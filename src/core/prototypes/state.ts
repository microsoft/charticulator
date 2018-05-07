import * as Specification from "../specification";
import * as Dataset from "../dataset";
import * as Prototypes from "./index";
import { getById, zip, zipArray, uniqueID } from "../common";
import { ObjectClassCache } from "./cache";
import { ObjectClass, ObjectClasses } from "./object";

import { DataflowTable, DataflowManager } from "./dataflow";

import * as Marks from "./marks";
import * as Scales from "./scales";
import * as Glyphs from "./glyphs";
import * as PlotSegments from "./plot_segments";
import * as Constraints from "./constraints";
import * as Charts from "./charts";
import { ChartElementClass } from "./chart_element";

/** Handles the life cycle of states and the dataflow */
export class ChartStateManager {
    public readonly chart: Specification.Chart;
    public chartState: Specification.ChartState;
    public dataset: Dataset.Dataset;
    public dataflow: DataflowManager;

    public classCache = new ObjectClassCache();
    public idIndex = new Map<string, [Specification.Object, Specification.ObjectState]>();

    constructor(chart: Specification.Chart, dataset: Dataset.Dataset, state: Specification.ChartState = null) {
        this.chart = chart;
        this.dataset = dataset;
        this.dataflow = new DataflowManager(dataset);

        if (state == null) {
            this.initialize();
        } else {
            this.setState(state);
        }
    }

    /** Set an existing state */
    public setState(state: Specification.ChartState) {
        this.chartState = state;
        this.rebuildID2Object();
        this.initializeCache();
    }

    /** Set a new dataset, this will reset the state */
    public setDataset(dataset: Dataset.Dataset): void {
        this.dataset = dataset;
        this.dataflow = new DataflowManager(dataset);
        this.initialize();
    }

    /** Get data table by name */
    public getTable(name: string): DataflowTable {
        return this.dataflow.getTable(name);
    }

    /** Get an object by its unique ID */
    public getObjectById(id: string): Specification.Object {
        return this.idIndex.get(id)[0];
    }

    /** Get a chart-level element or scale by its id */
    public getClassById(id: string): ObjectClass {
        let [object, state] = this.idIndex.get(id);
        return this.classCache.getClass(state);
    }

    /** Get classes for chart elements */
    public getElements(): ObjectClass[] {
        return zipArray(this.chart.elements, this.chartState.elements).map(([element, elementState]) => {
            return this.classCache.getClass(elementState);
        });
    }

    /** Create an empty chart state using chart and dataset */
    private createChartState(): Specification.ChartState {
        let chart = this.chart;

        // Build the state hierarchy
        let elementStates = chart.elements.map((element) => {
            // Initialie the element state
            let elementState: Specification.ChartElementState = {
                attributes: {}
            };
            // Special case for plot segment
            if (Prototypes.isType(element.classID, "plot-segment")) {
                this.mapPlotSegmentState(element, elementState);
            }
            return elementState;
        });

        let scaleStates = chart.scales.map((scale) => {
            let state = <Specification.ScaleState>{
                attributes: {}
            };
            return state;
        });

        return {
            elements: elementStates,
            scales: scaleStates,
            attributes: {}
        };
    }

    /** Initialize the object class cache */
    public initializeCache() {
        this.classCache = new ObjectClassCache();

        let chartClass = this.classCache.createChartClass(null, this.chart, this.chartState);
        chartClass.setDataflow(this.dataflow);

        for (let [scale, scaleState] of zip(this.chart.scales, this.chartState.scales)) {
            let scaleClass = this.classCache.createScaleClass(chartClass, scale, scaleState);
        }

        for (let [element, elementState] of zip(this.chart.elements, this.chartState.elements)) {
            let elementClass = this.classCache.createChartElementClass(chartClass, element, elementState);
            // For plot segment, handle data mapping
            if (Prototypes.isType(element.classID, "plot-segment")) {
                this.initializePlotSegmentCache(element, elementState);
            }
        }
    }

    /** Enumerate all object classes */
    public enumerateClasses(callback: (cls: ObjectClass) => void) {
        let chartClass = this.classCache.getChartClass(this.chartState);
        callback(chartClass);

        for (let [scale, scaleState] of zip(this.chart.scales, this.chartState.scales)) {
            let scaleClass = this.classCache.getClass(scaleState);
            callback(scaleClass);
        }

        for (let [element, elementState] of zip(this.chart.elements, this.chartState.elements)) {
            let elementClass = this.classCache.getClass(elementState);
            callback(elementClass);
            // For plot segment, handle data mapping
            if (Prototypes.isType(element.classID, "plot-segment")) {
                let plotSegment = element as Specification.PlotSegment;
                let plotSegmentState = elementState as Specification.PlotSegmentState;
                let glyph = this.getObjectById(plotSegment.glyph) as Specification.Glyph;
                for (let glyphState of plotSegmentState.glyphs) {
                    let glyphClass = this.classCache.getClass(glyphState);
                    callback(glyphClass);
                    for (let [mark, markState] of zip(glyph.marks, glyphState.marks)) {
                        let markClass = this.classCache.getClass(markState);
                        callback(markClass);
                    }
                }
            }
        }
    }

    /** Enumerate classes, only return a specific type */
    public enumerateClassesByType(type: string, callback: (cls: ObjectClass) => void) {
        this.enumerateClasses((cls) => {
            if (Prototypes.isType(cls.object.classID, type)) {
                callback(cls);
            }
        });
    }

    public enumeratePlotSegments(callback: (cls: PlotSegments.PlotSegmentClass) => void) {
        for (let [element, elementState] of zip(this.chart.elements, this.chartState.elements)) {
            let elementClass = this.classCache.getClass(elementState);
            if (Prototypes.isType(element.classID, "plot-segment")) {
                callback(elementClass as PlotSegments.PlotSegmentClass);
            }
        }
    }

    /** Initialize the chart state with default parameters */
    public initializeState() {
        this.enumerateClasses((cls) => {
            cls.initializeState();
        });
    }

    /** Recreate the chart state from scratch */
    private initialize() {
        this.chartState = this.createChartState();
        this.rebuildID2Object();
        this.initializeCache();
        this.initializeState();
    }

    /** Rebuild id to object map */
    private rebuildID2Object() {
        this.idIndex.clear();
        // Chart elements
        for (let [element, elementState] of zipArray(this.chart.elements, this.chartState.elements)) {
            this.idIndex.set(element._id, [element, elementState]);
        }
        // Scales
        for (let [scale, scaleState] of zipArray(this.chart.scales, this.chartState.scales)) {
            this.idIndex.set(scale._id, [scale, scaleState]);
        }
        // Glyphs
        for (let glyph of this.chart.glyphs) {
            this.idIndex.set(glyph._id, [glyph, null]);
            for (let element of glyph.marks) {
                this.idIndex.set(element._id, [element, null]);
            }
        }
    }

    /** Find an unused name given a prefix, will try prefix1, prefix2, and so on. */
    public findUnusedName(prefix: string) {
        let chart = this.chart;
        let names = new Set<string>();
        for (let scale of chart.scales) {
            names.add(scale.properties.name);
        }
        for (let element of chart.elements) {
            names.add(element.properties.name);
        }
        for (let mark of chart.glyphs) {
            names.add(mark.properties.name);
            for (let element of mark.marks) {
                names.add(element.properties.name);
            }
        }
        for (let i = 1; ; i++) {
            let candidate = prefix + i.toString();
            if (!names.has(candidate)) {
                return candidate;
            }
        }
    }

    /** Create a new object */
    public createObject(classID: string, ...args: any[]): Specification.Object {
        let namePrefix = "Object";
        let metadata = ObjectClasses.GetMetadata(classID);
        if (metadata && metadata.displayName) {
            namePrefix = metadata.displayName;
        }
        let object = ObjectClasses.CreateDefault(classID, ...args);
        let name = this.findUnusedName(namePrefix);
        object.properties.name = name;
        return object;
    }

    /** Add a new glyph */
    public addGlyph(classID: string, table: string): Specification.Glyph {
        let newGlyph: Specification.Glyph = {
            _id: uniqueID(),
            table: table,
            classID: classID,
            marks: [{
                _id: uniqueID(),
                classID: "mark.anchor",
                mappings: {
                    x: <Specification.ParentMapping>{ type: "parent", parentAttribute: "cx" },
                    y: <Specification.ParentMapping>{ type: "parent", parentAttribute: "cy" }
                },
                properties: { name: "Anchor" }
            }],
            properties: {
                name: this.findUnusedName("Glyph")
            },
            mappings: {},
            constraints: []
        };
        this.idIndex.set(newGlyph._id, [newGlyph, null]);
        this.idIndex.set(newGlyph.marks[0]._id, [newGlyph.marks[0], null]);
        return newGlyph;
    }
    /** Remove a glyph */
    public removeGlyph(glyph: Specification.Glyph) {
        let idx = this.chart.glyphs.indexOf(glyph);
        if (idx < 0) return;
        this.idIndex.delete(glyph._id);
        for (let element of glyph.marks) {
            this.idIndex.delete(element._id);
        }
        this.chart.glyphs.splice(idx, 1);

        // Delete all plot segments using this glyph
        let elementsToDelete: Specification.PlotSegment[] = [];
        for (let element of this.chart.elements) {
            if (Prototypes.isType(element.classID, "plot-segment")) {
                let plotSegment = element as Specification.PlotSegment;
                if (plotSegment.glyph == glyph._id) {
                    elementsToDelete.push(plotSegment);
                }
            }
        }
        for (let plotSegment of elementsToDelete) {
            this.removeChartElement(plotSegment);
        }
    }

    /** Add a new element to a glyph */
    public addMarkToGlyph(mark: Specification.Element, glyph: Specification.Glyph) {
        glyph.marks.push(mark);

        // Create element state in all plot segments using this glyph
        this.enumeratePlotSegments((plotSegmentClass: PlotSegments.PlotSegmentClass) => {
            if (plotSegmentClass.object.glyph == glyph._id) {
                for (let glyphState of plotSegmentClass.state.glyphs) {
                    let glyphClass = this.classCache.getGlyphClass(glyphState);
                    let markState: Specification.MarkState = {
                        attributes: {}
                    };
                    glyphState.marks.push(markState);
                    let markClass = this.classCache.createMarkClass(glyphClass, mark, markState);
                    markClass.initializeState();
                }
            }
        });
    }

    /** Remove an element from a glyph */
    public removeMarkFromGlyph(mark: Specification.Element, glyph: Specification.Glyph): void {
        let idx = glyph.marks.indexOf(mark);
        if (idx < 0) return;
        glyph.marks.splice(idx, 1);
        glyph.constraints = this.validateConstraints(glyph.constraints, glyph.marks);
        this.idIndex.delete(mark._id);

        // Remove the element state from all elements using this glyph
        this.enumeratePlotSegments((plotSegmentClass: PlotSegments.PlotSegmentClass) => {
            if (plotSegmentClass.object.glyph == glyph._id) {
                for (let glyphState of plotSegmentClass.state.glyphs) {
                    glyphState.marks.splice(idx, 1);
                }
            }
        });
    }

    /** Add a chart element */
    public addChartElement(element: Specification.ChartElement) {
        let elementState: Specification.ChartElementState = {
            attributes: {}
        };
        if (Prototypes.isType(element.classID, "plot-segment")) {
            this.mapPlotSegmentState(element, elementState);
        }
        this.chart.elements.push(element);
        this.chartState.elements.push(elementState);

        let elementClass = this.classCache.createChartElementClass(this.classCache.getChartClass(this.chartState), element, elementState);

        if (Prototypes.isType(element.classID, "plot-segment")) {
            this.initializePlotSegmentCache(element, elementState);
        }

        elementClass.initializeState();

        if (Prototypes.isType(element.classID, "plot-segment")) {
            this.initializePlotSegmentState(elementClass as PlotSegments.PlotSegmentClass);
        }

        this.idIndex.set(element._id, [element, elementState]);
    }

    public reorderArray<T>(array: T[], fromIndex: number, toIndex: number) {
        let x = array.splice(fromIndex, 1)[0];
        if (fromIndex < toIndex) {
            array.splice(toIndex - 1, 0, x);
        } else {
            array.splice(toIndex, 0, x);
        }
    }

    public reorderChartElement(fromIndex: number, toIndex: number) {
        if (toIndex == fromIndex || toIndex == fromIndex + 1) return; // no effect
        this.reorderArray(this.chart.elements, fromIndex, toIndex);
        this.reorderArray(this.chartState.elements, fromIndex, toIndex);
    }

    public reorderGlyphElement(glyph: Specification.Glyph, fromIndex: number, toIndex: number) {
        if (toIndex == fromIndex || toIndex == fromIndex + 1) return; // no effect
        for (let [element, elementState] of zip(this.chart.elements, this.chartState.elements)) {
            if (Prototypes.isType(element.classID, "plot-segment")) {
                let plotSegment = element as Specification.PlotSegment;
                let plotSegmentState = elementState as Specification.PlotSegmentState;
                if (plotSegment.glyph == glyph._id) {
                    for (let glyphState of plotSegmentState.glyphs) {
                        this.reorderArray(glyphState.marks, fromIndex, toIndex);
                    }
                }
            }
        }
        this.reorderArray(glyph.marks, fromIndex, toIndex);
    }

    private mapPlotSegmentState(element: Specification.ChartElement, elementState: Specification.ChartElementState) {
        let plotSegment = element as Specification.PlotSegment;
        let plotSegmentState = elementState as Specification.PlotSegmentState;
        let glyphObject = getById(this.chart.glyphs, plotSegment.glyph) as Specification.Glyph;
        let table = this.getTable(glyphObject.table);
        plotSegmentState.dataRowIndices = table.rows.map((r, i) => i);
        plotSegmentState.glyphs = table.rows.map((row, index) => {
            let glyphState = <Specification.GlyphState>{
                marks: glyphObject.marks.map(element => {
                    let elementState = <Specification.MarkState>{
                        attributes: {}
                    }
                    return elementState;
                }),
                attributes: {}
            };
            return glyphState;
        });
    }
    private initializePlotSegmentCache(element: Specification.ChartElement, elementState: Specification.ChartElementState) {
        let plotSegment = element as Specification.PlotSegment;
        let plotSegmentState = elementState as Specification.PlotSegmentState;
        let plotSegmentClass = this.classCache.getPlotSegmentClass(plotSegmentState);
        let glyph = this.getObjectById(plotSegment.glyph) as Specification.Glyph;
        for (let glyphState of plotSegmentState.glyphs) {
            let glyphClass = this.classCache.createGlyphClass(plotSegmentClass, glyph, glyphState);
            for (let [mark, markState] of zip(glyph.marks, glyphState.marks)) {
                let markClass = this.classCache.createMarkClass(glyphClass, mark, markState);
            }
        }
    }

    private initializePlotSegmentState(plotSegmentClass: PlotSegments.PlotSegmentClass) {
        let glyph = this.getObjectById(plotSegmentClass.object.glyph) as Specification.Glyph;
        for (let glyphState of plotSegmentClass.state.glyphs) {
            let glyphClass = this.classCache.getGlyphClass(glyphState);
            glyphClass.initializeState();
            for (let [mark, markState] of zip(glyph.marks, glyphState.marks)) {
                let markClass = this.classCache.getMarkClass(markState);
                markClass.initializeState();
            }
        }
    }

    /** Remove a chart element */
    public removeChartElement(element: Specification.ChartElement) {
        let idx = this.chart.elements.indexOf(element);
        if (idx < 0) return;
        this.chart.elements.splice(idx, 1);
        this.chartState.elements.splice(idx, 1);
        this.idIndex.delete(element._id);
        this.chart.constraints = this.validateConstraints(this.chart.constraints, this.chart.elements);
    }

    /** Add a new scale */
    public addScale(scale: Specification.Scale) {
        let scaleState: Specification.ScaleState = {
            attributes: {}
        };
        this.chart.scales.push(scale);
        this.chartState.scales.push(scaleState);

        let scaleClass = this.classCache.createScaleClass(this.classCache.getChartClass(this.chartState), scale, scaleState);
        scaleClass.initializeState();
        this.idIndex.set(scale._id, [scale, scaleState]);
    }

    /** Remove a scale */
    public removeScale(scale: Specification.Scale) {
        let idx = this.chart.scales.indexOf(scale);
        if (idx < 0) return;
        this.chart.scales.splice(idx, 1);
        this.chartState.scales.splice(idx, 1);
        this.idIndex.delete(scale._id);
    }

    public getMarkClass(state: Specification.MarkState): Marks.MarkClass {
        return this.classCache.getMarkClass(state);
    }
    public getGlyphClass(state: Specification.GlyphState): Glyphs.GlyphClass {
        return this.classCache.getGlyphClass(state);
    }
    public getChartElementClass(state: Specification.ChartElementState): ChartElementClass {
        return this.classCache.getChartElementClass(state);
    }
    public getPlotSegmentClass(state: Specification.PlotSegmentState): PlotSegments.PlotSegmentClass {
        return this.classCache.getPlotSegmentClass(state);
    }
    public getScaleClass(state: Specification.ScaleState): Scales.ScaleClass {
        return this.classCache.getScaleClass(state);
    }
    public getChartClass(state: Specification.ChartState): Charts.ChartClass {
        return this.classCache.getChartClass(state);
    }
    public getClass(state: Specification.ObjectState): ObjectClass {
        return this.classCache.getClass(state);
    }

    /** Remove constraints that relate to non-existant element */
    public validateConstraints(constraints: Specification.Constraint[], elements: Specification.Object[]): Specification.Constraint[] {
        let elementIDs = new Set<string>();
        for (let e of elements) {
            elementIDs.add(e._id);
        }
        return constraints.filter(constraint => {
            switch (constraint.type) {
                case "snap": {
                    return elementIDs.has(constraint.attributes.element as string) && elementIDs.has(constraint.attributes.targetElement as string);
                }
                default:
                    return true;
            }
        });
    }
}

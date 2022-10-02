/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  deepClone,
  gather,
  getById,
  makeRange,
  uniqueID,
  zip,
  zipArray,
} from "../common";
import * as Dataset from "../dataset";
import * as Expression from "../expression";
import * as Specification from "../specification";
import { MappingType } from "../specification";
import * as Charts from "./charts";
import * as Glyphs from "./glyphs";
import * as Prototypes from "./index";
import { forEachObject, ObjectItemKind } from "./index";
import * as Marks from "./marks";
import * as PlotSegments from "./plot_segments";
import * as Scales from "./scales";

import { ObjectClassCache } from "./cache";
import { ChartElementClass } from "./chart_element";
import { DataflowManager, DataflowTable } from "./dataflow";
import { CompiledFilter } from "./filter";
import { ObjectClass, ObjectClasses } from "./object";
import { ChartConstraintSolver } from "../solver";
import { ValueType } from "../expression/classes";
import { expect_deep_approximately_equals } from "../../app/utils";
import { AxisDataBinding, AxisDataBindingType } from "../specification/types";

/**
 * Represents a set of default attributes
 */
export interface DefaultAttributes {
  /* Maps between an object id and a set of attributes */
  [objectId: string]: {
    [attribute: string]: any;
  };
}

export type ClassEnumerationCallback = (
  cls: ObjectClass,
  state: Specification.ObjectState
) => void;

export const defaultDifferenceApproximation = 0.01;

/** Handles the life cycle of states and the dataflow */
export class ChartStateManager {
  private chartOrigin: Specification.Chart;

  public chart: Specification.Chart;
  public dataset: Dataset.Dataset;
  public chartState: Specification.ChartState;
  public dataflow: DataflowManager;

  public classCache = new ObjectClassCache();
  public idIndex = new Map<
    string,
    [Specification.Object, Specification.ObjectState]
  >();
  public options: {
    [key: string]: any;
  };

  private onUpdateListeners: ((chart: Specification.Chart) => void)[] = [];

  constructor(
    chart: Specification.Chart,
    dataset: Dataset.Dataset,
    state: Specification.ChartState = null,
    defaultAttributes: DefaultAttributes = {},
    options: {
      [key: string]: any;
    } = {},
    chartOrigin?: Specification.Chart
  ) {
    this.chart = chart;
    this.chartOrigin = chartOrigin ? chartOrigin : deepClone(chart);
    this.dataset = dataset;
    this.dataflow = new DataflowManager(dataset);
    this.options = options;

    if (state == null) {
      this.initialize(defaultAttributes);
    } else {
      this.setState(state);
    }
  }

  public getOriginChart() {
    return this.chartOrigin;
  }

  public updateState(
    chart: Specification.Chart,
    dataset: Dataset.Dataset,
    state: Specification.ChartState
  ) {
    this.chart = chart;
    this.dataset = dataset;
    this.chartState = state;
    this.initialize({});
  }

  public resetDifference() {
    this.chartOrigin = deepClone(this.chart);
  }

  public onUpdate(callback: (chart: Specification.Chart) => void) {
    this.onUpdateListeners.push(callback);
  }

  public clearOnUpdateListener(callback: (chart: Specification.Chart) => void) {
    const index = this.onUpdateListeners.findIndex((func) => func === callback);
    if (index != -1) {
      this.onUpdateListeners = [
        ...this.onUpdateListeners.slice(0, index),
        ...this.onUpdateListeners.slice(
          index + 1,
          this.onUpdateListeners.length
        ),
      ];
    }
  }

  // eslint-disable-next-line max-lines-per-function
  public hasUnsavedChanges() {
    const origin = this.chartOrigin;
    const chart = this.chart;

    const currentProperties = chart.properties;
    const originProperties = origin.properties;

    try {
      expect_deep_approximately_equals(
        currentProperties,
        originProperties,
        defaultDifferenceApproximation,
        true
      );
    } catch {
      return true;
    }

    if (origin.constraints.length !== chart.constraints.length) {
      return true;
    } else {
      for (let index = 0; index < origin.constraints.length; index++) {
        const originConstraints = origin.constraints[index];
        const current = chart.constraints[index];
        expect_deep_approximately_equals(
          originConstraints,
          current,
          defaultDifferenceApproximation,
          true
        );
      }
    }

    const chartElements = [...forEachObject(chart)];
    const originElements = [...forEachObject(origin)];

    // forEachObject returns all objects in the chart
    // if any object was added or removed to the chart it means chart has changes
    // don't need to compare in details
    if (chartElements.length != originElements.length) {
      return true;
    } else {
      for (let index = 0; index < chartElements.length; index++) {
        const currentElement = chartElements[index];
        const originElement = originElements[index];

        if (currentElement.kind != originElement.kind) {
          return true;
        }
        if (currentElement.glyph?.classID != originElement.glyph?.classID) {
          return true;
        }
        if (currentElement.object?._id != originElement.object?._id) {
          return true;
        }
        if (currentElement.scale?._id != originElement.scale?._id) {
          return true;
        }
        if (
          currentElement.kind == ObjectItemKind.ChartElement &&
          currentElement.kind == ObjectItemKind.ChartElement
        ) {
          if (currentElement.chartElement && originElement.chartElement) {
            if (
              currentElement.chartElement._id != originElement.chartElement._id
            ) {
              return true;
            }
            if (
              currentElement.chartElement.classID !=
              originElement.chartElement.classID
            ) {
              return true;
            }
          }
          if (
            Prototypes.isType(
              currentElement.chartElement.classID,
              "plot-segment"
            ) &&
            Prototypes.isType(
              originElement.chartElement.classID,
              "plot-segment"
            )
          ) {
            const currentPlotSegment = currentElement.chartElement as Specification.PlotSegment;
            const originPlotSegment = originElement.chartElement as Specification.PlotSegment;

            if (currentPlotSegment.glyph != originPlotSegment.glyph) {
              return true;
            }

            if (currentPlotSegment.table != originPlotSegment.table) {
              return true;
            }

            try {
              expect_deep_approximately_equals(
                currentPlotSegment.filter,
                originPlotSegment.filter,
                defaultDifferenceApproximation,
                true
              );
              expect_deep_approximately_equals(
                currentPlotSegment.groupBy,
                originPlotSegment.groupBy,
                defaultDifferenceApproximation,
                true
              );
              expect_deep_approximately_equals(
                currentPlotSegment.order,
                originPlotSegment.order,
                defaultDifferenceApproximation,
                true
              );
              expect_deep_approximately_equals(
                currentPlotSegment.mappings,
                originPlotSegment.mappings,
                defaultDifferenceApproximation,
                true
              );
              expect_deep_approximately_equals(
                currentPlotSegment.properties,
                originPlotSegment.properties,
                defaultDifferenceApproximation,
                true
              );
            } catch (ex) {
              console.log(ex);
              return true;
            }
          }

          try {
            const currentProperties = currentElement.chartElement.properties;
            const originProperties = originElement.chartElement.properties;

            expect_deep_approximately_equals(
              currentProperties,
              originProperties,
              defaultDifferenceApproximation,
              true
            );
          } catch (ex) {
            console.log(ex);
            return true;
          }
        }

        if (
          currentElement.kind == ObjectItemKind.Glyph &&
          originElement.kind == ObjectItemKind.Glyph
        ) {
          if (currentElement.glyph.table != originElement.glyph.table) {
            return true;
          }
        }

        if (
          currentElement.kind == ObjectItemKind.Mark &&
          originElement.kind == ObjectItemKind.Mark
        ) {
          if (currentElement.mark?.classID != originElement.mark?.classID) {
            return true;
          }
          try {
            const currentProperties = currentElement.mark.properties;
            const originProperties = originElement.mark.properties;

            expect_deep_approximately_equals(
              currentProperties,
              originProperties,
              defaultDifferenceApproximation,
              true
            );
          } catch (ex) {
            console.log(ex);
            return true;
          }
        }

        try {
          const currentMappings = currentElement.object.mappings;
          const originMappings = originElement.object.mappings;
          expect_deep_approximately_equals(
            currentMappings,
            originMappings,
            defaultDifferenceApproximation,
            true
          );
        } catch (ex) {
          console.log(ex);
          return true;
        }

        //scale mappings
        try {
          const currentProperties = currentElement.object?.properties;
          const originProperties = originElement.object?.properties;
          expect_deep_approximately_equals(
            currentProperties,
            originProperties,
            defaultDifferenceApproximation,
            true
          );
        } catch (ex) {
          console.log(ex);
          return true;
        }
      }
    }

    return false;
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
    this.initialize({});
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
    // eslint-disable-next-line
    const [object, state] = this.idIndex.get(id);
    return this.classCache.getClass(state);
  }

  /** Get classes for chart elements */
  public getElements(): ObjectClass[] {
    return zipArray(this.chart.elements, this.chartState.elements).map(
      // eslint-disable-next-line
      ([element, elementState]) => {
        return this.classCache.getClass(elementState);
      }
    );
  }

  /** Create an empty chart state using chart and dataset */
  private createChartState(): Specification.ChartState {
    const chart = this.chart;

    // Build the state hierarchy
    const elementStates = chart.elements.map((element) => {
      // Initialize the element state
      const elementState: Specification.ChartElementState = {
        attributes: {},
      };
      // Special case for plot segment
      if (Prototypes.isType(element.classID, "plot-segment")) {
        this.mapPlotSegmentState(
          <Specification.PlotSegment>element,
          <Specification.PlotSegmentState>elementState
        );
      }
      return elementState;
    });

    const scaleStates = chart.scales.map(() => {
      const state = <Specification.ScaleState>{
        attributes: {},
      };
      return state;
    });

    return {
      elements: elementStates,
      scales: scaleStates,
      scaleMappings: chart.scaleMappings,
      attributes: {},
    };
  }

  /** Initialize the object class cache */
  public initializeCache() {
    this.classCache = new ObjectClassCache();

    const chartClass = this.classCache.createChartClass(
      null,
      this.chart,
      this.chartState
    );
    chartClass.setDataflow(this.dataflow);
    chartClass.setManager(this);

    for (const [scale, scaleState] of zip(
      this.chart.scales,
      this.chartState.scales
    )) {
      this.classCache.createScaleClass(chartClass, scale, scaleState);
    }

    for (const [element, elementState] of zip(
      this.chart.elements,
      this.chartState.elements
    )) {
      this.classCache.createChartElementClass(
        chartClass,
        element,
        elementState
      );
      // For plot segment, handle data mapping
      if (Prototypes.isType(element.classID, "plot-segment")) {
        this.initializePlotSegmentCache(element, elementState);
      }
    }
  }

  /** Enumerate all object classes */
  public enumerateClasses(callback: ClassEnumerationCallback) {
    const chartClass = this.classCache.getChartClass(this.chartState);
    callback(chartClass, this.chartState);

    // eslint-disable-next-line
    for (const [scale, scaleState] of zip(
      this.chart.scales,
      this.chartState.scales
    )) {
      const scaleClass = this.classCache.getClass(scaleState);
      callback(scaleClass, scaleState);
    }

    for (const [element, elementState] of zip(
      this.chart.elements,
      this.chartState.elements
    )) {
      const elementClass = this.classCache.getClass(elementState);
      callback(elementClass, elementState);
      // For plot segment, handle data mapping
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = <Specification.PlotSegment>element;
        const plotSegmentState = <Specification.PlotSegmentState>elementState;
        const glyph = <Specification.Glyph>(
          this.getObjectById(plotSegment.glyph)
        );
        for (const glyphState of plotSegmentState.glyphs) {
          const glyphClass = this.classCache.getClass(glyphState);
          callback(glyphClass, glyphState);
          // eslint-disable-next-line
          for (const [mark, markState] of zip(glyph.marks, glyphState.marks)) {
            const markClass = this.classCache.getClass(markState);
            callback(markClass, markState);
          }
        }
      }
    }
  }

  /** Enumerate classes, only return a specific type */
  public enumerateClassesByType(
    type: string,
    callback: ClassEnumerationCallback
  ) {
    this.enumerateClasses((cls, state) => {
      if (Prototypes.isType(cls.object.classID, type)) {
        callback(cls, state);
      }
    });
  }

  public enumeratePlotSegments(
    callback: (cls: PlotSegments.PlotSegmentClass) => void
  ) {
    for (const [element, elementState] of zip(
      this.chart.elements,
      this.chartState.elements
    )) {
      const elementClass = this.classCache.getClass(elementState);
      if (Prototypes.isType(element.classID, "plot-segment")) {
        callback(<PlotSegments.PlotSegmentClass>elementClass);
      }
    }
  }

  /** Initialize the chart state with default parameters */
  public initializeState(defaultAttributes: DefaultAttributes = {}) {
    this.enumerateClasses((cls) => {
      cls.initializeState();

      const attributesToAdd = defaultAttributes[cls.object._id];
      if (attributesToAdd) {
        cls.state.attributes = {
          ...cls.state.attributes,
          ...attributesToAdd,
        };
      }
    });
  }

  /** Recreate the chart state from scratch */
  private initialize(defaultAttributes: DefaultAttributes) {
    this.chartState = this.createChartState();
    this.rebuildID2Object();
    this.initializeCache();
    this.initializeState(defaultAttributes);
  }

  /** Rebuild id to object map */
  private rebuildID2Object() {
    this.idIndex.clear();
    // Chart elements
    for (const [element, elementState] of zipArray(
      this.chart.elements,
      this.chartState.elements
    )) {
      this.idIndex.set(element._id, [element, elementState]);
    }
    // Scales
    for (const [scale, scaleState] of zipArray(
      this.chart.scales,
      this.chartState.scales
    )) {
      this.idIndex.set(scale._id, [scale, scaleState]);
    }
    // Glyphs
    for (const glyph of this.chart.glyphs) {
      this.idIndex.set(glyph._id, [glyph, null]);
      for (const element of glyph.marks) {
        this.idIndex.set(element._id, [element, null]);
      }
    }
  }

  /** Test if a name is already used */
  public isNameUsed(candidate: string) {
    const chart = this.chart;
    const names = new Set<string>();
    for (const scale of chart.scales) {
      names.add(scale.properties.name);
    }
    for (const element of chart.elements) {
      names.add(element.properties.name);
    }
    for (const mark of chart.glyphs) {
      names.add(mark.properties.name);
      for (const element of mark.marks) {
        names.add(element.properties.name);
      }
    }
    return names.has(candidate);
  }

  /** Find an unused name given a prefix, will try prefix1, prefix2, and so on. */
  public findUnusedName(prefix: string) {
    for (let i = 1; ; i++) {
      const candidate = prefix + i.toString();
      if (!this.isNameUsed(candidate)) {
        return candidate;
      }
    }
  }

  /** Create a new object */
  public createObject(classID: string, ...args: any[]): Specification.Object {
    let namePrefix = "Object";
    const metadata = ObjectClasses.GetMetadata(classID);
    if (metadata && metadata.displayName) {
      namePrefix = metadata.displayName;
    }
    const object = ObjectClasses.CreateDefault(classID, ...args);
    const name = this.findUnusedName(namePrefix);
    object.properties.name = name;
    return object;
  }

  /** Add a new glyph */
  public addGlyph(classID: string, table: string): Specification.Glyph {
    const newGlyph: Specification.Glyph = {
      _id: uniqueID(),
      classID,
      properties: { name: this.findUnusedName("Glyph") },
      table,
      marks: [
        {
          _id: uniqueID(),
          classID: "mark.anchor",
          properties: { name: "Anchor" },
          mappings: {
            x: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "icx",
            },
            y: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "icy",
            },
          },
        },
      ],
      mappings: {},
      constraints: [],
    };
    this.idIndex.set(newGlyph._id, [newGlyph, null]);
    this.idIndex.set(newGlyph.marks[0]._id, [newGlyph.marks[0], null]);
    this.chart.glyphs.push(newGlyph);
    return newGlyph;
  }
  /** Remove a glyph */
  public removeGlyph(glyph: Specification.Glyph) {
    const idx = this.chart.glyphs.indexOf(glyph);
    if (idx < 0) {
      return;
    }
    this.idIndex.delete(glyph._id);
    for (const element of glyph.marks) {
      this.idIndex.delete(element._id);
    }
    this.chart.glyphs.splice(idx, 1);

    // Delete all plot segments using this glyph
    const elementsToDelete: Specification.PlotSegment[] = [];
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = <Specification.PlotSegment>element;
        if (plotSegment.glyph == glyph._id) {
          elementsToDelete.push(plotSegment);
        }
      }
    }
    for (const plotSegment of elementsToDelete) {
      this.removeChartElement(plotSegment);
    }
  }

  /** Add a new element to a glyph */
  public addMarkToGlyph(
    mark: Specification.Element,
    glyph: Specification.Glyph
  ) {
    glyph.marks.push(mark);

    // Create element state in all plot segments using this glyph
    this.enumeratePlotSegments(
      (plotSegmentClass: PlotSegments.PlotSegmentClass) => {
        if (plotSegmentClass.object.glyph == glyph._id) {
          for (const glyphState of plotSegmentClass.state.glyphs) {
            const glyphClass = this.classCache.getGlyphClass(glyphState);
            const markState: Specification.MarkState = {
              attributes: {},
            };
            glyphState.marks.push(markState);
            const markClass = this.classCache.createMarkClass(
              glyphClass,
              mark,
              markState
            );
            markClass.initializeState();
          }
        }
      }
    );
  }

  /** Remove an element from a glyph */
  public removeMarkFromGlyph(
    mark: Specification.Element,
    glyph: Specification.Glyph
  ): void {
    const idx = glyph.marks.indexOf(mark);
    if (idx < 0) {
      return;
    }
    glyph.marks.splice(idx, 1);
    glyph.constraints = this.validateConstraints(
      glyph.constraints,
      glyph.marks
    );
    this.idIndex.delete(mark._id);

    // Remove the element state from all elements using this glyph
    this.enumeratePlotSegments(
      (plotSegmentClass: PlotSegments.PlotSegmentClass) => {
        if (plotSegmentClass.object.glyph == glyph._id) {
          for (const glyphState of plotSegmentClass.state.glyphs) {
            glyphState.marks.splice(idx, 1);
          }
        }
      }
    );
  }

  /** Add a chart element */
  public addChartElement(
    element: Specification.ChartElement,
    index: number = null
  ) {
    const elementState: Specification.ChartElementState = {
      attributes: {},
    };
    if (Prototypes.isType(element.classID, "plot-segment")) {
      this.mapPlotSegmentState(
        <Specification.PlotSegment>element,
        <Specification.PlotSegmentState>elementState
      );
    }

    if (index != null && index >= 0 && index <= this.chart.elements.length) {
      this.chart.elements.splice(index, 0, element);
      this.chartState.elements.splice(index, 0, elementState);
    } else {
      this.chart.elements.push(element);
      this.chartState.elements.push(elementState);
    }

    const elementClass = this.classCache.createChartElementClass(
      this.classCache.getChartClass(this.chartState),
      element,
      elementState
    );

    if (Prototypes.isType(element.classID, "plot-segment")) {
      this.initializePlotSegmentCache(element, elementState);
    }

    elementClass.initializeState();

    if (Prototypes.isType(element.classID, "plot-segment")) {
      this.initializePlotSegmentState(
        <PlotSegments.PlotSegmentClass>elementClass
      );
    }

    this.idIndex.set(element._id, [element, elementState]);
  }

  public reorderArray<T>(array: T[], fromIndex: number, toIndex: number) {
    const x = array.splice(fromIndex, 1)[0];
    if (fromIndex < toIndex) {
      array.splice(toIndex - 1, 0, x);
    } else {
      array.splice(toIndex, 0, x);
    }
  }

  public reorderChartElement(fromIndex: number, toIndex: number) {
    if (toIndex == fromIndex || toIndex == fromIndex + 1) {
      return;
    } // no effect
    this.reorderArray(this.chart.elements, fromIndex, toIndex);
    this.reorderArray(this.chartState.elements, fromIndex, toIndex);
  }

  public reorderGlyphElement(
    glyph: Specification.Glyph,
    fromIndex: number,
    toIndex: number
  ) {
    if (toIndex == fromIndex || toIndex == fromIndex + 1) {
      return;
    } // no effect
    for (const [element, elementState] of zip(
      this.chart.elements,
      this.chartState.elements
    )) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = <Specification.PlotSegment>element;
        const plotSegmentState = <Specification.PlotSegmentState>elementState;
        if (plotSegment.glyph == glyph._id) {
          for (const glyphState of plotSegmentState.glyphs) {
            this.reorderArray(glyphState.marks, fromIndex, toIndex);
          }
        }
      }
    }
    this.reorderArray(glyph.marks, fromIndex, toIndex);
  }

  private applyScrollingFilter(data: AxisDataBinding, tableName: string) {
    const filteredIndices: number[] = [];
    // TODO fix expression (get column name from expression properly)
    const table = this.getTable(tableName);

    //in default we dont have expression, we should return all rows
    if (data.type === AxisDataBindingType.Default) {
      return table.rows.map((row, id) => id);
    }
    const parsed = (Expression.parse(
      data?.expression
    ) as Expression.FunctionCall)?.args[0];

    if (data.type === AxisDataBindingType.Categorical) {
      for (let i = 0; i < table.rows.length; i++) {
        const rowContext = table.getRowContext(i);

        if (
          data.categories.find(
            (category) => category === parsed.getStringValue(rowContext)
          ) !== undefined ||
          !data.allCategories
        ) {
          filteredIndices.push(i);
        }
      }
    } else if (data.type === AxisDataBindingType.Numerical) {
      for (let i = 0; i < table.rows.length; i++) {
        const rowContext = table.getRowContext(i);
        const value = parsed.getValue(rowContext);
        if (data.domainMin < data.domainMax) {
          if (value >= data.domainMin && value <= data.domainMax) {
            filteredIndices.push(i);
          }
        } else {
          if (value >= data.domainMax && value <= data.domainMin) {
            filteredIndices.push(i);
          }
        }
      }
    }

    return filteredIndices;
  }

  /**
   * Map/remap plot segment glyphs
   * @param plotSegment
   * @param plotSegmentState
   */
  private mapPlotSegmentState(
    plotSegment: Specification.PlotSegment,
    plotSegmentState: Specification.PlotSegmentState
  ) {
    const glyphObject = <Specification.Glyph>(
      getById(this.chart.glyphs, plotSegment.glyph)
    );
    const table = this.getTable(glyphObject.table);
    const index2ExistingGlyphState = new Map<
      string,
      Specification.GlyphState
    >();
    if (plotSegmentState.dataRowIndices) {
      for (const [rowIndex, glyphState] of zip(
        plotSegmentState.dataRowIndices,
        plotSegmentState.glyphs
      )) {
        index2ExistingGlyphState.set(rowIndex.join(","), glyphState);
      }
    }
    let filteredIndices = table.rows.map((r, i) => i);

    // scrolling filters
    if (plotSegment.properties.xData && plotSegment.properties.yData) {
      const dataX = plotSegment.properties.xData as AxisDataBinding;
      const filteredIndicesX = this.applyScrollingFilter(
        dataX,
        plotSegment.table
      );

      const dataY = plotSegment.properties.yData as AxisDataBinding;
      const filteredIndicesY = this.applyScrollingFilter(
        dataY,
        plotSegment.table
      );

      filteredIndices = filteredIndicesX.filter((value) =>
        filteredIndicesY.includes(value)
      );
    } else {
      if (plotSegment.properties.xData) {
        const data = plotSegment.properties.xData as AxisDataBinding;
        filteredIndices = this.applyScrollingFilter(data, plotSegment.table);
      }
      if (plotSegment.properties.yData) {
        const data = plotSegment.properties.yData as AxisDataBinding;
        filteredIndices = this.applyScrollingFilter(data, plotSegment.table);
      }
    }
    if (plotSegment.properties.axis) {
      const data = plotSegment.properties.axis as AxisDataBinding;
      filteredIndices = this.applyScrollingFilter(data, plotSegment.table);
    }
    plotSegmentState.dataRowIndices = filteredIndices.map((i) => [i]);

    if (plotSegment.filter) {
      try {
        const filter = new CompiledFilter(
          plotSegment.filter,
          this.dataflow.cache
        );
        filteredIndices = filteredIndices.filter((i) => {
          return filter.filter(table.getRowContext(i));
        });
      } catch (e) {
        //Plot segment empty filter expression
      }
    }
    if (plotSegment.groupBy) {
      if (plotSegment.groupBy.expression) {
        const expr = this.dataflow.cache.parse(plotSegment.groupBy.expression);
        const groups = new Map<string, number[]>();
        plotSegmentState.dataRowIndices = [];
        for (const i of filteredIndices) {
          const groupBy = expr.getStringValue(table.getRowContext(i));
          if (groups.has(groupBy)) {
            groups.get(groupBy).push(i);
          } else {
            const g = [i];
            groups.set(groupBy, g);
            plotSegmentState.dataRowIndices.push(g);
          }
        }
      } else {
        // TODO: emit error
      }
    } else {
      plotSegmentState.dataRowIndices = filteredIndices.map((i) => [i]);
    }
    // Resolve filter
    plotSegmentState.glyphs = plotSegmentState.dataRowIndices.map(
      (rowIndex) => {
        if (index2ExistingGlyphState.has(rowIndex.join(","))) {
          return index2ExistingGlyphState.get(rowIndex.join(","));
        } else {
          const glyphState = <Specification.GlyphState>{
            marks: glyphObject.marks.map(() => {
              const elementState = <Specification.MarkState>{
                attributes: {},
              };
              return elementState;
            }),
            attributes: {},
          };
          return glyphState;
        }
      }
    );
  }

  private initializePlotSegmentCache(
    element: Specification.ChartElement,
    elementState: Specification.ChartElementState
  ) {
    const plotSegment = <Specification.PlotSegment>element;
    const plotSegmentState = <Specification.PlotSegmentState>elementState;
    const plotSegmentClass = this.classCache.getPlotSegmentClass(
      plotSegmentState
    );
    const glyph = <Specification.Glyph>this.getObjectById(plotSegment.glyph);
    for (const glyphState of plotSegmentState.glyphs) {
      if (this.classCache.hasClass(glyphState)) {
        continue;
      }
      const glyphClass = this.classCache.createGlyphClass(
        plotSegmentClass,
        glyph,
        glyphState
      );
      for (const [mark, markState] of zip(glyph.marks, glyphState.marks)) {
        this.classCache.createMarkClass(glyphClass, mark, markState);
      }
    }
  }

  private initializePlotSegmentState(
    plotSegmentClass: PlotSegments.PlotSegmentClass
  ) {
    const glyph = <Specification.Glyph>(
      this.getObjectById(plotSegmentClass.object.glyph)
    );
    for (const glyphState of plotSegmentClass.state.glyphs) {
      const glyphClass = this.classCache.getGlyphClass(glyphState);
      glyphClass.initializeState();
      // eslint-disable-next-line
      for (const [mark, markState] of zip(glyph.marks, glyphState.marks)) {
        const markClass = this.classCache.getMarkClass(markState);
        markClass.initializeState();
      }
    }
  }

  private triggerUpdateListeners() {
    this.onUpdateListeners.forEach((listener) => listener(this.chart));
  }
  /** Remove a chart element */
  public removeChartElement(element: Specification.ChartElement) {
    const idx = this.chart.elements.indexOf(element);
    if (idx < 0) {
      return;
    }
    this.chart.elements.splice(idx, 1);
    this.chartState.elements.splice(idx, 1);
    this.idIndex.delete(element._id);
    this.chart.constraints = this.validateConstraints(
      this.chart.constraints,
      this.chart.elements
    );
  }

  public remapPlotSegmentGlyphs(plotSegment: Specification.PlotSegment) {
    const idx = this.chart.elements.indexOf(plotSegment);
    if (idx < 0) {
      return;
    }
    const plotSegmentState = <Specification.PlotSegmentState>(
      this.chartState.elements[idx]
    );
    this.mapPlotSegmentState(plotSegment, plotSegmentState);
    this.initializePlotSegmentCache(plotSegment, plotSegmentState);
    this.solveConstraints();
    this.triggerUpdateListeners();
  }

  /** Add a new scale */
  public addScale(scale: Specification.Scale) {
    const scaleState: Specification.ScaleState = {
      attributes: {},
    };
    this.chart.scales.push(scale);
    this.chartState.scales.push(scaleState);

    const scaleClass = this.classCache.createScaleClass(
      this.classCache.getChartClass(this.chartState),
      scale,
      scaleState
    );
    scaleClass.initializeState();
    this.idIndex.set(scale._id, [scale, scaleState]);
  }

  /** Remove a scale */
  public removeScale(scale: Specification.Scale) {
    const idx = this.chart.scales.indexOf(scale);
    if (idx < 0) {
      return;
    }
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
  public getChartElementClass(
    state: Specification.ChartElementState
  ): ChartElementClass {
    return this.classCache.getChartElementClass(state);
  }
  public getPlotSegmentClass(
    state: Specification.PlotSegmentState
  ): PlotSegments.PlotSegmentClass {
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

  public findGlyphState(
    plotSegment: Specification.PlotSegment,
    glyph: Specification.Glyph,
    glyphIndex: number = 0
  ): Specification.GlyphState {
    if (glyphIndex == null) {
      glyphIndex = 0;
    }
    const plotSegmentClass = <PlotSegments.PlotSegmentClass>(
      this.getClassById(plotSegment._id)
    );
    return plotSegmentClass.state.glyphs[glyphIndex];
  }

  public findMarkState(
    plotSegment: Specification.PlotSegment,
    glyph: Specification.Glyph,
    mark: Specification.Element,
    glyphIndex: number = 0
  ): Specification.MarkState {
    const markIndex = glyph.marks.indexOf(mark);
    return this.findGlyphState(plotSegment, glyph, glyphIndex)?.marks[
      markIndex
    ];
  }

  /** Remove constraints that relate to non-existant element */
  public validateConstraints(
    constraints: Specification.Constraint[],
    elements: Specification.Object[]
  ): Specification.Constraint[] {
    const elementIDs = new Set<string>();
    for (const e of elements) {
      elementIDs.add(e._id);
    }
    return constraints.filter((constraint) => {
      switch (constraint.type) {
        case "snap": {
          return (
            elementIDs.has(<string>constraint.attributes.element) &&
            elementIDs.has(<string>constraint.attributes.targetElement)
          );
        }
        default:
          return true;
      }
    });
  }

  public resolveResource(description: string) {
    const m = description.match(/^resource:([.*]+)$/);
    if (m && this.chart.resources) {
      const id = m[1];
      for (const item of this.chart.resources) {
        if (item.id == id) {
          return item.data;
        }
      }
    } else {
      return description;
    }
  }

  /** Get chart-level data context for a given table */
  public getChartDataContext(tableName: string): Expression.Context {
    if (tableName == null) {
      return null;
    }
    const table = this.dataflow.getTable(tableName);
    return table.getGroupedContext(makeRange(0, table.rows.length));
  }

  /** Get glyph-level data context for the glyphIndex-th glyph */
  public getGlyphDataContext(
    plotSegment: Specification.PlotSegment,
    glyphIndex: number
  ): Expression.Context {
    const table = this.dataflow.getTable(plotSegment.table);
    const plotSegmentClass = <PlotSegments.PlotSegmentClass>(
      this.getClassById(plotSegment._id)
    );
    const indices = plotSegmentClass.state.dataRowIndices[glyphIndex];
    return table.getGroupedContext(indices);
  }

  /** Get all glyph-level data contexts for a given plot segment */
  public getGlyphDataContexts(
    plotSegment: Specification.PlotSegment,
    // eslint-disable-next-line
    glyphIndex: number
  ): Expression.Context[] {
    const table = this.dataflow.getTable(plotSegment.table);
    const plotSegmentClass = <PlotSegments.PlotSegmentClass>(
      this.getClassById(plotSegment._id)
    );
    return plotSegmentClass.state.dataRowIndices.map((indices) =>
      table.getGroupedContext(indices)
    );
  }

  public getGroupedExpressionVector(
    tableName: string,
    groupBy: Specification.Types.GroupBy,
    expression: string
  ): ValueType[] {
    const expr = this.dataflow.cache.parse(expression);
    const table = this.dataflow.getTable(tableName);
    if (!table) {
      return [];
    }
    const indices: number[] = [];
    for (let i = 0; i < table.rows.length; i++) {
      indices.push(i);
    }
    if (groupBy && groupBy.expression) {
      const groupExpression = this.dataflow.cache.parse(groupBy.expression);
      const groups = gather(indices, (i) =>
        groupExpression.getStringValue(table.getRowContext(i))
      );
      return groups.map((g) => expr.getValue(table.getGroupedContext(g)));
    } else {
      return indices.map((i) => expr.getValue(table.getGroupedContext([i])));
    }
  }

  public solveConstraints(
    additional: (solver: ChartConstraintSolver) => void = null,
    mappingOnly: boolean = false
  ) {
    if (mappingOnly) {
      const solver = new ChartConstraintSolver("glyphs");
      solver.setup(this);
      solver.destroy();
    } else {
      const iterations = additional != null ? 2 : 1;
      const phases: ("chart" | "glyphs")[] = ["chart", "glyphs"];
      for (let i = 0; i < iterations; i++) {
        for (const phase of phases) {
          const solver = new ChartConstraintSolver(phase);
          solver.setup(this);
          if (additional) {
            additional(solver);
          }
          solver.solve();
          solver.destroy();
        }
        additional = null;
      }
    }
  }
}

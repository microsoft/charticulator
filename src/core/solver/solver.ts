import * as Specification from "../specification";
import * as Prototypes from "../prototypes";
import * as Dataset from "../dataset";
// import * as Optimizers from "../optimizers";
import * as Expression from "../expression";

import { zip, uniqueID, getById, getByName, KeyNameMap } from "../common";
import { WASMSolver as MyConstraintSolver, Matrix } from "./wasm_solver";
import { ConstraintSolver, ConstraintStrength, VariableStrength, Variable } from "./abstract";
import { RowContext } from "../dataset/context";

export class BaseSolver {
    public solver: MyConstraintSolver;

    public chart: Specification.Chart;
    public chartState: Specification.ChartState;
    public manager: Prototypes.ChartStateManager;
    public dataset: Dataset.Dataset;
    public datasetContext: Dataset.DatasetContext;
    public expressionCache: Expression.ExpressionCache;

    // public id2ItemState: Map<string, [any, any]>;

    constructor() {
        this.solver = new MyConstraintSolver();
    }

    public setManager(manager: Prototypes.ChartStateManager) {
        this.chart = manager.chart;
        this.chartState = manager.chartState;
        this.manager = manager;
        this.dataset = manager.dataset;
        this.datasetContext = new Dataset.DatasetContext(this.dataset);
        this.expressionCache = new Expression.ExpressionCache();
        // this.id2ItemState = new Map<string, [any, any]>();

        // for (let [scale, scaleState] of zip(chart.scales, state.scales)) {
        //     this.id2ItemState.set(scale._id, [scale, scaleState]);
        // }
    }

    public setDataset(dataset: Dataset.Dataset) {
        this.dataset = dataset;
        this.datasetContext = new Dataset.DatasetContext(this.dataset);
        this.expressionCache = new Expression.ExpressionCache();
    }

    public solve(): { softLoss: number, hardLoss: number } {
        let loss = this.solver.solve();
        this.solver.applyPlugins();
        return { softLoss: loss[1], hardLoss: loss[0] };
    }

    public destroy() {
        if (this.solver) {
            this.solver.destroy();
        }
    }

    public addMapping(attrs: Specification.AttributeMap, parentAttrs: Specification.AttributeMap, attr: string, info: Prototypes.AttributeDescription, mapping: Specification.Mapping, rowContext: Dataset.RowContext) {
        switch (mapping.type) {
            case "scale": {
                let scaleMapping = mapping as Specification.ScaleMapping;
                if (scaleMapping.scale != null) {
                    // Apply the scale
                    let expr = this.expressionCache.parse(scaleMapping.expression);
                    let dataValue = expr.getValue(rowContext) as Dataset.ValueType;
                    let scaleClass = this.manager.getClassById(scaleMapping.scale) as Prototypes.Scales.ScaleClass;
                    if (!info.solverExclude) {
                        scaleClass.buildConstraint(dataValue, this.solver.attr(attrs, attr), this.solver);
                    }
                    let value = scaleClass.mapDataToAttribute(dataValue);
                    attrs[attr] = value;
                    // this.registry.makeConstant(attrs, attr);
                    // this.hardBuilder.addLinear(value as number, [[-1, this.hardBuilder.attr(attrs, attr)]])
                } else {
                    // No scale, map the column value directly
                    let expr = this.expressionCache.parse(scaleMapping.expression);
                    let dataValue = expr.getValue(rowContext) as Dataset.ValueType;
                    attrs[attr] = dataValue as Specification.AttributeValue;
                    if (!info.solverExclude) {
                        this.solver.makeConstant(attrs, attr);
                    }
                    // this.hardBuilder.addLinear(attrs[attr] as number, [[-1, this.hardBuilder.attr(attrs, attr)]])
                }
            } break;
            case "value": {
                let valueMapping = mapping as Specification.ValueMapping;
                attrs[attr] = valueMapping.value;
                if (!info.solverExclude) {
                    this.solver.makeConstant(attrs, attr);
                }
                // this.registry.makeConstant(attrs, attr);
            } break;
            case "parent": {
                let parentMapping = mapping as Specification.ParentMapping;
                this.solver.addEquals(ConstraintStrength.HARD, this.solver.attr(attrs, attr), this.solver.attr(parentAttrs, parentMapping.parentAttribute));
            } break;
        }
    }

    public addObject(object: Specification.Object, objectState: Specification.ObjectState, parentState: Specification.ObjectState = null, rowContext: Dataset.RowContext = null) {
        let objectClass = this.manager.getClass(objectState);
        for (let attr of objectClass.attributeNames) {
            let info = objectClass.attributes[attr];
            if (!info.solverExclude) {
                if (objectState.attributes[attr] == null) {
                    objectState.attributes[attr] = 0;
                }
                this.addAttribute(objectState.attributes, attr, info, true);
            }
            if (!info.stateExclude) {
                if (object.mappings.hasOwnProperty(attr)) {
                    // If the attribute is mapped, apply the mapping, and do not compute gradient
                    let mapping = object.mappings[attr];
                    this.addMapping(objectState.attributes, parentState != null ? parentState.attributes : null, attr, info, mapping, rowContext);
                } else {
                    if (info.defaultValue !== undefined) {
                        objectState.attributes[attr] = info.defaultValue;
                    }
                }
            }
        }
    }

    public addScales(allowScaleParameterChange: boolean = true) {
        let { chart, chartState } = this;
        for (let [scale, scaleState] of zip(chart.scales, chartState.scales)) {
            this.addObject(scale, scaleState);
        }
    }

    private supportVariables = new KeyNameMap<Object, Specification.AttributeMap>();
    public getSupportVariable(key: Object, name: string, defaultValue: number): Variable {
        if (this.supportVariables.has(key, name)) {
            return this.solver.attr(this.supportVariables.get(key, name), "value");
        } else {
            let attr: Specification.AttributeMap = {};
            attr["value"] = defaultValue;
            this.supportVariables.add(key, name, attr);
            let variable = this.solver.attr(attr, "value", { edit: true, strength: VariableStrength.NONE });
            return variable;
        }
    }

    public addMark(layout: Specification.PlotSegment, mark: Specification.Glyph, rowContext: Dataset.RowContext, markState: Specification.GlyphState, element: Specification.Element, elementState: Specification.MarkState) {
        this.addObject(element, elementState, markState, rowContext);
        let glyphAnalyzed = this.getGlyphAnalyzeResult(mark);
        let elementClass = this.manager.getMarkClass(elementState);
        // for (let attr of elementClass.attributeNames) {
        //     if (!element.mappings.hasOwnProperty(attr)) {
        //         // if (attr == "width" || attr == "height") {
        //         //     if(glyphAnalyzed.isAttributeFree(element, attr)) {
        //         //         let variable = this.getSupportVariable(layout, element._id + "/" + attr, elementState.attributes[attr] as number);
        //         //         this.solver.addEquals(ConstraintStrength.WEAK, variable, this.solver.attr(elementState.attributes, attr));
        //         //     }
        //         // }
        //     }
        // }

        elementClass.buildConstraints(this.solver, {
            rowContext: rowContext,
            getExpressionValue: (expr: string, context: Expression.Context) => {
                return this.manager.dataflow.cache.parse(expr).getNumberValue(context);
            }
        });
    }

    public getAttachedAttributes(mark: Specification.Glyph) {
        let attached = new Set<string>();
        for (let element of mark.marks) {
            if (element.classID == "mark.anchor") continue;
            for (let name in element.mappings) {
                let mapping = element.mappings[name];
                if (mapping.type == "parent") {
                    attached.add((mapping as Specification.ParentMapping).parentAttribute);
                }
            }
        }
        return attached;
    }

    private glyphAnalyzeResults = new WeakMap<Specification.Glyph, GlyphConstraintAnalyzer>();

    public getGlyphAnalyzeResult(glyph: Specification.Glyph) {
        if (this.glyphAnalyzeResults.has(glyph)) {
            return this.glyphAnalyzeResults.get(glyph);
        }
        let analyzer = new GlyphConstraintAnalyzer(glyph);
        analyzer.solve();
        this.glyphAnalyzeResults.set(glyph, analyzer);
        return analyzer;
    }

    public addGlyph(layout: Specification.PlotSegment, rowContext: Dataset.RowContext, glyph: Specification.Glyph, glyphState: Specification.GlyphState) {
        // Mark attributes
        this.addObject(glyph, glyphState, null, rowContext);

        let glyphAnalyzed = this.getGlyphAnalyzeResult(glyph);

        let glyphClass = this.manager.getGlyphClass(glyphState);
        for (let attr of glyphClass.attributeNames) {
            let info = glyphClass.attributes[attr];
            if (info.solverExclude) continue;
            if (glyph.properties.hasOwnProperty(attr)) {
                this.addAttribute(glyphState.attributes, attr, info, true);
            } else {
                this.addAttribute(glyphState.attributes, attr, info, true);
            }

            // If width/height are not constrained, make them constant
            if (attr == "width" && glyphAnalyzed.widthFree) {
                let variable = this.getSupportVariable(layout, glyph._id + "/" + attr, glyphState.attributes[attr] as number);
                this.solver.addEquals(ConstraintStrength.HARD, variable, this.solver.attr(glyphState.attributes, attr));
            }
            if (attr == "height" && glyphAnalyzed.heightFree) {
                let variable = this.getSupportVariable(layout, glyph._id + "/" + attr, glyphState.attributes[attr] as number);
                this.solver.addEquals(ConstraintStrength.HARD, variable, this.solver.attr(glyphState.attributes, attr));
            }
        }
        // Element attributes and intrinsic constraints
        for (let [element, elementState] of zip(glyph.marks, glyphState.marks)) {
            this.addMark(layout, glyph, rowContext, glyphState, element, elementState);
        }
        // Mark-level constraints
        glyphClass.buildIntrinsicConstraints(this.solver);

        for (let constraint of glyph.constraints) {
            let cls = Prototypes.Constraints.ConstraintTypeClass.getClass(constraint.type);
            cls.buildConstraints(constraint, glyph.marks, glyphState.marks, this.solver);
        }
    }

    public addAttribute(attrs: Specification.AttributeMap, attr: string, info: Prototypes.AttributeDescription, gradient: boolean) {
        this.solver.attr(attrs, attr, {
            edit: gradient,
            strength: info.strength
        });
        // this.registry.add(attrs, attr, gradient, info.priority);
    }

    public addChart() {
        let { chart, chartState } = this;
        this.addObject(chart, chartState, null, null);
        let boundsClass = this.manager.getChartClass(chartState);
        boundsClass.buildIntrinsicConstraints(this.solver);

        for (let [element, elementState] of zip(chart.elements, chartState.elements)) {
            this.addObject(element, elementState, chartState);
            let elementClass = this.manager.getChartElementClass(elementState);

            if (Prototypes.isType(element.classID, "plot-segment")) {
                let layout = element as Specification.PlotSegment;
                let layoutState = elementState as Specification.PlotSegmentState;
                let mark = getById(chart.glyphs, layout.glyph);
                let table = getByName(this.dataset.tables, layout.table);
                let tableContext = this.datasetContext.getTableContext(table);


                for (let [dataRowIndex, markState] of zip(layoutState.dataRowIndices, layoutState.glyphs)) {
                    this.addGlyph(layout, tableContext.getRowContext(table.rows[dataRowIndex]), mark, markState);
                }

            }
            elementClass.buildConstraints(this.solver, {
                getExpressionValue: (expr: string, context: Expression.Context) => {
                    return this.manager.dataflow.cache.parse(expr).getNumberValue(context);
                },
                getGlyphAttributes: (glyphID: string, table: string, rowIndex: number) => {
                    let analyzed = this.getGlyphAnalyzeResult(getById(this.chart.glyphs, glyphID));
                    return analyzed.computeAttributes(this.manager.dataflow.getTable(table).getRowContext(rowIndex));
                }
            });
        }

        for (let constraint of chart.constraints) {
            let cls = Prototypes.Constraints.ConstraintTypeClass.getClass(constraint.type);
            cls.buildConstraints(constraint, chart.elements, chartState.elements, this.solver);
        }
    }
}

/** Solves constraints in the scope of a chart */
export class ChartConstraintSolver extends BaseSolver {
    setup(manager: Prototypes.ChartStateManager) {
        this.setManager(manager);
        this.addScales(true);
        this.addChart();
    }
}

/** Solves constraints in the scope of a single glyph */
export class GlyphConstraintSolver extends BaseSolver {
    //     setup(chart: Specification.Chart, state: Specification.ChartState, dataset: Dataset.Dataset, glyph: Specification.Glyph, glyphState: Specification.GlyphState, dataRow: Specification.DataRow) {
    //         this.setChart(chart, state);
    //         this.setDataset(dataset);
    //         let tempLayout = {} as Specification.PlotSegment;
    //         this.addGlyph(tempLayout, dataRow, glyph, glyphState);
    //         this.addScales(false);
    //     }
}

/** Closed-form solution for single marks
 *
 * Closed-form solution is: MarkAttributes = F(DataValues, ScaleAttributes, FreeVariables)
 */
export interface GlyphConstraintAnalyzerAttribute {
    index: number;
    type: "object" | "input";
    id: string;
    attribute: string;
}
export class GlyphConstraintAnalyzer extends ConstraintSolver {
    // Variable registry
    private variableRegistry = new KeyNameMap<Specification.AttributeMap, GlyphConstraintAnalyzerAttribute>();
    private indexToAttribute = new Map<number, GlyphConstraintAnalyzerAttribute>();
    private currentVariableIndex = 0;
    private linears: [number, { weight: number, index?: number, biasIndex?: number }[]][] = [];
    private inputBiases = new Map<string, GlyphConstraintAnalyzerAttribute>();
    private indexToBias = new Map<number, GlyphConstraintAnalyzerAttribute>();
    private inputBiasesCount = 0;

    public glyphState: Specification.GlyphState;

    public addAttribute(attrs: Specification.AttributeMap, attr: string, id: string) {
        let value = this.currentVariableIndex;
        let attrInfo: GlyphConstraintAnalyzerAttribute = {
            index: this.currentVariableIndex,
            type: "object",
            id: id,
            attribute: attr
        }
        this.variableRegistry.add(attrs, attr, attrInfo);
        this.indexToAttribute.set(attrInfo.index, attrInfo);
        this.currentVariableIndex += 1;
        return attrInfo;
    }

    // Allocate or get attribute index
    public attr(attrs: Specification.AttributeMap, attr: string) {
        if (this.variableRegistry.has(attrs, attr)) {
            return this.variableRegistry.get(attrs, attr);
        } else {
            let value = this.currentVariableIndex;
            let attrInfo: GlyphConstraintAnalyzerAttribute = {
                index: this.currentVariableIndex,
                id: uniqueID(),
                type: "object",
                attribute: attr
            };
            console.warn("Adding unnamed attribute", attr);
            this.variableRegistry.add(attrs, attr, attrInfo);
            this.indexToAttribute.set(attrInfo.index, attrInfo);
            this.currentVariableIndex += 1;
            return attrInfo;
        }
    }

    public addLinear(strength: ConstraintStrength, bias: number, lhs: [number, { index: number }][], rhs: [number, { index: number }][] = []) {
        this.linears.push([
            bias,
            lhs.map(([weight, obj]) => { return { weight: weight, index: obj.index }; }).concat(
                rhs.map(([weight, obj]) => { return { weight: -weight, index: obj.index }; })
            )
        ]);
    }

    public addInputAttribute(name: string, attr: { index: number }) {
        if (this.inputBiases.has(name)) {
            let idx = this.inputBiases.get(name).index;
            this.linears.push([0, [{ weight: 1, index: attr.index }, { weight: 1, biasIndex: idx }]]);
        } else {
            let idx = this.inputBiasesCount;
            this.inputBiasesCount++;
            let attrInfo: GlyphConstraintAnalyzerAttribute = {
                index: idx,
                type: "input",
                id: null,
                attribute: name
            };
            this.inputBiases.set(name, attrInfo);
            this.indexToBias.set(attrInfo.index, attrInfo);
            this.linears.push([0, [{ weight: 1, index: attr.index }, { weight: 1, biasIndex: idx }]]);
        }
    }

    private dataInputList = new Map<string, Expression.Expression>();
    public addDataInput(name: string, expression: string) {
        this.dataInputList.set(name, Expression.parse(expression));
    }

    public addMapping(attrs: Specification.AttributeMap, attr: string, mapping: Specification.Mapping, parentAttrs: Specification.AttributeMap) {
        switch (mapping.type) {
            case "scale": {
                let scaleMapping = mapping as Specification.ScaleMapping;
                this.addInputAttribute(`scale/${scaleMapping.scale}/${scaleMapping.expression}`, this.attr(attrs, attr));
                this.addDataInput(`scale/${scaleMapping.scale}/${scaleMapping.expression}`, scaleMapping.expression);
            } break;
            case "value": {
                let valueMapping = mapping as Specification.ValueMapping;
                attrs[attr] = valueMapping.value;
                this.addLinear(ConstraintStrength.HARD, valueMapping.value as number, [[-1, this.attr(attrs, attr)]]);
            } break;
            case "parent": {
                let parentMapping = mapping as Specification.ParentMapping;
                this.addEquals(ConstraintStrength.HARD, this.attr(attrs, attr), this.attr(parentAttrs, parentMapping.parentAttribute));
            } break;
        }
    }

    constructor(glyph: Specification.Glyph) {
        super();

        let glyphState: Specification.GlyphState = {
            attributes: {},
            marks: []
        };
        let glyphClass = Prototypes.ObjectClasses.Create(null, glyph, glyphState) as Prototypes.Glyphs.GlyphClass;
        glyphClass.initializeState();
        for (let mark of glyph.marks) {
            let markState: Specification.MarkState = {
                attributes: {}
            };
            glyphState.marks.push(markState);
            let markClass = Prototypes.ObjectClasses.Create(glyphClass, mark, markState);
            markClass.initializeState();
        }

        for (let attr of glyphClass.attributeNames) {
            let info = glyphClass.attributes[attr];
            if (info.solverExclude) continue;
            this.addAttribute(glyphState.attributes, attr, glyph._id);
            if (glyph.mappings.hasOwnProperty(attr)) {
                this.addMapping(glyphState.attributes, attr, glyph.mappings[attr], null);
            }
        }

        for (let [mark, markState] of zip(glyph.marks, glyphState.marks)) {
            let markClass = Prototypes.ObjectClasses.Create(glyphClass, mark, markState) as Prototypes.Marks.MarkClass;
            for (let attr of markClass.attributeNames) {
                let info = markClass.attributes[attr];
                if (info.solverExclude) continue;
                this.addAttribute(markState.attributes, attr, mark._id);
                if (mark.mappings.hasOwnProperty(attr)) {
                    this.addMapping(markState.attributes, attr, mark.mappings[attr], glyphState.attributes);
                }
            }
            markClass.buildConstraints(this, {
                getExpressionValue: () => 1
            });
        }

        glyphClass.buildIntrinsicConstraints(this);

        this.addInputAttribute("x", this.attr(glyphState.attributes, "x"));
        this.addInputAttribute("y", this.attr(glyphState.attributes, "y"));


        for (let constraint of glyph.constraints) {
            let cls = Prototypes.Constraints.ConstraintTypeClass.getClass(constraint.type);
            cls.buildConstraints(constraint, glyph.marks, glyphState.marks, this);
        }

        this.glyphState = glyphState;
    }

    public setValue() { }
    public getValue() { return 0; }

    public makeConstant(attr: { index: number }) {
        console.warn("(unimplemented) Make Constant: ", attr);
    }

    public destroy() {

    }

    private ker: Float64Array[];
    private X0: Float64Array[];

    public solve(): [number, number] {
        let N = this.currentVariableIndex;
        let linears = this.linears;
        // Formulate the problem as A * X = B
        let A = new Matrix();
        A.init(linears.length, N);
        let B = new Matrix();
        B.init(linears.length, this.inputBiasesCount + 1);

        let A_data = A.data(), A_rowStride = A.rowStride, A_colStride = A.colStride;
        let B_data = B.data(), B_rowStride = B.rowStride, B_colStride = B.colStride;
        for (let i = 0; i < linears.length; i++) {
            B_data[i * B_rowStride] = -linears[i][0];
            for (let item of linears[i][1]) {
                if (item.index != null) {
                    A_data[i * A_rowStride + item.index * A_colStride] = item.weight;
                }
                if (item.biasIndex != null) {
                    B_data[i * B_rowStride + (1 + item.biasIndex) * B_colStride] = item.weight;
                }
            }
        }

        let X = new Matrix();
        let ker = new Matrix();

        Matrix.SolveLinearSystem(X, ker, A, B);

        this.X0 = [];
        this.ker = [];
        let X_data = X.data(), X_colStride = X.colStride, X_rowStride = X.rowStride;
        for (let i = 0; i < X.cols; i++) {
            let a = new Float64Array(N);
            for (let j = 0; j < N; j++) {
                a[j] = X_data[i * X_colStride + j * X_rowStride];
            }
            this.X0.push(a);
        }
        let ker_data = ker.data(), ker_colStride = ker.colStride, ker_rowStride = ker.rowStride;
        for (let i = 0; i < ker.cols; i++) {
            let a = new Float64Array(N);
            for (let j = 0; j < N; j++) {
                a[j] = ker_data[i * ker_colStride + j * ker_rowStride];
            }
            this.ker.push(a);
        }

        X.destroy();
        ker.destroy();
        A.destroy();
        B.destroy();

        return null;
    }

    public isAttributeFree(attr: GlyphConstraintAnalyzerAttribute) {
        let isNonZero = false;
        for (let x of this.ker) {
            if (Math.abs(x[attr.index]) > 1e-8) isNonZero = true;
        }
        return isNonZero;
    }

    public get widthFree() {
        return this.isAttributeFree(this.attr(this.glyphState.attributes, "width"))
    }

    public get heightFree() {
        return this.isAttributeFree(this.attr(this.glyphState.attributes, "height"))
    }

    public computeAttribute(attr: GlyphConstraintAnalyzerAttribute, rowContext: Expression.Context) {
        let result = 0;
        for (let i = 0; i < this.X0.length; i++) {
            let bi = this.X0[i][attr.index];
            if (i == 0) {
                result += bi;
            } else {
                let bias = this.indexToBias.get(i - 1);
                if (bias && this.dataInputList.has(bias.attribute)) {
                    result += bi * this.dataInputList.get(bias.attribute).getNumberValue(rowContext);
                }
            }
        }
        return result;
    }
    public computeAttributes(rowContext: Expression.Context): { [name: string]: number } {
        return {
            width: this.computeAttribute(this.attr(this.glyphState.attributes, "width"), rowContext),
            height: this.computeAttribute(this.attr(this.glyphState.attributes, "height"), rowContext)
        }
    }
}
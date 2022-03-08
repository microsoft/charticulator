// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as Dataset from "../dataset";
import * as Expression from "../expression";
import * as Prototypes from "../prototypes";
import * as Specification from "../specification";

import { getById, ImageKeyColumn, KeyNameMap, uniqueID, zip } from "../common";
import { ConstraintSolver, ConstraintStrength, Variable } from "./abstract";
import { Matrix, WASMSolver } from "./wasm_solver";
import { PlotSegmentClass } from "../prototypes/plot_segments";
import { DataflowTableGroupedContext } from "../prototypes/dataflow";
import { FunctionCall } from "../expression";
import { ChartStateManager } from "../prototypes";
import { MappingType } from "../specification";

/** Solves constraints in the scope of a chart */
export class ChartConstraintSolver {
  public solver: WASMSolver;
  public stage: "chart" | "glyphs";

  public chart: Specification.Chart;
  public chartState: Specification.ChartState;
  public manager: Prototypes.ChartStateManager;
  public dataset: Dataset.Dataset;
  public datasetContext: Dataset.DatasetContext;
  public expressionCache: Expression.ExpressionCache;

  /**
   * Create a ChartConstraintSolver
   * - stage == "chart": disregard glyphs, solve chart-level constraints
   * - stage == "glyphs": fix chart-level attributes, solve only glyphs
   * @param stage determines the scope of the variables to solve
   */
  constructor(stage: "chart" | "glyphs") {
    this.solver = new WASMSolver();
    this.stage = stage;
  }

  public setManager(manager: Prototypes.ChartStateManager) {
    this.chart = manager.chart;
    this.chartState = manager.chartState;
    this.manager = manager;
    this.dataset = manager.dataset;
    this.datasetContext = new Dataset.DatasetContext(this.dataset);
    this.expressionCache = new Expression.ExpressionCache();
  }

  public setDataset(dataset: Dataset.Dataset) {
    this.dataset = dataset;
    this.datasetContext = new Dataset.DatasetContext(this.dataset);
    this.expressionCache = new Expression.ExpressionCache();
  }

  public solve(): { softLoss: number; hardLoss: number } {
    const loss = this.solver.solve();
    this.solver.applyPlugins();
    return { softLoss: loss[1], hardLoss: loss[0] };
  }

  public destroy() {
    if (this.solver) {
      this.solver.destroy();
    }
  }

  // eslint-disable-next-line max-lines-per-function
  public addMapping(
    attrs: Specification.AttributeMap,
    parentAttrs: Specification.AttributeMap,
    attr: string,
    info: Prototypes.AttributeDescription,
    mapping: Specification.Mapping,
    rowContext: Expression.Context,
    rowIndex?: number[]
  ) {
    if (
      rowContext == null &&
      (mapping.type == MappingType.scale || mapping.type == MappingType.text)
    ) {
      const xMapping =
        <Specification.ScaleMapping>mapping ||
        <Specification.TextMapping>mapping;
      rowContext = this.manager.getChartDataContext(xMapping.table);
    }
    switch (mapping.type) {
      case MappingType.scale:
        {
          const scaleMapping = <Specification.ScaleMapping>mapping;
          if (scaleMapping.scale != null) {
            // Apply the scale
            const expr = this.expressionCache.parse(scaleMapping.expression);
            const dataValue = <Dataset.DataValue>expr.getValue(rowContext);
            const scaleClass = <Prototypes.Scales.ScaleClass>(
              this.manager.getClassById(scaleMapping.scale)
            );
            if (!info.solverExclude) {
              scaleClass.buildConstraint(
                dataValue,
                this.solver.attr(attrs, attr),
                this.solver
              );
            }
            const value = scaleClass.mapDataToAttribute(dataValue);
            attrs[attr] = value;
            // this.registry.makeConstant(attrs, attr);
            // this.hardBuilder.addLinear(value as number, [[-1, this.hardBuilder.attr(attrs, attr)]])
          } else {
            // No scale, map the column value directly
            const expr = this.expressionCache.parse(scaleMapping.expression);
            const dataValue = <Dataset.DataValue>expr.getValue(rowContext);
            attrs[attr] = <Specification.AttributeValue>dataValue;
            if (!info.solverExclude) {
              this.solver.makeConstant(attrs, attr);
            }
            // this.hardBuilder.addLinear(attrs[attr] as number, [[-1, this.hardBuilder.attr(attrs, attr)]])
          }
        }
        break;
      case MappingType.expressionScale:
        {
          const dataTable = this.manager.dataset.tables.filter(
            (tb) => tb.type === "Main"
          );
          const dataImageIndex =
            dataTable?.[0]?.rows[rowIndex[0]][ImageKeyColumn];
          const imageTable = this.manager.dataset.tables.filter(
            (tb) => tb.type === "Image"
          );
          const imageDataTableIndex = imageTable?.[0]?.rows.find(
            (row) => row[ImageKeyColumn] == dataImageIndex
          );

          // get table from scale mapping
          const scaleMapping = <Specification.ScaleValueExpressionMapping>(
            mapping
          );
          const tableContext = this.manager.dataflow.getTable(
            scaleMapping.table
          );
          rowContext = tableContext.getGroupedContext(rowIndex);
          // const expr = this.expressionCache.parse(scaleMapping.expression);
          // const dataValue = <Dataset.DataValue>expr.getValue(rowContext);
          const dataValue = <Dataset.DataValue>"";
          const scaleClass = <Prototypes.Scales.ScaleClass>(
            this.manager.getClassById(scaleMapping.scale)
          );
          if (!info.solverExclude) {
            scaleClass.buildConstraint(
              dataValue,
              this.solver.attr(attrs, attr),
              this.solver
            );
          }
          const value = scaleClass.mapDataToAttribute(
            imageDataTableIndex[ImageKeyColumn]
          );
          attrs[attr] = value;
        }
        break;
      case MappingType.text:
        {
          const textMapping = <Specification.TextMapping>mapping;
          const expr = this.expressionCache.parseTextExpression(
            textMapping.textExpression
          );
          if (
            expr.parts.find(
              (part) =>
                part.expression instanceof FunctionCall &&
                part.expression.name === "columnName"
            )
          ) {
            attrs[attr] = expr.getValue(
              (<DataflowTableGroupedContext>rowContext).getTable()
            );
          } else {
            attrs[attr] = expr.getValue(rowContext);
          }
        }
        break;
      case MappingType.value:
        {
          const valueMapping = <Specification.ValueMapping>mapping;
          attrs[attr] = valueMapping.value;
          if (!info.solverExclude) {
            this.solver.makeConstant(attrs, attr);
          }
          // this.registry.makeConstant(attrs, attr);
        }
        break;
      case MappingType.parent:
        {
          const parentMapping = <Specification.ParentMapping>mapping;
          this.solver.addEquals(
            ConstraintStrength.HARD,
            this.solver.attr(attrs, attr),
            this.solver.attr(parentAttrs, parentMapping.parentAttribute)
          );
        }
        break;
    }
  }

  public addObject(
    object: Specification.Object,
    objectState: Specification.ObjectState,
    parentState: Specification.ObjectState,
    rowContext: Expression.Context,
    solve: boolean,
    rowIndex?: number[]
  ) {
    const objectClass = this.manager.getClass(objectState);
    for (const attr of objectClass.attributeNames) {
      const info = objectClass.attributes[attr];
      if (!info.solverExclude) {
        if (objectState.attributes[attr] == null) {
          objectState.attributes[attr] = 0;
        }
        this.addAttribute(
          objectState.attributes,
          attr,
          solve || info.editableInGlyphStage
        );
      }
      if (!info.stateExclude) {
        if (Object.prototype.hasOwnProperty.call(object.mappings, attr)) {
          // If the attribute is mapped, apply the mapping, and do not compute gradient
          const mapping = object.mappings[attr];
          this.addMapping(
            objectState.attributes,
            parentState != null ? parentState.attributes : null,
            attr,
            info,
            mapping,
            rowContext,
            rowIndex
          );
        } else {
          if (info.defaultValue !== undefined) {
            objectState.attributes[attr] = info.defaultValue;
          }
        }
      }
    }
  }

  public addScales(allowScaleParameterChange: boolean = true) {
    const { chart, chartState } = this;
    for (const [scale, scaleState] of zip(chart.scales, chartState.scales)) {
      this.addObject(scale, scaleState, null, null, allowScaleParameterChange, [
        0,
      ]);
    }
  }

  private supportVariables = new KeyNameMap<
    Record<string, unknown>,
    Specification.AttributeMap
  >();
  public getSupportVariable(
    key: Record<string, unknown>,
    name: string,
    defaultValue: number
  ): Variable {
    if (this.supportVariables.has(key, name)) {
      return this.solver.attr(this.supportVariables.get(key, name), "value");
    } else {
      const attr: Specification.AttributeMap = {};
      attr.value = defaultValue;
      this.supportVariables.add(key, name, attr);
      const variable = this.solver.attr(attr, "value", {
        edit: true,
      });
      return variable;
    }
  }

  public addMark(
    layout: Specification.PlotSegment,
    mark: Specification.Glyph,
    rowContext: Expression.Context,
    markState: Specification.GlyphState,
    element: Specification.Element,
    elementState: Specification.MarkState,
    rowIndex: number[]
  ) {
    this.addObject(
      element,
      elementState,
      markState,
      rowContext,
      true,
      rowIndex
    );
    const elementClass = this.manager.getMarkClass(elementState);

    elementClass.buildConstraints(
      this.solver,
      {
        rowContext,
        getExpressionValue: (expr: string, context: Expression.Context) => {
          return this.manager.dataflow.cache
            .parse(expr)
            .getNumberValue(context);
        },
      },
      this.manager
    );
  }

  public getAttachedAttributes(mark: Specification.Glyph) {
    const attached = new Set<string>();
    for (const element of mark.marks) {
      if (element.classID == "mark.anchor") {
        continue;
      }
      for (const name in element.mappings) {
        const mapping = element.mappings[name];
        if (mapping.type == MappingType.parent) {
          attached.add((<Specification.ParentMapping>mapping).parentAttribute);
        }
      }
    }
    return attached;
  }

  private glyphAnalyzeResults = new WeakMap<
    Specification.Glyph,
    GlyphConstraintAnalyzer
  >();

  public getGlyphAnalyzeResult(glyph: Specification.Glyph) {
    if (this.glyphAnalyzeResults.has(glyph)) {
      return this.glyphAnalyzeResults.get(glyph);
    }
    const analyzer = new GlyphConstraintAnalyzer(glyph, this.manager);
    analyzer.solve();
    this.glyphAnalyzeResults.set(glyph, analyzer);
    return analyzer;
  }

  public addGlyph(
    layout: Specification.PlotSegment,
    rowContext: Expression.Context,
    glyph: Specification.Glyph,
    glyphState: Specification.GlyphState,
    rowIndex: number[]
  ) {
    // Mark attributes
    this.addObject(glyph, glyphState, null, rowContext, true, rowIndex);

    const glyphAnalyzed = this.getGlyphAnalyzeResult(glyph);

    const glyphClass = this.manager.getGlyphClass(glyphState);
    for (const attr of glyphClass.attributeNames) {
      // const info = glyphClass.attributes[attr];
      // if (info.solverExclude) {
      //   continue;
      // }
      // this.addAttribute(glyphState.attributes, attr, true);

      // If width/height are not constrained, make them constant
      if (attr == "width" && glyphAnalyzed.widthFree) {
        const variable = this.getSupportVariable(
          <Record<string, unknown>>(<unknown>layout),
          glyph._id + "/" + attr,
          <number>glyphState.attributes[attr]
        );
        this.solver.addEquals(
          ConstraintStrength.HARD,
          variable,
          this.solver.attr(glyphState.attributes, attr)
        );
      }
      if (attr == "height" && glyphAnalyzed.heightFree) {
        const variable = this.getSupportVariable(
          <Record<string, unknown>>(<unknown>layout),
          glyph._id + "/" + attr,
          <number>glyphState.attributes[attr]
        );
        this.solver.addEquals(
          ConstraintStrength.HARD,
          variable,
          this.solver.attr(glyphState.attributes, attr)
        );
      }
    }
    // Element attributes and intrinsic constraints
    for (const [element, elementState] of zip(glyph.marks, glyphState.marks)) {
      this.addMark(
        layout,
        glyph,
        rowContext,
        glyphState,
        element,
        elementState,
        rowIndex
      );
    }
    // Mark-level constraints
    glyphClass.buildIntrinsicConstraints(this.solver);

    for (const constraint of glyph.constraints) {
      const cls = Prototypes.Constraints.ConstraintTypeClass.getClass(
        constraint.type
      );
      cls.buildConstraints(
        constraint,
        glyph.marks,
        glyphState.marks,
        this.solver
      );
    }
  }

  public addAttribute(
    attrs: Specification.AttributeMap,
    attr: string,
    edit: boolean
  ) {
    this.solver.attr(attrs, attr, { edit });
  }

  public addChart() {
    const { chart, chartState } = this;
    this.addObject(chart, chartState, null, null, this.stage == "chart", [0]);
    const boundsClass = this.manager.getChartClass(chartState);
    boundsClass.buildIntrinsicConstraints(this.solver);

    for (const [element, elementState] of zip(
      chart.elements,
      chartState.elements
    )) {
      this.addObject(
        element,
        elementState,
        chartState,
        null,
        this.stage == "chart",
        [0]
      );
      const elementClass = this.manager.getChartElementClass(elementState);

      elementClass.buildConstraints(
        this.solver,
        {
          getExpressionValue: (expr: string, context: Expression.Context) => {
            return this.manager.dataflow.cache
              .parse(expr)
              .getNumberValue(context);
          },
          getGlyphAttributes: (
            glyphID: string,
            table: string,
            rowIndex: number[]
          ) => {
            const analyzed = this.getGlyphAnalyzeResult(
              getById(this.chart.glyphs, glyphID)
            );
            return analyzed.computeAttributes(
              this.manager.dataflow.getTable(table).getGroupedContext(rowIndex)
            );
          },
        },
        this.manager
      );

      if (this.stage == "glyphs") {
        if (Prototypes.isType(element.classID, "plot-segment")) {
          const layout = <Specification.PlotSegment>element;
          const layoutState = <Specification.PlotSegmentState>elementState;
          const mark = getById(chart.glyphs, layout.glyph);
          const tableContext = this.manager.dataflow.getTable(layout.table);

          for (const [dataRowIndex, markState] of zip(
            layoutState.dataRowIndices,
            layoutState.glyphs
          )) {
            this.addGlyph(
              layout,
              tableContext.getGroupedContext(dataRowIndex),
              mark,
              markState,
              dataRowIndex
            );
          }
          (<PlotSegmentClass>elementClass).buildGlyphConstraints(this.solver, {
            getExpressionValue: (expr: string, context: Expression.Context) => {
              return this.manager.dataflow.cache
                .parse(expr)
                .getNumberValue(context);
            },
            getGlyphAttributes: (
              glyphID: string,
              table: string,
              rowIndex: number[]
            ) => {
              const analyzed = this.getGlyphAnalyzeResult(
                getById(this.chart.glyphs, glyphID)
              );
              return analyzed.computeAttributes(
                this.manager.dataflow
                  .getTable(table)
                  .getGroupedContext(rowIndex)
              );
            },
          });
        }
      }
    }

    for (const constraint of chart.constraints) {
      const cls = Prototypes.Constraints.ConstraintTypeClass.getClass(
        constraint.type
      );
      cls.buildConstraints(
        constraint,
        chart.elements,
        chartState.elements,
        this.solver
      );
    }
  }

  public setup(manager: Prototypes.ChartStateManager) {
    this.setManager(manager);
    this.addScales(true);
    this.addChart();
  }
}

/**
 * Closed-form solution for single marks
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
  private variableRegistry = new KeyNameMap<
    Specification.AttributeMap,
    GlyphConstraintAnalyzerAttribute
  >();
  private indexToAttribute = new Map<
    number,
    GlyphConstraintAnalyzerAttribute
  >();
  private currentVariableIndex = 0;
  private linears: [
    number,
    { weight: number; index?: number; biasIndex?: number }[]
  ][] = [];
  private inputBiases = new Map<string, GlyphConstraintAnalyzerAttribute>();
  private indexToBias = new Map<number, GlyphConstraintAnalyzerAttribute>();
  private inputBiasesCount = 0;

  public glyphState: Specification.GlyphState;

  public manager: ChartStateManager;

  public addAttribute(
    attrs: Specification.AttributeMap,
    attr: string,
    id: string
  ) {
    const attrInfo: GlyphConstraintAnalyzerAttribute = {
      index: this.currentVariableIndex,
      type: "object",
      id,
      attribute: attr,
    };
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
      const attrInfo: GlyphConstraintAnalyzerAttribute = {
        index: this.currentVariableIndex,
        id: uniqueID(),
        type: "object",
        attribute: attr,
      };
      console.warn("Adding unnamed attribute", attr);
      this.variableRegistry.add(attrs, attr, attrInfo);
      this.indexToAttribute.set(attrInfo.index, attrInfo);
      this.currentVariableIndex += 1;
      return attrInfo;
    }
  }

  public addLinear(
    strength: ConstraintStrength,
    bias: number,
    lhs: [number, { index: number }][],
    rhs: [number, { index: number }][] = []
  ) {
    this.linears.push([
      bias,
      lhs
        .map(([weight, obj]) => ({ weight, index: obj.index }))
        .concat(
          rhs.map(([weight, obj]) => ({ weight: -weight, index: obj.index }))
        ),
    ]);
  }

  public addSoftInequality(
    strength: ConstraintStrength,
    bias: number,
    lhs: [number, { index: number }][],
    rhs: [number, { index: number }][] = []
  ) {
    this.linears.push([
      bias,
      lhs
        .map(([weight, obj]) => ({ weight, index: obj.index }))
        .concat(
          rhs.map(([weight, obj]) => ({ weight: -weight, index: obj.index }))
        ),
    ]);
  }

  public addInputAttribute(name: string, attr: { index: number }) {
    if (this.inputBiases.has(name)) {
      const idx = this.inputBiases.get(name).index;
      this.linears.push([
        0,
        [
          { weight: 1, index: attr.index },
          { weight: 1, biasIndex: idx },
        ],
      ]);
    } else {
      const idx = this.inputBiasesCount;
      this.inputBiasesCount++;
      const attrInfo: GlyphConstraintAnalyzerAttribute = {
        index: idx,
        type: "input",
        id: null,
        attribute: name,
      };
      this.inputBiases.set(name, attrInfo);
      this.indexToBias.set(attrInfo.index, attrInfo);
      this.linears.push([
        0,
        [
          { weight: 1, index: attr.index },
          { weight: 1, biasIndex: idx },
        ],
      ]);
    }
  }

  private dataInputList = new Map<string, Expression.Expression>();
  public addDataInput(name: string, expression: string) {
    this.dataInputList.set(name, Expression.parse(expression));
  }

  public addMapping(
    attrs: Specification.AttributeMap,
    attr: string,
    mapping: Specification.Mapping,
    parentAttrs: Specification.AttributeMap
  ) {
    switch (mapping.type) {
      case MappingType.scale:
        {
          const scaleMapping = <Specification.ScaleMapping>mapping;
          this.addInputAttribute(
            `scale/${scaleMapping.scale}/${scaleMapping.expression}`,
            this.attr(attrs, attr)
          );
          this.addDataInput(
            `scale/${scaleMapping.scale}/${scaleMapping.expression}`,
            scaleMapping.expression
          );
        }
        break;
      case MappingType.value:
        {
          const valueMapping = <Specification.ValueMapping>mapping;
          attrs[attr] = valueMapping.value;
          this.addLinear(ConstraintStrength.HARD, <number>valueMapping.value, [
            [-1, this.attr(attrs, attr)],
          ]);
        }
        break;
      case MappingType.parent:
        {
          const parentMapping = <Specification.ParentMapping>mapping;
          this.addEquals(
            ConstraintStrength.HARD,
            this.attr(attrs, attr),
            this.attr(parentAttrs, parentMapping.parentAttribute)
          );
        }
        break;
    }
  }

  constructor(glyph: Specification.Glyph, manager: ChartStateManager) {
    super();
    this.manager = manager;

    const glyphState: Specification.GlyphState = {
      attributes: {},
      marks: [],
    };
    const glyphClass = <Prototypes.Glyphs.GlyphClass>(
      Prototypes.ObjectClasses.Create(null, glyph, glyphState)
    );
    glyphClass.initializeState();
    for (const mark of glyph.marks) {
      const markState: Specification.MarkState = {
        attributes: {},
      };
      glyphState.marks.push(markState);
      const markClass = Prototypes.ObjectClasses.Create(
        glyphClass,
        mark,
        markState
      );
      markClass.initializeState();
    }

    for (const attr of glyphClass.attributeNames) {
      const info = glyphClass.attributes[attr];
      if (info.solverExclude) {
        continue;
      }
      this.addAttribute(glyphState.attributes, attr, glyph._id);
      if (Object.prototype.hasOwnProperty.call(glyph.mappings, attr)) {
        this.addMapping(
          glyphState.attributes,
          attr,
          glyph.mappings[attr],
          null
        );
      }
    }

    for (const [mark, markState] of zip(glyph.marks, glyphState.marks)) {
      const markClass = <Prototypes.Marks.MarkClass>(
        Prototypes.ObjectClasses.Create(glyphClass, mark, markState)
      );
      for (const attr of markClass.attributeNames) {
        const info = markClass.attributes[attr];
        if (info.solverExclude) {
          continue;
        }
        this.addAttribute(markState.attributes, attr, mark._id);
        if (Object.prototype.hasOwnProperty.call(mark.mappings, attr)) {
          this.addMapping(
            markState.attributes,
            attr,
            mark.mappings[attr],
            glyphState.attributes
          );
        }
      }
      markClass.buildConstraints(
        this,
        {
          getExpressionValue: () => 1,
        },
        this.manager
      );
    }

    glyphClass.buildIntrinsicConstraints(this);

    this.addInputAttribute("x", this.attr(glyphState.attributes, "x"));
    this.addInputAttribute("y", this.attr(glyphState.attributes, "y"));

    for (const constraint of glyph.constraints) {
      const cls = Prototypes.Constraints.ConstraintTypeClass.getClass(
        constraint.type
      );
      cls.buildConstraints(constraint, glyph.marks, glyphState.marks, this);
    }

    this.glyphState = glyphState;
  }

  // eslint-disable-next-line
  public setValue() {}
  public getValue() {
    return 0;
  }

  public makeConstant(attr: { index: number }) {
    console.warn("(unimplemented) Make Constant: ", attr);
  }

  // eslint-disable-next-line
  public destroy() {}

  private ker: Float64Array[];
  private X0: Float64Array[];

  public solve(): [number, number] {
    const N = this.currentVariableIndex;
    const linears = this.linears;
    // Formulate the problem as A * X = B
    const A = new Matrix();
    A.init(linears.length, N);
    const B = new Matrix();
    B.init(linears.length, this.inputBiasesCount + 1);

    const A_data = A.data(),
      A_rowStride = A.rowStride,
      A_colStride = A.colStride;
    const B_data = B.data(),
      B_rowStride = B.rowStride,
      B_colStride = B.colStride;
    for (let i = 0; i < linears.length; i++) {
      B_data[i * B_rowStride] = -linears[i][0];
      for (const item of linears[i][1]) {
        if (item.index != null) {
          A_data[i * A_rowStride + item.index * A_colStride] = item.weight;
        }
        if (item.biasIndex != null) {
          B_data[i * B_rowStride + (1 + item.biasIndex) * B_colStride] =
            item.weight;
        }
      }
    }

    const X = new Matrix();
    const ker = new Matrix();

    Matrix.SolveLinearSystem(X, ker, A, B);

    this.X0 = [];
    this.ker = [];
    const X_data = X.data(),
      X_colStride = X.colStride,
      X_rowStride = X.rowStride;
    for (let i = 0; i < X.cols; i++) {
      const a = new Float64Array(N);
      for (let j = 0; j < N; j++) {
        a[j] = X_data[i * X_colStride + j * X_rowStride];
      }
      this.X0.push(a);
    }
    const ker_data = ker.data(),
      ker_colStride = ker.colStride,
      ker_rowStride = ker.rowStride;
    for (let i = 0; i < ker.cols; i++) {
      const a = new Float64Array(N);
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
    for (const x of this.ker) {
      if (Math.abs(x[attr.index]) > 1e-8) {
        isNonZero = true;
      }
    }
    return isNonZero;
  }

  public get widthFree() {
    return this.isAttributeFree(this.attr(this.glyphState.attributes, "width"));
  }

  public get heightFree() {
    return this.isAttributeFree(
      this.attr(this.glyphState.attributes, "height")
    );
  }

  public computeAttribute(
    attr: GlyphConstraintAnalyzerAttribute,
    rowContext: Expression.Context
  ) {
    let result = 0;
    for (let i = 0; i < this.X0.length; i++) {
      const bi = this.X0[i][attr.index];
      if (i == 0) {
        result += bi;
      } else {
        const bias = this.indexToBias.get(i - 1);
        if (bias && this.dataInputList.has(bias.attribute)) {
          result +=
            bi *
            this.dataInputList.get(bias.attribute).getNumberValue(rowContext);
        }
      }
    }
    return result;
  }
  public computeAttributes(
    rowContext: Expression.Context
  ): { [name: string]: number } {
    return {
      width: this.computeAttribute(
        this.attr(this.glyphState.attributes, "width"),
        rowContext
      ),
      height: this.computeAttribute(
        this.attr(this.glyphState.attributes, "height"),
        rowContext
      ),
    };
  }
}

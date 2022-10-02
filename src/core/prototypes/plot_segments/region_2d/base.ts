/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Expression from "../../../expression";
import {
  ConstraintPlugins,
  ConstraintSolver,
  ConstraintStrength,
  Variable,
} from "../../../solver";
import * as Specification from "../../../specification";
import { AxisDataBindingType } from "../../../specification/types";
import { BuildConstraintsContext, Controls } from "../../common";
import { LabelPosition } from "../../controls";
import { DataflowTable } from "../../dataflow";
import {
  AxisMode,
  buildAxisWidgets,
  getCategoricalAxis,
  getNumericalInterpolate,
} from "../axis";
import { PlotSegmentClass } from "../plot_segment";

import { strings } from "./../../../../strings";
import { ChartStateManager } from "../../state";

export enum Region2DSublayoutType {
  Overlap = "overlap",
  DodgeX = "dodge-x",
  DodgeY = "dodge-y",
  Grid = "grid",
  Packing = "packing",
  Jitter = "jitter",
}

export enum SublayoutAlignment {
  Start = "start",
  Middle = "middle",
  End = "end",
}

export enum GridDirection {
  X = "x",
  Y = "y",
}

export enum GridStartPosition {
  LeftTop = "LT",
  RightTop = "RT",
  LeftBottom = "LB",
  RightBottom = "RB",
}

export interface Region2DSublayoutOptions extends Specification.AttributeMap {
  type: Region2DSublayoutType;

  /** Sublayout alignment (for dodge and grid) */
  align: {
    x: SublayoutAlignment;
    y: SublayoutAlignment;
  };

  ratioX: number;
  ratioY: number;

  /** Grid options */
  grid?: {
    /** Grid direction */
    direction: GridDirection;
    /** Number of glyphs in X direction (direction == "x") */
    xCount?: number;
    /** Number of glyphs in Y direction (direction == "x") */
    yCount?: number;
    /** Position of the first glyph in grid */
    gridStartPosition: GridStartPosition;
  };

  /** Order in sublayout objects */
  order: Specification.Types.SortBy;
  orderReversed: boolean;
  /** packing options */
  packing: {
    gravityX: number;
    gravityY: number;
    boxedX: boolean;
    boxedY: boolean;
  };
  jitter: {
    vertical: boolean;
    horizontal: boolean;
  };
}

export interface Region2DAttributes extends Specification.AttributeMap {
  /** Horizontal/vertical line guide line position */
  x?: number;
  y?: number;
  gapX?: number;
  gapY?: number;
}

export interface Region2DHandleDescription {
  type: "gap";
  gap?: {
    property: Controls.Property;
    axis: AxisMode;
    reference: number;
    value: number;
    span: [number, number];
    scale: number;
  };
}

export enum PlotSegmentAxisPropertyNames {
  xData = "xData",
  yData = "yData",
  axis = "axis",
}

export interface Region2DProperties extends Specification.AttributeMap {
  /** X axis data binding, set to null to remove the axis, set to { type: "none" } to keep the axis but don't bind data */
  xData?: Specification.Types.AxisDataBinding;
  /** Y axis data binding, set to null to remove the axis, set to { type: "none" } to keep the axis but don't bind data */
  yData?: Specification.Types.AxisDataBinding;
  sublayout: Region2DSublayoutOptions;

  marginX1?: number;
  marginX2?: number;
  marginY1?: number;
  marginY2?: number;
}

export interface Region2DConfigurationTerminology {
  xAxis: string;
  yAxis: string;
  /** Items alignments */
  xMin: string;
  xMiddle: string;
  xMax: string;
  yMin: string;
  yMiddle: string;
  yMax: string;
  /** Stack X */
  dodgeX: string;
  /** Stack Y */
  dodgeY: string;
  /** Grid */
  grid: string;
  gridDirectionX: string;
  gridDirectionY: string;
  /** Packing force layout */
  packing: string;
  overlap: string;
  jitter: string;
}

export interface Region2DConfigurationIcons {
  xMinIcon: string;
  xMiddleIcon: string;
  xMaxIcon: string;
  yMinIcon: string;
  yMiddleIcon: string;
  yMaxIcon: string;
  dodgeXIcon: string;
  dodgeYIcon: string;
  gridIcon: string;
  packingIcon: string;
  jitterIcon: string;
  overlapIcon: string;
}

export interface Region2DConfiguration {
  terminology: Region2DConfigurationTerminology;
  icons: Region2DConfigurationIcons;
  xAxisPrePostGap: boolean;
  yAxisPrePostGap: boolean;

  getXYScale?(): { x: number; y: number };
}

export class CrossFitter {
  private solver: ConstraintSolver;
  private mode: "min" | "max";
  private candidates: [Variable, [number, Variable][], number][];

  constructor(solver: ConstraintSolver, mode: "min" | "max") {
    this.solver = solver;
    this.mode = mode;
    this.candidates = [];
  }

  public add(src: Variable, dst: Variable) {
    return this.addComplex(src, [[1, dst]]);
  }

  public addComplex(
    src: Variable,
    dst: [number, Variable][],
    dstBias: number = 0
  ) {
    this.candidates.push([src, dst, dstBias]);
  }

  public addConstraint(w: ConstraintStrength) {
    if (this.candidates.length == 0) {
      return;
    }
    for (const candidate of this.candidates) {
      if (this.mode == "min") {
        this.solver.addSoftInequality(
          w,
          -candidate[2],
          [[1, candidate[0]]],
          candidate[1]
        );
      } else {
        this.solver.addSoftInequality(w, candidate[2], candidate[1], [
          [1, candidate[0]],
        ]);
      }
    }
  }
}

export class DodgingFitters {
  public xMin: CrossFitter;
  public xMax: CrossFitter;
  public yMin: CrossFitter;
  public yMax: CrossFitter;

  constructor(solver: ConstraintSolver) {
    this.xMin = new CrossFitter(solver, "min");
    this.yMin = new CrossFitter(solver, "min");
    this.xMax = new CrossFitter(solver, "max");
    this.yMax = new CrossFitter(solver, "max");
  }

  public addConstraint(w: ConstraintStrength) {
    this.xMin.addConstraint(w);
    this.xMax.addConstraint(w);
    this.yMin.addConstraint(w);
    this.yMax.addConstraint(w);
  }
}

/**
 * Describes variables for constraints group. Count of group matches with data count
 */
export class SublayoutGroup {
  public group: number[];
  public x1: Variable;
  public y1: Variable;
  public x2: Variable;
  public y2: Variable;
}

export interface SublayoutContext {
  mode: "default" | "x-only" | "y-only" | "disabled";
  xAxisPrePostGap?: boolean;
  yAxisPrePostGap?: boolean;
}

/**
 * Class builds constrains for plot segments
 * The builder creates constraints depends on sublayout
 */
export class Region2DConstraintBuilder {
  constructor(
    public plotSegment: PlotSegmentClass<
      Region2DProperties,
      Region2DAttributes
    >,
    public config: Region2DConfiguration,
    public x1Name: string,
    public x2Name: string,
    public y1Name: string,
    public y2Name: string,
    public solver?: ConstraintSolver,
    public solverContext?: BuildConstraintsContext,
    public chartStateManager?: ChartStateManager
  ) {}

  public static defaultJitterPackingRadius = 5;

  public getTableContext(): DataflowTable {
    return this.plotSegment.parent.dataflow.getTable(
      this.plotSegment.object.table
    );
  }

  public getExpression(expr: string): Expression.Expression {
    return this.plotSegment.parent.dataflow.cache.parse(expr);
  }

  public groupMarksByCategories(
    categories: { expression: string; categories: string[] }[]
  ): number[][] {
    // Prepare categories
    const categoriesParsed = categories.map((c) => {
      const imap = new Map<string, number>();
      for (let i = 0; i < c.categories.length; i++) {
        imap.set(c.categories[i], i);
      }
      return {
        categories: c.categories,
        indexMap: imap,
        stride: 0,
        expression: this.getExpression(c.expression),
      };
    });
    let k = 1;
    for (let i = categoriesParsed.length - 1; i >= 0; i--) {
      const c = categoriesParsed[i];
      c.stride = k;
      k *= c.categories.length;
    }
    const totalLength = k;

    // Gather result
    const result = new Array<number[]>(totalLength);
    for (let i = 0; i < totalLength; i++) {
      result[i] = [];
    }

    const dateRowIndices = this.plotSegment.state.dataRowIndices;
    const table = this.getTableContext();
    // Gather places
    for (let i = 0; i < dateRowIndices.length; i++) {
      const row = table.getGroupedContext(dateRowIndices[i]);
      let place = 0;
      for (const c of categoriesParsed) {
        const value = c.expression.getStringValue(row);
        place += c.indexMap.get(value) * c.stride;
      }
      // Make sure the place is valid
      if (place == place) {
        result[place].push(i);
      }
    }

    return result;
  }

  public orderMarkGroups(groups: SublayoutGroup[]) {
    const order = this.plotSegment.object.properties.sublayout.order;
    const dateRowIndices = this.plotSegment.state.dataRowIndices;
    const table = this.getTableContext();
    // debugger
    // Sort results
    if (order != null && order.expression) {
      const orderExpression = this.getExpression(order.expression);
      const compare = (i: number, j: number) => {
        const vi = orderExpression.getValue(
          table.getGroupedContext(dateRowIndices[i])
        );
        const vj = orderExpression.getValue(
          table.getGroupedContext(dateRowIndices[j])
        );
        if (vi < vj) {
          return -1;
        } else if (vi > vj) {
          return 1;
        } else {
          return 0;
        }
      };
      for (let i = 0; i < groups.length; i++) {
        groups[i].group.sort(compare);
      }
    }
    if (this.plotSegment.object.properties.sublayout.orderReversed) {
      for (let i = 0; i < groups.length; i++) {
        groups[i].group.reverse();
      }
    }
    return groups;
  }

  /** Make sure gapX correctly correspond to gapXRatio */
  public gapX(length: number, ratio: number) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const attrs = state.attributes;

    const [gapX, x1, x2] = solver.attrs(attrs, [
      "gapX",
      this.x1Name,
      this.x2Name,
    ]);

    solver.addLinear(
      ConstraintStrength.HARD,
      ratio * (props.marginX2 + props.marginX2),
      [[length - 1, gapX]],
      [
        [ratio, x2],
        [-ratio, x1],
      ]
    );
  }

  /** Make sure gapY correctly correspond to gapYRatio */
  public gapY(length: number, ratio: number) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const attrs = state.attributes;

    const [gapY, y1, y2] = solver.attrs(attrs, [
      "gapY",
      this.y1Name,
      this.y2Name,
    ]);
    solver.addLinear(
      ConstraintStrength.HARD,
      ratio * (props.marginX2 + props.marginX2),
      [[length - 1, gapY]],
      [
        [ratio, y2],
        [-ratio, y1],
      ]
    );
  }

  /**
   * Map elements according to numerical/categorical mapping
   */
  public numericalMapping(axis: AxisMode): void {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const attrs = state.attributes;
    const dataIndices = state.dataRowIndices;

    const table = this.getTableContext();

    switch (axis) {
      case "x":
        {
          this.numericalMappingX(
            props,
            solver,
            attrs,
            state,
            table,
            dataIndices
          );
          // solver.addEquals(ConstraintWeight.HARD, x, x1);
        }
        break;
      case "y": {
        this.numericalMappingY(props, solver, attrs, state, table, dataIndices);
        // solver.addEquals(ConstraintWeight.HARD, y, y2);
      }
    }
  }

  private numericalMappingY(
    props: Region2DProperties,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    state: Specification.PlotSegmentState<Region2DAttributes>,
    table: DataflowTable,
    dataIndices: number[][]
  ) {
    const data = props.yData;
    if (data.type == "numerical") {
      const [y1, y2] = solver.attrs(attrs, [this.y1Name, this.y2Name]);
      const expr = this.getExpression(data.expression);
      const interp = getNumericalInterpolate(data);
      for (const [index, markState] of state.glyphs.entries()) {
        const rowContext = table.getGroupedContext(dataIndices[index]);
        const value = expr.getNumberValue(rowContext);
        const t = interp(value);
        solver.addLinear(
          ConstraintStrength.HARD,
          (t - 1) * props.marginY2 + t * props.marginY1,
          [
            [1 - t, y1],
            [t, y2],
          ],
          [[1, solver.attr(markState.attributes, "y")]]
        );
      }
    }
    if (data.type == "categorical") {
      const [y1, y2, gapY] = solver.attrs(attrs, [
        this.y1Name,
        this.y2Name,
        "gapY",
      ]);
      const expr = this.getExpression(data.expression);
      for (const [index, markState] of state.glyphs.entries()) {
        const rowContext = table.getGroupedContext(dataIndices[index]);
        const value = expr.getStringValue(rowContext);

        this.gapY(data.categories.length, data.gapRatio);

        const i = data.categories.indexOf(value);
        solver.addLinear(
          ConstraintStrength.HARD,
          (data.categories.length - i - 0.5) * props.marginY1 -
            (i + 0.5) * props.marginY2,
          [
            [i + 0.5, y2],
            [data.categories.length - i - 0.5, y1],
            [-data.categories.length / 2 + i + 0.5, gapY],
          ],
          [[data.categories.length, solver.attr(markState.attributes, "y")]]
        );
      }
    }
  }

  private numericalMappingX(
    props: Region2DProperties,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    state: Specification.PlotSegmentState<Region2DAttributes>,
    table: DataflowTable,
    dataIndices: number[][]
  ) {
    const data = props.xData;
    if (data.type == "numerical") {
      const [x1, x2] = solver.attrs(attrs, [this.x1Name, this.x2Name]);
      const expr = this.getExpression(data.expression);
      const interp = getNumericalInterpolate(data);
      for (const [index, markState] of state.glyphs.entries()) {
        const rowContext = table.getGroupedContext(dataIndices[index]);
        const value = expr.getNumberValue(rowContext);
        const t = interp(value);
        solver.addLinear(
          ConstraintStrength.HARD,
          (1 - t) * props.marginX1 - t * props.marginX2,
          [
            [1 - t, x1],
            [t, x2],
          ],
          [[1, solver.attr(markState.attributes, "x")]]
        );
      }
    }
    if (data.type == "categorical") {
      const [x1, x2, gapX] = solver.attrs(attrs, [
        this.x1Name,
        this.x2Name,
        "gapX",
      ]);
      const expr = this.getExpression(data.expression);
      for (const [index, markState] of state.glyphs.entries()) {
        const rowContext = table.getGroupedContext(dataIndices[index]);
        const value = expr.getStringValue(rowContext);

        this.gapX(data.categories.length, data.gapRatio);

        const i = data.categories.indexOf(value);
        solver.addLinear(
          ConstraintStrength.HARD,
          (data.categories.length - i - 0.5) * props.marginX1 -
            (i + 0.5) * props.marginX2,
          [
            [i + 0.5, x2],
            [data.categories.length - i - 0.5, x1],
            [-data.categories.length / 2 + i + 0.5, gapX],
          ],
          [[data.categories.length, solver.attr(markState.attributes, "x")]]
        );
      }
    }
  }

  public groupMarksByCategoricalMapping(axis: "x" | "y" | "xy") {
    const props = this.plotSegment.object.properties;
    switch (axis) {
      case "x": {
        const data = props.xData;
        return this.groupMarksByCategories([
          { categories: data.categories, expression: data.expression },
        ]);
      }
      case "y": {
        const data = props.yData;
        return this.groupMarksByCategories([
          { categories: data.categories, expression: data.expression },
        ]);
      }
      case "xy": {
        const xData = props.xData;
        const yData = props.yData;
        return this.groupMarksByCategories([
          { categories: xData.categories, expression: xData.expression },
          { categories: yData.categories, expression: yData.expression },
        ]);
      }
    }
  }

  public categoricalMapping(
    axis: "x" | "y" | "xy",
    sublayoutContext: SublayoutContext
  ): void {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const attrs = state.attributes;
    const props = this.plotSegment.object.properties;

    const categoryMarks = this.groupMarksByCategoricalMapping(axis);

    switch (axis) {
      case "x":
        {
          // take x axis data to determine count of groups
          this.categoricalMappingX(
            props,
            solver,
            attrs,
            categoryMarks,
            sublayoutContext
          );
        }
        break;
      case "y":
        {
          this.categoricalMappingY(
            props,
            solver,
            attrs,
            categoryMarks,
            sublayoutContext
          );
        }
        break;
      case "xy":
        {
          this.categoricalMappingXY(
            props,
            solver,
            attrs,
            categoryMarks,
            sublayoutContext
          );
        }
        break;
    }
  }

  private categoricalMappingXY(
    props: Region2DProperties,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    categoryMarks: number[][],
    sublayoutContext: SublayoutContext
  ) {
    const xData = props.xData;
    const yData = props.yData;
    const [x1, x2, y1, y2] = solver.attrs(attrs, [
      this.x1Name,
      this.x2Name,
      this.y1Name,
      this.y2Name,
    ]);

    const xAxis = getCategoricalAxis(xData, this.config.xAxisPrePostGap, false);
    const yAxis = getCategoricalAxis(yData, this.config.yAxisPrePostGap, true);

    const sublayoutGroups: SublayoutGroup[] = [];
    for (let yIndex = 0; yIndex < yData.categories.length; yIndex++) {
      const [ty1, ty2] = yAxis.ranges[yIndex];
      for (let xIndex = 0; xIndex < xData.categories.length; xIndex++) {
        const [tx1, tx2] = xAxis.ranges[xIndex];

        const vx1Expr = <[number, Variable][]>[
          [tx1, x2],
          [1 - tx1, x1],
        ];
        const vx2Expr = <[number, Variable][]>[
          [tx2, x2],
          [1 - tx2, x1],
        ];

        const vy1Expr = <[number, Variable][]>[
          [ty1, y2],
          [1 - ty1, y1],
        ];
        const vy2Expr = <[number, Variable][]>[
          [ty2, y2],
          [1 - ty2, y1],
        ];

        const vx1 = solver.attr(
          { value: solver.getLinear(...vx1Expr) },
          "value",
          { edit: true }
        );
        const vx2 = solver.attr(
          { value: solver.getLinear(...vx2Expr) },
          "value",
          { edit: true }
        );
        const vy1 = solver.attr(
          { value: solver.getLinear(...vy1Expr) },
          "value",
          { edit: true }
        );
        const vy2 = solver.attr(
          { value: solver.getLinear(...vy2Expr) },
          "value",
          { edit: true }
        );

        solver.addLinear(ConstraintStrength.HARD, 0, vx1Expr, [[1, vx1]]);
        solver.addLinear(ConstraintStrength.HARD, 0, vx2Expr, [[1, vx2]]);
        solver.addLinear(ConstraintStrength.HARD, 0, vy1Expr, [[1, vy1]]);
        solver.addLinear(ConstraintStrength.HARD, 0, vy2Expr, [[1, vy2]]);

        sublayoutGroups.push({
          group: categoryMarks[xIndex * yData.categories.length + yIndex],
          x1: vx1,
          y1: vy1,
          x2: vx2,
          y2: vy2,
        });
      }
    }
    this.applySublayout(sublayoutGroups, "xy", sublayoutContext);
  }

  private categoricalMappingY(
    props: Region2DProperties,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    categoryMarks: number[][],
    sublayoutContext: SublayoutContext
  ) {
    const data = props.yData;
    const [x1, x2, y1, y2] = solver.attrs(attrs, [
      this.x1Name,
      this.x2Name,
      this.y1Name,
      this.y2Name,
    ]);

    const axis = getCategoricalAxis(data, this.config.yAxisPrePostGap, true);

    const sublayoutGroups: SublayoutGroup[] = [];
    for (let cindex = 0; cindex < data.categories.length; cindex++) {
      const [t1, t2] = axis.ranges[cindex];

      const vy1Expr = <[number, Variable][]>[
        [t1, y2],
        [1 - t1, y1],
      ];
      const vy2Expr = <[number, Variable][]>[
        [t2, y2],
        [1 - t2, y1],
      ];

      const vy1 = solver.attr(
        { value: solver.getLinear(...vy1Expr) },
        "value",
        { edit: true }
      );
      const vy2 = solver.attr(
        { value: solver.getLinear(...vy2Expr) },
        "value",
        { edit: true }
      );

      solver.addLinear(ConstraintStrength.HARD, 0, vy1Expr, [[1, vy1]]);
      solver.addLinear(ConstraintStrength.HARD, 0, vy2Expr, [[1, vy2]]);

      sublayoutGroups.push({
        group: categoryMarks[cindex],
        x1,
        y1: vy1,
        x2,
        y2: vy2,
      });
    }
    this.applySublayout(sublayoutGroups, "y", sublayoutContext);
  }

  private categoricalMappingX(
    props: Region2DProperties,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    categoryMarks: number[][],
    sublayoutContext: SublayoutContext
  ) {
    const data = props.xData;
    const [x1, x2, y1, y2] = solver.attrs(attrs, [
      this.x1Name,
      this.x2Name,
      this.y1Name,
      this.y2Name,
    ]);

    const axis = getCategoricalAxis(data, this.config.xAxisPrePostGap, false);

    const sublayoutGroups: SublayoutGroup[] = [];
    for (let cindex = 0; cindex < data.categories.length; cindex++) {
      const [t1, t2] = axis.ranges[cindex];

      // t1 * x2 = (1 - t1) * x1
      const vx1Expr = <[number, Variable][]>[
        [t1, x2],
        [1 - t1, x1],
      ];
      // t2 * x2 = (1 - t2) * x1
      const vx2Expr = <[number, Variable][]>[
        [t2, x2],
        [1 - t2, x1],
      ];

      const vx1 = solver.attr(
        { value: solver.getLinear(...vx1Expr) },
        "value",
        { edit: true }
      );
      const vx2 = solver.attr(
        { value: solver.getLinear(...vx2Expr) },
        "value",
        { edit: true }
      );

      // t1 * x2 = (1 - t1) * x2 = 1 * vx1
      solver.addLinear(ConstraintStrength.HARD, 0, vx1Expr, [[1, vx1]]);
      // t2 * x2 = (1 - t2) * x2 = 1 * vx2
      solver.addLinear(ConstraintStrength.HARD, 0, vx2Expr, [[1, vx2]]);

      // save group of constraints
      sublayoutGroups.push({
        group: categoryMarks[cindex],
        x1: vx1,
        y1,
        x2: vx2,
        y2,
      });
    }
    this.applySublayout(sublayoutGroups, "x", sublayoutContext);
  }

  public categoricalHandles(
    axis: "x" | "y" | "xy",
    sublayout: boolean
  ): Region2DHandleDescription[] {
    let handles: Region2DHandleDescription[] = [];
    const props = this.plotSegment.object.properties;
    const x1 = <number>this.plotSegment.state.attributes[this.x1Name];
    const y1 = <number>this.plotSegment.state.attributes[this.y1Name];
    const x2 = <number>this.plotSegment.state.attributes[this.x2Name];
    const y2 = <number>this.plotSegment.state.attributes[this.y2Name];

    // We are using sublayouts here
    if (sublayout) {
      const categoryMarks = this.groupMarksByCategoricalMapping(axis);
      const xAxis =
        axis == "x" || axis == "xy"
          ? getCategoricalAxis(props.xData, this.config.xAxisPrePostGap, false)
          : null;
      const yAxis =
        axis == "y" || axis == "xy"
          ? getCategoricalAxis(props.yData, this.config.yAxisPrePostGap, true)
          : null;
      handles = handles.concat(
        this.sublayoutHandles(
          categoryMarks.map((x, i) => {
            let ix = i,
              iy = i;
            if (axis == "xy") {
              ix = i % xAxis.ranges.length;
              iy = Math.floor(i / xAxis.ranges.length);
            }
            return {
              group: x,
              x1: xAxis ? xAxis.ranges[ix][0] * (x2 - x1) + x1 : x1,
              y1: yAxis ? yAxis.ranges[iy][0] * (y2 - y1) + y1 : y1,
              x2: xAxis ? xAxis.ranges[ix][1] * (x2 - x1) + x1 : x2,
              y2: yAxis ? yAxis.ranges[iy][1] * (y2 - y1) + y1 : y2,
            };
          }),
          false,
          false
        )
      );
    }

    if (axis == "x" || axis == "xy") {
      const data = props.xData;
      const axis = getCategoricalAxis(data, this.config.xAxisPrePostGap, false);
      for (let i = 0; i < axis.ranges.length - 1; i++) {
        const p1 = axis.ranges[i][1];
        handles.push({
          type: "gap",
          gap: {
            property: {
              property: PlotSegmentAxisPropertyNames.xData,
              field: "gapRatio",
            },
            axis: AxisMode.X,
            reference: p1 * (x2 - x1) + x1,
            value: data.gapRatio,
            scale: axis.gapScale * (x2 - x1),
            span: [y1, y2],
          },
        });
      }
    }
    if (axis == "y" || axis == "xy") {
      const data = props.yData;
      const axis = getCategoricalAxis(data, this.config.yAxisPrePostGap, true);
      for (let i = 0; i < axis.ranges.length - 1; i++) {
        const p1 = axis.ranges[i][1];
        handles.push({
          type: "gap",
          gap: {
            property: {
              property: PlotSegmentAxisPropertyNames.yData,
              field: "gapRatio",
            },
            axis: AxisMode.Y,
            reference: p1 * (y2 - y1) + y1,
            value: data.gapRatio,
            scale: axis.gapScale * (y2 - y1),
            span: [x1, x2],
          },
        });
      }
    }
    return handles;
  }

  public stacking(axis: AxisMode): void {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const attrs = state.attributes;
    const dataIndices = state.dataRowIndices;

    const [x1, x2, y1, y2] = solver.attrs(attrs, [
      this.x1Name,
      this.x2Name,
      this.y1Name,
      this.y2Name,
    ]);

    const count = dataIndices.length;

    const doStack = count <= 36;

    for (const [index, markState] of state.glyphs.entries()) {
      switch (axis) {
        case "x":
          {
            this.stackingX(
              solver,
              attrs,
              doStack,
              index,
              state,
              x1,
              x2,
              count,
              markState
            );
          }
          break;
        case "y":
          {
            this.stackingY(
              solver,
              attrs,
              doStack,
              index,
              state,
              y1,
              y2,
              count,
              markState
            );
          }
          break;
      }
    }

    switch (axis) {
      case "x":
        {
          this.gapX(count, this.plotSegment.object.properties.xData.gapRatio);
        }
        break;
      case "y":
        {
          this.gapY(count, this.plotSegment.object.properties.yData.gapRatio);
        }
        break;
    }
  }

  private stackingY(
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    doStack: boolean,
    index: number,
    state: Specification.PlotSegmentState<Region2DAttributes>,
    y1: Variable,
    y2: Variable,
    count: number,
    markState: Specification.GlyphState<Specification.AttributeMap>
  ) {
    const [gapY] = solver.attrs(attrs, ["gapY"]);
    if (doStack) {
      if (index > 0) {
        const y2Prev = solver.attr(state.glyphs[index - 1].attributes, "y2");
        const y1This = solver.attr(state.glyphs[index].attributes, "y1");
        solver.addLinear(ConstraintStrength.HARD, 0, [
          [1, y2Prev],
          [-1, y1This],
          [1, gapY],
        ]);
      }
      if (index == 0) {
        const y1This = solver.attr(state.glyphs[index].attributes, "y1");
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, y1]], [[1, y1This]]);
      }
      if (index == state.glyphs.length - 1) {
        const y2This = solver.attr(state.glyphs[index].attributes, "y2");
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, y2]], [[1, y2This]]);
      }
    } else {
      const t = (index + 0.5) / count;
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [1 - t, y2],
          [t, y1],
        ],
        [[1, solver.attr(markState.attributes, "y")]]
      );
      solver.addLinear(
        ConstraintStrength.WEAK,
        0,
        [
          [1, y2],
          [-1, y1],
        ],
        [
          [count, solver.attr(markState.attributes, "height")],
          [count - 1, gapY],
        ]
      );
    }
  }

  private stackingX(
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    doStack: boolean,
    index: number,
    state: Specification.PlotSegmentState<Region2DAttributes>,
    x1: Variable,
    x2: Variable,
    count: number,
    markState: Specification.GlyphState<Specification.AttributeMap>
  ) {
    const [gapX] = solver.attrs(attrs, ["gapX"]);
    if (doStack) {
      if (index > 0) {
        const x2Prev = solver.attr(state.glyphs[index - 1].attributes, "x2");
        const x1This = solver.attr(state.glyphs[index].attributes, "x1");
        solver.addLinear(ConstraintStrength.HARD, 0, [
          [1, x2Prev],
          [-1, x1This],
          [1, gapX],
        ]);
      }
      if (index == 0) {
        const x1This = solver.attr(state.glyphs[index].attributes, "x1");
        // solver.addEquals(ConstraintWeight.HARD, x1, x1This);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, x1]], [[1, x1This]]);
      }
      if (index == state.glyphs.length - 1) {
        const x2This = solver.attr(state.glyphs[index].attributes, "x2");
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, x2]], [[1, x2This]]);
      }
    } else {
      const t = (index + 0.5) / count;
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [1 - t, x1],
          [t, x2],
        ],
        [[1, solver.attr(markState.attributes, "x")]]
      );
      solver.addLinear(
        ConstraintStrength.WEAK,
        0,
        [
          [1, x2],
          [-1, x1],
        ],
        [
          [count, solver.attr(markState.attributes, "width")],
          [count - 1, gapX],
        ]
      );
    }
  }

  public fitGroups(groups: SublayoutGroup[], axis: "x" | "y" | "xy") {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const fitters = new DodgingFitters(solver);

    const alignment = props.sublayout.align;

    groups.forEach((group) => {
      const markStates = group.group.map((index) => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;

      for (let index = 0; index < markStates.length; index++) {
        const m1 = markStates[index];
        if (axis == "x" || axis == "xy") {
          if (alignment.x == SublayoutAlignment.Start) {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "x1"),
              x1
            );
          } else {
            fitters.xMin.add(solver.attr(m1.attributes, "x1"), x1);
          }
          if (alignment.x == SublayoutAlignment.End) {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "x2"),
              x2
            );
          } else {
            fitters.xMax.add(solver.attr(m1.attributes, "x2"), x2);
          }
          if (alignment.x == SublayoutAlignment.Middle) {
            solver.addLinear(
              ConstraintStrength.HARD,
              0,
              [
                [1, solver.attr(m1.attributes, "x1")],
                [1, solver.attr(m1.attributes, "x2")],
              ],
              [
                [1, x1],
                [1, x2],
              ]
            );
          }
        }
        if (axis == "y" || axis == "xy") {
          if (alignment.y == SublayoutAlignment.Start) {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "y1"),
              y1
            );
          } else {
            fitters.yMin.add(solver.attr(m1.attributes, "y1"), y1);
          }
          if (alignment.y == SublayoutAlignment.End) {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "y2"),
              y2
            );
          } else {
            fitters.yMax.add(solver.attr(m1.attributes, "y2"), y2);
          }
          if (alignment.y == SublayoutAlignment.Middle) {
            solver.addLinear(
              ConstraintStrength.HARD,
              0,
              [
                [1, solver.attr(m1.attributes, "y1")],
                [1, solver.attr(m1.attributes, "y2")],
              ],
              [
                [1, y1],
                [1, y2],
              ]
            );
          }
        }
      }
    });

    fitters.addConstraint(ConstraintStrength.MEDIUM);
  }

  public applySublayout(
    groups: SublayoutGroup[],
    axis: "x" | "y" | "xy",
    context: SublayoutContext
  ) {
    if (!context || context.mode == "disabled") {
      this.fitGroups(groups, axis);
    } else {
      this.orderMarkGroups(groups);
      const props = this.plotSegment.object.properties;
      if (context.mode == "x-only" || context.mode == "y-only") {
        if (props.sublayout.type == Region2DSublayoutType.Packing) {
          this.sublayoutPacking(
            groups,
            context.mode == "x-only" ? AxisMode.X : AxisMode.Y
          );
        } else if (props.sublayout.type == Region2DSublayoutType.Jitter) {
          this.sublayoutJitter(
            groups,
            context.mode == "x-only" ? AxisMode.X : AxisMode.Y
          );
        } else {
          this.fitGroups(groups, axis);
        }
      } else {
        if (props.sublayout.type == Region2DSublayoutType.Overlap) {
          this.fitGroups(groups, "xy");
        }
        // Stack X
        if (props.sublayout.type == Region2DSublayoutType.DodgeX) {
          this.sublayoutDodging(
            groups,
            GridDirection.X,
            context.xAxisPrePostGap
          );
        }
        // Stack Y
        if (props.sublayout.type == Region2DSublayoutType.DodgeY) {
          this.sublayoutDodging(
            groups,
            GridDirection.Y,
            context.yAxisPrePostGap
          );
        }
        // Grid layout
        if (props.sublayout.type == Region2DSublayoutType.Grid) {
          this.sublayoutGrid(groups);
        }
        // Force layout
        if (props.sublayout.type == Region2DSublayoutType.Packing) {
          this.sublayoutPacking(groups);
        }
        // Jitter layout
        if (props.sublayout.type == Region2DSublayoutType.Jitter) {
          this.sublayoutJitter(groups);
        }
      }
    }
  }

  // eslint-disable-next-line
  public sublayoutDodging(
    groups: SublayoutGroup[],
    direction: GridDirection,
    enablePrePostGap: boolean
  ) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;

    const fitters = new DodgingFitters(solver);

    const alignment = props.sublayout.align;

    let maxCount = 0;
    for (const g of groups) {
      maxCount = Math.max(maxCount, g.group.length);
    }
    let dodgeGapRatio: number = 0;
    let dodgeGapOffset: number = 0;
    if (!enablePrePostGap) {
      dodgeGapRatio =
        direction == "x"
          ? props.sublayout.ratioX / (maxCount - 1)
          : props.sublayout.ratioY / (maxCount - 1);
      dodgeGapOffset = 0;
    } else {
      dodgeGapRatio =
        direction == "x"
          ? props.sublayout.ratioX / maxCount
          : props.sublayout.ratioY / maxCount;
      dodgeGapOffset = dodgeGapRatio / 2;
    }

    groups.forEach((group) => {
      const markStates = group.group.map((index) => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;

      const count = markStates.length;
      // If nothing there, skip
      if (count == 0) {
        return;
      }

      for (let index = 0; index < markStates.length; index++) {
        const m1 = markStates[index];
        if (index > 0) {
          const m0 = markStates[index - 1];
          switch (direction) {
            case "x":
              {
                solver.addLinear(ConstraintStrength.HARD, 0, [
                  [dodgeGapRatio, x2],
                  [-dodgeGapRatio, x1],
                  [1, solver.attr(m0.attributes, "x2")],
                  [-1, solver.attr(m1.attributes, "x1")],
                ]);
              }
              break;
            case "y":
              {
                solver.addLinear(ConstraintStrength.HARD, 0, [
                  [dodgeGapRatio, y2],
                  [-dodgeGapRatio, y1],
                  [1, solver.attr(m0.attributes, "y2")],
                  [-1, solver.attr(m1.attributes, "y1")],
                ]);
              }
              break;
          }
        }

        this.setFirstSublayoutDodgingDirection(
          direction,
          alignment,
          solver,
          m1,
          y1,
          fitters,
          y2,
          x1,
          x2
        );
      }
      const m1 = markStates[0];
      const mN = markStates[markStates.length - 1];
      switch (direction) {
        case "x":
          {
            this.setSublayoutDodgingDirectionX(
              x1,
              dodgeGapOffset,
              x2,
              alignment,
              solver,
              m1,
              fitters,
              mN
            );
          }
          break;
        case "y":
          {
            this.setSublayoutDodgingDirectionY(
              y1,
              dodgeGapOffset,
              y2,
              alignment,
              solver,
              m1,
              fitters,
              mN
            );
          }
          break;
      }
    });

    fitters.addConstraint(ConstraintStrength.MEDIUM);
  }

  private setSublayoutDodgingDirectionY(
    y1: Variable,
    dodgeGapOffset: number,
    y2: Variable,
    alignment: { x: SublayoutAlignment; y: SublayoutAlignment },
    solver: ConstraintSolver,
    m1: Specification.GlyphState<Specification.AttributeMap>,
    fitters: DodgingFitters,
    mN: Specification.GlyphState<Specification.AttributeMap>
  ) {
    const y1WithGap: [number, Variable][] = [
      [1, y1],
      [dodgeGapOffset, y2],
      [-dodgeGapOffset, y1],
    ];
    const y2WithGap: [number, Variable][] = [
      [1, y2],
      [dodgeGapOffset, y1],
      [-dodgeGapOffset, y2],
    ];
    if (alignment.y == "start") {
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1, solver.attr(m1.attributes, "y1")]],
        y1WithGap
      );
    } else {
      fitters.yMin.addComplex(solver.attr(m1.attributes, "y1"), y1WithGap);
    }
    if (alignment.y == "end") {
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1, solver.attr(mN.attributes, "y2")]],
        y2WithGap
      );
    } else {
      fitters.yMax.addComplex(solver.attr(mN.attributes, "y2"), y2WithGap);
    }
    if (alignment.y == "middle") {
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [1, solver.attr(m1.attributes, "y1")],
          [1, solver.attr(mN.attributes, "y2")],
        ],
        [
          [1, y1],
          [1, y2],
        ]
      );
    }
  }

  private setSublayoutDodgingDirectionX(
    x1: Variable,
    dodgeGapOffset: number,
    x2: Variable,
    alignment: { x: SublayoutAlignment; y: SublayoutAlignment },
    solver: ConstraintSolver,
    m1: Specification.GlyphState<Specification.AttributeMap>,
    fitters: DodgingFitters,
    mN: Specification.GlyphState<Specification.AttributeMap>
  ) {
    const x1WithGap: [number, Variable][] = [
      [1, x1],
      [dodgeGapOffset, x2],
      [-dodgeGapOffset, x1],
    ];
    const x2WithGap: [number, Variable][] = [
      [1, x2],
      [dodgeGapOffset, x1],
      [-dodgeGapOffset, x2],
    ];
    if (alignment.x == "start") {
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1, solver.attr(m1.attributes, "x1")]],
        x1WithGap
      );
    } else {
      fitters.xMin.addComplex(solver.attr(m1.attributes, "x1"), x1WithGap);
    }
    if (alignment.x == "end") {
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1, solver.attr(mN.attributes, "x2")]],
        x2WithGap
      );
    } else {
      fitters.xMax.addComplex(solver.attr(mN.attributes, "x2"), x2WithGap);
    }
    if (alignment.x == "middle") {
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [1, solver.attr(m1.attributes, "x1")],
          [1, solver.attr(mN.attributes, "x2")],
        ],
        [
          [1, x1],
          [1, x2],
        ]
      );
    }
  }

  private setFirstSublayoutDodgingDirection(
    direction: string,
    alignment: { x: SublayoutAlignment; y: SublayoutAlignment },
    solver: ConstraintSolver,
    m1: Specification.GlyphState<Specification.AttributeMap>,
    y1: Variable,
    fitters: DodgingFitters,
    y2: Variable,
    x1: Variable,
    x2: Variable
  ) {
    switch (direction) {
      case "x":
        {
          if (alignment.y == "start") {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "y1"),
              y1
            );
          } else {
            fitters.yMin.add(solver.attr(m1.attributes, "y1"), y1);
          }
          if (alignment.y == "end") {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "y2"),
              y2
            );
          } else {
            fitters.yMax.add(solver.attr(m1.attributes, "y2"), y2);
          }
          if (alignment.y == "middle") {
            solver.addLinear(
              ConstraintStrength.HARD,
              0,
              [
                [1, solver.attr(m1.attributes, "y1")],
                [1, solver.attr(m1.attributes, "y2")],
              ],
              [
                [1, y1],
                [1, y2],
              ]
            );
          }
        }
        break;
      case "y":
        {
          if (alignment.x == "start") {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "x1"),
              x1
            );
          } else {
            fitters.xMin.add(solver.attr(m1.attributes, "x1"), x1);
          }
          if (alignment.x == "end") {
            solver.addEquals(
              ConstraintStrength.HARD,
              solver.attr(m1.attributes, "x2"),
              x2
            );
          } else {
            fitters.xMax.add(solver.attr(m1.attributes, "x2"), x2);
          }
          if (alignment.x == "middle") {
            solver.addLinear(
              ConstraintStrength.HARD,
              0,
              [
                [1, solver.attr(m1.attributes, "x1")],
                [1, solver.attr(m1.attributes, "x2")],
              ],
              [
                [1, x1],
                [1, x2],
              ]
            );
          }
        }
        break;
    }
  }

  public getGlyphPreSolveAttributes(rowIndices: number[]) {
    const attrs = this.solverContext.getGlyphAttributes(
      this.plotSegment.object.glyph,
      this.plotSegment.object.table,
      rowIndices
    );
    return attrs;
  }

  public sublayoutGrid(groups: SublayoutGroup[], directionOverride?: string) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;

    let direction: string = props.sublayout.grid.direction;
    if (directionOverride != null) {
      direction = directionOverride;
    }

    const alignX = props.sublayout.align.x;
    const alignY = props.sublayout.align.y;

    const xMinFitter = new CrossFitter(solver, "min");
    const xMaxFitter = new CrossFitter(solver, "max");
    const yMinFitter = new CrossFitter(solver, "min");
    const yMaxFitter = new CrossFitter(solver, "max");

    let maxCount = 0;
    groups.forEach((group) => {
      if (maxCount < group.group.length) {
        maxCount = group.group.length;
      }
    });

    let xCount: number, yCount: number;
    // Determine xCount and yCount, aka., the number of divisions on each axis
    switch (direction) {
      case "x":
        {
          if (props.sublayout.grid.xCount != null) {
            xCount = props.sublayout.grid.xCount;
            yCount = Math.ceil(maxCount / xCount);
          } else {
            xCount = Math.ceil(Math.sqrt(maxCount));
            yCount = Math.ceil(maxCount / xCount);
          }
        }
        break;
      case "y":
        {
          if (props.sublayout.grid.yCount != null) {
            yCount = props.sublayout.grid.yCount;
            xCount = Math.ceil(maxCount / yCount);
          } else {
            yCount = Math.ceil(Math.sqrt(maxCount));
            xCount = Math.ceil(maxCount / yCount);
          }
        }
        break;
      case "x1":
        {
          xCount = maxCount;
          yCount = 1;
        }
        break;
      case "y1":
        {
          yCount = maxCount;
          xCount = 1;
        }
        break;
    }
    const gapRatioX = xCount > 1 ? props.sublayout.ratioX / (xCount - 1) : 0;
    const gapRatioY = yCount > 1 ? props.sublayout.ratioY / (yCount - 1) : 0;

    const gridStartPosition: GridStartPosition =
      props.sublayout.grid.gridStartPosition;

    groups.forEach((group) => {
      const markStates = group.group.map((index) => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;

      let xMax: number, yMax: number;
      if (direction == "x" || direction == "x1") {
        xMax = Math.min(markStates.length, xCount);
        yMax = Math.ceil(markStates.length / xCount);
      } else {
        yMax = Math.min(markStates.length, yCount);
        xMax = Math.ceil(markStates.length / yCount);
      }

      // Constraint glyphs
      this.addGlyphConstraints(
        markStates,
        direction,
        xCount,
        alignY,
        xMax,
        yMax,
        yCount,
        alignX,
        gapRatioX,
        x2,
        x1,
        gapRatioY,
        y2,
        y1,
        solver,
        xMinFitter,
        xMaxFitter,
        yMinFitter,
        yMaxFitter,
        gridStartPosition
      );
    });
    xMinFitter.addConstraint(ConstraintStrength.MEDIUM);
    xMaxFitter.addConstraint(ConstraintStrength.MEDIUM);
    yMinFitter.addConstraint(ConstraintStrength.MEDIUM);
    yMaxFitter.addConstraint(ConstraintStrength.MEDIUM);
  }

  // eslint-disable-next-line
  private addGlyphConstraints(
    markStates: Specification.GlyphState<Specification.AttributeMap>[],
    direction: string,
    xCount: number,
    alignY: SublayoutAlignment,
    xMax: number,
    yMax: number,
    yCount: number,
    alignX: SublayoutAlignment,
    gapRatioX: number,
    x2: Variable,
    x1: Variable,
    gapRatioY: number,
    y2: Variable,
    y1: Variable,
    solver: ConstraintSolver,
    xMinFitter: CrossFitter,
    xMaxFitter: CrossFitter,
    yMinFitter: CrossFitter,
    yMaxFitter: CrossFitter,
    gridStartPosition: GridStartPosition
  ) {
    if (
      gridStartPosition === GridStartPosition.LeftBottom ||
      gridStartPosition === GridStartPosition.RightBottom
    ) {
      markStates = markStates.reverse();
    }
    for (let i = 0; i < markStates.length; i++) {
      let xi: number, yi: number;
      if (direction == "x" || direction == "x1") {
        xi = i % xCount;
        if (alignY == "start") {
          xi = xMax - 1 - ((markStates.length - 1 - i) % xCount);
          yi = Math.floor((markStates.length - 1 - i) / xCount);
        } else {
          yi = yMax - 1 - Math.floor(i / xCount);
        }

        if (
          gridStartPosition === GridStartPosition.RightTop ||
          gridStartPosition === GridStartPosition.RightBottom
        ) {
          xi = xCount - 1 - xi; // flip X
        }
      } else {
        yi = yMax - 1 - (i % yCount);
        xi = Math.floor(i / yCount);
        if (alignX == "end") {
          yi = (markStates.length - 1 - i) % yCount;
          xi = xMax - 1 - Math.floor((markStates.length - 1 - i) / yCount);
        }
        if (
          gridStartPosition === GridStartPosition.LeftTop ||
          gridStartPosition === GridStartPosition.LeftBottom
        ) {
          yi = yCount - 1 - yi; // flip Y
        }
      }
      // Adjust xi, yi based on alignment settings
      if (alignX == "end") {
        xi = xi + xCount - xMax;
      }
      if (alignX == "middle") {
        xi = xi + (xCount - xMax) / 2;
      }
      if (alignY == "end") {
        yi = yi + yCount - yMax;
      }
      if (alignY == "middle") {
        yi = yi + (yCount - yMax) / 2;
      }
      const cellX1: [number, Variable][] = [
        [(xi / xCount) * (1 + gapRatioX), x2],
        [1 - (xi / xCount) * (1 + gapRatioX), x1],
      ];
      const cellX2: [number, Variable][] = [
        [((xi + 1) / xCount) * (1 + gapRatioX) - gapRatioX, x2],
        [1 - ((xi + 1) / xCount) * (1 + gapRatioX) + gapRatioX, x1],
      ];
      const cellY1: [number, Variable][] = [
        [(yi / yCount) * (1 + gapRatioY), y2],
        [1 - (yi / yCount) * (1 + gapRatioY), y1],
      ];
      const cellY2: [number, Variable][] = [
        [((yi + 1) / yCount) * (1 + gapRatioY) - gapRatioY, y2],
        [1 - ((yi + 1) / yCount) * (1 + gapRatioY) + gapRatioY, y1],
      ];
      const state = markStates[i];
      if (alignX == "start") {
        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [[1, solver.attr(state.attributes, "x1")]],
          cellX1
        );
      } else {
        xMinFitter.addComplex(solver.attr(state.attributes, "x1"), cellX1);
      }
      if (alignX == "end") {
        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [[1, solver.attr(state.attributes, "x2")]],
          cellX2
        );
      } else {
        xMaxFitter.addComplex(solver.attr(state.attributes, "x2"), cellX2);
      }
      if (alignX == "middle") {
        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [
            [1, solver.attr(state.attributes, "x1")],
            [1, solver.attr(state.attributes, "x2")],
          ],
          cellX1.concat(cellX2)
        );
      }
      if (alignY == "start") {
        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [[1, solver.attr(state.attributes, "y1")]],
          cellY1
        );
      } else {
        yMinFitter.addComplex(solver.attr(state.attributes, "y1"), cellY1);
      }
      if (alignY == "end") {
        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [[1, solver.attr(state.attributes, "y2")]],
          cellY2
        );
      } else {
        yMaxFitter.addComplex(solver.attr(state.attributes, "y2"), cellY2);
      }
      if (alignY == "middle") {
        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [
            [1, solver.attr(state.attributes, "y1")],
            [1, solver.attr(state.attributes, "y2")],
          ],
          cellY1.concat(cellY2)
        );
      }
    }
  }

  public sublayoutHandles(
    groups: {
      group: number[];
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }[],
    enablePrePostGapX: boolean,
    enablePrePostGapY: boolean
  ) {
    this.orderMarkGroups(groups);
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const handles: Region2DHandleDescription[] = [];
    let maxCount = 0;
    for (const g of groups) {
      maxCount = Math.max(maxCount, g.group.length);
    }

    if (props.sublayout.type == Region2DSublayoutType.DodgeX) {
      for (const group of groups) {
        for (let i = 0; i < group.group.length - 1; i++) {
          const state1 = state.glyphs[group.group[i]];
          const state2 = state.glyphs[group.group[i + 1]];
          const p1 = <number>state1.attributes.x2;
          const minY = Math.min(
            <number>state1.attributes.y1,
            <number>state1.attributes.y2,
            <number>state2.attributes.y1,
            <number>state2.attributes.y2
          );
          const maxY = Math.max(
            <number>state1.attributes.y1,
            <number>state1.attributes.y2,
            <number>state2.attributes.y1,
            <number>state2.attributes.y2
          );
          handles.push({
            type: "gap",
            gap: {
              axis: AxisMode.X,
              property: { property: "sublayout", field: "ratioX" },
              reference: p1,
              value: props.sublayout.ratioX,
              scale:
                (1 / (enablePrePostGapX ? maxCount : maxCount - 1)) *
                (group.x2 - group.x1),
              span: [minY, maxY],
            },
          });
        }
      }
    }
    if (props.sublayout.type == Region2DSublayoutType.DodgeY) {
      for (const group of groups) {
        for (let i = 0; i < group.group.length - 1; i++) {
          const state1 = state.glyphs[group.group[i]];
          const state2 = state.glyphs[group.group[i + 1]];
          const p1 = <number>state1.attributes.y2;
          const minX = Math.min(
            <number>state1.attributes.x1,
            <number>state1.attributes.x2,
            <number>state2.attributes.x1,
            <number>state2.attributes.x2
          );
          const maxX = Math.max(
            <number>state1.attributes.x1,
            <number>state1.attributes.x2,
            <number>state2.attributes.x1,
            <number>state2.attributes.x2
          );
          handles.push({
            type: "gap",
            gap: {
              axis: AxisMode.Y,
              property: { property: "sublayout", field: "ratioY" },
              reference: p1,
              value: props.sublayout.ratioY,
              scale:
                (1 / (enablePrePostGapY ? maxCount : maxCount - 1)) *
                (group.y2 - group.y1),
              span: [minX, maxX],
            },
          });
        }
      }
    }
    if (props.sublayout.type == Region2DSublayoutType.Grid) {
      // TODO: implement grid sublayout handles
    }
    return handles;
  }

  public sublayoutPacking(groups: SublayoutGroup[], axisOnly?: AxisMode) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const packingProps = this.plotSegment.object.properties.sublayout.packing;

    groups.forEach((group) => {
      const markStates = group.group.map((index) => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;
      const centerState: Specification.AttributeMap = {
        cx: 0,
        cy: 0,
      };
      const cx = solver.attr(centerState, "cx", {
        edit: true,
      });
      const cy = solver.attr(centerState, "cy", {
        edit: true,
      });
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[2, cx]],
        [
          [1, x1],
          [1, x2],
        ]
      );
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[2, cy]],
        [
          [1, y1],
          [1, y2],
        ]
      );
      const points = markStates.map((state) => {
        let radius = 0;
        for (const e of state.marks) {
          if (e.attributes.size != null) {
            radius = Math.max(
              radius,
              Math.sqrt(<number>e.attributes.size / Math.PI)
            );
          } else {
            const w = <number>e.attributes.width;
            const h = <number>e.attributes.height;
            if (w != null && h != null) {
              radius = Math.max(radius, Math.sqrt(w * w + h * h) / 2);
            }
          }
        }
        if (radius == 0) {
          radius = Region2DConstraintBuilder.defaultJitterPackingRadius;
        }
        return <[Variable, Variable, number]>[
          solver.attr(state.attributes, "x"),
          solver.attr(state.attributes, "y"),
          radius,
        ];
      });
      solver.addPlugin(
        new ConstraintPlugins.PackingPlugin(
          solver,
          cx,
          cy,
          points,
          axisOnly,
          this.config.getXYScale,
          {
            gravityX: packingProps && packingProps.gravityX,
            gravityY: packingProps && packingProps.gravityY,
            boxed:
              packingProps.boxedX || packingProps.boxedY
                ? {
                    x1: packingProps.boxedX ? solver.getValue(group.x1) : null,
                    x2: packingProps.boxedX ? solver.getValue(group.x2) : null,
                    y1: packingProps.boxedY ? solver.getValue(group.y1) : null,
                    y2: packingProps.boxedY ? solver.getValue(group.y2) : null,
                  }
                : null,
          }
        )
      );
    });
  }

  public sublayoutJitter(groups: SublayoutGroup[], axisOnly?: AxisMode) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const jitterProps = this.plotSegment.object.properties.sublayout.jitter;

    groups.forEach((group) => {
      const markStates = group.group.map((index) => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;

      const points = markStates.map((state) => {
        let radius = 0;
        for (const e of state.marks) {
          if (e.attributes.size != null) {
            radius = Math.max(
              radius,
              Math.sqrt(<number>e.attributes.size / Math.PI)
            );
          } else {
            const w = <number>e.attributes.width;
            const h = <number>e.attributes.height;
            if (w != null && h != null) {
              radius = Math.max(radius, Math.sqrt(w * w + h * h) / 2);
            }
          }
        }
        if (radius == 0) {
          radius = Region2DConstraintBuilder.defaultJitterPackingRadius;
        }
        return <[Variable, Variable, number]>[
          solver.attr(state.attributes, "x"),
          solver.attr(state.attributes, "y"),
          radius,
        ];
      });
      solver.addPlugin(
        new ConstraintPlugins.JitterPlugin(
          solver,
          x1,
          y1,
          x2,
          y2,
          points,
          axisOnly,
          jitterProps
            ? jitterProps
            : {
                horizontal: true,
                vertical: true,
              }
        )
      );
    });
  }

  public getHandles(): Region2DHandleDescription[] {
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const xMode = props.xData ? props.xData.type : "null";
    const yMode = props.yData ? props.yData.type : "null";
    let handles: Region2DHandleDescription[] = [];

    switch (xMode) {
      case "null":
        {
          switch (yMode) {
            case "null":
              {
                handles = handles.concat(
                  this.sublayoutHandles(
                    [
                      {
                        x1: <number>state.attributes[this.x1Name],
                        y1: <number>state.attributes[this.y1Name],
                        x2: <number>state.attributes[this.x2Name],
                        y2: <number>state.attributes[this.y2Name],
                        group: state.dataRowIndices.map((x, i) => i),
                      },
                    ],
                    this.config.xAxisPrePostGap,
                    this.config.yAxisPrePostGap
                  )
                );
              }
              break;
            // case "numerical":
            //   {
            //   }
            //   break;
            case "categorical":
              {
                handles = handles.concat(this.categoricalHandles("y", true));
              }
              break;
          }
        }
        break;
      case "numerical":
        {
          switch (yMode) {
            // case "null":
            //   {
            //   }
            //   break;
            // case "numerical":
            //   {
            //   }
            //   break;
            case "categorical":
              {
                handles = handles.concat(this.categoricalHandles("y", false));
              }
              break;
          }
        }
        break;
      case "categorical":
        {
          switch (yMode) {
            case "null":
              {
                handles = handles.concat(this.categoricalHandles("x", true));
              }
              break;
            case "numerical":
              {
                handles = handles.concat(this.categoricalHandles("x", false));
              }
              break;
            case "categorical":
              {
                handles = handles.concat(this.categoricalHandles("xy", true));
              }
              break;
          }
        }
        break;
    }

    return handles;
  }

  public build(): void {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const attrs = state.attributes;
    const props = this.plotSegment.object.properties;
    const xMode = props.xData ? props.xData.type : "null";
    const yMode = props.yData ? props.yData.type : "null";

    switch (xMode) {
      case "null":
        {
          this.buildXNullMode(yMode, solver, attrs, state);
        }
        break;
      case "default":
        {
          this.buildXDefaultMode(yMode, solver, attrs, state);
        }
        break;
      case "numerical":
        {
          this.buildXNumericalMode(yMode, solver, attrs, state);
        }
        break;
      case "categorical":
        {
          this.buildXCategoricalMode(yMode);
        }
        break;
    }
    solver.addEquals(
      ConstraintStrength.HARD,
      solver.attr(attrs, "x"),
      solver.attr(attrs, this.x1Name)
    );
    solver.addEquals(
      ConstraintStrength.HARD,
      solver.attr(attrs, "y"),
      solver.attr(attrs, this.y1Name)
    );
  }

  private buildXCategoricalMode(yMode: string) {
    switch (yMode) {
      case "null":
        {
          this.categoricalMapping("x", { mode: "default" });
        }
        break;
      case "default":
        {
          this.stacking(AxisMode.Y);
          this.categoricalMapping("x", { mode: "disabled" });
        }
        break;
      case "numerical":
        {
          this.numericalMapping(AxisMode.Y);
          this.categoricalMapping("x", { mode: "x-only" });
        }
        break;
      case "categorical":
        {
          this.categoricalMapping("xy", { mode: "default" });
        }
        break;
    }
  }

  private buildXNumericalMode(
    yMode: string,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    state: Specification.PlotSegmentState<Region2DAttributes>
  ) {
    switch (yMode) {
      case "null":
        {
          // numerical, null
          this.numericalMapping(AxisMode.X);
          this.applySublayout(
            [
              {
                x1: solver.attr(attrs, this.x1Name),
                y1: solver.attr(attrs, this.y1Name),
                x2: solver.attr(attrs, this.x2Name),
                y2: solver.attr(attrs, this.y2Name),
                group: state.dataRowIndices.map((x, i) => i),
              },
            ],
            "y",
            {
              mode: "y-only",
            }
          );
        }
        break;
      case "default":
        {
          this.stacking(AxisMode.Y);
          this.numericalMapping(AxisMode.X);
        }
        break;
      case "numerical":
        {
          // numerical, numerical
          this.numericalMapping(AxisMode.X);
          this.numericalMapping(AxisMode.Y);
        }
        break;
      case "categorical":
        {
          // numerical, categorical
          this.numericalMapping(AxisMode.X);
          this.categoricalMapping("y", { mode: "y-only" });
        }
        break;
    }
  }

  private buildXDefaultMode(
    yMode: string,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    state: Specification.PlotSegmentState<Region2DAttributes>
  ) {
    switch (yMode) {
      case "null":
        {
          this.stacking(AxisMode.X);
          this.applySublayout(
            [
              {
                x1: solver.attr(attrs, this.x1Name),
                y1: solver.attr(attrs, this.y1Name),
                x2: solver.attr(attrs, this.x2Name),
                y2: solver.attr(attrs, this.y2Name),
                group: state.dataRowIndices.map((x, i) => i),
              },
            ],
            "y",
            {
              mode: "y-only",
            }
          );
        }
        break;
      case "default":
        {
          this.stacking(AxisMode.X);
          this.stacking(AxisMode.Y);
        }
        break;
      case "numerical":
        {
          this.stacking(AxisMode.X);
          this.numericalMapping(AxisMode.Y);
        }
        break;
      case "categorical":
        {
          this.stacking(AxisMode.X);
          this.categoricalMapping("y", { mode: "disabled" });
        }
        break;
    }
  }

  private buildXNullMode(
    yMode: string,
    solver: ConstraintSolver,
    attrs: Region2DAttributes,
    state: Specification.PlotSegmentState<Region2DAttributes>
  ) {
    switch (yMode) {
      case "null":
        {
          // null, null
          this.applySublayout(
            [
              {
                x1: solver.attr(attrs, this.x1Name),
                y1: solver.attr(attrs, this.y1Name),
                x2: solver.attr(attrs, this.x2Name),
                y2: solver.attr(attrs, this.y2Name),
                group: state.dataRowIndices.map((x, i) => i),
              },
            ],
            "xy",
            {
              mode: "default",
              xAxisPrePostGap: this.config.xAxisPrePostGap,
              yAxisPrePostGap: this.config.yAxisPrePostGap,
            }
          );
        }
        break;
      case "default":
        {
          this.stacking(AxisMode.Y);
          this.applySublayout(
            [
              {
                x1: solver.attr(attrs, this.x1Name),
                y1: solver.attr(attrs, this.y1Name),
                x2: solver.attr(attrs, this.x2Name),
                y2: solver.attr(attrs, this.y2Name),
                group: state.dataRowIndices.map((x, i) => i),
              },
            ],
            "x",
            {
              mode: "x-only",
            }
          );
        }
        break;
      case "numerical":
        {
          // null, numerical
          this.numericalMapping(AxisMode.Y);
          this.applySublayout(
            [
              {
                x1: solver.attr(attrs, this.x1Name),
                y1: solver.attr(attrs, this.y1Name),
                x2: solver.attr(attrs, this.x2Name),
                y2: solver.attr(attrs, this.y2Name),
                group: state.dataRowIndices.map((x, i) => i),
              },
            ],
            "x",
            {
              mode: "x-only",
            }
          );
        }
        break;
      case "categorical":
        {
          // null, categorical
          this.categoricalMapping("y", { mode: "default" });
        }
        break;
    }
  }

  public applicableSublayoutOptions() {
    const { icons, terminology } = this.config;
    const overlapOption = {
      value: Region2DSublayoutType.Overlap,
      label: terminology.overlap,
      icon: icons.overlapIcon,
    };
    const packingOption = {
      value: Region2DSublayoutType.Packing,
      label: terminology.packing,
      icon: icons.packingIcon,
    };
    const dodgeXOption = {
      value: Region2DSublayoutType.DodgeX,
      label: terminology.dodgeX,
      icon: icons.dodgeXIcon,
    };
    const dodgeYOption = {
      value: Region2DSublayoutType.DodgeY,
      label: terminology.dodgeY,
      icon: icons.dodgeYIcon,
    };
    const gridOption = {
      value: Region2DSublayoutType.Grid,
      label: terminology.grid,
      icon: icons.gridIcon,
    };
    const jitterOption = {
      value: Region2DSublayoutType.Jitter,
      label: terminology.jitter,
      icon: icons.jitterIcon,
    };
    const props = this.plotSegment.object.properties;
    const xMode = props.xData ? props.xData.type : "null";
    const yMode = props.yData ? props.yData.type : "null";
    if (
      (xMode == "null" || xMode == "categorical") &&
      (yMode == "null" || yMode == "categorical")
    ) {
      return [
        dodgeXOption,
        dodgeYOption,
        gridOption,
        packingOption,
        jitterOption,
        overlapOption,
      ];
    }
    return [packingOption, jitterOption, overlapOption];
  }

  public isSublayoutApplicable() {
    const props = this.plotSegment.object.properties;
    const xMode = props.xData ? props.xData.type : "null";
    const yMode = props.yData ? props.yData.type : "null";
    // Sublayout is not applicable when one of x, y is scaffold ("default"), or both of them are numerical
    return (
      xMode != "default" &&
      yMode != "default" &&
      (xMode != "numerical" || yMode != "numerical")
    );
  }

  // eslint-disable-next-line
  public buildSublayoutWidgets(m: Controls.WidgetManager) {
    const extra: Controls.Widget[] = [];
    const props = this.plotSegment.object.properties;
    const type = props.sublayout.type;
    if (
      type == Region2DSublayoutType.DodgeX ||
      type == Region2DSublayoutType.DodgeY ||
      type == Region2DSublayoutType.Grid ||
      type == Region2DSublayoutType.Overlap
    ) {
      const isXFixed = props.xData && props.xData.type == "numerical";
      const isYFixed = props.yData && props.yData.type == "numerical";

      const alignmentWidgets = [];

      if (!isYFixed) {
        alignmentWidgets.push(
          m.inputSelect(
            { property: "sublayout", field: ["align", "y"] },
            {
              type: "radio",
              options: ["start", "middle", "end"],
              icons: [
                "AlignVerticalBottom",
                "AlignVerticalCenter",
                "AlignVerticalTop",
              ],
              labels: [
                strings.alignment.bottom,
                strings.alignment.middle,
                strings.alignment.top,
              ],
              tooltip: strings.canvas.alignItemsOnY,
              ignoreSearch: true,
            }
          )
        );
      }
      if (!isXFixed) {
        alignmentWidgets.push(
          m.inputSelect(
            { property: "sublayout", field: ["align", "x"] },
            {
              type: "radio",
              options: ["start", "middle", "end"],
              icons: [
                "AlignHorizontalLeft",
                "AlignHorizontalCenter",
                "AlignHorizontalRight",
              ],
              labels: [
                strings.alignment.left,
                strings.alignment.middle,
                strings.alignment.right,
              ],
              tooltip: strings.canvas.alignItemsOnX,
              ignoreSearch: true,
            }
          )
        );
      }

      extra.push(
        m.searchWrapper(
          {
            searchPattern: [
              strings.alignment.alignment,
              strings.objects.plotSegment.subLayout,
            ],
          },
          [
            m.vertical(
              m.label(strings.alignment.alignment, {
                ignoreSearch: true,
                addMargins: false,
              }),
              m.horizontal([0, 0, 0], ...alignmentWidgets.reverse(), null)
            ),
          ]
        )
      );
      if (type == Region2DSublayoutType.Grid) {
        extra.push(
          m.searchWrapper(
            {
              searchPattern: [
                strings.objects.axes.gap,
                strings.objects.plotSegment.subLayout,
                strings.coordinateSystem.x,
                strings.coordinateSystem.y,
              ],
            },
            [
              m.label(strings.objects.axes.gap, { ignoreSearch: true }),
              m.searchWrapper(
                {
                  searchPattern: [
                    strings.coordinateSystem.x,
                    strings.objects.axes.gap,
                    strings.objects.plotSegment.subLayout,
                  ],
                },
                [
                  m.inputNumber(
                    { property: "sublayout", field: "ratioX" },
                    {
                      minimum: 0,
                      maximum: 1,
                      percentage: true,
                      showSlider: true,
                      label: strings.coordinateSystem.x,
                      ignoreSearch: true,
                    }
                  ),
                ]
              ),
              m.searchWrapper(
                {
                  searchPattern: [
                    strings.coordinateSystem.y,
                    strings.objects.axes.gap,
                    strings.objects.plotSegment.subLayout,
                  ],
                },
                [
                  m.inputNumber(
                    { property: "sublayout", field: "ratioY" },
                    {
                      minimum: 0,
                      maximum: 1,
                      percentage: true,
                      showSlider: true,
                      label: strings.coordinateSystem.y,
                      ignoreSearch: true,
                    }
                  ),
                ]
              ),
            ]
          )
        );
      } else {
        extra.push(
          m.inputNumber(
            {
              property: "sublayout",
              field: type == Region2DSublayoutType.DodgeX ? "ratioX" : "ratioY",
            },
            {
              minimum: 0,
              maximum: 1,
              percentage: true,
              showSlider: true,
              label: strings.objects.axes.gap,
              searchSection: strings.objects.plotSegment.subLayout,
            }
          )
        );
      }
      if (type == Region2DSublayoutType.Grid) {
        const { terminology } = this.config;
        extra.push(
          m.inputSelect(
            { property: "sublayout", field: ["grid", "direction"] },
            {
              type: "radio",
              options: [GridDirection.X, GridDirection.Y],
              icons: ["GripperBarHorizontal", "GripperBarVertical"],
              labels: [terminology.gridDirectionX, terminology.gridDirectionY],
              label: strings.objects.plotSegment.orientation,
              searchSection: strings.objects.plotSegment.subLayout,
            }
          ),
          m.inputSelect(
            {
              property: "sublayout",
              field: ["grid", "gridStartPosition"],
            },
            {
              type: "radio",
              icons: [
                "ArrowTallDownRight",
                "ArrowTallDownLeft",
                "ArrowTallUpLeft",
                "ArrowTallUpRight",
              ],
              options: [
                GridStartPosition.LeftTop,
                GridStartPosition.RightTop,
                GridStartPosition.LeftBottom,
                GridStartPosition.RightBottom,
              ],
              labels: [
                strings.objects.plotSegment.directionDownRight,
                strings.objects.plotSegment.directionDownLeft,
                strings.objects.plotSegment.directionUpLeft,
                strings.objects.plotSegment.directionUpRight,
              ],
              label: strings.objects.plotSegment.direction,
              searchSection: strings.objects.plotSegment.subLayout,
            }
          ),
          m.inputNumber(
            {
              property: "sublayout",
              field:
                props.sublayout.grid.direction == "x"
                  ? ["grid", "xCount"]
                  : ["grid", "yCount"],
            },
            {
              label: strings.objects.axes.count,
              searchSection: strings.objects.plotSegment.subLayout,
              placeholder: strings.core.auto,
            }
          )
        );
      }
      if (type != Region2DSublayoutType.Overlap) {
        extra.push(
          m.searchWrapper(
            {
              searchPattern: [
                strings.objects.plotSegment.order,
                strings.objects.plotSegment.subLayout,
              ],
            },
            [
              m.label(strings.objects.plotSegment.order, {
                ignoreSearch: true,
                addMargins: false,
              }),
              m.horizontal(
                [0, 0],
                m.orderByWidget(
                  { property: "sublayout", field: "order" },
                  { table: this.plotSegment.object.table, shiftCallout: 15 }
                ),
                m.inputBoolean(
                  { property: "sublayout", field: "orderReversed" },
                  { type: "highlight", icon: "Sort", ignoreSearch: true }
                )
              ),
            ]
          )
        );
      }
    }
    if (type == Region2DSublayoutType.Packing) {
      extra.push(
        m.searchWrapper(
          {
            searchPattern: [
              strings.objects.plotSegment.subLayout,
              strings.objects.plotSegment.gravity,
              strings.coordinateSystem.x,
              strings.coordinateSystem.y,
            ],
          },
          [
            m.label(strings.objects.plotSegment.gravity, {
              ignoreSearch: true,
            }),
            m.inputNumber(
              { property: "sublayout", field: ["packing", "gravityX"] },
              {
                minimum: 0.1,
                maximum: 15,
                label: strings.coordinateSystem.x,
                ignoreSearch: true,
              }
            ),
            m.inputNumber(
              { property: "sublayout", field: ["packing", "gravityY"] },
              {
                minimum: 0.1,
                maximum: 15,
                label: strings.coordinateSystem.y,
                ignoreSearch: true,
              }
            ),
            m.label(strings.objects.plotSegment.packingInContainer, {
              ignoreSearch: true,
            }),
            m.inputBoolean(
              { property: "sublayout", field: ["packing", "boxedX"] },
              {
                type: "checkbox",
                label: strings.objects.plotSegment.packingX,
                ignoreSearch: false,
              }
            ),
            m.inputBoolean(
              { property: "sublayout", field: ["packing", "boxedY"] },
              {
                type: "checkbox",
                label: strings.objects.plotSegment.packingY,
                ignoreSearch: false,
              }
            ),
          ]
        )
      );
    }
    if (type == Region2DSublayoutType.Jitter) {
      extra.push(
        m.searchWrapper(
          {
            searchPattern: [
              strings.objects.plotSegment.distribution,
              strings.objects.plotSegment.subLayout,
            ],
          },
          [
            m.label(strings.objects.plotSegment.distribution, {
              ignoreSearch: true,
            }),
            m.inputBoolean(
              { property: "sublayout", field: ["jitter", "horizontal"] },
              {
                type: "highlight",
                icon: "HorizontalDistributeCenter",
                ignoreSearch: true,
              }
            ),
            m.inputBoolean(
              { property: "sublayout", field: ["jitter", "vertical"] },
              {
                type: "highlight",
                icon: "VerticalDistributeCenter",
                ignoreSearch: true,
              }
            ),
          ]
        )
      );
    }
    const options = this.applicableSublayoutOptions();
    return [
      m.verticalGroup(
        {
          header: strings.objects.plotSegment.subLayout,
        },
        [
          m.inputSelect(
            { property: "sublayout", field: "type" },
            {
              type: "radio",
              options: options.map((x) => x.value),
              icons: options.map((x) => x.icon),
              labels: options.map((x) => x.label),
              label: strings.objects.plotSegment.type,
              searchSection: strings.objects.plotSegment.subLayout,
            }
          ),
          ...extra,
        ]
      ),
    ];
  }

  public buildAxisWidgets(
    manager: Controls.WidgetManager,
    axisName: string,
    axis: "x" | "y"
  ): Controls.Widget[] {
    const props = this.plotSegment.object.properties;
    const data = axis == "x" ? props.xData : props.yData;
    const axisProperty =
      axis == "x"
        ? PlotSegmentAxisPropertyNames.xData
        : PlotSegmentAxisPropertyNames.yData;

    let axisType = "";
    if (data) {
      switch (data.type) {
        case AxisDataBindingType.Categorical:
          axisType = strings.objects.axes.categoricalSuffix;
          break;
        case AxisDataBindingType.Numerical:
          axisType = strings.objects.axes.numericalSuffix;
          break;
      }
    }
    const mainCollapsePanelHeader = axisName + axisType;

    return [
      manager.customCollapsiblePanel(
        [
          ...buildAxisWidgets(
            data,
            axisProperty,
            manager,
            axisName,
            {
              showOffset: true,
              showScrolling: true,
              showOnTop: true,
            },
            this.updatePlotSegment.bind(this)
          ),
          ...this.plotSegment.buildGridLineWidgets(
            data,
            manager,
            axisProperty,
            mainCollapsePanelHeader
          ),
        ],
        {
          header: mainCollapsePanelHeader,
          styles: {
            marginLeft: 5,
          },
        }
      ),
    ];
  }

  public updatePlotSegment() {
    if (this.chartStateManager && this.plotSegment) {
      this.chartStateManager.remapPlotSegmentGlyphs(this.plotSegment.object);
    }
  }

  public buildPanelWidgets(m: Controls.WidgetManager): Controls.Widget[] {
    const { terminology } = this.config;
    if (this.isSublayoutApplicable()) {
      return [
        ...this.buildAxisWidgets(m, terminology.xAxis, "x"),
        ...this.buildAxisWidgets(m, terminology.yAxis, "y"),
        ...this.buildSublayoutWidgets(m),
      ];
    } else {
      return [
        ...this.buildAxisWidgets(m, terminology.xAxis, "x"),
        ...this.buildAxisWidgets(m, terminology.yAxis, "y"),
      ];
    }
  }

  // eslint-disable-next-line
  public buildPopupWidgets(m: Controls.WidgetManager): Controls.Widget[] {
    const props = this.plotSegment.object.properties;
    const { icons, terminology } = this.config;
    let sublayout: Controls.Widget[] = [];

    if (this.isSublayoutApplicable()) {
      const extra: Controls.Widget[] = [];
      const isXFixed = props.xData && props.xData.type == "numerical";
      const isYFixed = props.yData && props.yData.type == "numerical";
      const type = props.sublayout.type;
      if (
        type == Region2DSublayoutType.DodgeX ||
        type == Region2DSublayoutType.DodgeY ||
        type == Region2DSublayoutType.Grid ||
        type == Region2DSublayoutType.Overlap
      ) {
        if (!isXFixed) {
          extra.push(
            m.inputSelect(
              { property: "sublayout", field: ["align", "x"] },
              {
                type: "dropdown",
                showLabel: true,
                labelPosition: LabelPosition.Bottom,
                options: ["start", "middle", "end"],
                icons: [icons.xMinIcon, icons.xMiddleIcon, icons.xMaxIcon],
                labels: [
                  terminology.xMin,
                  terminology.xMiddle,
                  terminology.xMax,
                ],
                tooltip: strings.canvas.alignItemsOnX,
                hideBorder: true,
                shiftCallout: 15,
              }
            )
          );
        }
        if (!isYFixed) {
          extra.push(
            m.inputSelect(
              { property: "sublayout", field: ["align", "y"] },
              {
                type: "dropdown",
                showLabel: true,
                labelPosition: LabelPosition.Bottom,
                options: ["start", "middle", "end"],
                icons: [icons.yMinIcon, icons.yMiddleIcon, icons.yMaxIcon],
                labels: [
                  terminology.yMin,
                  terminology.yMiddle,
                  terminology.yMax,
                ],
                tooltip: strings.canvas.alignItemsOnY,
                hideBorder: true,
                shiftCallout: 15,
              }
            )
          );
        }
        if (type == "grid") {
          extra.push(m.sep());
          extra.push(
            m.inputSelect(
              { property: "sublayout", field: ["grid", "direction"] },
              {
                type: "dropdown",
                showLabel: true,
                labelPosition: LabelPosition.Bottom,
                options: [GridDirection.X, GridDirection.Y],
                icons: ["GripperBarHorizontal", "GripperBarVertical"],
                labels: [
                  terminology.gridDirectionX,
                  terminology.gridDirectionY,
                ],
                tooltip: strings.canvas.gridDirection,
                hideBorder: true,
                shiftCallout: 15,
              }
            )
          );
          extra.push(
            m.inputSelect(
              {
                property: "sublayout",
                field: ["grid", "gridStartPosition"],
              },
              {
                type: "dropdown",
                icons: [
                  "ArrowTallDownRight",
                  "ArrowTallDownLeft",
                  "ArrowTallUpLeft",
                  "ArrowTallUpRight",
                ],
                options: [
                  GridStartPosition.LeftTop,
                  GridStartPosition.RightTop,
                  GridStartPosition.LeftBottom,
                  GridStartPosition.RightBottom,
                ],
                labels: [
                  strings.objects.plotSegment.directionDownRight,
                  strings.objects.plotSegment.directionDownLeft,
                  strings.objects.plotSegment.directionUpLeft,
                  strings.objects.plotSegment.directionUpRight,
                ],
                hideBorder: true,
              }
            )
          );
        }
        if (type != Region2DSublayoutType.Overlap) {
          extra.push(m.sep());
          extra.push(
            m.orderByWidget(
              { property: "sublayout", field: "order" },
              {
                table: this.plotSegment.object.table,
                displayLabel: true,
                tooltip: strings.canvas.elementOrders,
                shiftCallout: 15,
              }
            ),
            m.inputBoolean(
              { property: "sublayout", field: "orderReversed" },
              { type: "highlight", icon: "Sort" }
            )
          );
        }
      }
      const options = this.applicableSublayoutOptions();
      sublayout = [
        m.inputSelect(
          { property: "sublayout", field: "type" },
          {
            type: "dropdown",
            showLabel: true,
            labelPosition: LabelPosition.Bottom,
            options: options.map((x) => x.value),
            icons: options.map((x) => x.icon),
            labels: options.map((x) => x.label),
            tooltip: strings.canvas.sublayoutType,
            hideBorder: true,
            shiftCallout: 15,
          }
        ),
        ...extra,
      ];
    }

    const isXStacking = props.xData && props.xData.type == "default";
    const isYStacking = props.yData && props.yData.type == "default";
    if (isXStacking && !isYStacking) {
      if (props.xData.type == "default") {
        sublayout.push(m.label(terminology.xAxis + ": Stacking"));
      }
      sublayout.push(
        m.inputSelect(
          { property: "sublayout", field: ["align", "y"] },
          {
            type: "dropdown",
            showLabel: true,
            labelPosition: LabelPosition.Bottom,
            options: ["start", "middle", "end"],
            icons: [icons.yMinIcon, icons.yMiddleIcon, icons.yMaxIcon],
            labels: [terminology.yMin, terminology.yMiddle, terminology.yMax],
            hideBorder: true,
            shiftCallout: 15,
          }
        )
      );
    }
    if (isYStacking && !isXStacking) {
      if (props.yData.type == "default") {
        sublayout.push(m.label(terminology.yAxis + ": Stacking"));
      }
      sublayout.push(
        m.inputSelect(
          { property: "sublayout", field: ["align", "x"] },
          {
            type: "dropdown",
            showLabel: true,
            labelPosition: LabelPosition.Bottom,
            options: ["start", "middle", "end"],
            icons: [icons.xMinIcon, icons.xMiddleIcon, icons.xMaxIcon],
            labels: [terminology.xMin, terminology.xMiddle, terminology.xMax],
            hideBorder: true,
            shiftCallout: 15,
          }
        )
      );
    }
    if (isXStacking && isYStacking) {
      if (props.yData.type == "default") {
        sublayout.push(
          m.label(terminology.xAxis + " & " + terminology.yAxis + ": Stacking")
        );
      }
    }

    return [...sublayout];
  }
}

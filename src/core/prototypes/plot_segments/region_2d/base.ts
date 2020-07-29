// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Expression from "../../../expression";
import {
  ConstraintPlugins,
  ConstraintSolver,
  ConstraintStrength,
  Variable
} from "../../../solver";
import * as Specification from "../../../specification";
import { BuildConstraintsContext, Controls } from "../../common";
import { DataflowTable } from "../../dataflow";
import {
  buildAxisWidgets,
  getCategoricalAxis,
  getNumericalInterpolate
} from "../axis";
import { PlotSegmentClass } from "../plot_segment";

export interface Region2DSublayoutOptions extends Specification.AttributeMap {
  type: "overlap" | "dodge-x" | "dodge-y" | "grid" | "packing";

  /** Sublayout alignment (for dodge and grid) */
  align: {
    x: "start" | "middle" | "end";
    y: "start" | "middle" | "end";
  };

  ratioX: number;
  ratioY: number;

  /** Grid options */
  grid?: {
    /** Grid direction */
    direction: "x" | "y";
    /** Number of glyphs in X direction (direction == "x") */
    xCount?: number;
    /** Number of glyphs in Y direction (direction == "x") */
    yCount?: number;
  };

  /** Order in sublayout objects */
  order: Specification.Types.SortBy;
  orderReversed: boolean;
  /** packing options */
  packing: {
    gravityX: number;
    gravityY: number;
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
    axis: "x" | "y";
    reference: number;
    value: number;
    span: [number, number];
    scale: number;
  };
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

export interface Region2DConfiguration {
  terminology: {
    xAxis: string;
    yAxis: string;
    /** Items alignments */
    xMin: string;
    xMinIcon: string;
    xMiddle: string;
    xMiddleIcon: string;
    xMax: string;
    xMaxIcon: string;
    yMin: string;
    yMinIcon: string;
    yMiddle: string;
    yMiddleIcon: string;
    yMax: string;
    yMaxIcon: string;
    /** Stack X */
    dodgeX: string;
    dodgeXIcon: string;
    /** Stack Y */
    dodgeY: string;
    dodgeYIcon: string;
    /** Grid */
    grid: string;
    gridIcon: string;
    gridDirectionX: string;
    gridDirectionY: string;
    /** Packing force layout */
    packing: string;
    packingIcon: string;
    overlap: string;
    overlapIcon: string;
  };

  xAxisPrePostGap: boolean;
  yAxisPrePostGap: boolean;

  getXYScale?(): { x: number; y: number };
}

export class CrossFitter {
  private solver: ConstraintSolver;
  private mode: "min" | "max";
  private candidates: Array<[Variable, Array<[number, Variable]>, number]>;

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
    dst: Array<[number, Variable]>,
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
          [1, candidate[0]]
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
 * Describes variables for constraints group. Count of group matches with data cound
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
  public terminology: Region2DConfiguration["terminology"];

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
    public solverContext?: BuildConstraintsContext
  ) {
    this.terminology = config.terminology;
  }

  public getTableContext(): DataflowTable {
    return this.plotSegment.parent.dataflow.getTable(
      this.plotSegment.object.table
    );
  }

  public getExpression(expr: string): Expression.Expression {
    return this.plotSegment.parent.dataflow.cache.parse(expr);
  }

  public groupMarksByCategories(
    categories: Array<{ expression: string; categories: string[] }>
  ): number[][] {
    // Prepare categories
    const categoriesParsed = categories.map(c => {
      const imap = new Map<string, number>();
      for (let i = 0; i < c.categories.length; i++) {
        imap.set(c.categories[i], i);
      }
      return {
        categories: c.categories,
        indexMap: imap,
        stride: 0,
        expression: this.getExpression(c.expression)
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
      this.x2Name
    ]);

    solver.addLinear(
      ConstraintStrength.HARD,
      ratio * (props.marginX2 + props.marginX2),
      [[length - 1, gapX]],
      [[ratio, x2], [-ratio, x1]]
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
      this.y2Name
    ]);
    solver.addLinear(
      ConstraintStrength.HARD,
      ratio * (props.marginX2 + props.marginX2),
      [[length - 1, gapY]],
      [[ratio, y2], [-ratio, y1]]
    );
  }

  /** Map elements according to numerical/categorical mapping */
  public numericalMapping(axis: "x" | "y"): void {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const attrs = state.attributes;
    const dataIndices = state.dataRowIndices;

    const table = this.getTableContext();

    switch (axis) {
      case "x":
        {
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
                [[1 - t, x1], [t, x2]],
                [[1, solver.attr(markState.attributes, "x")]]
              );
            }
          }
          if (data.type == "categorical") {
            const [x1, x2, gapX] = solver.attrs(attrs, [
              this.x1Name,
              this.x2Name,
              "gapX"
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
                  [-data.categories.length / 2 + i + 0.5, gapX]
                ],
                [
                  [
                    data.categories.length,
                    solver.attr(markState.attributes, "x")
                  ]
                ]
              );
            }
          }
          // solver.addEquals(ConstraintWeight.HARD, x, x1);
        }
        break;
      case "y": {
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
              [[1 - t, y1], [t, y2]],
              [[1, solver.attr(markState.attributes, "y")]]
            );
          }
        }
        if (data.type == "categorical") {
          const [y1, y2, gapY] = solver.attrs(attrs, [
            this.y1Name,
            this.y2Name,
            "gapY"
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
                [-data.categories.length / 2 + i + 0.5, gapY]
              ],
              [[data.categories.length, solver.attr(markState.attributes, "y")]]
            );
          }
        }
        // solver.addEquals(ConstraintWeight.HARD, y, y2);
      }
    }
  }

  public groupMarksByCategoricalMapping(axis: "x" | "y" | "xy") {
    const props = this.plotSegment.object.properties;
    switch (axis) {
      case "x": {
        const data = props.xData;
        return this.groupMarksByCategories([
          { categories: data.categories, expression: data.expression }
        ]);
      }
      case "y": {
        const data = props.yData;
        return this.groupMarksByCategories([
          { categories: data.categories, expression: data.expression }
        ]);
      }
      case "xy": {
        const xData = props.xData;
        const yData = props.yData;
        return this.groupMarksByCategories([
          { categories: xData.categories, expression: xData.expression },
          { categories: yData.categories, expression: yData.expression }
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
          const data = props.xData;
          const [x1, x2, y1, y2] = solver.attrs(attrs, [
            this.x1Name,
            this.x2Name,
            this.y1Name,
            this.y2Name
          ]);

          const axis = getCategoricalAxis(
            data,
            this.config.xAxisPrePostGap,
            false
          );

          const sublayoutGroups: SublayoutGroup[] = [];
          for (let cindex = 0; cindex < data.categories.length; cindex++) {
            const [t1, t2] = axis.ranges[cindex];

            // t1 * x2 = (1 - t1) * x2
            const vx1Expr = [[t1, x2], [1 - t1, x1]] as Array<
              [number, Variable]
            >;
            // t2 * x2 = (1 - t2) * x2
            const vx2Expr = [[t2, x2], [1 - t2, x1]] as Array<
              [number, Variable]
            >;

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
              y2
            });
          }
          this.applySublayout(sublayoutGroups, "x", sublayoutContext);
        }
        break;
      case "y":
        {
          const data = props.yData;
          const [x1, x2, y1, y2] = solver.attrs(attrs, [
            this.x1Name,
            this.x2Name,
            this.y1Name,
            this.y2Name
          ]);

          const axis = getCategoricalAxis(
            data,
            this.config.yAxisPrePostGap,
            true
          );

          const sublayoutGroups: SublayoutGroup[] = [];
          for (let cindex = 0; cindex < data.categories.length; cindex++) {
            const [t1, t2] = axis.ranges[cindex];

            const vy1Expr = [[t1, y2], [1 - t1, y1]] as Array<
              [number, Variable]
            >;
            const vy2Expr = [[t2, y2], [1 - t2, y1]] as Array<
              [number, Variable]
            >;

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
              y2: vy2
            });
          }
          this.applySublayout(sublayoutGroups, "y", sublayoutContext);
        }
        break;
      case "xy":
        {
          const xData = props.xData;
          const yData = props.yData;
          const [x1, x2, y1, y2] = solver.attrs(attrs, [
            this.x1Name,
            this.x2Name,
            this.y1Name,
            this.y2Name
          ]);

          const xAxis = getCategoricalAxis(
            xData,
            this.config.xAxisPrePostGap,
            false
          );
          const yAxis = getCategoricalAxis(
            yData,
            this.config.yAxisPrePostGap,
            true
          );

          const sublayoutGroups: SublayoutGroup[] = [];
          for (let yIndex = 0; yIndex < yData.categories.length; yIndex++) {
            const [ty1, ty2] = yAxis.ranges[yIndex];
            for (let xIndex = 0; xIndex < xData.categories.length; xIndex++) {
              const [tx1, tx2] = xAxis.ranges[xIndex];

              const vx1Expr = [[tx1, x2], [1 - tx1, x1]] as Array<
                [number, Variable]
              >;
              const vx2Expr = [[tx2, x2], [1 - tx2, x1]] as Array<
                [number, Variable]
              >;

              const vy1Expr = [[ty1, y2], [1 - ty1, y1]] as Array<
                [number, Variable]
              >;
              const vy2Expr = [[ty2, y2], [1 - ty2, y1]] as Array<
                [number, Variable]
              >;

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
                y2: vy2
              });
            }
          }
          this.applySublayout(sublayoutGroups, "xy", sublayoutContext);
        }
        break;
    }
  }

  public categoricalHandles(
    axis: "x" | "y" | "xy",
    sublayout: boolean
  ): Region2DHandleDescription[] {
    let handles: Region2DHandleDescription[] = [];
    const props = this.plotSegment.object.properties;
    const x1 = this.plotSegment.state.attributes[this.x1Name] as number;
    const y1 = this.plotSegment.state.attributes[this.y1Name] as number;
    const x2 = this.plotSegment.state.attributes[this.x2Name] as number;
    const y2 = this.plotSegment.state.attributes[this.y2Name] as number;

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
              y2: yAxis ? yAxis.ranges[iy][1] * (y2 - y1) + y1 : y2
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
            property: { property: "xData", field: "gapRatio" },
            axis: "x",
            reference: p1 * (x2 - x1) + x1,
            value: data.gapRatio,
            scale: axis.gapScale * (x2 - x1),
            span: [y1, y2]
          }
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
            property: { property: "yData", field: "gapRatio" },
            axis: "y",
            reference: p1 * (y2 - y1) + y1,
            value: data.gapRatio,
            scale: axis.gapScale * (y2 - y1),
            span: [x1, x2]
          }
        });
      }
    }
    return handles;
  }

  public stacking(axis: "x" | "y"): void {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const attrs = state.attributes;
    const dataIndices = state.dataRowIndices;

    const [x1, x2, y1, y2] = solver.attrs(attrs, [
      this.x1Name,
      this.x2Name,
      this.y1Name,
      this.y2Name
    ]);

    const count = dataIndices.length;

    const doStack = count <= 36;

    for (const [index, markState] of state.glyphs.entries()) {
      switch (axis) {
        case "x":
          {
            const [gapX] = solver.attrs(attrs, ["gapX"]);
            if (doStack) {
              if (index > 0) {
                const x2Prev = solver.attr(
                  state.glyphs[index - 1].attributes,
                  "x2"
                );
                const x1This = solver.attr(
                  state.glyphs[index].attributes,
                  "x1"
                );
                solver.addLinear(ConstraintStrength.HARD, 0, [
                  [1, x2Prev],
                  [-1, x1This],
                  [1, gapX]
                ]);
              }
              if (index == 0) {
                const x1This = solver.attr(
                  state.glyphs[index].attributes,
                  "x1"
                );
                // solver.addEquals(ConstraintWeight.HARD, x1, x1This);
                solver.addLinear(
                  ConstraintStrength.HARD,
                  0,
                  [[1, x1]],
                  [[1, x1This]]
                );
              }
              if (index == state.glyphs.length - 1) {
                const x2This = solver.attr(
                  state.glyphs[index].attributes,
                  "x2"
                );
                solver.addLinear(
                  ConstraintStrength.HARD,
                  0,
                  [[1, x2]],
                  [[1, x2This]]
                );
              }
            } else {
              const t = (index + 0.5) / count;
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [[1 - t, x1], [t, x2]],
                [[1, solver.attr(markState.attributes, "x")]]
              );
              solver.addLinear(
                ConstraintStrength.WEAK,
                0,
                [[1, x2], [-1, x1]],
                [
                  [count, solver.attr(markState.attributes, "width")],
                  [count - 1, gapX]
                ]
              );
            }
          }
          break;
        case "y":
          {
            const [gapY] = solver.attrs(attrs, ["gapY"]);
            if (doStack) {
              if (index > 0) {
                const y2Prev = solver.attr(
                  state.glyphs[index - 1].attributes,
                  "y2"
                );
                const y1This = solver.attr(
                  state.glyphs[index].attributes,
                  "y1"
                );
                solver.addLinear(ConstraintStrength.HARD, 0, [
                  [1, y2Prev],
                  [-1, y1This],
                  [1, gapY]
                ]);
              }
              if (index == 0) {
                const y1This = solver.attr(
                  state.glyphs[index].attributes,
                  "y1"
                );
                solver.addLinear(
                  ConstraintStrength.HARD,
                  0,
                  [[1, y1]],
                  [[1, y1This]]
                );
              }
              if (index == state.glyphs.length - 1) {
                const y2This = solver.attr(
                  state.glyphs[index].attributes,
                  "y2"
                );
                solver.addLinear(
                  ConstraintStrength.HARD,
                  0,
                  [[1, y2]],
                  [[1, y2This]]
                );
              }
            } else {
              const t = (index + 0.5) / count;
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [[1 - t, y2], [t, y1]],
                [[1, solver.attr(markState.attributes, "y")]]
              );
              solver.addLinear(
                ConstraintStrength.WEAK,
                0,
                [[1, y2], [-1, y1]],
                [
                  [count, solver.attr(markState.attributes, "height")],
                  [count - 1, gapY]
                ]
              );
            }
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

  public fitGroups(groups: SublayoutGroup[], axis: "x" | "y" | "xy") {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const fitters = new DodgingFitters(solver);

    const alignment = props.sublayout.align;

    groups.forEach(group => {
      const markStates = group.group.map(index => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;

      for (let index = 0; index < markStates.length; index++) {
        const m1 = markStates[index];
        if (axis == "x" || axis == "xy") {
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
                [1, solver.attr(m1.attributes, "x2")]
              ],
              [[1, x1], [1, x2]]
            );
          }
        }
        if (axis == "y" || axis == "xy") {
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
                [1, solver.attr(m1.attributes, "y2")]
              ],
              [[1, y1], [1, y2]]
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
        if (props.sublayout.type == "packing") {
          this.sublayoutPacking(groups, context.mode == "x-only" ? "x" : "y");
        } else {
          this.fitGroups(groups, axis);
        }
      } else {
        if (props.sublayout.type == "overlap") {
          this.fitGroups(groups, "xy");
        }
        // Stack X
        if (props.sublayout.type == "dodge-x") {
          this.sublayoutDodging(groups, "x", context.xAxisPrePostGap);
        }
        // Stack Y
        if (props.sublayout.type == "dodge-y") {
          this.sublayoutDodging(groups, "y", context.yAxisPrePostGap);
        }
        // Grid layout
        if (props.sublayout.type == "grid") {
          this.sublayoutGrid(groups);
        }
        // Force layout
        if (props.sublayout.type == "packing") {
          this.sublayoutPacking(groups);
        }
      }
    }
  }

  public sublayoutDodging(
    groups: SublayoutGroup[],
    direction: "x" | "y",
    enablePrePostGap: boolean
  ) {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const props = this.plotSegment.object.properties;
    const dataIndices = state.dataRowIndices;

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

    groups.forEach(group => {
      const markStates = group.group.map(index => state.glyphs[index]);
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
                  [-1, solver.attr(m1.attributes, "x1")]
                ]);
              }
              break;
            case "y":
              {
                solver.addLinear(ConstraintStrength.HARD, 0, [
                  [dodgeGapRatio, y2],
                  [-dodgeGapRatio, y1],
                  [1, solver.attr(m0.attributes, "y2")],
                  [-1, solver.attr(m1.attributes, "y1")]
                ]);
              }
              break;
          }
        }

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
                    [1, solver.attr(m1.attributes, "y2")]
                  ],
                  [[1, y1], [1, y2]]
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
                    [1, solver.attr(m1.attributes, "x2")]
                  ],
                  [[1, x1], [1, x2]]
                );
              }
            }
            break;
        }
      }
      const m1 = markStates[0];
      const mN = markStates[markStates.length - 1];
      switch (direction) {
        case "x":
          {
            const x1WithGap: Array<[number, Variable]> = [
              [1, x1],
              [dodgeGapOffset, x2],
              [-dodgeGapOffset, x1]
            ];
            const x2WithGap: Array<[number, Variable]> = [
              [1, x2],
              [dodgeGapOffset, x1],
              [-dodgeGapOffset, x2]
            ];
            if (alignment.x == "start") {
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [[1, solver.attr(m1.attributes, "x1")]],
                x1WithGap
              );
            } else {
              fitters.xMin.addComplex(
                solver.attr(m1.attributes, "x1"),
                x1WithGap
              );
            }
            if (alignment.x == "end") {
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [[1, solver.attr(mN.attributes, "x2")]],
                x2WithGap
              );
            } else {
              fitters.xMax.addComplex(
                solver.attr(mN.attributes, "x2"),
                x2WithGap
              );
            }
            if (alignment.x == "middle") {
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [
                  [1, solver.attr(m1.attributes, "x1")],
                  [1, solver.attr(mN.attributes, "x2")]
                ],
                [[1, x1], [1, x2]]
              );
            }
          }
          break;
        case "y":
          {
            const y1WithGap: Array<[number, Variable]> = [
              [1, y1],
              [dodgeGapOffset, y2],
              [-dodgeGapOffset, y1]
            ];
            const y2WithGap: Array<[number, Variable]> = [
              [1, y2],
              [dodgeGapOffset, y1],
              [-dodgeGapOffset, y2]
            ];
            if (alignment.y == "start") {
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [[1, solver.attr(m1.attributes, "y1")]],
                y1WithGap
              );
            } else {
              fitters.yMin.addComplex(
                solver.attr(m1.attributes, "y1"),
                y1WithGap
              );
            }
            if (alignment.y == "end") {
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [[1, solver.attr(mN.attributes, "y2")]],
                y2WithGap
              );
            } else {
              fitters.yMax.addComplex(
                solver.attr(mN.attributes, "y2"),
                y2WithGap
              );
            }
            if (alignment.y == "middle") {
              solver.addLinear(
                ConstraintStrength.HARD,
                0,
                [
                  [1, solver.attr(m1.attributes, "y1")],
                  [1, solver.attr(mN.attributes, "y2")]
                ],
                [[1, y1], [1, y2]]
              );
            }
          }
          break;
      }
    });

    fitters.addConstraint(ConstraintStrength.MEDIUM);
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
    groups.forEach(group => {
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

    groups.forEach(group => {
      const markStates = group.group.map(index => state.glyphs[index]);
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
        } else {
          yi = yMax - 1 - (i % yCount);
          xi = Math.floor(i / yCount);
          if (alignX == "end") {
            yi = (markStates.length - 1 - i) % yCount;
            xi = xMax - 1 - Math.floor((markStates.length - 1 - i) / yCount);
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
        const cellX1: Array<[number, Variable]> = [
          [(xi / xCount) * (1 + gapRatioX), x2],
          [1 - (xi / xCount) * (1 + gapRatioX), x1]
        ];
        const cellX2: Array<[number, Variable]> = [
          [((xi + 1) / xCount) * (1 + gapRatioX) - gapRatioX, x2],
          [1 - ((xi + 1) / xCount) * (1 + gapRatioX) + gapRatioX, x1]
        ];
        const cellY1: Array<[number, Variable]> = [
          [(yi / yCount) * (1 + gapRatioY), y2],
          [1 - (yi / yCount) * (1 + gapRatioY), y1]
        ];
        const cellY2: Array<[number, Variable]> = [
          [((yi + 1) / yCount) * (1 + gapRatioY) - gapRatioY, y2],
          [1 - ((yi + 1) / yCount) * (1 + gapRatioY) + gapRatioY, y1]
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
              [1, solver.attr(state.attributes, "x2")]
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
              [1, solver.attr(state.attributes, "y2")]
            ],
            cellY1.concat(cellY2)
          );
        }
      }
    });
    xMinFitter.addConstraint(ConstraintStrength.MEDIUM);
    xMaxFitter.addConstraint(ConstraintStrength.MEDIUM);
    yMinFitter.addConstraint(ConstraintStrength.MEDIUM);
    yMaxFitter.addConstraint(ConstraintStrength.MEDIUM);
  }

  public sublayoutHandles(
    groups: Array<{
      group: number[];
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>,
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

    if (props.sublayout.type == "dodge-x") {
      for (const group of groups) {
        for (let i = 0; i < group.group.length - 1; i++) {
          const state1 = state.glyphs[group.group[i]];
          const state2 = state.glyphs[group.group[i + 1]];
          const p1 = state1.attributes.x2 as number;
          const minY = Math.min(
            state1.attributes.y1 as number,
            state1.attributes.y2 as number,
            state2.attributes.y1 as number,
            state2.attributes.y2 as number
          );
          const maxY = Math.max(
            state1.attributes.y1 as number,
            state1.attributes.y2 as number,
            state2.attributes.y1 as number,
            state2.attributes.y2 as number
          );
          handles.push({
            type: "gap",
            gap: {
              axis: "x",
              property: { property: "sublayout", field: "ratioX" },
              reference: p1,
              value: props.sublayout.ratioX,
              scale:
                (1 / (enablePrePostGapX ? maxCount : maxCount - 1)) *
                (group.x2 - group.x1),
              span: [minY, maxY]
            }
          });
        }
      }
    }
    if (props.sublayout.type == "dodge-y") {
      for (const group of groups) {
        for (let i = 0; i < group.group.length - 1; i++) {
          const state1 = state.glyphs[group.group[i]];
          const state2 = state.glyphs[group.group[i + 1]];
          const p1 = state1.attributes.y2 as number;
          const minX = Math.min(
            state1.attributes.x1 as number,
            state1.attributes.x2 as number,
            state2.attributes.x1 as number,
            state2.attributes.x2 as number
          );
          const maxX = Math.max(
            state1.attributes.x1 as number,
            state1.attributes.x2 as number,
            state2.attributes.x1 as number,
            state2.attributes.x2 as number
          );
          handles.push({
            type: "gap",
            gap: {
              axis: "y",
              property: { property: "sublayout", field: "ratioY" },
              reference: p1,
              value: props.sublayout.ratioY,
              scale:
                (1 / (enablePrePostGapY ? maxCount : maxCount - 1)) *
                (group.y2 - group.y1),
              span: [minX, maxX]
            }
          });
        }
      }
    }
    if (props.sublayout.type == "grid") {
      // TODO: implement grid sublayout handles
    }
    return handles;
  }

  public sublayoutPacking(groups: SublayoutGroup[], axisOnly?: "x" | "y") {
    const solver = this.solver;
    const state = this.plotSegment.state;
    const packingProps = this.plotSegment.object.properties.sublayout.packing;

    groups.forEach(group => {
      const markStates = group.group.map(index => state.glyphs[index]);
      const { x1, y1, x2, y2 } = group;
      const centerState: Specification.AttributeMap = {
        cx: 0,
        cy: 0
      };
      const cx = solver.attr(centerState, "cx", {
        edit: true
      });
      const cy = solver.attr(centerState, "cy", {
        edit: true
      });
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[2, cx]],
        [[1, x1], [1, x2]]
      );
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[2, cy]],
        [[1, y1], [1, y2]]
      );
      const points = markStates.map(state => {
        let radius = 0;
        for (const e of state.marks) {
          if (e.attributes.size != null) {
            radius = Math.max(
              radius,
              Math.sqrt((e.attributes.size as number) / Math.PI)
            );
          } else {
            const w = e.attributes.width as number;
            const h = e.attributes.height as number;
            if (w != null && h != null) {
              radius = Math.max(radius, Math.sqrt(w * w + h * h) / 2);
            }
          }
        }
        if (radius == 0) {
          radius = 5;
        }
        return [
          solver.attr(state.attributes, "x"),
          solver.attr(state.attributes, "y"),
          radius
        ] as [Variable, Variable, number];
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
            gravityY: packingProps && packingProps.gravityY
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
                        x1: state.attributes[this.x1Name] as number,
                        y1: state.attributes[this.y1Name] as number,
                        x2: state.attributes[this.x2Name] as number,
                        y2: state.attributes[this.y2Name] as number,
                        group: state.dataRowIndices.map((x, i) => i)
                      }
                    ],
                    this.config.xAxisPrePostGap,
                    this.config.yAxisPrePostGap
                  )
                );
              }
              break;
            case "numerical":
              {
              }
              break;
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
            case "null":
              {
              }
              break;
            case "numerical":
              {
              }
              break;
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
                      group: state.dataRowIndices.map((x, i) => i)
                    }
                  ],
                  "xy",
                  {
                    mode: "default",
                    xAxisPrePostGap: this.config.xAxisPrePostGap,
                    yAxisPrePostGap: this.config.yAxisPrePostGap
                  }
                );
              }
              break;
            case "default":
              {
                this.stacking("y");
                this.applySublayout(
                  [
                    {
                      x1: solver.attr(attrs, this.x1Name),
                      y1: solver.attr(attrs, this.y1Name),
                      x2: solver.attr(attrs, this.x2Name),
                      y2: solver.attr(attrs, this.y2Name),
                      group: state.dataRowIndices.map((x, i) => i)
                    }
                  ],
                  "x",
                  {
                    mode: "x-only"
                  }
                );
              }
              break;
            case "numerical":
              {
                // null, numerical
                this.numericalMapping("y");
                this.applySublayout(
                  [
                    {
                      x1: solver.attr(attrs, this.x1Name),
                      y1: solver.attr(attrs, this.y1Name),
                      x2: solver.attr(attrs, this.x2Name),
                      y2: solver.attr(attrs, this.y2Name),
                      group: state.dataRowIndices.map((x, i) => i)
                    }
                  ],
                  "x",
                  {
                    mode: "x-only"
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
        break;
      case "default":
        {
          switch (yMode) {
            case "null":
              {
                this.stacking("x");
                this.applySublayout(
                  [
                    {
                      x1: solver.attr(attrs, this.x1Name),
                      y1: solver.attr(attrs, this.y1Name),
                      x2: solver.attr(attrs, this.x2Name),
                      y2: solver.attr(attrs, this.y2Name),
                      group: state.dataRowIndices.map((x, i) => i)
                    }
                  ],
                  "y",
                  {
                    mode: "y-only"
                  }
                );
              }
              break;
            case "default":
              {
                this.stacking("x");
                this.stacking("y");
              }
              break;
            case "numerical":
              {
                this.stacking("x");
                this.numericalMapping("y");
              }
              break;
            case "categorical":
              {
                this.stacking("x");
                this.categoricalMapping("y", { mode: "disabled" });
              }
              break;
          }
        }
        break;
      case "numerical":
        {
          switch (yMode) {
            case "null":
              {
                // numerical, null
                this.numericalMapping("x");
                this.applySublayout(
                  [
                    {
                      x1: solver.attr(attrs, this.x1Name),
                      y1: solver.attr(attrs, this.y1Name),
                      x2: solver.attr(attrs, this.x2Name),
                      y2: solver.attr(attrs, this.y2Name),
                      group: state.dataRowIndices.map((x, i) => i)
                    }
                  ],
                  "y",
                  {
                    mode: "y-only"
                  }
                );
              }
              break;
            case "default":
              {
                this.stacking("y");
                this.numericalMapping("x");
              }
              break;
            case "numerical":
              {
                // numerical, numerical
                this.numericalMapping("x");
                this.numericalMapping("y");
              }
              break;
            case "categorical":
              {
                // numerical, categorical
                this.numericalMapping("x");
                this.categoricalMapping("y", { mode: "y-only" });
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
                this.categoricalMapping("x", { mode: "default" });
              }
              break;
            case "default":
              {
                this.stacking("y");
                this.categoricalMapping("x", { mode: "disabled" });
              }
              break;
            case "numerical":
              {
                this.numericalMapping("y");
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

  public applicableSublayoutOptions() {
    const overlapOption = {
      value: "overlap",
      label: this.terminology.overlap,
      icon: this.terminology.overlapIcon
    };
    const packingOption = {
      value: "packing",
      label: this.terminology.packing,
      icon: this.terminology.packingIcon
    };
    const dodgeXOption = {
      value: "dodge-x",
      label: this.terminology.dodgeX,
      icon: this.terminology.dodgeXIcon
    };
    const dodgeYOption = {
      value: "dodge-y",
      label: this.terminology.dodgeY,
      icon: this.terminology.dodgeYIcon
    };
    const gridOption = {
      value: "grid",
      label: this.terminology.grid,
      icon: this.terminology.gridIcon
    };
    const props = this.plotSegment.object.properties;
    const xMode = props.xData ? props.xData.type : "null";
    const yMode = props.yData ? props.yData.type : "null";
    if (
      (xMode == "null" || xMode == "categorical") &&
      (yMode == "null" || yMode == "categorical")
    ) {
      return [
        overlapOption,
        dodgeXOption,
        dodgeYOption,
        gridOption,
        packingOption
      ];
    }
    return [overlapOption, packingOption];
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

  public buildSublayoutWidgets(m: Controls.WidgetManager) {
    const extra: Controls.Widget[] = [];
    const props = this.plotSegment.object.properties;
    const type = props.sublayout.type;
    if (
      type == "dodge-x" ||
      type == "dodge-y" ||
      type == "grid" ||
      type == "overlap"
    ) {
      const isXFixed = props.xData && props.xData.type == "numerical";
      const isYFixed = props.yData && props.yData.type == "numerical";
      extra.push(
        m.row(
          "Align",
          m.horizontal(
            [0, 0],
            isXFixed
              ? null
              : m.inputSelect(
                  { property: "sublayout", field: ["align", "x"] },
                  {
                    type: "radio",
                    options: ["start", "middle", "end"],
                    icons: ["align/left", "align/x-middle", "align/right"],
                    labels: ["Left", "Middle", "Right"]
                  }
                ),
            isYFixed
              ? null
              : m.inputSelect(
                  { property: "sublayout", field: ["align", "y"] },
                  {
                    type: "radio",
                    options: ["start", "middle", "end"],
                    icons: ["align/bottom", "align/y-middle", "align/top"],
                    labels: ["Bottom", "Middle", "Top"]
                  }
                )
          )
        )
      );
      if (type == "grid") {
        extra.push(
          m.row(
            "Gap",
            m.horizontal(
              [0, 1, 0, 1],
              m.label("x: "),
              m.inputNumber(
                { property: "sublayout", field: "ratioX" },
                { minimum: 0, maximum: 1, percentage: true, showSlider: true }
              ),
              m.label("y: "),
              m.inputNumber(
                { property: "sublayout", field: "ratioY" },
                { minimum: 0, maximum: 1, percentage: true, showSlider: true }
              )
            )
          )
        );
      } else {
        extra.push(
          m.row(
            "Gap",
            m.inputNumber(
              {
                property: "sublayout",
                field: type == "dodge-x" ? "ratioX" : "ratioY"
              },
              { minimum: 0, maximum: 1, percentage: true, showSlider: true }
            )
          )
        );
      }
      if (type == "grid") {
        extra.push(
          m.row(
            "Direction",
            m.horizontal(
              [0, 0, 1],
              m.inputSelect(
                { property: "sublayout", field: ["grid", "direction"] },
                {
                  type: "radio",
                  options: ["x", "y"],
                  icons: ["scaffold/xwrap", "scaffold/ywrap"],
                  labels: [
                    this.terminology.gridDirectionX,
                    this.terminology.gridDirectionY
                  ]
                }
              ),
              m.label("Count:"),
              m.inputNumber({
                property: "sublayout",
                field:
                  props.sublayout.grid.direction == "x"
                    ? ["grid", "xCount"]
                    : ["grid", "yCount"]
              })
            )
          )
        );
      }
      if (type != "overlap") {
        extra.push(
          m.row(
            "Order",
            m.horizontal(
              [0, 0],
              m.orderByWidget(
                { property: "sublayout", field: "order" },
                { table: this.plotSegment.object.table }
              ),
              m.inputBoolean(
                { property: "sublayout", field: "orderReversed" },
                { type: "highlight", icon: "general/order-reversed" }
              )
            )
          )
        );
      }
    }
    if (type == "packing") {
      extra.push(
        m.row(
          "Gravity",
          m.horizontal(
            [0, 1, 0, 1],
            m.label("x: "),
            m.inputNumber(
              { property: "sublayout", field: ["packing", "gravityX"] },
              { minimum: 0.1, maximum: 15 }
            ),
            m.label("y: "),
            m.inputNumber(
              { property: "sublayout", field: ["packing", "gravityY"] },
              { minimum: 0.1, maximum: 15 }
            )
          )
        )
      );
    }
    const options = this.applicableSublayoutOptions();
    return [
      m.sectionHeader("Sub-layout"),
      m.row(
        "Type",
        m.inputSelect(
          { property: "sublayout", field: "type" },
          {
            type: "radio",
            options: options.map(x => x.value),
            icons: options.map(x => x.icon),
            labels: options.map(x => x.label)
          }
        )
      ),
      ...extra
    ];
  }

  public buildAxisWidgets(
    m: Controls.WidgetManager,
    axisName: string,
    axis: "x" | "y"
  ): Controls.Widget[] {
    const props = this.plotSegment.object.properties;
    const data = axis == "x" ? props.xData : props.yData;
    const axisProperty = axis == "x" ? "xData" : "yData";
    return buildAxisWidgets(data, axisProperty, m, axisName);
  }

  public buildPanelWidgets(m: Controls.WidgetManager): Controls.Widget[] {
    if (this.isSublayoutApplicable()) {
      return [
        ...this.buildAxisWidgets(m, this.terminology.xAxis, "x"),
        ...this.buildAxisWidgets(m, this.terminology.yAxis, "y"),
        ...this.buildSublayoutWidgets(m)
      ];
    } else {
      return [
        ...this.buildAxisWidgets(m, this.terminology.xAxis, "x"),
        ...this.buildAxisWidgets(m, this.terminology.yAxis, "y")
      ];
    }
  }

  public buildPopupWidgets(m: Controls.WidgetManager): Controls.Widget[] {
    const props = this.plotSegment.object.properties;
    let sublayout: Controls.Widget[] = [];

    if (this.isSublayoutApplicable()) {
      const extra: Controls.Widget[] = [];
      const isXFixed = props.xData && props.xData.type == "numerical";
      const isYFixed = props.yData && props.yData.type == "numerical";
      const type = props.sublayout.type;
      if (
        type == "dodge-x" ||
        type == "dodge-y" ||
        type == "grid" ||
        type == "overlap"
      ) {
        if (!isXFixed) {
          extra.push(
            m.inputSelect(
              { property: "sublayout", field: ["align", "x"] },
              {
                type: "dropdown",
                options: ["start", "middle", "end"],
                icons: [
                  this.terminology.xMinIcon,
                  this.terminology.xMiddleIcon,
                  this.terminology.xMaxIcon
                ],
                labels: [
                  this.terminology.xMin,
                  this.terminology.xMiddle,
                  this.terminology.xMax
                ]
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
                options: ["start", "middle", "end"],
                icons: [
                  this.terminology.yMinIcon,
                  this.terminology.yMiddleIcon,
                  this.terminology.yMaxIcon
                ],
                labels: [
                  this.terminology.yMin,
                  this.terminology.yMiddle,
                  this.terminology.yMax
                ]
              }
            )
          );
        }
        if (type == "grid") {
          extra.push(
            m.inputSelect(
              { property: "sublayout", field: ["grid", "direction"] },
              {
                type: "dropdown",
                options: ["x", "y"],
                icons: ["scaffold/xwrap", "scaffold/ywrap"],
                labels: [
                  this.terminology.gridDirectionX,
                  this.terminology.gridDirectionY
                ]
              }
            )
          );
        }
        if (type != "overlap") {
          extra.push(m.sep());
          extra.push(
            m.orderByWidget(
              { property: "sublayout", field: "order" },
              { table: this.plotSegment.object.table }
            ),
            m.inputBoolean(
              { property: "sublayout", field: "orderReversed" },
              { type: "highlight", icon: "general/order-reversed" }
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
            options: options.map(x => x.value),
            icons: options.map(x => x.icon),
            labels: options.map(x => x.label)
          }
        ),
        ...extra
      ];
    }

    const isXStacking = props.xData && props.xData.type == "default";
    const isYStacking = props.yData && props.yData.type == "default";
    if (isXStacking && !isYStacking) {
      if (props.xData.type == "default") {
        sublayout.push(m.label(this.terminology.xAxis + ": Stacking"));
      }
      sublayout.push(
        m.inputSelect(
          { property: "sublayout", field: ["align", "y"] },
          {
            type: "dropdown",
            options: ["start", "middle", "end"],
            icons: [
              this.terminology.yMinIcon,
              this.terminology.yMiddleIcon,
              this.terminology.yMaxIcon
            ],
            labels: [
              this.terminology.yMin,
              this.terminology.yMiddle,
              this.terminology.yMax
            ]
          }
        )
      );
    }
    if (isYStacking && !isXStacking) {
      if (props.yData.type == "default") {
        sublayout.push(m.label(this.terminology.yAxis + ": Stacking"));
      }
      sublayout.push(
        m.inputSelect(
          { property: "sublayout", field: ["align", "x"] },
          {
            type: "dropdown",
            options: ["start", "middle", "end"],
            icons: [
              this.terminology.xMinIcon,
              this.terminology.xMiddleIcon,
              this.terminology.xMaxIcon
            ],
            labels: [
              this.terminology.xMin,
              this.terminology.xMiddle,
              this.terminology.xMax
            ]
          }
        )
      );
    }
    if (isXStacking && isYStacking) {
      if (props.yData.type == "default") {
        sublayout.push(
          m.label(
            this.terminology.xAxis +
              " & " +
              this.terminology.yAxis +
              ": Stacking"
          )
        );
      }
    }

    return [...sublayout];
  }
}

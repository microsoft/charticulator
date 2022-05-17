// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { forceSimulation, forceCollide, forceX, forceY } from "d3-force";
import { Rect } from "src/container";
import { AxisMode } from "../../prototypes/plot_segments/axis";
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

interface NodeType {
  x?: number;
  y?: number;
  r: number;
}

export interface PackingPluginOptions {
  gravityX: number;
  gravityY: number;
  boxed?: Rect;
}

export class PackingPlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public cx: Variable;
  public cy: Variable;
  public points: [Variable, Variable, number][];
  public xEnable: boolean;
  public yEnable: boolean;
  public getXYScale: () => { x: number; y: number };
  public gravityX?: number;
  public gravityY?: number;
  public boxed?: Rect;

  constructor(
    solver: ConstraintSolver,
    cx: Variable,
    cy: Variable,
    points: [Variable, Variable, number][],
    axisOnly?: AxisMode,
    getXYScale?: () => { x: number; y: number },
    options?: PackingPluginOptions
  ) {
    super();
    this.solver = solver;
    this.cx = cx;
    this.cy = cy;
    this.points = points;
    this.xEnable = axisOnly == null || axisOnly == "x";
    this.yEnable = axisOnly == null || axisOnly == "y";
    this.getXYScale = getXYScale;
    this.gravityX = options.gravityX;
    this.gravityY = options.gravityY;
    this.boxed = options.boxed;
  }

  public apply() {
    let xScale = 1;
    let yScale = 1;
    if (this.getXYScale != null) {
      const { x, y } = this.getXYScale();
      xScale = x;
      yScale = y;
    }
    const cx = this.solver.getValue(this.cx);
    const cy = this.solver.getValue(this.cy);
    const nodes = this.points.map((pt) => {
      const x = (this.solver.getValue(pt[0]) - cx) / xScale;
      const y = (this.solver.getValue(pt[1]) - cy) / yScale;
      // Use forceSimulation's default initialization
      return <NodeType>{
        fx: !this.xEnable ? x : undefined, // keep x unchanged if x is disabled
        fy: !this.yEnable ? y : undefined, // keep y unchanged if y is disabled
        r: pt[2],
      };
    });

    const force = forceSimulation(nodes);
    force.force(
      "collision",
      forceCollide<NodeType>((d) => d.r)
    );
    force.force("gravityX", forceX().strength(this.gravityX || 0.1));
    force.force("gravityY", forceY().strength(this.gravityY || 0.1));
    force.stop();
    const n = Math.ceil(
      Math.log(force.alphaMin()) / Math.log(1 - force.alphaDecay())
    );
    for (let i = 0; i < n * 2; i++) {
      force.tick();
    }
    for (let i = 0; i < nodes.length; i++) {
      if (this.xEnable) {
        if (this.boxed && this.boxed.x1 != null && this.boxed.x2 != null) {
          if (nodes[i].x < (this.boxed.x1 - cx) / xScale) {
            nodes[i].x = (this.boxed.x1 - cx) / xScale;
          } else if (nodes[i].x > (this.boxed.x2 - cx) / xScale) {
            nodes[i].x = (this.boxed.x2 - cx) / xScale;
          }
        }
        this.solver.setValue(this.points[i][0], nodes[i].x * xScale + cx);
      }
      if (this.yEnable) {
        if (this.boxed && this.boxed.y1 != null && this.boxed.y2 != null) {
          if (nodes[i].y < (this.boxed.y1 - cy) / yScale) {
            nodes[i].y = (this.boxed.y1 - cy) / yScale;
          } else if (nodes[i].y > (this.boxed.y2 - cy) / yScale) {
            nodes[i].y = (this.boxed.y2 - cy) / yScale;
          }
        }
        this.solver.setValue(this.points[i][1], nodes[i].y * yScale + cy);
      }
    }
    return true;
  }
}

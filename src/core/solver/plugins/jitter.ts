// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { getRandom } from "../..";
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

interface NodeType {
  x?: number;
  y?: number;
}

export interface JitterPluginOptions {
  vertical: boolean;
  horizontal: boolean;
}

export class JitterPlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public x1: Variable;
  public y1: Variable;
  public x2: Variable;
  public y2: Variable;
  public points: [Variable, Variable, number][];
  public xEnable: boolean;
  public yEnable: boolean;
  public getXYScale: () => { x: number; y: number };
  public options?: JitterPluginOptions;

  constructor(
    solver: ConstraintSolver,
    x1: Variable,
    y1: Variable,
    x2: Variable,
    y2: Variable,
    points: [Variable, Variable, number][],
    axisOnly?: "x" | "y",
    options?: JitterPluginOptions
  ) {
    super();
    this.solver = solver;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.points = points;
    this.xEnable = axisOnly == null || axisOnly == "x";
    this.yEnable = axisOnly == null || axisOnly == "y";
    this.options = options;
  }

  public apply() {
    const x1 = this.solver.getValue(this.x1);
    const x2 = this.solver.getValue(this.x2);
    const y1 = this.solver.getValue(this.y1);
    const y2 = this.solver.getValue(this.y2);
    const nodes = this.points.map(() => {
      const x = getRandom(x1, x2);
      const y = getRandom(y1, y2);
      // Use forceSimulation's default initialization
      return <NodeType>{
        x,
        y,
      };
    });

    for (let i = 0; i < nodes.length; i++) {
      if (this.options.horizontal) {
        this.solver.setValue(this.points[i][0], nodes[i].x);
      }
      if (this.options.vertical) {
        this.solver.setValue(this.points[i][1], nodes[i].y);
      }
    }
    return true;
  }
}

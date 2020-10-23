// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { PolarAttributes } from "../../prototypes/plot_segments/region_2d/polar";
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

export interface PolarCoordinatorPluginOptions {}

// Converts Polar coordinates to cartesian coordinates
export class PolarCoordinatorPlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public cx: Variable;
  public cy: Variable;
  public an: Array<Variable>;
  attrs: PolarAttributes;
  radialVarable: Array<Variable>;
  angleVarable: Array<Variable>;

  constructor(
    solver: ConstraintSolver,
    cx: Variable,
    cy: Variable,
    radialVarable: Array<Variable>,
    angleVarable: Array<Variable>,
    attrs: PolarAttributes
  ) {
    super();
    this.solver = solver;
    this.cx = cx;
    this.cy = cy;
    this.radialVarable = radialVarable;
    this.angleVarable = angleVarable;
    this.attrs = attrs;
  }

  public apply() {
    console.log("apply PolarCoordinatorPlugin");
    const cx = this.solver.getValue(this.cx);
    const cy = this.solver.getValue(this.cy);
    const attrs = this.attrs;
    for (let i = 0; i < this.angleVarable.length; i++) {
      const [angleAttr] = this.solver.attrs(attrs, [
        (this.angleVarable[i] as any).name,
      ]);

      for (let j = 0; j < this.radialVarable.length; j++) {
        const [radialAttr, pointX, pointY] = this.solver.attrs(attrs, [
          (this.radialVarable[j] as any).name,
          `point${i}${j}X`,
          `point${i}${j}Y`,
        ]);
        const angle = this.solver.getValue(angleAttr);
        const radians = (angle / 180) * Math.PI;

        const radius = Math.abs(this.solver.getValue(radialAttr));
        const tx = Math.sin(radians) * radius;
        const ty = Math.cos(radians) * radius;

        this.solver.setValue(pointX, cx + tx);
        this.solver.setValue(pointY, cy + ty);
      }
    }
    return true;
  }
}

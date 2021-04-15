// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Geometry, Specification } from "../..";
import { ChartStateManager } from "../../prototypes";
import {
  getPointValueName,
  PolarGuideCoordinatorAttributesExtend,
} from "../../prototypes/guides/polar_coordinator";
import { snapToAttribute } from "../../prototypes/update_attribute";
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

export interface PolarCoordinatorPluginOptions {}

// Converts Polar coordinates to cartesian coordinates
export class PolarCoordinatorPlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public cx: Variable;
  public cy: Variable;
  public an: (Variable)[];
  attrs: PolarGuideCoordinatorAttributesExtend;
  radialVarable: (Variable)[];
  angleVarable: (Variable)[];
  chartConstraints: Specification.Constraint[];
  coordinatoObjectID: string;
  chartMananger: ChartStateManager;

  constructor(
    solver: ConstraintSolver,
    cx: Variable,
    cy: Variable,
    radialVarable: (Variable)[],
    angleVarable: (Variable)[],
    attrs: PolarGuideCoordinatorAttributesExtend,
    chartConstraints: Specification.Constraint[],
    coordinatoObjectID: string,
    chartMananger: ChartStateManager
  ) {
    super();
    this.solver = solver;
    this.cx = cx;
    this.cy = cy;
    this.radialVarable = radialVarable;
    this.angleVarable = angleVarable;
    this.attrs = attrs;
    this.chartConstraints = chartConstraints;
    this.coordinatoObjectID = coordinatoObjectID;
    this.chartMananger = chartMananger;
  }

  public apply() {
    const cx = this.solver.getValue(this.cx);
    const cy = this.solver.getValue(this.cy);

    const attrs = this.attrs;
    for (let i = 0; i < this.angleVarable.length; i++) {
      const angleAttr = this.solver.attr(
        attrs,
        (<any>this.angleVarable[i]).name,
        {
          edit: false,
        }
      );

      for (let j = 0; j < this.radialVarable.length; j++) {
        const attrXname = getPointValueName(i, j, "X");
        const attrYname = getPointValueName(i, j, "Y");

        const radialAttr = this.solver.attr(
          attrs,
          (<any>this.radialVarable[j]).name,
          {
            edit: false,
          }
        );

        const pointX = this.solver.attr(attrs, attrXname, {
          edit: false,
        });

        const pointY = this.solver.attr(attrs, attrYname, {
          edit: false,
        });

        const angle = this.solver.getValue(angleAttr);
        const radians = Geometry.degreesToRadians(angle);

        const radius = Math.abs(this.solver.getValue(radialAttr));
        const tx = Math.sin(radians) * radius;
        const ty = Math.cos(radians) * radius;

        this.solver.setValue(pointX, cx + tx);
        this.solver.setValue(pointY, cy + ty);

        // take snapped attributes and apply new value
        snapToAttribute(
          this.chartMananger,
          this.chartConstraints,
          this.coordinatoObjectID,
          attrXname,
          cx + tx
        );
        snapToAttribute(
          this.chartMananger,
          this.chartConstraints,
          this.coordinatoObjectID,
          attrYname,
          cy + ty
        );
      }
    }
    return true;
  }
}

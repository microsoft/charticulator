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

// eslint-disable-next-line
export interface PolarCoordinatorPluginOptions { }

// Converts Polar coordinates to cartesian coordinates
export class PolarCoordinatorPlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public cx: Variable;
  public cy: Variable;
  public an: Variable[];
  attrs: PolarGuideCoordinatorAttributesExtend;
  radialVariable: Variable[];
  angleVariable: Variable[];
  chartConstraints: Specification.Constraint[];
  coordinatorObjectID: string;
  chartManager: ChartStateManager;

  constructor(
    solver: ConstraintSolver,
    cx: Variable,
    cy: Variable,
    radialVariable: Variable[],
    angleVariable: Variable[],
    attrs: PolarGuideCoordinatorAttributesExtend,
    chartConstraints: Specification.Constraint[],
    coordinatorObjectID: string,
    chartManager: ChartStateManager
  ) {
    super();
    this.solver = solver;
    this.cx = cx;
    this.cy = cy;
    this.radialVariable = radialVariable;
    this.angleVariable = angleVariable;
    this.attrs = attrs;
    this.chartConstraints = chartConstraints;
    this.coordinatorObjectID = coordinatorObjectID;
    this.chartManager = chartManager;
  }

  public apply() {
    const cx = this.solver.getValue(this.cx);
    const cy = this.solver.getValue(this.cy);

    const attrs = this.attrs;
    for (let i = 0; i < this.angleVariable.length; i++) {
      const angleAttr = this.solver.attr(
        attrs,
        (<any>this.angleVariable[i]).name,
        {
          edit: false,
        }
      );

      for (let j = 0; j < this.radialVariable.length; j++) {
        const attrXname = getPointValueName(i, j, "X");
        const attrYname = getPointValueName(i, j, "Y");

        const radialAttr = this.solver.attr(
          attrs,
          (<any>this.radialVariable[j]).name,
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
          this.chartManager,
          this.chartConstraints,
          this.coordinatorObjectID,
          attrXname,
          cx + tx
        );
        snapToAttribute(
          this.chartManager,
          this.chartConstraints,
          this.coordinatorObjectID,
          attrYname,
          cy + ty
        );
      }
    }
    return true;
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ConstraintPlugin, ConstraintSolver } from "../abstract";
import { PolarAttributes } from "../../prototypes/plot_segments/region_2d/polar";
import { Geometry } from "../../common";

export class PolarPlotSegmentPlugin extends ConstraintPlugin {
  constructor(public solver: ConstraintSolver, private attrs: PolarAttributes) {
    super();
  }
  public apply(): boolean {
    const { attrs } = this;
    const { angle1, angle2, radial1, radial2, x1, y1, x2, y2 } = attrs;

    attrs.cx = (x2 + x1) / 2;
    attrs.cy = (y2 + y1) / 2;

    const { cx, cy } = attrs;

    const toPoint = (radius: number, angle: number) => {
      const radians = Geometry.degreesToRadians(angle);
      return {
        x: cx + Math.sin(radians) * radius,
        y: cy + Math.cos(radians) * radius,
      };
    };

    const a1r1 = toPoint(radial1, angle1);
    attrs.a1r1x = a1r1.x;
    attrs.a1r1y = a1r1.y;

    const a1r2 = toPoint(radial2, angle1);
    attrs.a1r2x = a1r2.x;
    attrs.a1r2y = a1r2.y;

    const a2r1 = toPoint(radial1, angle2);
    attrs.a2r1x = a2r1.x;
    attrs.a2r1y = a2r1.y;

    const a2r2 = toPoint(radial2, angle2);
    attrs.a2r2x = a2r2.x;
    attrs.a2r2y = a2r2.y;

    // TODO take snapped attributes and apply new value

    // this.chartConstraints
    //   .filter(
    //     (constraint) =>
    //       constraint.type == "snap" &&
    //       constraint.attributes.targetAttribute === attrXname &&
    //       constraint.attributes.targetElement === this.coordinatoObjectID
    //   )
    //   .forEach((constraint) => {
    //     // UpdateChartElementAttribute
    //     this.onUpdateAttribute(
    //       constraint.attributes.element,
    //       constraint.attributes.attribute,
    //       cx + tx
    //     );
    //   });

    // this.chartConstraints
    //   .filter(
    //     (constraint) =>
    //       constraint.type == "snap" &&
    //       constraint.attributes.targetAttribute === attrYname &&
    //       constraint.attributes.targetElement === this.coordinatoObjectID
    //   )
    //   .forEach((constraint) => {
    //     // UpdateChartElementAttribute
    //     this.onUpdateAttribute(
    //       constraint.attributes.element,
    //       constraint.attributes.attribute,
    //       cy + ty
    //     );
    //   });

    return true;
  }
}

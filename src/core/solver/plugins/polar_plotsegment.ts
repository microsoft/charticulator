// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ConstraintPlugin, ConstraintSolver } from "../abstract";
import { PolarAttributes } from "../../prototypes/plot_segments/region_2d/polar";

export class PolarPlotSegmentPlugin extends ConstraintPlugin {
  constructor(public solver: ConstraintSolver, private attrs: PolarAttributes) {
    super();
  }
  public apply(): boolean {
    const { attrs } = this;
    attrs.cx = (attrs.x2 + attrs.x1) / 2;
    attrs.cy = (attrs.y2 + attrs.y1) / 2;

    return true;
  }
}

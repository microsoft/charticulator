// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ObjectClasses } from "../object";
import { LineGuide } from "./line";
import { MapPlotSegment } from "./map";
import {
  CartesianPlotSegment,
  CurvePlotSegment,
  PolarPlotSegment
} from "./region_2d";

export { defaultAxisStyle } from "./axis";
export { LineGuideAttributes } from "./line";
export {
  CartesianPlotSegment,
  CurvePlotSegment,
  PolarPlotSegment,
  Region2DAttributes
} from "./region_2d";

export { PlotSegmentClass } from "./plot_segment";

export function registerClasses() {
  ObjectClasses.Register(LineGuide);
  ObjectClasses.Register(MapPlotSegment);
  ObjectClasses.Register(CartesianPlotSegment);
  ObjectClasses.Register(CurvePlotSegment);
  ObjectClasses.Register(PolarPlotSegment);
}

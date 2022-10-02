// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Plotsegmets are high level elements of charticulator responsible for layout and arrange other elements (glyph's and marks)
 *
 * ![Plot segmets](media://plotsegmets_scaffolds.png)
 *
 * Segment can have different sublayouts: stacked x, stacked y, grid, packing e.tc
 *
 * ![Plot segmets sublayout](media://cartesian_plot_segment.png) ![Polar plot segmets sublayout](media://sublayout_polar.png)
 *
 * All plot segmets extends {@link PlotSegmentClass} class.
 *
 * Charticulator has different plot segmets:
 *
 * {@link LineGuide} - puts elements on the one line
 *
 * {@link MapPlotSegment} - special plot segmet to draw a map. Uses {@link StaticMapService} class to workd with Bing and Google services
 *
 * {@link CartesianPlotSegment} - classic plot segmet with x and y axis coordinates
 *
 * ![Cartesian plot segmets](media://cartesian_plot.png)
 *
 * {@link CurvePlotSegment} - puts elements on curve drawn by user.
 *
 * ![Curve plot](media://curve_plot.png)
 *
 * {@link PolarPlotSegment} - plot segmets with polar coordinates
 *
 * ![Polar plot segmets](media://polar_plot.png)
 *
 * @packageDocumentation
 * @preferred
 */

import { ObjectClasses } from "../object";
import { LineGuide } from "./line";
import { MapPlotSegment } from "./map";
import {
  CartesianPlotSegment,
  CurvePlotSegment,
  PolarPlotSegment,
} from "./region_2d";

export { defaultAxisStyle } from "./axis";
export { LineGuideAttributes } from "./line";
export {
  CartesianPlotSegment,
  CurvePlotSegment,
  PolarPlotSegment,
  Region2DAttributes,
  Region2DProperties,
} from "./region_2d";

export { PlotSegmentClass } from "./plot_segment";

export function registerClasses() {
  ObjectClasses.Register(LineGuide);
  ObjectClasses.Register(MapPlotSegment);
  ObjectClasses.Register(CartesianPlotSegment);
  ObjectClasses.Register(CurvePlotSegment);
  ObjectClasses.Register(PolarPlotSegment);
}

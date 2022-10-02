// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Module contains basic elements of charts:
 *
 * * Marks elements {@link "core/prototypes/marks/index"} are "bricks" of charticulator. Module contains descriptions of rectangle, image, symbol, text, e.t.c
 *
 * * Plot segments  {@link "core/prototypes/plot_segments/index"} container of glyphs to arrange them on the chart
 *
 * * Chart {@link "core/prototypes/charts/index"} highest level element, contains all other elements like plot segments, marks, legends e.t.c
 *
 * * Scales {@link "core/prototypes/plot_segments/index"} map data values into pixels and sizes of elements(marks)
 *
 * * Links {@link "core/prototypes/links/index"}
 *
 * * Legends {@link "core/prototypes/legends/index"}
 *
 * * Guides {@link "core/prototypes/guides/index"} helper non visual elements to align other elements
 *
 * * Glyphs {@link "core/prototypes/glyphs/index"} is container of other elements on plot segments
 *
 * * Dataflow {@link "core/prototypes/dataflow/index"} uses for connecting elements to dataset
 *
 * @packageDocumentation
 * @preferred
 */

import * as Charts from "./charts";
import * as Constraints from "./constraints";
import * as Dataflow from "./dataflow";
import * as Glyphs from "./glyphs";
import * as Guides from "./guides";
import * as Legends from "./legends";
import * as Links from "./links";
import * as Marks from "./marks";
import * as PlotSegments from "./plot_segments";
import * as Scales from "./scales";

export { ObjectClassCache } from "./cache";
export * from "./common";
export * from "./state";
export {
  Marks,
  Scales,
  Constraints,
  Glyphs,
  Charts,
  PlotSegments,
  Links,
  Guides,
  Legends,
  Dataflow,
};

Charts.registerClasses();
Glyphs.registerClasses();
Marks.registerClasses();
Links.registerClasses();
Legends.registerClasses();
Guides.registerClasses();
Scales.registerClasses();
PlotSegments.registerClasses();

Constraints.registerClasses();

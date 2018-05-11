import * as Specification from "../specification";

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

export * from "./common";

export { Marks, Scales, Constraints, Glyphs, Charts, PlotSegments, Links, Guides, Legends, Dataflow };
export { ObjectClassCache } from "./cache";
import { ObjectClass, ObjectClasses } from "./common";

// Shortcuts

// export function getObjectClass(object: Specification.Object, state: Specification.ObjectState) {
//     return ObjectClasses.Create(object, state) as ObjectClass;
// }

// export function getElementClass(element: Specification.Element, state: Specification.MarkState) {
//     return ObjectClasses.Create(element, state) as Marks.ElementClass;
// }

// export function getGlyphClass(glyph: Specification.Glyph, state: Specification.GlyphState) {
//     return ObjectClasses.Create(glyph, state) as Glyphs.GlyphClass;
// }

// export function getScaleClass(scale: Specification.Scale, state: Specification.ScaleState) {
//     return ObjectClasses.Create(scale, state) as Scales.ScaleClass;
// }

// export function getPlotSegmentClass(plotSegment: Specification.PlotSegment, state: Specification.PlotSegmentState) {
//     return ObjectClasses.Create(plotSegment, state) as PlotSegments.PlotSegmentClass;
// }

// export function getChartClass(chart: Specification.Chart, state: Specification.ChartState) {
//     return ObjectClasses.Create(chart, state) as Charts.ChartClass;
// }

// export function getMarkConstraintClass(type: string) {
//     return Constraints.MarkConstraintClass.getClass(type);
// }

export * from "./state";
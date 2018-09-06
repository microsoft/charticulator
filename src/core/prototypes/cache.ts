/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as Specification from "../specification";
import { ChartElementClass } from "./chart_element";
import { ObjectClass, ObjectClasses } from "./object";

import * as Charts from "./charts";
import * as Glyphs from "./glyphs";
import * as Marks from "./marks";
import * as PlotSegments from "./plot_segments";
import * as Scales from "./scales";

export class ObjectClassCache {
  private cache = new WeakMap<Specification.ObjectState, ObjectClass>();

  /** Clear the cache */
  public clear() {
    this.cache = new WeakMap<Specification.ObjectState, ObjectClass>();
  }

  public hasClass(state: Specification.ObjectState) {
    return this.cache.has(state);
  }

  public getMarkClass(state: Specification.MarkState): Marks.MarkClass {
    return this.getClass(state) as Marks.MarkClass;
  }
  public getGlyphClass(state: Specification.GlyphState): Glyphs.GlyphClass {
    return this.getClass(state) as Glyphs.GlyphClass;
  }
  public getPlotSegmentClass(
    state: Specification.PlotSegmentState
  ): PlotSegments.PlotSegmentClass {
    return this.getClass(state) as PlotSegments.PlotSegmentClass;
  }
  public getChartElementClass(
    state: Specification.ChartElementState
  ): ChartElementClass {
    return this.getClass(state) as ChartElementClass;
  }
  public getScaleClass(state: Specification.ScaleState): Scales.ScaleClass {
    return this.getClass(state) as Scales.ScaleClass;
  }
  public getChartClass(state: Specification.ChartState): Charts.ChartClass {
    return this.getClass(state) as Charts.ChartClass;
  }
  public getClass(state: Specification.ObjectState): ObjectClass {
    if (this.cache.has(state)) {
      return this.cache.get(state);
    } else {
      throw new Error(`class not found for state`);
    }
  }

  public createMarkClass(
    parent: Glyphs.GlyphClass,
    object: Specification.Element,
    state: Specification.MarkState
  ): Marks.MarkClass {
    return this.createClass(parent, object, state) as Marks.MarkClass;
  }
  public createGlyphClass(
    parent: PlotSegments.PlotSegmentClass,
    object: Specification.Glyph,
    state: Specification.GlyphState
  ): Glyphs.GlyphClass {
    return this.createClass(parent, object, state) as Glyphs.GlyphClass;
  }
  public createPlotSegmentClass(
    parent: Charts.ChartClass,
    object: Specification.PlotSegment,
    state: Specification.PlotSegmentState
  ): PlotSegments.PlotSegmentClass {
    return this.createClass(
      parent,
      object,
      state
    ) as PlotSegments.PlotSegmentClass;
  }
  public createChartElementClass(
    parent: Charts.ChartClass,
    object: Specification.ChartElement,
    state: Specification.ChartElementState
  ): ChartElementClass {
    return this.createClass(parent, object, state) as ChartElementClass;
  }
  public createScaleClass(
    parent: Charts.ChartClass,
    object: Specification.Scale,
    state: Specification.ScaleState
  ): Scales.ScaleClass {
    return this.createClass(parent, object, state) as Scales.ScaleClass;
  }
  public createChartClass(
    parent: ObjectClass,
    object: Specification.Chart,
    state: Specification.ChartState
  ): Charts.ChartClass {
    return this.createClass(parent, object, state) as Charts.ChartClass;
  }
  public createClass(
    parent: ObjectClass,
    object: Specification.Object,
    state: Specification.ObjectState
  ): ObjectClass {
    const newClass = ObjectClasses.Create(parent, object, state);
    this.cache.set(state, newClass);
    return newClass;
  }
}

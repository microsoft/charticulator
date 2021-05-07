// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Specification from "../specification";
import { ChartElementClass } from "./chart_element";
import { ObjectClass, ObjectClasses } from "./object";

import * as Charts from "./charts";
import * as Glyphs from "./glyphs";
import * as Marks from "./marks/mark";
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
    return <Marks.MarkClass>this.getClass(state);
  }
  public getGlyphClass(state: Specification.GlyphState): Glyphs.GlyphClass {
    return <Glyphs.GlyphClass>this.getClass(state);
  }
  public getPlotSegmentClass(
    state: Specification.PlotSegmentState
  ): PlotSegments.PlotSegmentClass {
    return <PlotSegments.PlotSegmentClass>this.getClass(state);
  }
  public getChartElementClass(
    state: Specification.ChartElementState
  ): ChartElementClass {
    return <ChartElementClass>this.getClass(state);
  }
  public getScaleClass(state: Specification.ScaleState): Scales.ScaleClass {
    return <Scales.ScaleClass>this.getClass(state);
  }
  public getChartClass(state: Specification.ChartState): Charts.ChartClass {
    return <Charts.ChartClass>this.getClass(state);
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
    return <Marks.MarkClass>this.createClass(parent, object, state);
  }
  public createGlyphClass(
    parent: PlotSegments.PlotSegmentClass,
    object: Specification.Glyph,
    state: Specification.GlyphState
  ): Glyphs.GlyphClass {
    return <Glyphs.GlyphClass>this.createClass(parent, object, state);
  }
  public createPlotSegmentClass(
    parent: Charts.ChartClass,
    object: Specification.PlotSegment,
    state: Specification.PlotSegmentState
  ): PlotSegments.PlotSegmentClass {
    return <PlotSegments.PlotSegmentClass>(
      this.createClass(parent, object, state)
    );
  }
  public createChartElementClass(
    parent: Charts.ChartClass,
    object: Specification.ChartElement,
    state: Specification.ChartElementState
  ): ChartElementClass {
    return <ChartElementClass>this.createClass(parent, object, state);
  }
  public createScaleClass(
    parent: Charts.ChartClass,
    object: Specification.Scale,
    state: Specification.ScaleState
  ): Scales.ScaleClass {
    return <Scales.ScaleClass>this.createClass(parent, object, state);
  }
  public createChartClass(
    parent: ObjectClass,
    object: Specification.Chart,
    state: Specification.ChartState
  ): Charts.ChartClass {
    return <Charts.ChartClass>this.createClass(parent, object, state);
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

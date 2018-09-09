/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { EventEmitter } from "../../core";

import {
  Dataset,
  getByName,
  indexOf,
  Prototypes,
  Solver,
  Specification
} from "../../core";

import { Actions } from "../actions";

import { BaseStore } from "../../core/store/base";
import { ChartStore, MarkSelection, GlyphSelection } from "./chart";
import { DatasetStore } from "./dataset";

/** Simple store that just refer to the chart store */
export class GlyphStore extends BaseStore {
  public static EVENT_STATE = "state";

  public readonly parent: ChartStore;

  public table: Dataset.Table;
  public glyph: Specification.Glyph;
  public glyphState: Specification.GlyphState;

  constructor(
    parent: ChartStore,
    table: Dataset.Table,
    glyph: Specification.Glyph
  ) {
    super(parent);
    this.table = table;
    this.glyph = glyph;

    this.updateMarkState();

    this.parent.addListener(ChartStore.EVENT_SELECTION, () => {
      this.updateMarkState();
    });

    this.parent.addListener(ChartStore.EVENT_GRAPHICS, () => {
      this.updateMarkState();
    });
  }

  public updateMarkState() {
    // Find the plot segment's index
    const layoutIndex = indexOf(
      this.parent.chart.elements,
      e =>
        Prototypes.isType(e.classID, "plot-segment") &&
        (e as Specification.PlotSegment).glyph == this.glyph._id
    );

    if (layoutIndex == -1) {
      // Cannot find plot segment, set glyphState to null
      this.glyphState = null;
      this.emit(GlyphStore.EVENT_STATE);
    } else {
      // Find the selected glyph
      const plotSegmentState = this.parent.chartState.elements[
        layoutIndex
      ] as Specification.PlotSegmentState;

      const glyphIndex = this.parent.getSelectedGlyphIndex(
        this.parent.chart.elements[layoutIndex]._id
      );

      // If found, use the glyph, otherwise fallback to the first glyph
      if (glyphIndex < 0) {
        this.glyphState = plotSegmentState.glyphs[0];
      } else {
        this.glyphState = plotSegmentState.glyphs[glyphIndex];
      }
      this.emit(GlyphStore.EVENT_STATE);
    }
  }
}

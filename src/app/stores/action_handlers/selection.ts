// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { getById, Prototypes, Specification } from "../../../core";
import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import {
  ChartElementSelection,
  GlyphSelection,
  MarkSelection
} from "../selection";
import { ActionHandlerRegistry } from "./registry";

export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.SelectChartElement, function(action) {
    const selection = new ChartElementSelection(action.chartElement);
    if (Prototypes.isType(action.chartElement.classID, "plot-segment")) {
      const plotSegment = action.chartElement as Specification.PlotSegment;
      if (action.glyphIndex != null) {
        this.setSelectedGlyphIndex(action.chartElement._id, action.glyphIndex);
      }
      this.currentGlyph = getById(this.chart.glyphs, plotSegment.glyph);
    }
    this.currentSelection = selection;
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.SelectMark, function(action) {
    if (action.plotSegment == null) {
      action.plotSegment = this.findPlotSegmentForGlyph(action.glyph);
    }
    const selection = new MarkSelection(
      action.plotSegment,
      action.glyph,
      action.mark
    );
    if (action.glyphIndex != null) {
      this.setSelectedGlyphIndex(action.plotSegment._id, action.glyphIndex);
    }
    this.currentGlyph = selection.glyph;
    this.currentSelection = selection;
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.SelectGlyph, function(action) {
    if (action.plotSegment == null) {
      action.plotSegment = this.findPlotSegmentForGlyph(action.glyph);
    }
    const selection = new GlyphSelection(action.plotSegment, action.glyph);
    if (action.glyphIndex != null) {
      this.setSelectedGlyphIndex(action.plotSegment._id, action.glyphIndex);
    }
    this.currentSelection = selection;
    this.currentGlyph = selection.glyph;
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.ClearSelection, function(action) {
    this.currentSelection = null;
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.SetCurrentTool, function(action) {
    this.currentTool = action.tool;
    this.currentToolOptions = action.options;
    this.emit(AppStore.EVENT_CURRENT_TOOL);
  });

  REG.add(Actions.FocusToMarkAttribute, function(action) {
    this.currentAttributeFocus = action.attributeName;
    this.emit(AppStore.EVENT_GRAPHICS);
  });
}

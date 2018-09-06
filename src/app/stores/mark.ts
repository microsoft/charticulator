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
import { ChartStore } from "./chart";
import { DatasetStore } from "./dataset";

/** Simple store that just refer to the chart store */
export class GlyphStore extends BaseStore {
  public static EVENT_STATE = "state";

  public readonly parent: ChartStore;

  public table: Dataset.Table;
  public mark: Specification.Glyph;
  public markState: Specification.GlyphState;

  constructor(
    parent: ChartStore,
    table: Dataset.Table,
    mark: Specification.Glyph
  ) {
    super(parent);
    this.table = table;
    this.mark = mark;

    this.updateMarkState();

    this.parent.datasetStore.addListener(DatasetStore.EVENT_SELECTION, () => {
      this.updateMarkState();
    });

    this.parent.addListener(ChartStore.EVENT_GRAPHICS, () => {
      this.updateMarkState();
    });
  }

  public updateMarkState() {
    const layoutIndex = indexOf(
      this.parent.chart.elements,
      e =>
        Prototypes.isType(e.classID, "plot-segment") &&
        (e as Specification.PlotSegment).glyph == this.mark._id
    );
    if (layoutIndex == -1) {
      this.markState = null;
      this.emit(GlyphStore.EVENT_STATE);
    } else {
      const plotSegmentState = this.parent.chartState.elements[
        layoutIndex
      ] as Specification.PlotSegmentState;
      let glyphIndex = -1;
      const selectedDataIndex = this.parent.datasetStore.getSelectedRowIndex(
        this.table
      );
      for (let i = 0; i < plotSegmentState.dataRowIndices.length; i++) {
        if (
          plotSegmentState.dataRowIndices[i].indexOf(selectedDataIndex) >= 0
        ) {
          glyphIndex = i;
        }
      }
      if (glyphIndex < 0) {
        this.markState = plotSegmentState.glyphs[0];
      } else {
        this.markState = plotSegmentState.glyphs[glyphIndex];
      }
      this.emit(GlyphStore.EVENT_STATE);
    }
  }
}

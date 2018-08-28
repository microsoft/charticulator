import { BaseStore } from "../core/store/base";
import { Specification, Dataset, Prototypes, indexOf } from "../core";
import { Actions } from "../app";

export interface ChartSelection {
  table: string;
  dataIndex: number;
}

export class ChartStore extends BaseStore {
  /** Fires when the selection changes */
  public static EVENT_SELECTION = "selection";

  public chart: Specification.Chart;

  // Single select for now
  public currentSelection: ChartSelection;
  public state: Specification.ChartState;
  public manager: Prototypes.ChartStateManager;

  constructor(specification: Specification.Chart, dataset: Dataset.Dataset) {
    super(null);
    this.chart = specification;
    this.manager = new Prototypes.ChartStateManager(specification, dataset);
    this.state = this.manager.chartState;
  }

  public handleAction(action: Actions.Action) {
    if (action instanceof Actions.SelectMark) {
      const selection = this.currentSelection;
      // There was something selected, but now there isn't or it is the same thing selected twice
      if (
        selection &&
        (action.dataRowIndex === undefined ||
          (action.dataRowIndex === selection.dataIndex &&
            action.glyph.table === selection.table))
      ) {
        this.currentSelection = undefined;
        // Otherwise, the user selected some useful mark
      } else if (action.dataRowIndex >= 0) {
        this.currentSelection = {
          table: action.glyph.table,
          dataIndex: action.dataRowIndex
        };
      }

      this.emit(ChartStore.EVENT_SELECTION);
    } else if (action instanceof Actions.ClearSelection) {
      // No need to re-emit if it hasn't changed
      if (this.currentSelection !== undefined) {
        this.currentSelection = undefined;

        this.emit(ChartStore.EVENT_SELECTION);
      }
    }
  }

  /**
   * Sets the current selection
   * @param selection The new selection
   */
  public setSelection(selection?: ChartSelection) {
    // Simple way of checking if it has changed.
    if (JSON.stringify(selection) !== JSON.stringify(this.currentSelection)) {
      this.currentSelection = selection;
      this.emit(ChartStore.EVENT_SELECTION);
    }
  }
}

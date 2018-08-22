import { BaseStore } from "../app/stores/base";
import { Specification, Dataset, Prototypes } from "../core";
import { Selection, MarkSelection } from "../app/stores/chart";
import { Actions } from "../app";

export class ChartStore extends BaseStore {
  /** Fires when the selection changes */
  public static EVENT_SELECTION = "selection";

  public chart: Specification.Chart;
  public selectedDataRowIdx: number;
  public currentSelection: Selection;
  public dataset: Dataset.Dataset;
  public state: Specification.ChartState;
  public manager: Prototypes.ChartStateManager;

  constructor(specification: Specification.Chart, dataset: Dataset.Dataset) {
    super(null);

    this.chart = specification;
    this.dataset = dataset;
    this.manager = new Prototypes.ChartStateManager(specification, dataset);
    this.state = this.manager.chartState;
  }

  public handleAction(action: Actions.Action) {
    if (action instanceof Actions.SelectMark) {
      this.currentSelection = undefined;
      this.selectedDataRowIdx = undefined;

      if (action.dataRowIndex >= 0) {
        const selection = new MarkSelection(action.glyph, action.mark);
        this.currentSelection = selection;
        this.selectedDataRowIdx = action.dataRowIndex;
      }

      this.emit(ChartStore.EVENT_SELECTION);
    } else if (action instanceof Actions.ClearSelection) {
      this.currentSelection = undefined;
      this.selectedDataRowIdx = undefined;

      this.emit(ChartStore.EVENT_SELECTION);
    }
  }
}

import { EventEmitter } from "../../core";

import { Dataset, Expression } from "../../core";

import { Actions } from "../actions";

import { ExpressionCache } from "../../core/expression/helpers";
import { BaseStore } from "../../core/store/base";
import { MainStore } from "./main_store";

export class DatasetStoreState {
  public dataset: Dataset.Dataset;
}

export class DatasetStoreSelectionState {
  public selectedRowIndices: { [name: string]: number };
}

// DataView is a dataset with helper functions
export class DatasetStore extends BaseStore {
  public static EVENT_CHANGED = "changed";
  public static EVENT_SELECTION = "selection";

  public readonly parent: MainStore;

  public dataset: Dataset.Dataset;
  public context: Dataset.DatasetContext;
  public selectedRowMap: WeakMap<Dataset.Table, number>;

  private expressionCache = new ExpressionCache();

  constructor(parent: MainStore) {
    super(parent);

    this.dataset = {
      name: "untitled",
      tables: []
    };

    this.selectedRowMap = new WeakMap<Dataset.Table, number>();
  }

  public saveState(): DatasetStoreState {
    return {
      dataset: this.dataset
    };
  }

  public loadState(state: DatasetStoreState) {
    this.dataset = state.dataset;
    this.context = new Dataset.DatasetContext(this.dataset);
    this.expressionCache.clear();
    this.emit(DatasetStore.EVENT_CHANGED);
    this.emit(DatasetStore.EVENT_SELECTION);
  }

  public handleAction(action: Actions.Action) {
    if (action instanceof Actions.AddTable) {
      this.dataset.tables.push(action.table);
      this.emit(DatasetStore.EVENT_CHANGED);
    }
    if (action instanceof Actions.SelectDataRow) {
      this.selectedRowMap.set(action.table, action.rowIndex);
      this.emit(DatasetStore.EVENT_SELECTION);
    }
    if (action instanceof Actions.ImportDataset) {
      this.selectedRowMap = new WeakMap<Dataset.Table, number>();
      this.emit(DatasetStore.EVENT_SELECTION);
      this.dataset = action.dataset;
      this.emit(DatasetStore.EVENT_CHANGED);
    }
    // if (action instanceof Actions.LoadDataFromCSV) {
    //     this.selectedRowMap = new WeakMap<Dataset.Table, number>();
    //     this.emit(DatasetStore.EVENT_SELECTION);

    //     let loader = new Dataset.DatasetLoader();
    //     let table = loader.loadCSVFromContents(action.filename, action.contents);
    //     this.dataset = {
    //         tables: [table],
    //         name: action.filename
    //     };

    //     this.emit(DatasetStore.EVENT_CHANGED);
    // }
  }

  public setDataset(dataset: Dataset.Dataset) {
    this.dataset = dataset;
    for (const table of this.dataset.tables) {
      this.selectedRowMap.set(table, 0);
    }
    this.context = new Dataset.DatasetContext(this.dataset);
    this.expressionCache.clear();
    this.emit(DatasetStore.EVENT_CHANGED);
  }

  public getTable(name: string): Dataset.Table {
    if (this.dataset != null) {
      return this.dataset.tables.filter(d => d.name == name)[0];
    } else {
      return null;
    }
  }

  public getTables(): Dataset.Table[] {
    return this.dataset.tables;
  }

  public getColumnVector(
    table: Dataset.Table,
    columnName: string
  ): Dataset.ValueType[] {
    return table.rows.map(d => d[columnName]);
  }

  public getSelectedRow(table: Dataset.Table): Dataset.Row {
    if (this.selectedRowMap.has(table)) {
      return table.rows[this.selectedRowMap.get(table)];
    } else {
      return table.rows[0];
    }
  }
  public getSelectedRowIndex(table: Dataset.Table): number {
    if (this.selectedRowMap.has(table)) {
      return this.selectedRowMap.get(table);
    } else {
      return 0;
    }
  }

  public setSelectedRowIndex(
    table: Dataset.Table,
    dataRowIndex: number,
    emit: boolean = true
  ) {
    if (
      dataRowIndex != null &&
      dataRowIndex >= 0 &&
      dataRowIndex < table.rows.length
    ) {
      this.selectedRowMap.set(table, dataRowIndex);
      if (emit) {
        this.emit(DatasetStore.EVENT_SELECTION);
      }
    }
  }

  public saveSelectionState(): DatasetStoreSelectionState {
    const state: DatasetStoreSelectionState = {
      selectedRowIndices: {}
    };
    for (const table of this.dataset.tables) {
      state.selectedRowIndices[table.name] = this.getSelectedRowIndex(table);
    }
    return state;
  }

  public loadSelectionState(state: DatasetStoreSelectionState) {
    for (const table of this.dataset.tables) {
      this.setSelectedRowIndex(table, state.selectedRowIndices[table.name]);
    }
    this.emit(DatasetStore.EVENT_SELECTION);
  }
}

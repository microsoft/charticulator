/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/

import { Dataset } from "../../core";
import { ExpressionCache } from "../../core/expression/helpers";
import { BaseStore } from "../../core/store/base";
import { Actions } from "../actions";
import { MainStore } from "./main_store";

export class DatasetStoreState {
  public dataset: Dataset.Dataset;
}

// DataView is a dataset with helper functions
export class DatasetStore extends BaseStore {
  public static EVENT_CHANGED = "changed";

  public readonly parent: MainStore;

  public dataset: Dataset.Dataset;
  public context: Dataset.DatasetContext;

  private expressionCache = new ExpressionCache();

  constructor(parent: MainStore) {
    super(parent);

    this.dataset = {
      name: "untitled",
      tables: []
    };
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
  }

  public handleAction(action: Actions.Action) {
    if (action instanceof Actions.AddTable) {
      this.dataset.tables.push(action.table);
      this.emit(DatasetStore.EVENT_CHANGED);
    }
    if (action instanceof Actions.ImportDataset) {
      this.dataset = action.dataset;
      this.emit(DatasetStore.EVENT_CHANGED);
    }
    if (action instanceof Actions.ImportChartAndDataset) {
      this.dataset = action.dataset;
      this.emit(DatasetStore.EVENT_CHANGED);
    }
  }

  public setDataset(dataset: Dataset.Dataset) {
    this.dataset = dataset;
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
}

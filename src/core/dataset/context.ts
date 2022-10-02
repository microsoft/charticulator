// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Context providers for expressions ({@link "core/expression/index"})
 *
 * @packageDocumentation
 * @preferred
 */

import { Context } from "../expression";
import { Dataset, Row, Table } from "./dataset";

export class DatasetContext implements Context {
  public fields: { [name: string]: Row[] } = {};

  constructor(public dataset: Dataset) {
    for (const table of dataset.tables) {
      this.fields[table.name] = table.rows;
    }
  }

  public getTableContext(table: Table) {
    return new TableContext(this, table);
  }

  public getVariable(name: string) {
    return this.fields[name];
  }
}

export class TableContext {
  public fields: { [name: string]: Row[] } = {};

  constructor(public parent: DatasetContext, public table: Table) {
    this.fields.table = table.rows;
  }

  public getRowContext(row: Row) {
    return new RowContext(this, row);
  }

  public getVariable(name: string) {
    const r = this.fields[name];
    if (r === undefined) {
      return this.parent.getVariable(name);
    }
  }
}

export class RowContext {
  constructor(public parent: TableContext, public row: Row) {}

  public getVariable(name: string) {
    const r = this.row[name];
    if (r === undefined) {
      return this.parent.getVariable(name);
    } else {
      return r;
    }
  }
}

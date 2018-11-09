// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Dataset } from "../../../core";

export interface TableViewProps {
  table: Dataset.Table;
  maxRows?: number;
}

export class TableView extends React.Component<TableViewProps, {}> {
  public render() {
    const table = this.props.table;
    let maxRows = table.rows.length;
    if (this.props.maxRows != null) {
      if (maxRows > this.props.maxRows) {
        maxRows = this.props.maxRows;
      }
    }
    return (
      <table className="charticulator__dataset-table-view">
        <thead>
          <tr>
            {table.columns.map(c => (
              <th key={c.name}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.slice(0, maxRows).map(r => (
            <tr key={r._id}>
              {table.columns.map(c => (
                <td key={c.name}>{r[c.name].toString()}</td>
              ))}
            </tr>
          ))}
          {table.rows.length > maxRows ? (
            <tr>
              {table.columns.map((c, i) =>
                i == 0 ? (
                  <td key={i}>({table.rows.length - maxRows} more rows)</td>
                ) : (
                  <td key={i}>...</td>
                )
              )}
            </tr>
          ) : null}
        </tbody>
      </table>
    );
  }
}

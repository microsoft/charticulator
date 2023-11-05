// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * See {@link DatasetView} or {@link TableView}
 * @packageDocumentation
 * @preferred
 */

import * as React from "react";
import { Dataset } from "../../../core";
import { getConvertableTypes } from "../../utils";
import { Dropdown } from "@fluentui/react";

export interface TableViewProps {
  table: Dataset.Table;
  maxRows?: number;
  onTypeChange?: (column: string, type: string) => void;
}

/**
 * Component for displaying data samples on loading or in context menu of {@link DatasetView}
 *
 * ![Table view](media://table_view.png)
 *
 * ![Table view](media://table_view_leftside.png)
 */
export class TableView extends React.Component<
  React.PropsWithChildren<TableViewProps>,
  any
> {
  public render() {
    const table = this.props.table;
    const onTypeChange = this.props.onTypeChange;
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
            {table.columns
              .filter((c) => !c.metadata.isRaw)
              .map((c) => (
                <th key={c.name}>{c.name}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {onTypeChange && (
            <tr key={-1}>
              {table.columns
                .filter((c) => !c.metadata.isRaw)
                .map((c, index) => {
                  const convertableTypes = getConvertableTypes(
                    c.type,
                    table.rows.slice(0, 10).map((row) => row[c.name])
                  );
                  return (
                    <td key={`${c.name}-${index}`}>
                      {
                        <Dropdown
                          onChange={(ev, newType) => {
                            onTypeChange(c.name, newType.key as string);
                            this.forceUpdate();
                          }}
                          styles={{
                            title: {
                              borderWidth: "0px",
                            },
                          }}
                          selectedKey={c.type}
                          options={convertableTypes.map((type) => {
                            const str = type.toString();
                            return {
                              key: type,
                              text: str[0].toUpperCase() + str.slice(1),
                            };
                          })}
                        />
                      }
                    </td>
                  );
                })}
            </tr>
          )}
          {table.rows.slice(0, maxRows).map((r) => (
            <tr key={r._id}>
              {table.columns
                .filter((c) => !c.metadata.isRaw)
                .map((c, index) => {
                  if (c.metadata.rawColumnName) {
                    return (
                      <td key={`${c.name}-${index}`}>
                        {r[c.metadata.rawColumnName] != null &&
                          r[c.metadata.rawColumnName].toString()}
                      </td>
                    );
                  } else {
                    return (
                      <td key={`${c.name}-${index}`}>
                        {r[c.name] != null && r[c.name].toString()}
                      </td>
                    );
                  }
                })}
            </tr>
          ))}
          {table.rows.length > maxRows ? (
            <tr>
              {table.columns
                .filter((c) => !c.metadata.isRaw)
                .map((c, i) =>
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

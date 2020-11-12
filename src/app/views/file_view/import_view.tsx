// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../../resources";

import { CurrentChartView } from ".";
import { ButtonRaised, FloatingPanel, SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";
import { Actions } from "../../actions";
import { Specification } from "../../../core";
import { Button, Select } from "../panels/widgets/controls";
import { Table } from "../../../core/dataset/dataset";
import { PopupContainer, PopupController } from "../../controllers";
import * as globals from "./../../globals";

export interface FileViewImportProps {
  tables: Specification.Template.Table[];
  datasetTables: Table[];
  tableMapping: Map<string, string>;
  unmappedColumns: Specification.Template.Column[];
  onSave: (columnMapping: Map<string, string>) => void;
  onClose: () => void;
}
export interface FileViewImportState {
  saving?: boolean;
  error?: string;
  columnMappings: Map<string, string>;
}

export class FileViewImport extends ContextedComponent<
  FileViewImportProps,
  FileViewImportState
> {
  public state: FileViewImportState = {
    columnMappings: new Map(),
  };

  public render() {
    const tables = this.props.tables;
    const newMapping = new Map(this.state.columnMappings);

    const getDefaultValue = (name: string) => ():
      | string
      | number
      | string[] => {
      const mapped = newMapping.get(name) as any;
      if (mapped) {
        return mapped;
      }

      console.log(name, "Unmapped", newMapping);
      return "Unmapped";
    };

    const onChange = (columnName: string) => (value: string) => {
      newMapping.set(columnName, value);
      this.setState({
        columnMappings: newMapping,
      });
    };

    return (
      <FloatingPanel
        floatInCenter={true}
        scroll={true}
        peerGroup="import"
        title="Import template"
        closeButtonIcon={"general/cross"}
        height={400}
        width={650}
      >
        <section className="charticulator__file-view-mapping_view">
          <section>
            {tables &&
              tables.map((table) => {
                return (
                  <div
                    className="charticulator__file-view-mapping_table"
                    key={table.name}
                  >
                    <h4>Table name: {table.name}</h4>
                    <div
                      className="charticulator__file-view-mapping_rows"
                      key={table.name}
                    >
                      {table.columns.map((column) => {
                        const optionValues = this.props.datasetTables
                          .find(
                            (t) =>
                              t.name ===
                              (this.props.tableMapping.get(table.name) ||
                                table.name)
                          )
                          .columns.map((pbiColumn) => {
                            let selected = false;
                            if (pbiColumn.displayName === column.name) {
                              selected = true;
                            }
                            return pbiColumn.displayName;
                          });

                        return (
                          <React.Fragment key={`${table.name}-${column.name}`}>
                            <div className="charticulator__file-view-mapping_row_item">
                              <span>{column.name}</span>
                              <Select
                                labels={optionValues}
                                icons={null}
                                options={optionValues}
                                value={getDefaultValue(
                                  column.name
                                )().toString()}
                                showText={true}
                                onChange={onChange(column.name)}
                              />
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            <p className="charticulator__file-view-mapping_row_button_toolbar">
              <div className="charticulator__file-view-mapping_row_item">
              <Button
                onClick={() => {
                  if (
                    this.props.unmappedColumns.filter(
                      (unmapped) =>
                        this.state.columnMappings.get(unmapped.name) ===
                        undefined
                    ).length == 0
                  ) {
                    this.props.onSave(this.state.columnMappings);
                  }
                }}
                text={"Save mapping"}
                active={
                  this.props.unmappedColumns.filter(
                    (unmapped) =>
                      this.state.columnMappings.get(unmapped.name) === undefined
                  ).length == 0
                }
              />
              </div>
              <div className="charticulator__file-view-mapping_row_item">
              <Button
                onClick={() => {
                  this.props.onClose();
                }}
                text={"Cancel"}
              />
              </div>
            </p>
          </section>
        </section>
      </FloatingPanel>
    );
  }
}

import * as React from "react";
import { Expression, Prototypes, Specification } from "../../../../core";
import { Actions } from "../../../actions";
import { DataFieldSelector } from "../../dataset/data_field_selector";
import { Button, InputExpression, Select } from "./controls";
import { WidgetManager } from "./manager";

export interface FilterEditorProps {
  manager: WidgetManager;
  options: Prototypes.Controls.FilterEditorOptions;
  value: Specification.Types.Filter;
}
export interface FilterEditorState {
  type: string;
  currentValue: Specification.Types.Filter;
}
export class FilterEditor extends React.Component<
  FilterEditorProps,
  FilterEditorState
> {
  public state: FilterEditorState = this.getDefaultState(this.props.value);
  public getDefaultState(value: Specification.Types.Filter): FilterEditorState {
    let filterType = "none";
    if (value) {
      if (value.expression) {
        filterType = "expression";
      }
      if (value.categories) {
        filterType = "categories";
      }
    }
    return {
      type: filterType,
      currentValue: value
    };
  }
  public emitUpdateFilter(newValue: Specification.Types.Filter) {
    if (this.props.options.target.property) {
      this.props.manager.emitSetProperty(
        this.props.options.target.property,
        newValue
      );
    }
    if (this.props.options.target.plotSegment) {
      this.props.manager.store.dispatcher.dispatch(
        new Actions.SetPlotSegmentFilter(
          this.props.options.target.plotSegment,
          newValue
        )
      );
    }
    this.setState(this.getDefaultState(newValue));
  }

  public render() {
    const { manager, options } = this.props;
    const value = this.state.currentValue;
    let typedControls: any[] = [];
    switch (this.state.type) {
      case "expression":
        {
          typedControls = [
            manager.row(
              "Expression",
              <InputExpression
                validate={newValue =>
                  manager.store.verifyUserExpressionWithTable(
                    newValue,
                    options.table,
                    { expectedTypes: ["boolean"] }
                  )
                }
                defaultValue={this.state.currentValue.expression}
                onEnter={newValue => {
                  this.emitUpdateFilter({
                    expression: newValue
                  });
                  return true;
                }}
              />
            )
          ];
        }
        break;
      case "categories":
        {
          const keysSorted: string[] = [];
          if (value && value.categories) {
            for (const k in value.categories.values) {
              if (value.categories.values.hasOwnProperty(k)) {
                keysSorted.push(k);
              }
            }
            keysSorted.sort((a, b) => (a < b ? -1 : 1));
          }
          typedControls = [
            manager.row(
              "Column",
              <div className="charticulator__filter-editor-column-selector">
                <DataFieldSelector
                  defaultValue={{
                    table: options.table,
                    expression: Expression.variable(
                      this.state.currentValue.categories.column
                    ).toString()
                  }}
                  table={options.table}
                  datasetStore={this.props.manager.store.datasetStore}
                  kinds={["categorical"]}
                  onChange={field => {
                    // Enumerate all values of this field
                    if (field.columnName) {
                      const table = this.props.manager.store.chartManager.dataflow.getTable(
                        field.table
                      );
                      const values: { [value: string]: boolean } = {};
                      for (const row of table.rows) {
                        if (row.hasOwnProperty(field.columnName)) {
                          values[row[field.columnName].toString()] = true;
                        }
                      }
                      this.emitUpdateFilter({
                        categories: {
                          column: field.columnName,
                          values: { ...values }
                        }
                      });
                    }
                  }}
                />
              </div>
            ),
            keysSorted.length > 0
              ? manager.row(
                  "Values",
                  <div className="charticulator__filter-editor-values-selector">
                    <div className="el-buttons">
                      <Button
                        text="Select All"
                        onClick={() => {
                          for (const key in value.categories.values) {
                            if (value.categories.values.hasOwnProperty(key)) {
                              value.categories.values[key] = true;
                            }
                          }
                          this.emitUpdateFilter({
                            categories: {
                              column: value.categories.column,
                              values: value.categories.values
                            }
                          });
                        }}
                      />
                      <Button
                        text="Clear"
                        onClick={() => {
                          for (const key in value.categories.values) {
                            if (value.categories.values.hasOwnProperty(key)) {
                              value.categories.values[key] = false;
                            }
                          }
                          this.emitUpdateFilter({
                            categories: {
                              column: value.categories.column,
                              values: value.categories.values
                            }
                          });
                        }}
                      />
                    </div>
                    <div className="el-list">
                      {keysSorted.map(key => (
                        <div key={key}>
                          <Button
                            icon={
                              value.categories.values[key]
                                ? "checkbox/checked"
                                : "checkbox/empty"
                            }
                            text={key}
                            onClick={() => {
                              value.categories.values[key] = !value.categories
                                .values[key];
                              this.emitUpdateFilter({
                                categories: {
                                  column: value.categories.column,
                                  values: value.categories.values
                                }
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              : null
          ];
        }
        break;
    }
    return (
      <div className="charticulator__filter-editor">
        <div className="attribute-editor">
          <div className="header">Edit Filter</div>
          {manager.vertical(
            manager.row(
              "Filter Type",
              <Select
                onChange={newValue => {
                  if (this.state.type != newValue) {
                    if (newValue == "none") {
                      this.emitUpdateFilter(null);
                    } else {
                      this.setState({
                        type: newValue,
                        currentValue: {
                          expression: "",
                          categories: {
                            column: "",
                            values: {}
                          }
                        }
                      });
                    }
                  }
                }}
                value={this.state.type}
                options={["none", "categories", "expression"]}
                labels={["None", "Categories", "Expression"]}
                showText={true}
              />
            ),
            ...typedControls
          )}
        </div>
      </div>
    );
  }
}

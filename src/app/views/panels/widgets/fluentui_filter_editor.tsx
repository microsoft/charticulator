// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Checkbox, DefaultButton, Dropdown } from "@fluentui/react";
import * as React from "react";
import { Expression, Prototypes, Specification } from "../../../../core";
import { strings } from "../../../../strings";
import { Actions } from "../../../actions";
import { DataFieldSelector } from "../../dataset/data_field_selector";
import {
  FluentCheckbox,
  labelRender,
} from "./controls/fluentui_customized_components";
import { FluentInputExpression } from "./controls/fluentui_input_expression";
import { CharticulatorPropertyAccessors } from "./types";

export interface FilterEditorProps {
  manager: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors;
  options: Prototypes.Controls.FilterEditorOptions;
  value: Specification.Types.Filter;
}
export interface FilterEditorState {
  type: string;
  currentValue: Specification.Types.Filter;
}
export class FluentUIFilterEditor extends React.Component<
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
      currentValue: value,
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

  // eslint-disable-next-line
  public render() {
    const { manager, options } = this.props;
    const value = this.state.currentValue;
    let typedControls: any[] = [];
    switch (this.state.type) {
      case "expression":
        {
          typedControls = [
            <FluentInputExpression
              validate={(newValue) => {
                if (newValue) {
                  return manager.store.verifyUserExpressionWithTable(
                    newValue,
                    options.table,
                    { expectedTypes: ["boolean"] }
                  );
                } else {
                  return {
                    pass: true,
                  };
                }
              }}
              allowNull={true}
              value={this.state.currentValue.expression}
              onEnter={(newValue) => {
                this.emitUpdateFilter({
                  expression: newValue,
                });
                return true;
              }}
              label={strings.filter.expression}
            />,
          ];
        }
        break;
      case "categories":
        {
          const keysSorted: string[] = [];
          if (value && value.categories) {
            for (const k in value.categories.values) {
              if (
                Object.prototype.hasOwnProperty.call(value.categories.values, k)
              ) {
                keysSorted.push(k);
              }
            }
            keysSorted.sort((a, b) => (a < b ? -1 : 1));
          }
          typedControls = [
            manager.vertical(
              manager.label(strings.filter.column),
              <div className="charticulator__filter-editor-column-selector">
                <DataFieldSelector
                  defaultValue={{
                    table: options.table,
                    expression: this.state.currentValue.categories.expression,
                  }}
                  table={options.table}
                  datasetStore={this.props.manager.store}
                  kinds={[Specification.DataKind.Categorical]}
                  onChange={(field) => {
                    // Enumerate all values of this field
                    if (field.expression) {
                      const parsed = Expression.parse(field.expression);
                      const table = this.props.manager.store.chartManager.dataflow.getTable(
                        field.table
                      );
                      const exprValues: { [value: string]: boolean } = {};
                      for (let i = 0; i < table.rows.length; i++) {
                        const rowContext = table.getRowContext(i);
                        exprValues[parsed.getStringValue(rowContext)] = true;
                      }
                      this.emitUpdateFilter({
                        categories: {
                          expression: field.expression,
                          values: exprValues,
                        },
                      });
                    }
                  }}
                />
              </div>
            ),
            keysSorted.length > 0
              ? manager.vertical(
                  manager.label(strings.filter.values),
                  <div className="charticulator__filter-editor-values-selector">
                    <div className="el-buttons">
                      <DefaultButton
                        text={strings.filter.selectAll}
                        onClick={() => {
                          for (const key in value.categories.values) {
                            if (
                              Object.prototype.hasOwnProperty.call(
                                value.categories.values,
                                key
                              )
                            ) {
                              value.categories.values[key] = true;
                            }
                          }
                          this.emitUpdateFilter({
                            categories: {
                              expression: value.categories.expression,
                              values: value.categories.values,
                            },
                          });
                        }}
                      />{" "}
                      <DefaultButton
                        text={strings.filter.clear}
                        onClick={() => {
                          for (const key in value.categories.values) {
                            if (
                              Object.prototype.hasOwnProperty.call(
                                value.categories.values,
                                key
                              )
                            ) {
                              value.categories.values[key] = false;
                            }
                          }
                          this.emitUpdateFilter({
                            categories: {
                              expression: value.categories.expression,
                              values: value.categories.values,
                            },
                          });
                        }}
                      />
                    </div>
                    <div>
                      {keysSorted.map((key) => (
                        <div key={key}>
                          <FluentCheckbox>
                            <Checkbox
                              checked={value.categories.values[key]}
                              label={key}
                              onChange={(ev, newValue) => {
                                value.categories.values[key] = newValue;
                                this.emitUpdateFilter({
                                  categories: {
                                    expression: value.categories.expression,
                                    values: value.categories.values,
                                  },
                                });
                              }}
                            />
                          </FluentCheckbox>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              : null,
          ];
        }
        break;
    }
    return (
      <div className="charticulator__filter-editor">
        <div className="attribute-editor">
          <div className="header">{strings.filter.editFilter}</div>
          {manager.vertical(
            <Dropdown
              label={strings.filter.filterType}
              styles={{
                root: {
                  minWidth: 105,
                },
              }}
              onRenderLabel={labelRender}
              options={[
                strings.filter.none,
                strings.filter.categories,
                strings.filter.expression,
              ].map((type) => {
                return {
                  key: type.toLowerCase(),
                  text: type,
                };
              })}
              selectedKey={this.state.type}
              onChange={(event, newValue) => {
                if (this.state.type != newValue.key) {
                  if (newValue.key == "none") {
                    this.emitUpdateFilter(null);
                  } else {
                    this.setState({
                      type: newValue.key as string,
                      currentValue: {
                        expression: "",
                        categories: {
                          expression: "",
                          values: {},
                        },
                      },
                    });
                  }
                }
              }}
            />,
            ...typedControls
          )}
        </div>
      </div>
    );
  }
}

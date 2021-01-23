// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Expression, Prototypes, Specification } from "../../../../core";
import { Actions } from "../../../actions";
import { DataFieldSelector } from "../../dataset/data_field_selector";
import { Button, InputExpression, Select } from "./controls";
import { CharticulatorPropertyAccessor } from "./manager";

export interface GroupByEditorProps {
  manager: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessor;
  options: Prototypes.Controls.GroupByEditorOptions;
  value: Specification.Types.GroupBy;
}
export interface GroupByEditorState {
  type: string;
  currentValue: Specification.Types.GroupBy;
}
export class GroupByEditor extends React.Component<
  GroupByEditorProps,
  GroupByEditorState
> {
  public state: GroupByEditorState = this.getDefaultState(this.props.value);
  public getDefaultState(
    value: Specification.Types.Filter
  ): GroupByEditorState {
    let groupByType = "none";
    if (value) {
      if (value.expression) {
        groupByType = "expression";
      }
    }
    return {
      type: groupByType,
      currentValue: value,
    };
  }
  public emitUpdateGroupBy(newValue: Specification.Types.Filter) {
    if (this.props.options.target.property) {
      this.props.manager.emitSetProperty(
        this.props.options.target.property,
        newValue
      );
    }
    if (this.props.options.target.plotSegment) {
      this.props.manager.store.dispatcher.dispatch(
        new Actions.SetPlotSegmentGroupBy(
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
    return (
      <div className="charticulator__groupby-editor">
        <DataFieldSelector
          defaultValue={
            this.state.currentValue && this.state.currentValue.expression
              ? {
                  table: options.table,
                  expression: this.state.currentValue.expression,
                }
              : null
          }
          table={options.table}
          nullDescription="(none)"
          datasetStore={this.props.manager.store}
          kinds={[Specification.DataKind.Categorical]}
          onChange={(field) => {
            if (field == null) {
              this.emitUpdateGroupBy(null);
            } else {
              this.emitUpdateGroupBy({
                expression: field.expression,
              });
            }
          }}
        />
      </div>
    );
  }
}

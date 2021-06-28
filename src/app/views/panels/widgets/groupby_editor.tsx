// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Prototypes, Specification } from "../../../../core";
import { strings } from "../../../../strings";
import { Actions } from "../../../actions";
import { DataFieldSelector } from "../../dataset/data_field_selector";
import { CharticulatorPropertyAccessors } from "./manager";
import { WidgetManager } from "./manager";

export interface GroupByEditorProps {
  manager: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors;
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
    const { options } = this.props;
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
          nullDescription={strings.core.none}
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

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import {
  argMax,
  argMin,
  Geometry,
  getById,
  Graphics,
  Point,
  Prototypes,
  Specification,
  uniqueID
} from "../../../core";
import { Actions } from "../../actions";
import { ButtonRaised, SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";

import { classNames } from "../../utils";
import {
  DataFieldSelector,
  DataFieldSelectorValue
} from "../dataset/data_field_selector";
import { ReorderListView } from "./object_list_editor";
import { LinkMarkType } from "../../../core/prototypes/links";
import { PanelRadioControl } from "./radio_control";
import { DataKind } from "../../../core/dataset";

export interface LegendCreationPanelProps {
  onFinish?: () => void;
}

export interface LegendCreationPanelState {
  legendDataSource: "columnNames" | "columnValues";
  legendType: "color" | "numerical" | "categorical";
  errorReport: string;
}

export class LegendCreationPanel extends ContextedComponent<
  LegendCreationPanelProps,
  LegendCreationPanelState
> {
  public state: LegendCreationPanelState = this.getDefaultState();

  private groupBySelector: DataFieldSelector;

  private getDefaultState(): LegendCreationPanelState {
    return {
      legendDataSource: "columnValues",
      errorReport: null,
      legendType: "color"
    };
  }

  public render() {
    return (
      <div className="charticulator__link-type-table">
        <div className="el-row">
          <h2>Legend type:</h2>
          <PanelRadioControl
            options={["columnValues", "columnNames"]}
            // icons={["Column names", "Column values"]}
            labels={["Column values", "Column names"]}
            value={this.state.legendDataSource}
            onChange={(newValue: "columnNames" | "columnValues") =>
              this.setState({ legendDataSource: newValue })
            }
            showText={true}
          />
        </div>
        {this.state.legendDataSource == "columnValues" ? (
          <div>
            <h2>Connect by:</h2>
            <div className="el-row">
              <DataFieldSelector
                multiSelect={false}
                ref={e => (this.groupBySelector = e)}
                kinds={[
                  Specification.DataKind.Categorical,
                  Specification.DataKind.Numerical,
                  Specification.DataKind.Temporal,
                  Specification.DataKind.Ordinal
                ]}
                datasetStore={this.store}
                nullDescription="(select column to create legend)"
              />
            </div>
          </div>
        ) : (
          <div>
            <h2>Connect by:</h2>
            <div className="el-row">
              <DataFieldSelector
                multiSelect={true}
                ref={e => (this.groupBySelector = e)}
                kinds={[
                  Specification.DataKind.Categorical,
                  Specification.DataKind.Numerical,
                  Specification.DataKind.Temporal,
                  Specification.DataKind.Ordinal
                ]}
                datasetStore={this.store}
                nullDescription="(select column names to create legend)"
              />
            </div>
          </div>
        )}
        <div className="el-row">
          <ButtonRaised
            text="Create Links"
            onClick={() => {
              const legend: any = null;

              const columns = this.groupBySelector
                ? this.groupBySelector.value
                  ? this.groupBySelector.props.multiSelect
                    ? (this.groupBySelector
                        .value as DataFieldSelectorValue[]).map(
                        v => v.expression
                      )
                    : [this.groupBySelector.value as DataFieldSelectorValue]
                  : []
                : [];

              console.log(columns);

              const keyOptions = "dataExpression";
              let legendType: "color" | "numerical" | "categorical" = "color";

              if (this.state.legendDataSource === "columnNames") {
                legendType = "color";
              } else {
                const kind = (this.groupBySelector
                  .value as DataFieldSelectorValue).metadata.kind;
                switch (kind) {
                  case DataKind.Numerical:
                    legendType = "numerical";
                    break;
                  case DataKind.Temporal:
                    legendType = "numerical";
                    break;
                  case DataKind.Ordinal:
                    legendType = "color";
                    break;
                }
              }

              const options = {
                dataSource: this.state.legendDataSource,
                [keyOptions]: columns,
                legendType
              };

              this.dispatch(
                new Actions.SetCurrentTool(
                  "legend.custom",
                  JSON.stringify(options)
                )
              );
              this.props.onFinish();
            }}
          />
          {this.state.errorReport ? (
            <span>{this.state.errorReport}</span>
          ) : null}
        </div>
      </div>
    );
  }
}

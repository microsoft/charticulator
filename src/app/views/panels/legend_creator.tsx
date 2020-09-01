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
  uniqueID,
  Expression
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
import { AttributeType } from "../../../core/specification";

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
            text="Create Legend"
            onClick={() => {
              const legend: any = null;

              const columns = this.groupBySelector
                ? this.groupBySelector.value
                  ? this.groupBySelector.props.multiSelect
                    ? (this.groupBySelector.value as DataFieldSelectorValue[])
                    : [this.groupBySelector.value as DataFieldSelectorValue]
                  : []
                : [];

              const keyOptions = "dataExpressionColumns";
              let legendType: "color" | "numerical" | "categorical" = "color";
              let attributeType: AttributeType = AttributeType.Color;

              if (this.state.legendDataSource === "columnNames") {
                legendType = "color";
                attributeType = AttributeType.Color;
              } else {
                const kind = (this.groupBySelector
                  .value as DataFieldSelectorValue).metadata.kind;
                switch (kind) {
                  case DataKind.Numerical:
                  case DataKind.Temporal:
                    legendType = "numerical";
                    attributeType = AttributeType.Number;
                    break;
                  case DataKind.Ordinal:
                    legendType = "color";
                    attributeType = AttributeType.Text;
                    break;
                }
              }

              // Create mapping
              let mappingOptions: any = {};
              if (this.state.legendDataSource === "columnValues") {
                const inferred = this.store.scaleInference(
                  { chart: { table: columns[0].table } },
                  columns[0].expression,
                  columns[0].type,
                  columns[0].metadata.kind,
                  attributeType,
                  {}
                );

                if (inferred != null) {
                  mappingOptions = {
                    type: "scale",
                    table: columns[0].table,
                    expression: columns[0].expression,
                    valueType: columns[0].type,
                    scale: inferred
                  } as Specification.ScaleMapping;
                } else {
                  if (
                    (columns[0].type == Specification.DataType.String ||
                      columns[0].type == Specification.DataType.Boolean ||
                      columns[0].type == Specification.DataType.Number) &&
                    attributeType == Specification.AttributeType.Text
                  ) {
                    // If the valueType is a number, use a format
                    const format =
                      columns[0].type == Specification.DataType.Number
                        ? ".1f"
                        : undefined;
                    mappingOptions = {
                      type: "text",
                      table: columns[0].table,
                      textExpression: new Expression.TextExpression([
                        {
                          expression: Expression.parse(columns[0].expression),
                          format
                        }
                      ]).toString()
                    } as Specification.TextMapping;
                  }
                }
              }

              const options = {
                dataSource: this.state.legendDataSource,
                [keyOptions]: columns,
                legendType,
                mappingOptions
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

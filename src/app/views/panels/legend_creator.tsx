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
import { DataKind, TableType } from "../../../core/dataset";
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
                const valueType: Specification.DataType =
                  Specification.DataType.String;
                const valueKind: Specification.DataKind =
                  Specification.DataKind.Categorical;
                const outputType: Specification.AttributeType =
                  Specification.AttributeType.Color;

                const scaleClassID = Prototypes.Scales.inferScaleType(
                  valueType,
                  valueKind,
                  outputType
                );

                const tableName = this.store.dataset.tables.find(
                  t => t.type === TableType.Main
                ).name;
                const table = this.store.chartManager.dataflow.getTable(
                  tableName
                );
                const data = (columns as any[])
                  .map(ex => {
                    const expression = `columnName(${ex.table}.columns, "${ex.columnName}")`;
                    const parsedExpression = this.store.chartManager.dataflow.cache.parse(
                      expression
                    );
                    try {
                      const table = this.store.chartManager.dataflow.getTable(
                        ex.table
                      );
                      return parsedExpression.getValue(table); // to do add check before apply
                    } catch (ex) {
                      console.error(ex);
                      return null;
                    }
                  })
                  .filter(v => v != null);

                const expression = `columnName(${tableName}.columns, ${(data as any[])
                  .map(ex => {
                    return `"${ex[0]}"`;
                  })
                  .join(",")})`;

                const newScale = this.store.chartManager.createObject(
                  scaleClassID
                ) as Specification.Scale;
                newScale.properties.name = this.store.chartManager.findUnusedName(
                  "Scale"
                );
                newScale.inputType = valueType;
                newScale.outputType = outputType;
                this.store.chartManager.addScale(newScale);
                const scaleClass = this.store.chartManager.getClassById(
                  newScale._id
                ) as Prototypes.Scales.ScaleClass;

                scaleClass.inferParameters(
                  data as Specification.DataValue[],
                  {}
                );

                const newLegend = this.store.chartManager.createObject(
                  `legend.custom`
                ) as Specification.ChartElement;
                newLegend.properties.scale = newScale._id;
                newLegend.mappings.x = {
                  type: "parent",
                  parentAttribute: "x2"
                } as Specification.ParentMapping;
                newLegend.mappings.y = {
                  type: "parent",
                  parentAttribute: "y2"
                } as Specification.ParentMapping;
                this.store.chartManager.addChartElement(newLegend);
                this.store.chartManager.chart.mappings.marginRight = {
                  type: "value",
                  value: 100
                } as Specification.ValueMapping;

                const mappingOptions = {
                  type: "scale",
                  table: tableName,
                  expression,
                  valueType,
                  scale: newScale._id,
                  allowSelectValue: true
                } as Specification.ScaleMapping;

                newLegend.mappings.mappingOptions = mappingOptions;
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

              if (this.state.legendDataSource === "columnValues") {
                const aggregation = Expression.getDefaultAggregationFunction(
                  columns[0].type
                );
                const aggregatedExpression = Expression.functionCall(
                  aggregation,
                  Expression.parse(columns[0].expression)
                ).toString();

                const table = columns[0].table;
                const inferred = this.store.scaleInference(
                  { chart: { table } },
                  aggregatedExpression,
                  columns[0].type,
                  columns[0].metadata.kind,
                  attributeType,
                  {}
                );

                const scaleObject = getById(
                  this.store.chartManager.chart.scales,
                  inferred
                );
                let newLegend: Specification.Object<Specification.ObjectProperties> = null;
                switch (scaleObject.classID) {
                  case "scale.categorical<string,color>":
                    newLegend = this.store.chartManager.createObject(
                      `legend.categorical`
                    ) as Specification.ChartElement;
                    newLegend.properties.scale = inferred;
                    newLegend.mappings.x = {
                      type: "parent",
                      parentAttribute: "x2"
                    } as Specification.ParentMapping;
                    newLegend.mappings.y = {
                      type: "parent",
                      parentAttribute: "y2"
                    } as Specification.ParentMapping;
                    this.store.chartManager.addChartElement(newLegend);
                    this.store.chartManager.chart.mappings.marginRight = {
                      type: "value",
                      value: 100
                    } as Specification.ValueMapping;
                    break;
                  case "scale.linear<number,color>":
                  case "scale.linear<integer,color>":
                    newLegend = this.store.chartManager.createObject(
                      `legend.numerical-color`
                    ) as Specification.ChartElement;
                    newLegend.properties.scale = inferred;
                    newLegend.mappings.x = {
                      type: "parent",
                      parentAttribute: "x2"
                    } as Specification.ParentMapping;
                    newLegend.mappings.y = {
                      type: "parent",
                      parentAttribute: "y2"
                    } as Specification.ParentMapping;
                    this.store.chartManager.addChartElement(newLegend);
                    this.store.chartManager.chart.mappings.marginRight = {
                      type: "value",
                      value: 100
                    } as Specification.ValueMapping;
                    break;
                  case "scale.linear<number,number>":
                  case "scale.linear<integer,number>":
                    newLegend = this.store.chartManager.createObject(
                      `legend.numerical-number`
                    ) as Specification.ChartElement;
                    newLegend.properties.scale = inferred;
                    newLegend.mappings.x1 = {
                      type: "parent",
                      parentAttribute: "x1"
                    } as Specification.ParentMapping;
                    newLegend.mappings.y1 = {
                      type: "parent",
                      parentAttribute: "y1"
                    } as Specification.ParentMapping;
                    newLegend.mappings.x2 = {
                      type: "parent",
                      parentAttribute: "x1"
                    } as Specification.ParentMapping;
                    newLegend.mappings.y2 = {
                      type: "parent",
                      parentAttribute: "y2"
                    } as Specification.ParentMapping;
                    this.store.chartManager.addChartElement(newLegend);
                }

                newLegend.mappings.mappingOptions = {
                  type: "scale",
                  table,
                  expression: aggregatedExpression,
                  valueType: columns[0].type,
                  scale: inferred
                } as Specification.ScaleMapping;
              }

              this.store.solveConstraintsAndUpdateGraphics();
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

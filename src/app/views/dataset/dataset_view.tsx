// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Dataset, Expression } from "../../../core";
import { DragData, Actions } from "../../actions";
import { ButtonFlat, DraggableElement, SVGImageIcon } from "../../components";
import { PopupView } from "../../controllers";
import * as globals from "../../globals";
import * as R from "../../resources";
import { AppStore } from "../../stores";
import {
  classNames,
  showOpenFileDialog,
  getFileNameWithoutExtension,
  getConvertableDataKind
} from "../../utils";
import { Button, Select, DropdownListView } from "../panels/widgets/controls";
import { kind2Icon, type2DerivedColumns } from "./common";
import { TableView } from "./table_view";
import { TableType } from "../../../core/dataset";
import { DataType, DataKind } from "../../../core/specification";

export interface DatasetViewProps {
  store: AppStore;
}

export interface DatasetViewState { }

export class DatasetView extends React.Component<
  DatasetViewProps,
  DatasetViewState
  > {
  public componentDidMount() {
    this.props.store.addListener(AppStore.EVENT_DATASET, () =>
      this.forceUpdate()
    );
  }
  public render() {
    const tables = this.props.store.getTables();
    const mainTables = [TableType.Main, TableType.Links];
    return (
      <div className="charticulator__dataset-view">
        {tables
          .filter(table => mainTables.find(m => m === table.type))
          .map((table, idx) => (
            <ColumnsView
              key={`t${idx}`}
              table={table}
              store={this.props.store}
            />
          ))}
      </div>
    );
  }

  public onImportConnections() {
    alert("Not implemented yet");
  }
}

export interface ColumnsViewProps {
  store: AppStore;
  table: Dataset.Table;
}

export interface ColumnsViewState {
  selectedColumn: string;
}

export class ColumnsView extends React.Component<
  ColumnsViewProps,
  ColumnsViewState
  > {
  constructor(props: ColumnsViewProps) {
    super(props);
    this.state = {
      selectedColumn: null
    };
  }

  public render() {
    const table = this.props.table;
    let anchor: HTMLDivElement;
    return (
      <div
        className="charticulator__dataset-view-columns"
        ref={e => (anchor = e)}
      >
        <h2 className="el-title">
          <span className="el-text">
            {this.props.table.type === TableType.Links
              ? "Link Data"
              : "Columns"}
          </span>
          <Button
            icon="general/replace"
            title="Replace data with CSV file"
            active={false}
            onClick={() => {
              showOpenFileDialog(["csv"]).then(file => {
                const loader = new Dataset.DatasetLoader();
                const reader = new FileReader();
                reader.onload = () => {
                  const newTable = loader.loadCSVFromContents(
                    table.name,
                    reader.result as string
                  );
                  newTable.displayName = getFileNameWithoutExtension(file.name);
                  newTable.name = table.name;
                  newTable.type = table.type
                  const store = this.props.store;
                  const newDataset: Dataset.Dataset = {
                    name: store.dataset.name,
                    tables: store.dataset.tables.map(x => {
                      if (x.name == table.name) {
                        return newTable;
                      } else {
                        return x;
                      }
                    })
                  };
                  store.dispatcher.dispatch(
                    new Actions.ReplaceDataset(newDataset)
                  );
                };
                reader.readAsText(file);
              });
            }}
          />
          <Button
            icon="general/more-horizontal"
            title="Show data values"
            active={false}
            onClick={() => {
              globals.popupController.popupAt(
                context => (
                  <PopupView context={context}>
                    <div className="charticulator__dataset-view-detail">
                      <h2>{table.displayName || table.name}</h2>
                      <p>
                        {table.rows.length} rows, {table.columns.length} columns
                      </p>
                      <TableView
                        table={table}
                        onTypeChange={(column, type) => {
                          const store = this.props.store;

                          store.dispatcher.dispatch(
                            new Actions.ConvertColumnDataType(table.name, column, type as DataType)
                          );
                        }}
                      />
                    </div>
                  </PopupView>
                ),
                { anchor, alignX: "outer", alignY: "start-inner" }
              );
            }}
          />
        </h2>
        <p className="el-details">{table.displayName || table.name}</p>
        {table.columns.map((c, idx) => (
          <ColumnView
            key={`t${idx}`}
            store={this.props.store}
            table={this.props.table}
            column={c}
          />
        ))}
      </div>
    );
  }
}

export class ColumnViewProps {
  public store: AppStore;
  public table: Dataset.Table;
  public column: Dataset.Column;
}

export class ColumnViewState {
  public isSelected: string;
  public isExpanded: boolean;
}

export class ColumnView extends React.Component<
  ColumnViewProps,
  ColumnViewState
  > {
  constructor(props: ColumnViewProps) {
    super(props);
    this.state = {
      isSelected: null,
      isExpanded: false
    };
  }

  public renderDerivedColumns() {
    const c = this.props.column;
    const derivedColumns = type2DerivedColumns[c.type];
    if (!derivedColumns) {
      return null;
    }
    return (
      <div className="charticulator__dataset-view-derived-fields">
        {derivedColumns.map(desc => {
          const expr = Expression.functionCall(
            desc.function,
            Expression.variable(this.props.column.name)
          ).toString();
          const lambdaExpr = Expression.lambda(
            ["x"],
            Expression.functionCall(
              desc.function,
              Expression.fields(
                Expression.variable("x"),
                this.props.column.name
              )
            )
          ).toString();
          const type = desc.type;
          return this.renderColumnControl(
            desc.name,
            R.getSVGIcon(kind2Icon[desc.metadata.kind]),
            expr,
            lambdaExpr,
            type,
            null,
            desc.metadata
          )
        })}
      </div>
    );
  }

  public applyAggregation(expr: string, type: string) {
    const aggregation = Expression.getDefaultAggregationFunction(type);
    return Expression.functionCall(
      aggregation,
      Expression.parse(expr)
    ).toString();
  }

  public renderColumnControl(
    label: string,
    icon: string,
    expr: string,
    lambdaExpr: string,
    type: Dataset.DataType,
    additionalElement: JSX.Element = null,
    metadata: Dataset.ColumnMetadata,
    onColumnKindChanged?: (column: string, type: string) => void
  ) {
    let anchor: HTMLDivElement;
    return (
      <div className="click-handler"
        ref={e => (anchor = e)}
        onClick={() => {
          if (!onColumnKindChanged) {
            return;
          }
          globals.popupController.popupAt(
            context => (
              <PopupView key={label} context={context}>
                <div>
                  <DropdownListView
                    selected={type}
                    list={getConvertableDataKind(type).map(type => {
                      return {
                        name: type.toString(),
                        text: type.toString(),
                        url: R.getSVGIcon(kind2Icon[type])
                      }
                    })}
                    context={context}
                    onClick={(value: string) => {
                      onColumnKindChanged(label, value);
                    }}
                  />
                </div>
              </PopupView>
            ),
            { anchor, alignX: "outer", alignY: "start-inner" }
          );
        }}
      >
        <DraggableElement
          key={expr}
          className={classNames("charticulator__dataset-view-column", [
            "is-active",
            this.state.isSelected == expr
          ])}
          onDragStart={() => this.setState({ isSelected: expr })}
          onDragEnd={() => this.setState({ isSelected: null })}
          dragData={() => {
            this.setState({ isSelected: expr });
            const r = new DragData.DataExpression(
              this.props.table,
              this.applyAggregation(expr, type),
              type,
              metadata
            );
            return r;
          }}
          renderDragElement={() => [
            <span className="dragging-table-cell">{expr}</span>,
            { x: -10, y: -8 }
          ]}
        >
          <SVGImageIcon url={icon} />
          <span className="el-text">{label}</span>
          {additionalElement}
        </DraggableElement>
      </div>
    );
  }

  public render() {
    const c = this.props.column;

    const derivedColumnsControl = this.renderDerivedColumns();

    if (derivedColumnsControl != null) {
      return (
        <div>
          {this.renderColumnControl(
            c.name,
            R.getSVGIcon(kind2Icon[c.metadata.kind]),
            Expression.variable(c.name).toString(),
            Expression.lambda(
              ["x"],
              Expression.fields(Expression.variable("x"), c.name)
            ).toString(),
            c.type,
            <ButtonFlat
              title="Show derived fields"
              url={
                this.state.isExpanded
                  ? R.getSVGIcon("general/minus")
                  : R.getSVGIcon("general/more-vertical")
              }
              onClick={() => {
                this.setState({ isExpanded: !this.state.isExpanded });
              }}
            />,
            c.metadata,
            (column, type) => {
              c.metadata.kind = type as DataKind;
              this.forceUpdate();
              this.props.store.dispatcher.dispatch(
                new Actions.UpdatePlotSegments()
              );
            }
          )}
          {this.state.isExpanded ? derivedColumnsControl : null}
        </div>
      );
    } else {
      return this.renderColumnControl(
        c.name,
        R.getSVGIcon(kind2Icon[c.metadata.kind]),
        Expression.variable(c.name).toString(),
        Expression.lambda(
          ["x"],
          Expression.fields(Expression.variable("x"), c.name)
        ).toString(),
        c.type,
        null,
        c.metadata,
        (column, type) => {
          c.metadata.kind = type as DataKind;
          this.props.store.dispatcher.dispatch(
            new Actions.UpdatePlotSegments()
          );
          this.forceUpdate();
        }
      );
    }
  }
}

import * as React from "react";

import { EventSubscription } from "../../../core";

import { DatasetStore } from "../../stores";
import { Dataset, Expression } from "../../../core";
import * as globals from "../../globals";

import { classNames } from "../../utils";
import * as R from "../../resources";
import { DraggableElement, SVGImageIcon } from "../../components";
import { DragData, Actions } from "../../actions";

import { DropdownButton, ButtonFlat } from "../../components";
import { Button } from "../panels/widgets/controls";
import { PopupView } from "../../controllers";
import { TableView } from "./table_view";

export interface DatasetViewProps {
    store: DatasetStore;
}

export interface DatasetViewState {
}

export class DatasetView extends React.Component<DatasetViewProps, DatasetViewState> {
    public componentDidMount() {
        this.props.store.addListener(DatasetStore.EVENT_SELECTION, () => this.forceUpdate());
        this.props.store.addListener(DatasetStore.EVENT_CHANGED, () => this.forceUpdate());
    }
    public render() {
        let tables = this.props.store.getTables();
        return (
            <div className="charticulator__dataset-view">
                {tables.map((table, idx) => (
                    <ColumnsView key={`t${idx}`} table={table} store={this.props.store} isLinkTable={idx == 1} />
                ))}
            </div>
        );
    }

    public onImportConnections() {
        alert("Not implemented yet");
    }
}

export interface ColumnsViewProps {
    store: DatasetStore;
    table: Dataset.Table;
    isLinkTable: boolean;
}

export interface ColumnsViewState {
    selectedColumn: string;
}

export interface DerivedColumnDescription {
    name: string;
    type: string;
    function: string;
    metadata: Dataset.ColumnMetadata;
}

function makeTwoDigitRange(start: number, end: number): string[] {
    let r: string[] = [];
    for (let i = start; i <= end; i++) {
        let istr = i.toString();
        while (istr.length < 2) istr = "0" + istr;
        r.push(istr);
    }
    return r;
}

let type2DerivedColumns: { [name: string]: DerivedColumnDescription[] } = {
    "string": null,
    "number": null,
    "integer": null,
    "boolean": null,
    "date": [
        { name: "year", type: "string", function: "date.year", metadata: { kind: "categorical", orderMode: "alphabetically" } },
        { name: "month", type: "string", function: "date.month", metadata: { kind: "categorical", order: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] } },
        { name: "day", type: "string", function: "date.day", metadata: { kind: "categorical", orderMode: "alphabetically" } },
        { name: "weekOfYear", type: "string", function: "date.weekOfYear", metadata: { kind: "categorical", orderMode: "alphabetically" } },
        { name: "dayOfYear", type: "string", function: "date.dayOfYear", metadata: { kind: "categorical", orderMode: "alphabetically" } },
        { name: "weekday", type: "string", function: "date.weekday", metadata: { kind: "categorical", order: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] } },
        { name: "hour", type: "string", function: "date.hour", metadata: { kind: "categorical", order: makeTwoDigitRange(0, 24) } },
        { name: "minute", type: "string", function: "date.minute", metadata: { kind: "categorical", order: makeTwoDigitRange(0, 59) } },
        { name: "second", type: "string", function: "date.second", metadata: { kind: "categorical", order: makeTwoDigitRange(0, 59) } }
    ]
};

let kind2Icon: { [name: string]: string } = {
    "categorical": "type/categorical",
    "numerical": "type/numerical",
    "boolean": "type/boolean",
    "date": "type/numerical",
};

export class ColumnsView extends React.Component<ColumnsViewProps, ColumnsViewState> {
    constructor(props: ColumnsViewProps) {
        super(props);
        this.state = {
            selectedColumn: null
        };
    }

    public render() {
        let table = this.props.table;
        let anchor: HTMLDivElement;
        return (
            <div className="charticulator__dataset-view-columns" ref={(e) => anchor = e}>
                <h2 className="el-title">
                    <span className="el-text">{this.props.isLinkTable ? "Link Data" : "Columns"}</span>
                    <Button
                        icon="general/more-horizontal"
                        active={false}
                        onClick={() => {
                            globals.popupController.popupAt((context) => (
                                <PopupView context={context}>
                                    <div className="charticulator__dataset-view-detail">
                                        <h2>{table.name}</h2>
                                        <p>{table.rows.length} rows, {table.columns.length} columns</p>
                                        <TableView table={table} />
                                    </div>
                                </PopupView>
                            ), { anchor: anchor, alignX: "outer", alignY: "start-inner" });
                        }}
                    />
                </h2>
                <p className="el-details">{table.name}</p>
                {table.columns.map((c, idx) => (
                    <ColumnView key={`t${idx}`} store={this.props.store} table={this.props.table} column={c} />
                ))}
            </div>
        );
    }
}

export class ColumnViewProps {
    store: DatasetStore;
    table: Dataset.Table;
    column: Dataset.Column;
}

export class ColumnViewState {
    isSelected: string;
    isExpanded: boolean;
}

export class ColumnView extends React.Component<ColumnViewProps, ColumnViewState> {
    constructor(props: ColumnViewProps) {
        super(props);
        this.state = {
            isSelected: null,
            isExpanded: false
        };
    }

    public renderDerivedColumns() {
        let c = this.props.column;
        let derivedColumns = type2DerivedColumns[c.type];
        if (!derivedColumns) return null;
        return (
            <div className="charticulator__dataset-view-derived-fields">
                {derivedColumns.map(desc => {
                    let expr = Expression.functionCall(desc.function, Expression.variable(this.props.column.name)).toString();
                    let lambdaExpr = Expression.lambda(["x"], Expression.functionCall(desc.function, Expression.fields(Expression.variable("x"), this.props.column.name))).toString();
                    let type = desc.type;
                    return this.renderColumnControl(desc.name, R.getSVGIcon(kind2Icon[desc.metadata.kind]), expr, lambdaExpr, type, null, desc.metadata);
                })}
            </div>
        );
    }

    public renderColumnControl(label: string, icon: string, expr: string, lambdaExpr: string, type: string, additionalElement: JSX.Element = null, metadata: Dataset.ColumnMetadata) {
        return (
            <DraggableElement
                className={classNames("charticulator__dataset-view-column", ["is-active", this.state.isSelected == expr])}
                onDragStart={() => this.setState({ isSelected: expr })}
                onDragEnd={() => this.setState({ isSelected: null })}
                dragData={() => {
                    this.setState({ isSelected: expr });
                    let r = new DragData.DataExpression(this.props.table, expr, lambdaExpr, type, metadata);
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
        );
    }

    public render() {
        let c = this.props.column;

        let derivedColumnsControl = this.renderDerivedColumns();

        if (derivedColumnsControl != null) {
            return (
                <div>
                    {this.renderColumnControl(
                        c.name, R.getSVGIcon(kind2Icon[c.metadata.kind]),
                        Expression.variable(c.name).toString(),
                        Expression.lambda(["x"], Expression.fields(Expression.variable("x"), c.name)).toString(),
                        c.type,
                        (
                            <ButtonFlat
                                title="Show derived fields"
                                url={this.state.isExpanded ? R.getSVGIcon("general/minus") : R.getSVGIcon("general/more-vertical")} onClick={() => {
                                    this.setState({ isExpanded: !this.state.isExpanded });
                                }}
                            />
                        ),
                        c.metadata
                    )}
                    {this.state.isExpanded ? derivedColumnsControl : null}
                </div>
            );
        } else {
            return this.renderColumnControl(
                c.name, R.getSVGIcon(kind2Icon[c.metadata.kind]),
                Expression.variable(c.name).toString(),
                Expression.lambda(["x"], Expression.fields(Expression.variable("x"), c.name)).toString(),
                c.type, null, c.metadata
            );
        }
    }

}
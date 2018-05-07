import { Context } from "../expression";
import { Dataset, Table, Column, Row } from "./dataset";
import { getByName } from "../common";

export class DatasetContext implements Context {
    fields: { [name: string]: Row[] } = {};

    constructor(public dataset: Dataset) {
        for (let table of dataset.tables) {
            this.fields[table.name] = table.rows;
        }
    }

    public getTableContext(table: Table) {
        return new TableContext(this, table);
    }

    public getVariable(name: string) {
        return this.fields[name];
    }
}

export class TableContext {
    fields: { [name: string]: Row[] } = {};

    constructor(public parent: DatasetContext, public table: Table) {
        this.fields["table"] = table.rows;
    }

    public getRowContext(row: Row) {
        return new RowContext(this, row);
    }

    public getVariable(name: string) {
        let r = this.fields[name];
        if (r === undefined) {
            return this.parent.getVariable(name);
        }
    }
}

export class RowContext {
    constructor(public parent: TableContext, public row: Row) {
    }

    public getVariable(name: string) {
        let r = this.row[name];
        if (r === undefined) {
            return this.parent.getVariable(name);
        } else {
            return r;
        }
    }
}
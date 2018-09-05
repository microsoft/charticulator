/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import { Specification, Dataset, Expression } from "../../../core";
import { DatasetStore } from "../../stores";
import { classNames } from "../../utils";
import { SVGImageIcon } from "../../components";
import * as R from "../../resources";

const kind2Icon: { [name: string]: string } = {
  categorical: "type/categorical",
  numerical: "type/numerical",
  boolean: "type/boolean",
  date: "type/numerical"
};

export interface DataFieldSelectorProps {
  datasetStore: DatasetStore;
  /** Show fields only from a particular table */
  table?: string;
  /** Show fields only of certain kinds or types (categorical / numerical) */
  kinds?: string[];
  types?: string[];
  /** Allow null selection and describe null as specified */
  nullDescription?: string;
  nullNotHighlightable?: boolean;

  /** Set a default value */
  defaultValue?: {
    table: string;
    lambdaExpression?: string;
    expression?: string;
  };

  onChange?: (newValue: DataFieldSelectorValue) => void;
}

export interface DataFieldSelectorValue {
  table: string;
  expression: string;
  lambdaExpression: string;
  columnName?: string;
  type: string;
  metadata: Dataset.ColumnMetadata;
}

export interface DataFieldSelectorState {
  currentSelection: DataFieldSelectorValue;
}

export class DataFieldSelector extends React.Component<
  DataFieldSelectorProps,
  DataFieldSelectorState
> {
  constructor(props: DataFieldSelectorProps) {
    super(props);

    if (this.props.defaultValue) {
      const fs = this.getFields().filter(x => {
        if (
          this.props.defaultValue.table != null &&
          x.table != this.props.defaultValue.table
        ) {
          return false;
        }
        if (this.props.defaultValue.lambdaExpression != null) {
          return x.lambdaExpression == this.props.defaultValue.lambdaExpression;
        }
        if (this.props.defaultValue.expression != null) {
          return x.expression == this.props.defaultValue.expression;
        }
      });
      if (fs.length == 1) {
        this.state = {
          currentSelection: fs[0]
        };
      } else {
        this.state = {
          currentSelection: null
        };
      }
    } else {
      this.state = {
        currentSelection: null
      };
    }
  }

  public get value() {
    return this.state.currentSelection;
  }

  private getFields() {
    const store = this.props.datasetStore;
    const columns = store.getTables()[0].columns;
    let candidates = columns.map(c => {
      return {
        table: store.getTables()[0].name,
        columnName: c.name,
        expression: Expression.variable(c.name).toString(),
        lambdaExpression: Expression.lambda(
          ["x"],
          Expression.fields(Expression.variable("x"), c.name)
        ).toString(),
        type: c.type,
        metadata: c.metadata
      };
    });
    if (this.props.table) {
      candidates = candidates.filter(x => x.table == this.props.table);
    }
    if (this.props.kinds) {
      candidates = candidates.filter(
        x =>
          x.metadata != null && this.props.kinds.indexOf(x.metadata.kind) >= 0
      );
    }
    if (this.props.types) {
      candidates = candidates.filter(
        x => x.metadata != null && this.props.types.indexOf(x.type) >= 0
      );
    }
    return candidates;
  }

  private isValueEqual(v1: DataFieldSelectorValue, v2: DataFieldSelectorValue) {
    if (v1 == v2) {
      return true;
    }
    if (v1 == null || v2 == null) {
      return false;
    }
    return v1.expression == v2.expression && v1.table == v2.table;
  }

  private selectItem(item: DataFieldSelectorValue) {
    this.setState({ currentSelection: item });
    if (this.props.onChange) {
      this.props.onChange(item);
    }
  }

  public render() {
    const fields = this.getFields();
    return (
      <div className="charticulator__data-field-selector">
        {this.props.nullDescription ? (
          <div
            className={classNames("el-item", "is-null", [
              "is-active",
              !this.props.nullNotHighlightable &&
                this.state.currentSelection == null
            ])}
            onClick={() => this.selectItem(null)}
          >
            {this.props.nullDescription}
          </div>
        ) : null}
        {fields.length == 0 && !this.props.nullDescription ? (
          <div className="el-item is-null">(no suitable column)</div>
        ) : null}
        {fields.map(f => {
          return (
            <div
              key={f.table + f.expression}
              className={classNames("el-item", [
                "is-active",
                this.isValueEqual(this.state.currentSelection, f)
              ])}
              onClick={() => this.selectItem(f)}
            >
              <SVGImageIcon url={R.getSVGIcon(kind2Icon[f.metadata.kind])} />
              {f.columnName || f.expression}
            </div>
          );
        })}
      </div>
    );
  }
}

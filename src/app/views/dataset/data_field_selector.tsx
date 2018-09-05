import * as React from "react";
import { Dataset, Expression } from "../../../core";
import { SVGImageIcon } from "../../components";
import * as R from "../../resources";
import { DatasetStore } from "../../stores";
import { classNames } from "../../utils";
import { kind2Icon, type2DerivedColumns } from "./common";
import { Button } from "../panels/widgets/controls";

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
  /** Only available if the expression refers to exactly a column */
  columnName?: string;
  type: string;
  metadata: Dataset.ColumnMetadata;
}

export interface DataFieldSelectorValueCandidate
  extends DataFieldSelectorValue {
  selectable: boolean;
  displayName: string;
  derived?: DataFieldSelectorValueCandidate[];
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
      const fs = this.getAllFields().filter(x => {
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

  private getAllFields() {
    const fields = this.getFields();
    const r: DataFieldSelectorValue[] = [];
    for (const item of fields) {
      r.push(item);
      if (item.derived) {
        for (const ditem of item.derived) {
          r.push(ditem);
        }
      }
    }
    return r;
  }

  private getFields() {
    const store = this.props.datasetStore;
    const columns = store.getTables()[0].columns;
    const columnFilters: Array<(x: DataFieldSelectorValue) => boolean> = [];
    if (this.props.table) {
      columnFilters.push(x => x.table == this.props.table);
    }
    if (this.props.kinds) {
      columnFilters.push(
        x =>
          x.metadata != null && this.props.kinds.indexOf(x.metadata.kind) >= 0
      );
    }
    if (this.props.types) {
      columnFilters.push(
        x => x.metadata != null && this.props.types.indexOf(x.type) >= 0
      );
    }
    const columnFilter = (x: DataFieldSelectorValue) => {
      for (const f of columnFilters) {
        if (!f(x)) {
          return false;
        }
      }
      return true;
    };
    let candidates = columns.map(c => {
      const r: DataFieldSelectorValueCandidate = {
        selectable: true,
        table: store.getTables()[0].name,
        columnName: c.name,
        expression: Expression.variable(c.name).toString(),
        lambdaExpression: Expression.lambda(
          ["x"],
          Expression.fields(Expression.variable("x"), c.name)
        ).toString(),
        type: c.type,
        displayName: c.name,
        metadata: c.metadata,
        derived: []
      };
      // Compute derived columns.
      const derivedColumns = type2DerivedColumns[r.type];
      if (derivedColumns) {
        for (const item of derivedColumns) {
          const ditem: DataFieldSelectorValueCandidate = {
            table: store.getTables()[0].name,
            columnName: null,
            expression: Expression.functionCall(
              item.function,
              Expression.parse(r.expression)
            ).toString(),
            lambdaExpression: Expression.lambda(
              ["x"],
              Expression.functionCall(
                item.function,
                Expression.fields(Expression.variable("x"), c.name)
              )
            ).toString(),
            type: item.type,
            metadata: item.metadata,
            displayName: item.name,
            selectable: true
          };
          if (columnFilter(ditem)) {
            r.derived.push(ditem);
          }
        }
      }
      r.selectable = columnFilter(r);
      return r;
    });
    // Make sure we only show good ones
    candidates = candidates.filter(x => x.derived.length > 0 || x.selectable);
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
            className={classNames("el-field-item", "is-null", "is-selectable", [
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
          <div className="el-field-item is-null">(no suitable column)</div>
        ) : null}
        {fields.map(f => {
          let elDerived: HTMLElement;
          return (
            <div className="el-column-item" key={f.table + f.expression}>
              <div
                className={classNames(
                  "el-field-item",
                  [
                    "is-active",
                    this.isValueEqual(this.state.currentSelection, f)
                  ],
                  ["is-selectable", f.selectable]
                )}
                onClick={f.selectable ? () => this.selectItem(f) : null}
              >
                <SVGImageIcon url={R.getSVGIcon(kind2Icon[f.metadata.kind])} />
                <span className="el-text">{f.displayName}</span>
                {f.derived && f.derived.length > 0 ? (
                  <Button
                    icon="general/more-vertical"
                    onClick={() => {
                      if (elDerived) {
                        if (elDerived.style.display == "none") {
                          elDerived.style.display = "block";
                        } else {
                          elDerived.style.display = "none";
                        }
                      }
                    }}
                  />
                ) : null}
              </div>
              {f.derived && f.derived.length > 0 ? (
                <div
                  className="el-derived-fields"
                  style={{ display: "none" }}
                  ref={e => (elDerived = e)}
                >
                  {f.derived.map(df => {
                    return (
                      <div
                        key={df.table + df.expression}
                        className={classNames(
                          "el-field-item",
                          [
                            "is-active",
                            this.isValueEqual(this.state.currentSelection, df)
                          ],
                          ["is-selectable", df.selectable]
                        )}
                        onClick={
                          df.selectable ? () => this.selectItem(df) : null
                        }
                      >
                        <SVGImageIcon
                          url={R.getSVGIcon(kind2Icon[df.metadata.kind])}
                        />
                        <span className="el-text">{df.displayName}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
}

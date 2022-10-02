// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Dataset, Expression } from "../../../core";
import { SVGImageIcon } from "../../components";
import * as R from "../../resources";
import { AppStore } from "../../stores";
import { classNames } from "../../utils";
import { kind2Icon, type2DerivedColumns, isKindAcceptable } from "./common";
import { Button, Select } from "../panels/widgets/controls";

export interface DataFieldSelectorProps {
  datasetStore: AppStore;
  /** Show fields only from a particular table */
  table?: string;
  /** Show fields only of certain kinds or types (categorical / numerical) */
  kinds?: Dataset.DataKind[];
  types?: Dataset.DataType[];
  /** Allow null selection and describe null as specified */
  nullDescription?: string;
  nullNotHighlightable?: boolean;

  /** Set a default value */
  defaultValue?: {
    table: string;
    // lambdaExpression?: string;
    expression?: string;
  };

  onChange?: (newValue: DataFieldSelectorValue) => void;
  onChangeSelectionList?: (newValue: DataFieldSelectorValue[]) => void;

  useAggregation?: boolean;
  multiSelect?: boolean;
}

export interface DataFieldSelectorValue {
  table: string;
  expression: string;
  rawExpression: string;
  // lambdaExpression: string;
  /** Only available if the expression refers to exactly a column */
  columnName?: string;
  type: Dataset.DataType;
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
  currentSelections: DataFieldSelectorValue[];
  currentSelectionAggregation: string;
  currentSelectionsAggregations: string[];
}

export class DataFieldSelector extends React.Component<
  DataFieldSelectorProps,
  DataFieldSelectorState
> {
  constructor(props: DataFieldSelectorProps) {
    super(props);
    this.state = this.getDefaultState(props);
  }

  protected getDefaultState(
    props: DataFieldSelectorProps
  ): DataFieldSelectorState {
    let expression = this.props.defaultValue
      ? this.props.defaultValue.expression
      : null;
    let expressionAggregation: string = null;
    if (props.useAggregation) {
      if (expression != null) {
        const parsed = Expression.parse(expression);
        if (parsed instanceof Expression.FunctionCall) {
          expression = parsed.args[0].toString();
          expressionAggregation = parsed.name;
        }
      }
    }
    if (props.defaultValue) {
      for (const f of this.getAllFields()) {
        if (
          props.defaultValue.table != null &&
          f.table != props.defaultValue.table
        ) {
          continue;
        }
        if (expression != null) {
          if (f.expression == expression) {
            return {
              currentSelection: f,
              currentSelectionAggregation: expressionAggregation,
              currentSelections: [f],
              currentSelectionsAggregations: [expressionAggregation],
            };
          }
        }
      }
    }
    return {
      currentSelection: null,
      currentSelectionAggregation: null,
      currentSelections: [],
      currentSelectionsAggregations: [],
    };
  }

  public get value() {
    if (this.props.multiSelect) {
      return this.state.currentSelections;
    } else {
      return this.state.currentSelection;
    }
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
    const table = store
      .getTables()
      .filter(
        (table) => table.name == this.props.table || this.props.table == null
      )[0];
    const columns = table.columns;
    const columnFilters: ((x: DataFieldSelectorValue) => boolean)[] = [];
    columnFilters.push((x) => !x.metadata.isRaw);
    if (this.props.table) {
      columnFilters.push((x) => x.table == this.props.table);
    }
    if (this.props.kinds) {
      columnFilters.push(
        (x) =>
          x.metadata != null &&
          isKindAcceptable(x.metadata.kind, this.props.kinds)
      );
    }
    if (this.props.types) {
      columnFilters.push(
        (x) => x.metadata != null && this.props.types.indexOf(x.type) >= 0
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
    let candidates = columns.map((c) => {
      const r: DataFieldSelectorValueCandidate = {
        selectable: true,
        table: table.name,
        columnName: c.name,
        expression: Expression.variable(c.name).toString(),
        rawExpression: Expression.variable(
          c.metadata.rawColumnName || c.name
        ).toString(),
        type: c.type,
        displayName: c.name,
        metadata: c.metadata,
        derived: [],
      };
      // Compute derived columns.
      const derivedColumns = type2DerivedColumns[r.type];
      if (derivedColumns) {
        for (const item of derivedColumns) {
          const ditem: DataFieldSelectorValueCandidate = {
            table: table.name,
            columnName: null,
            expression: Expression.functionCall(
              item.function,
              Expression.parse(r.expression)
            ).toString(),
            rawExpression: Expression.functionCall(
              item.function,
              Expression.parse(r.rawExpression)
            ).toString(),
            type: item.type,
            metadata: item.metadata,
            displayName: item.name,
            selectable: true,
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
    candidates = candidates.filter(
      (x) => (x.derived.length > 0 || x.selectable) && !x.metadata.isRaw
    );
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

  private isValueExists(
    v1: DataFieldSelectorValue,
    v2: DataFieldSelectorValue[]
  ) {
    if (
      v2.find(
        (v) => v == v1 || (v1.expression == v.expression && v1.table == v.table)
      )
    ) {
      return true;
    }
    if (v1 == null || v2.length == 0) {
      return false;
    }
    return false;
  }

  private selectItem(item: DataFieldSelectorValue, aggregation: string = null) {
    if (item == null) {
      if (this.props.onChange) {
        this.props.onChange(null);
      }
    } else {
      if (this.props.useAggregation) {
        if (aggregation == null) {
          aggregation = Expression.getDefaultAggregationFunction(
            item.type,
            item.metadata?.kind
          );
        }
      }
      if (this.props.multiSelect) {
        this.setState((current) => {
          const found = current.currentSelections.find(
            (i) => i.expression === item.expression
          );
          if (found) {
            return {
              ...current,
              currentSelections: current.currentSelections.filter(
                (i) => i.expression !== item.expression
              ),
              currentSelectionsAggregations: current.currentSelectionsAggregations.filter(
                (a) => a !== aggregation
              ),
            };
          } else {
            return {
              ...current,
              currentSelections: [...current.currentSelections, item],
              currentSelectionsAggregations: [
                ...current.currentSelectionsAggregations,
                aggregation,
              ],
            };
          }
        });
      } else {
        this.setState({
          currentSelection: item,
          currentSelectionAggregation: aggregation,
        });
      }
      if (this.props.onChange) {
        if (this.props.multiSelect) {
          const rlist = [...this.state.currentSelections, item].map((item) => {
            const r = {
              table: item.table,
              expression: item.expression,
              rawExpression: item.rawExpression,
              columnName: item.columnName,
              type: item.type,
              metadata: item.metadata,
            };
            if (this.props.useAggregation) {
              r.expression = Expression.functionCall(
                aggregation,
                Expression.parse(item.expression)
              ).toString();
              r.rawExpression = Expression.functionCall(
                aggregation,
                Expression.parse(item.rawExpression)
              ).toString();
            }
            return r;
          });
          this.props.onChangeSelectionList(rlist);
        } else {
          const r = {
            table: item.table,
            expression: item.expression,
            rawExpression: item.rawExpression,
            columnName: item.columnName,
            type: item.type,
            metadata: item.metadata,
          };
          if (this.props.useAggregation) {
            r.expression = Expression.functionCall(
              aggregation,
              Expression.parse(item.expression)
            ).toString();
            r.rawExpression = Expression.functionCall(
              aggregation,
              Expression.parse(item.rawExpression)
            ).toString();
          }
          this.props.onChange(r);
        }
      }
    }
  }

  public renderCandidate(item: DataFieldSelectorValueCandidate): JSX.Element {
    let elDerived: HTMLElement;
    const onClick = (item: DataFieldSelectorValueCandidate) => {
      if (item.selectable) {
        this.selectItem(
          item,
          this.isValueEqual(this.state.currentSelection, item)
            ? this.state.currentSelectionAggregation
            : null
        );
      }
    };
    return (
      <div className="el-column-item" key={item.table + item.expression}>
        <div
          tabIndex={0}
          className={classNames(
            "el-field-item",
            [
              "is-active",
              this.props.multiSelect
                ? this.isValueExists(item, this.state.currentSelections)
                : this.isValueEqual(this.state.currentSelection, item),
            ],
            ["is-selectable", item.selectable]
          )}
          onClick={() => onClick(item)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onClick(item);
            }
          }}
        >
          <SVGImageIcon url={R.getSVGIcon(kind2Icon[item.metadata.kind])} />
          <span className="el-text">{item.displayName}</span>
          {this.props.useAggregation &&
          this.isValueEqual(this.state.currentSelection, item) ? (
            <Select
              value={this.state.currentSelectionAggregation}
              options={Expression.getCompatibleAggregationFunctionsByDataType(
                item.type
              ).map((x) => x.name)}
              labels={Expression.getCompatibleAggregationFunctionsByDataType(
                item.type
              ).map((x) => x.displayName)}
              showText={true}
              onChange={(newValue) => {
                this.selectItem(item, newValue);
              }}
            />
          ) : null}
          {item.derived && item.derived.length > 0 ? (
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
        {item.derived && item.derived.length > 0 ? (
          <div
            className="el-derived-fields"
            style={{ display: "none" }}
            ref={(e) => (elDerived = e)}
          >
            {item.derived.map((df) => this.renderCandidate(df))}
          </div>
        ) : null}
      </div>
    );
  }

  //Update design
  public render() {
    const fields = this.getFields();

    return (
      <div className="charticulator__data-field-selector">
        {this.props.nullDescription ? (
          <div
            tabIndex={0}
            className={classNames("el-field-item", "is-null", "is-selectable", [
              "is-active",
              !this.props.nullNotHighlightable &&
                this.state.currentSelection == null,
            ])}
            onClick={() => this.selectItem(null)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                this.selectItem(null);
              }
            }}
          >
            {this.props.nullDescription}
          </div>
        ) : null}
        {fields.length == 0 && !this.props.nullDescription ? (
          <div className="el-field-item is-null">(no suitable column)</div>
        ) : null}
        {fields.map((f) => this.renderCandidate(f))}
      </div>
    );
  }
}

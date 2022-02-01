// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Controls } from "../common";
import { deepClone } from "../../common";
import { Dataset, Expression, Specification } from "../../index";
import { CharticulatorPropertyAccessors } from "../../../app/views/panels/widgets/types";

export function getTableColumns(
  manager: Controls.WidgetManager & CharticulatorPropertyAccessors
) {
  const store = manager.store;
  const storeTable = store.getTables()[0];
  return deepClone<Dataset.Column[]>(storeTable.columns);
}

export function getColumnByExpression(
  manager: Controls.WidgetManager & CharticulatorPropertyAccessors,
  expression: string
) {
  const store = manager.store;
  const storeTable = store.getTables()[0];

  const parsed = Expression.parse(expression);
  let expression1: string;
  // console.log(parsed);
  if (parsed instanceof Expression.FunctionCall) {
    expression1 = parsed.args[0].toString();
    // expression1 = expression?.split("`").join("");
    //need to provide date.year() etc.
    // expression1 = this.parseDerivedColumnsExpression(expression);
  }
  const currentColumn = deepClone<Dataset.Column[]>(storeTable.columns).filter(
    (column) => column.displayName === expression1
  );
  return currentColumn;
}

export function getColumnNameByExpression(expression: string) {
  let columnName: string;
  const parsed = Expression.parse(expression);
  if (parsed instanceof Expression.FunctionCall) {
    columnName = parsed.args[0].toString();
    // expression1 = expression?.split("`").join("");
    //need to provide date.year() etc.
    // expression1 = this.parseDerivedColumnsExpression(expression);
  }
  return columnName;
}

export function parseDerivedColumnsExpression(expression: string): string {
  const DATE_DERIVED_PREDIX: string = "date.";
  if (expression.startsWith(DATE_DERIVED_PREDIX)) {
    //data.year(DATE) -> DATE
    return expression.match(/\(([^)]+)\)/)[1];
  }
  return expression;
}

export function transformOrderByExpression(expression: string): string {
  return expression.indexOf("`") < 0
    ? expression.split(" ").length >= 2
      ? "`" + expression + "`"
      : expression
    : expression;
}

export function shouldShowTickFormatForTickExpression(
  data: Specification.Types.AxisDataBinding,
  manager: Controls.WidgetManager
): boolean {
  let showInputFormat = true;
  try {
    //check tick data type
    if (data.tickDataExpression) {
      const extendedManager = manager as Controls.WidgetManager &
        CharticulatorPropertyAccessors;
      const chartManager = extendedManager.store.chartManager;
      const table = chartManager.getTable(
        extendedManager.store.getTables()[0].name
      );
      const tickDataExpression = chartManager.dataflow.cache.parse(
        data.tickDataExpression
      );

      const c = table.getRowContext(0);
      const tickData = tickDataExpression.getValue(c);
      //if string -> hide input format
      if (typeof tickData === "string") {
        showInputFormat = false;
      }
    }
  } catch (ex) {
    console.log(ex);
    showInputFormat = true;
  }
  return showInputFormat;
}

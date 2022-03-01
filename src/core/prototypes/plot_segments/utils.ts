// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Controls } from "../common";
import { deepClone } from "../../common";
import { Dataset, Expression, Specification } from "../../index";
import { CharticulatorPropertyAccessors } from "../../../app/views/panels/widgets/types";
import { AxisDataBinding, OrderMode } from "../../../core/specification/types";
import { DataType } from "../../../core/specification";

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

export type CategoryItemsWithId = [unknown[], number];
export type CategoryItemsWithIds = CategoryItemsWithId[];

function isNumbers(array: unknown[]): array is number[] {
  return typeof array[0] === "number";
}

function numbersSortFunction(a: number, b: number) {
  return a - b;
}

export const JoinSymbol = ", ";

function getStingValueFromCategoryItemsWithIds(
  itemWithId: CategoryItemsWithId
): string {
  const item = itemWithId[0];
  if (isNumbers(item)) {
    if (Array.isArray(item)) {
      return item.sort(numbersSortFunction).join(JoinSymbol);
    } else {
      return item;
    }
  } else {
    if (Array.isArray(item)) {
      return item.sort().join(JoinSymbol);
    } else {
      return item;
    }
  }
}

/**
 * Transform data to sting array
 * [
 * [[data], id],
 * [....]
 * ]
 * @param itemsWithIds
 * @return unique string array
 */
export function transformOnResetCategories(
  itemsWithIds: CategoryItemsWithIds
): string[] {
  const data = itemsWithIds.map((itemWithId) =>
    getStingValueFromCategoryItemsWithIds(itemWithId)
  );
  const uniqueValues = new Set(data);
  return [...uniqueValues];
}

export function getOnConfirmFunction(
  datasetAxisData: any[][],
  items: string[],
  itemsWithIds: CategoryItemsWithIds,
  data: AxisDataBinding
) {
  try {
    const newDataOrder = [...datasetAxisData];
    const new_order = [];

    for (let i = 0; i < items.length; i++) {
      const idxForItem: number[] = [];
      for (let j = 0; j < itemsWithIds.length; j++) {
        const item = itemsWithIds[j];
        const stringSortedValue = getStingValueFromCategoryItemsWithIds(item);
        if (stringSortedValue === items[i]) {
          idxForItem.push(item[1]);
        }
      }

      for (let j = 0; j < idxForItem.length; j++) {
        const foundItem = newDataOrder.find(
          (item) => item[1] === idxForItem[j]
        );
        new_order.push(foundItem);
      }
    }
    const getItem = (item: any) => {
      if (data.valueType == DataType.Number) {
        return "" + item;
      }
      return item;
    };
    data.order = new_order.map((item) => getItem(item[0]));
    data.orderMode = OrderMode.order;
    data.categories = new_order.map((item) => getItem(item[0]));
  } catch (e) {
    console.log(e);
  }
}

export function transformDataToCategoryItemsWithIds(
  data: unknown[][]
): CategoryItemsWithIds {
  return data.map((item, idx) => [item, idx]);
}

export function updateWidgetCategoriesByExpression(
  widgetData: unknown[][]
): string[] {
  const newWidgetData: string[] = [];
  const transformedWidgetData = transformDataToCategoryItemsWithIds(widgetData);
  transformedWidgetData.map((item) => {
    const stringValueForItem = getStingValueFromCategoryItemsWithIds(item);
    newWidgetData.push(stringValueForItem);
  });
  return newWidgetData;
}

export function getSortedCategories(itemsWithIds: CategoryItemsWithIds) {
  let sortedData: string[];
  if (itemsWithIds[0] && isNumbers(itemsWithIds[0][0])) {
    sortedData = transformOnResetCategories(
      itemsWithIds.sort((firstItem, secondItem) => {
        if (isNumbers(firstItem[0]) && isNumbers(secondItem[0])) {
          return firstItem[0][0] - secondItem[0][0];
        }
        return 0;
      })
    );
  } else {
    sortedData = transformOnResetCategories(itemsWithIds).sort();
  }
  return sortedData;
}

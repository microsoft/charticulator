// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { csvParseRows, tsvParseRows } from "d3-dsv";

import {
  convertColumn,
  inferColumnMetadata,
  inferColumnType
} from "./data_types";
import { Column, Dataset, Row, Table, ValueType } from "./dataset";

export function parseHints(hints: string) {
  const items = hints.match(/ *\*(.*)/);
  if (items) {
    const entries = items[1]
      .trim()
      .split(";")
      .map(x => x.trim())
      .filter(x => x != "");
    const result: { [name: string]: string } = {};
    for (const entry of entries) {
      const items = entry.split(":").map(x => x.trim());
      if (items.length == 2) {
        result[items[0]] = items[1];
      } else if (items.length == 1) {
        result[items[0]] = "true";
      }
    }
    return result;
  } else {
    return {};
  }
}

export function parseDataset(
  fileName: string,
  content: string,
  type: "csv" | "tsv"
): Table {
  let rows: string[][];
  switch (type) {
    case "csv":
      {
        rows = csvParseRows(content);
      }
      break;
    case "tsv":
      {
        rows = tsvParseRows(content);
      }
      break;
    default:
      {
        rows = [[]];
      }
      break;
  }

  // Remove empty rows if any
  rows = rows.filter(row => row.length > 0);

  if (rows.length > 0) {
    const header = rows[0];
    let columnHints: Array<{ [name: string]: string }>;
    let data = rows.slice(1);
    if (data.length > 0 && data[0].every(x => /^ *\*/.test(x))) {
      columnHints = data[0].map(parseHints);
      data = data.slice(1);
    } else {
      columnHints = header.map(x => ({}));
    }

    const columns = header.map((name, index) => {
      const hints = columnHints[index] || {};
      // Infer column type
      const values = data.map(row => row[index]);
      const inferredType = hints.type || inferColumnType(values);
      const [type, metadata] = inferColumnMetadata(inferredType, values, hints);
      const column = {
        name,
        type,
        metadata
      } as Column;
      return column;
    });

    const columnValues = columns.map((c, index) => {
      const values = data.map(row => row[index]);
      return convertColumn(c.type, values);
    });

    const outRows = data.map((row, rindex) => {
      const out: Row = { _id: rindex.toString() };
      columns.forEach((column, cindex) => {
        out[column.name] = columnValues[cindex][rindex];
      });
      return out;
    });

    return {
      name: fileName,
      columns,
      rows: outRows
    };
  } else {
    return null;
  }
}

// export function getColumnsSummary(dataset: Dataset) {
//     return dataset.columns.map((column) => {
//         let values = dataset.rows.filter(row => row[column.name] != null).map(row => row[column.name].toString());
//         let uniqueValues = getUniqueValues(values);
//         return {
//             name: column.name,
//             type: column.type,
//             format: column.format,
//             values: values,
//             uniqueValues: uniqueValues,
//             isDistinctValues: isDistinctValues(values)
//         }
//     });
// }

// export function getColumnsForDistinctAxis(dataset: Dataset, maxUniqueValues: number = 1e10) {
//     let summary = getColumnsSummary(dataset);
//     let candidates = summary.filter(c => c.isDistinctValues && c.type == "string" && c.uniqueValues.length <= maxUniqueValues);
//     return candidates.map(c => c.name);
// }

// export function getColumnsForContinuousAxis(dataset: Dataset) {
//     let candidates = dataset.columns.filter(d => d.type == "integer" || d.type == "number");
//     return candidates.map(c => c.name);

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { csvParseRows, tsvParseRows } from "d3-dsv";

import { inferAndConvertColumn } from "./data_types";
import { Column, Row, Table } from "./dataset";

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

    const columnValues = header.map((name, index) => {
      const values = data.map(row => row[index]);
      return inferAndConvertColumn(values);
    });

    const outRows = data.map((row, rindex) => {
      const out: Row = { _id: rindex.toString() };
      columnValues.forEach((column, cindex) => {
        out[header[cindex]] = columnValues[cindex].values[rindex];
      });
      return out;
    });

    const columns = columnValues.map((x, i) => ({
      name: header[i],
      type: x.type,
      metadata: x.metadata
    }));

    return {
      name: fileName,
      displayName: fileName,
      columns,
      rows: outRows
    };
  } else {
    return null;
  }
}

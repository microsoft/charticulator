// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { dsvFormat } from "d3-dsv";

import { inferAndConvertColumn, LocaleNumberFormat } from "./data_types";
import {
  Row,
  Table,
  rawColumnPostFix,
  DataValue,
  DataType,
  ColumnMetadata,
} from "./dataset";
import { deepClone } from "../common";

export function parseHints(hints: string) {
  const items = hints.match(/ *\*(.*)/);
  if (items) {
    const entries = items[1]
      .trim()
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x != "");
    const result: { [name: string]: string } = {};
    for (const entry of entries) {
      const items = entry.split(":").map((x) => x.trim());
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

export interface LocaleFileFormat {
  delimiter: string;
  numberFormat: LocaleNumberFormat;
  currency: string;
  group: string;
}

/**
 * Parses data from file. Returns converted rows and list of column names with types.
 * Calls {@link inferAndConvertColumn} method from {@link "core/dataset/data_types"} for convert types.
 * @param fileName input file name for parsing
 * @param content data of file
 * @param type type of file. *.csv - text with coma delimiter. *.tsv - tab separated text files
 */
export function parseDataset(
  fileName: string,
  content: string,
  localeFileFormat: LocaleFileFormat
): Table {
  let rows: string[][];
  const tableName = fileName.replace(/\W/g, "_");
  rows = dsvFormat(localeFileFormat.delimiter).parseRows(content);

  // Remove empty rows if any
  rows = rows.filter((row) => row.length > 0);

  if (rows.length > 0) {
    const header = rows[0];
    // eslint-disable-next-line
    // TODO fix it
    let columnHints: { [name: string]: string }[];
    let data = rows.slice(1);
    if (data.length > 0 && data[0].every((x) => /^ *\*/.test(x))) {
      columnHints = data[0].map(parseHints);
      data = data.slice(1);
    } else {
      // eslint-disable-next-line
      columnHints = header.map(() => ({}));
    }

    let columnValues = header.map((name, index) => {
      const values = data.map((row) => row[index]);
      return inferAndConvertColumn(values, localeFileFormat.numberFormat);
    });

    const additionalColumns: {
      values: DataValue[];
      rawValues?: string[] | DataValue[];
      type: DataType;
      metadata: ColumnMetadata;
    }[] = [];
    columnValues.forEach((column, index) => {
      if (column.rawValues) {
        const rawColumn = deepClone(column);
        rawColumn.metadata.isRaw = true;
        rawColumn.values = rawColumn.rawValues;
        delete rawColumn.rawValues;
        const rawColumnName = header[index] + rawColumnPostFix;
        column.metadata.rawColumnName = rawColumnName;
        delete column.rawValues;
        header.push(rawColumnName);
        additionalColumns.push(rawColumn);
      }
    });
    columnValues = columnValues.concat(additionalColumns);

    const outRows = data.map((row, rindex) => {
      const out: Row = { _id: rindex.toString() };
      columnValues.forEach((column, cindex) => {
        out[header[cindex]] = columnValues[cindex].values[rindex];
        if (columnValues[cindex].rawValues) {
          out[header[cindex] + rawColumnPostFix] =
            columnValues[cindex].rawValues[rindex];
          if (!header.find((h) => h === header[cindex] + rawColumnPostFix)) {
            header.push(header[cindex] + rawColumnPostFix);
          }
        }
      });
      return out;
    });

    const columns = columnValues.map((x, i) => ({
      name: header[i],
      displayName: header[i],
      type: x.type,
      metadata: x.metadata,
    }));

    return {
      name: tableName,
      displayName: tableName,
      columns,
      rows: outRows,
      type: null,
      localeNumberFormat: localeFileFormat.numberFormat,
    };
  } else {
    return null;
  }
}

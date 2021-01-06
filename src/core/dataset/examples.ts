// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Column, DataKind, DataType, Table } from "./dataset";

const exampleCount = 3;
const delim = ",";

export function ensureColumnsHaveExamples(table: Table) {
  table.columns.forEach((c) => {
    if (!c.metadata.examples) {
      let examples: string[] = [];
      if (c.type === DataType.Boolean) {
        examples = ["true", "false"];
      } else {
        const distinct = getDistinctValues(table, c);
        if (c.metadata.kind === DataKind.Ordinal) {
          distinct.sort();
        }
        examples = distinct.slice(0, exampleCount);
      }
      examples = examples.map((e) => {
        if (e.indexOf(delim) >= 0) {
          return JSON.stringify(e);
        } else {
          return e;
        }
      });
      c.metadata.examples = examples.join(`${delim} `);
    }
  });
}

function getDistinctValues(t: Table, c: Column) {
  const o: { [key: string]: null } = {};
  t.rows.forEach((r) => {
    const valueKey = r[c.name].toString();
    o[valueKey] = null;
  });
  return Object.keys(o);
}

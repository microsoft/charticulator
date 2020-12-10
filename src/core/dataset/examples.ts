// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Column, Table } from "./dataset";

export function ensureColumnsHaveExamples(t: Table) {
  console.log("table name", t.name);
  t.columns.forEach((c) => {
    console.log(`column ${c.name}`, c.metadata);
    if (!c.metadata.examples) {
      populateExamples(t, c);
    }
  });
}

function populateExamples(t: Table, c: Column) {
  const examples: string[] = [];
  t.rows.forEach((r) => {
    examples.push(r[c.name].toString());
  });
  c.metadata.examples = examples.join("");
}

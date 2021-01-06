// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dataset } from "../core";
import { TableType } from "../core/dataset";
import { strings } from "../strings";

export function makeDefaultDataset(): Dataset.Dataset {
  const rows: any[] = [];
  const months = strings.defaultDataset.months.split(",");
  let monthIndex = 0;
  for (const month of months) {
    let cityIndex = 0;
    for (const city of ["City1", "City2", "City3"]) {
      const value =
        50 +
        30 *
          Math.sin(
            ((monthIndex + 0.5) * Math.PI) / 12 + (cityIndex * Math.PI) / 2
          );
      rows.push({
        _id: "ID" + rows.length,
        Month: month,
        City: city,
        Value: +value.toFixed(1),
      });
      cityIndex += 1;
    }
    monthIndex += 1;
  }
  return {
    tables: [
      {
        name: "Temperature",
        displayName: strings.defaultDataset.temperature,
        columns: [
          {
            name: "Month",
            displayName: strings.defaultDataset.month,
            type: Dataset.DataType.String,
            metadata: {
              kind: Dataset.DataKind.Categorical,
              order: months,
            },
          },
          {
            name: "City",
            displayName: strings.defaultDataset.city,
            type: Dataset.DataType.String,
            metadata: { kind: Dataset.DataKind.Categorical },
          },
          {
            name: "Value",
            displayName: strings.defaultDataset.value,
            type: Dataset.DataType.Number,
            metadata: { kind: Dataset.DataKind.Numerical, format: ".1f" },
          },
        ],
        rows,
        type: TableType.Main,
      },
    ],
    name: "demo",
  };
}

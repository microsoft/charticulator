// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";
import {
  inferColumnType,
  inferAndConvertColumn,
  LocaleNumberFormat,
} from "../../core/dataset/data_types";
import { DataType } from "../../core/dataset";

const localeNumberFormat: LocaleNumberFormat = { remove: ".", decimal: "," };

describe("Data Type Inference Intl", () => {
  it("inferColumnType", () => {
    const cases: Array<[string[], DataType]> = [
      [["1", "3", "4,5", "23"], DataType.Number],
      [["1990-01-13", "2012-12-30", "12:34:56", "11:05am"], DataType.Date],
      [["true", "true", "false", "yes", "no"], DataType.Boolean],
      [["Hello", "World", "Charticulator"], DataType.String],
      [["2010", "2011", "2013", "2012"], DataType.Number],
      [["Jan", "Feb", "Mar", "Nov"], DataType.String],
    ];
    for (const [values, type] of cases) {
      const inferredType = inferColumnType(values, localeNumberFormat);
      expect(inferredType).to.equals(type, values.join(", "));
    }
  });
  it("inferAndConvertColumn", () => {
    const cases: Array<[string[], any]> = [
      [
        ["1", "3", "4,5", "23", null],
        {
          type: DataType.Number,
          values: [1, 3, 4.5, 23, null],
          metadata: { kind: "numerical" },
        },
      ],
      [
        ["1990-01-13", "2012-12-30", "12:34:56", "11:05am"],
        { type: DataType.Date, metadata: { kind: "temporal" } },
      ],
      [
        ["true", "true", "false", "yes", "no"],
        { type: DataType.Boolean, metadata: { kind: "categorical" } },
      ],
      [
        ["Hello", "World", "Charticulator"],
        { type: DataType.String, metadata: { kind: "categorical" } },
      ],
      [
        ["2010", "2011", "2013", "2012"],
        {
          type: DataType.String,
          metadata: {
            unit: "__year",
            orderMode: "alphabetically",
            kind: "ordinal",
          },
        },
      ],
      [
        ["Jan", "Feb", "MAR", "november", "sept."],
        {
          type: DataType.String,
          values: ["Jan", "Feb", "Mar", "Nov", "Sep"],
          metadata: {
            kind: "ordinal",
            order: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
            unit: "__month",
          },
        },
      ],
    ];
    for (const [values, expectedResult] of cases) {
      const r = inferAndConvertColumn(values, localeNumberFormat);
      if (expectedResult.type) {
        expect(r.type).to.equals(expectedResult.type);
      }
      if (expectedResult.metadata) {
        for (const k of Object.keys(expectedResult.metadata)) {
          expect((r.metadata as any)[k]).to.deep.equals(
            expectedResult.metadata[k]
          );
        }
      }
    }
  });
});

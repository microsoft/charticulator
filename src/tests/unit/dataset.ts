// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";
import { LocaleNumberFormat } from "../../core/dataset/data_types";
import { parseDataset } from "../../core/dataset/dsv_parser";

const localeNumberFormat: LocaleNumberFormat = { remove: ".", decimal: "," };

describe("Data set tests", () => {
  it("parseDataset method parses csv file", () => {
    const content = `Area,Abstract,Full
    CAT1,167,851.6
    CAT2,126,1105.6
    CAT3,535,425.3
    CAT4,921,737.9
    CAT5,55,544.1
    CAT6,15,739.56`;

    const table = parseDataset("folder/file-!№;%()_{}~,.csv", content, {
      delimiter: ",",
      currency: "$",
      group: ".",
      numberFormat: localeNumberFormat,
    });

    expect(table.name).not.contains("/");
    expect(table.name).not.contains("-");
    expect(table.name).not.contains("№");
    expect(table.name).not.contains(";");
    expect(table.name).not.contains("%");
    expect(table.name).not.contains("(");
    expect(table.name).not.contains(")");
    expect(table.name).not.contains("{");
    expect(table.name).not.contains("}");
    expect(table.name).not.contains("~");
    expect(table.name).not.contains(",");
    expect(table.name).not.contains(".");

    expect(table.columns.length).to.equal(3, "table has 3 columns");
    expect(table.rows.length).to.equal(6, "table has 6 rows");
  });
});

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Charticulator uses [d3-dsv](https://github.com/d3/d3-dsv) package to load and parse csv data.
 *
 * The module contains methods to parse and convert data on importing into Charticulator.
 *
 * {@link "core/dataset/data_types"} contains methods for converting strings into correspond data types.
 *
 * {@link "core/dataset/dsv_parser"} wrapper to call methods from {@link "core/dataset/data_types"} for whole dataset. The main method of module is {@link parseDataset}
 *
 * {@link "core/dataset/datetime"} contains methods to parse dates.
 *
 * {@link "core/dataset/context"} provides proxy classes for data and expressions. Expressions module ({@link "core/expression/index"}) classes use data through context.
 *
 * {@link "core/dataset/dataset"} interfaces for describe dataset structures of charticulator as Table, Column, Dataset e.t.c.
 *
 * @packageDocumentation
 * @preferred
 */
export * from "./dataset";

export { DatasetLoader } from "./loader";

export { DatasetContext, TableContext, RowContext } from "./context";

export {
  convertColumnType,
  inferColumnType,
  inferAndConvertColumn,
  dataTypes
} from "./data_types";

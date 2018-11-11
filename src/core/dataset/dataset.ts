// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DataValue, DataType, DataKind } from "../specification";

export { DataValue, DataType, DataKind };

export interface Dataset {
  /** Name of the dataset */
  name: string;
  /** Tables in the dataset */
  tables: Table[];
}

export interface ColumnMetadata {
  /** Abstract data kind */
  kind?: DataKind;
  /** The unit of the data type, used in scale inference when mapping multiple columns */
  unit?: string;
  /** Order of categories for categorical type */
  order?: string[];
  orderMode?: "alphabetically" | "occurrence" | "order";
  /** Formatting for other data types */
  format?: string;
}

export interface Column {
  /** Name, used to address the entry from row */
  name: string;
  /** Data type in memory (number, string, Date, boolean, etc) */
  type: DataType;
  /** Metadata */
  metadata: ColumnMetadata;
}

export interface Row {
  /** Internal row ID, automatically assigned to be unique */
  _id: string;
  /** Row attributes */
  [name: string]: DataValue;
}

export interface Table {
  /** Table name */
  name: string;
  /** The name to be shown to the user */
  displayName: string;
  /** Columns in the table */
  columns: Column[];
  /** Rows in the table */
  rows: Row[];
}

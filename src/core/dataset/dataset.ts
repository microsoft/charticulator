// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../strings";
import { DataValue, DataType, DataKind } from "../specification";
import { OrderMode } from "../specification/types";
import { LocaleNumberFormat } from "./data_types";

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
  orderMode?: OrderMode;
  /** Formatting for other data types */
  format?: string;
  rawColumnName?: string;
  isRaw?: boolean;
  examples?: string;
}

export interface Column {
  /** Name, used to address the entry from row */
  name: string;
  /** Name, used to display row name */
  displayName: string;
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
  /** Type of the table */
  type: TableType;
  /** Optional locale format of the table */
  localeNumberFormat?: LocaleNumberFormat;
}

export enum TableType {
  /** The main table with data for the chart */
  Main = "Main",
  /** Table with source_id and target_id columns for links, can contain additional columns with data */
  Links = "Links",
  /** TelLs to nested chart that table is parent chart table with all data */
  ParentMain = "ParentMain",
  /** TelLs to nested chart that table is parent links table of the chart with all data */
  ParentLinks = "ParentLinks",
  /** The main table with data for images */
  Image = "Image",
}

export const tableTypeName: {
  [key in TableType]: string;
} = {
  [TableType.Main]: strings.dataset.tableTitleColumns,
  [TableType.Links]: strings.dataset.tableTitleLinks,
  [TableType.Image]: strings.dataset.tableTitleImages,
  [TableType.ParentLinks]: "",
  [TableType.ParentMain]: "",
};

export const rawColumnPostFix = "_raw";

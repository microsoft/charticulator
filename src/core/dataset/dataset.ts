export type ValueType = string | number | Date | boolean;

// ValueTypes:
//   text
//   number
//   date
//   reference - reference a row in another table, use row index number (zero-based) for storage

export interface Dataset {
    /** Name of the dataset */
    name: string;
    /** Tables in the dataset */
    tables: Table[];
}

export interface ColumnMetadata {
    /** Conceptural data type: categorical (including ordinal), numerical, text, boolean */
    kind: string;
    /** The unit of the data type, used in scale inference when mapping multiple columns */
    unit?: string;
    /** Order of categories for categorical type */
    order?: string[];
    orderMode?: "alphabetically" | "occurrence" | "order";
    /** Formatting for other data types */
    format?: string;
}

export interface Column {
    /** Name of the column, used to address the entry from row */
    name: string;
    /** Data type in memory (number, string, Date, boolean, etc) */
    type: string;
    /** Metadata on this column */
    metadata: ColumnMetadata;
}

export interface Row {
    /** Internal row ID, automatically assigned to be unique */
    _id: string;
    /** Row attributes */
    [name: string]: ValueType;
}

export interface Table {
    /** Table name */
    name: string;
    /** Columns in the table */
    columns: Column[];
    /** Rows in the table */
    rows: Row[];
}
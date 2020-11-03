// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DataValue, DataType, DataKind, ColumnMetadata } from "./dataset";
import {
  parseDate,
  testAndNormalizeMonthName,
  monthNames,
  getDateFormat
} from "./datetime";

export interface LocaleNumberFormat {
  remove: string;
  decimal: string;
}

function localeNumber(x: string, localeNumberFormat: LocaleNumberFormat) {
  const reRemove = new RegExp("\\" + localeNumberFormat.remove, "g");
  x = x.replace(reRemove, "");
  if (localeNumberFormat.decimal !== ".") {
    const reReplace = new RegExp("\\" + localeNumberFormat.decimal, "g");
    x = x.replace(reReplace, ".");
  }
  return +x;
}

// Infer column type.
// Adapted from datalib: https://github.com/vega/datalib/blob/master/src/import/type.js

export interface DataTypeDescription {
  test: (v: string, localeNumberFormat?: LocaleNumberFormat) => boolean;
  convert: (v: string, localeNumberFormat?: LocaleNumberFormat) => DataValue;
}

export let dataTypes: { [name in DataType]: DataTypeDescription } = {
  boolean: {
    test: (x: string) => {
      const lx = x.toLowerCase();
      return lx === "true" || lx === "false" || lx == "yes" || lx == "no";
    },
    convert: (x: string) => {
      const lx = x.toLowerCase();
      if (lx == "true" || lx == "yes") {
        return true;
      } else if (lx == "false" || lx == "no") {
        return false;
      } else {
        return null;
      }
    }
  },
  number: {
    test: (x: string, localeNumberFormat: LocaleNumberFormat) => {
      if (x === "null") {
        return true;
      }
      const value = localeNumber(x, localeNumberFormat);
      return !isNaN(value);
    },
    convert: (x: string, localeNumberFormat: LocaleNumberFormat) => {
      const value = localeNumber(x, localeNumberFormat);
      return isNaN(value) ? null : value;
    }
  },
  date: {
    test: (x: string) => parseDate(x, true) != null,
    convert: (x: string) => parseDate(x, true)
  },
  string: {
    test: (x: string) => true,
    convert: (x: string) => x.toString()
  }
};

/** Infer column type from a set of strings (not null) */
export function inferColumnType(
  values: string[],
  localeNumberFormat: LocaleNumberFormat
): DataType {
  const candidates: DataType[] = [
    DataType.Boolean,
    DataType.Number,
    DataType.Date
  ] as any;
  for (let i = 0; i < values.length; i++) {
    let v = values[i];
    v = v.trim();
    if (v == "") {
      continue;
    }
    // test for remaining candidates
    for (let j = 0; j < candidates.length; j++) {
      if (!dataTypes[candidates[j]].test(v, localeNumberFormat)) {
        // console.log(candidates[j], "fail at", v);
        candidates.splice(j, 1);
        j -= 1;
      }
    }
    // if no types left, return "string"
    if (candidates.length == 0) {
      return DataType.String;
    }
  }
  return candidates[0];
}

/** Convert strings to value type, null & non-convertibles are set as null */
export function convertColumn(
  type: DataType,
  values: string[],
  localeNumberFormat: LocaleNumberFormat = {
    remove: ",",
    decimal: "."
  }
): DataValue[] {
  const converter = dataTypes[type].convert;
  return values.map(v => (v != null ? converter(v, localeNumberFormat) : null));
}

/** Get distinct values from a non-null array of basic types */
export function getDistinctValues(values: DataValue[]): DataValue[] {
  const seen = new Set<DataValue>();
  for (const v of values) {
    seen.add(v);
  }
  return Array.from(seen);
}

/** Infer column metadata and update type if necessary */
export function inferAndConvertColumn(
  values: string[],
  localeNumberFormat: LocaleNumberFormat,
  hints?: { [name: string]: string }
): {
  values: DataValue[];
  rawValues?: string[] | DataValue[];
  type: DataType;
  metadata: ColumnMetadata;
} {
  const inferredType = inferColumnType(
    values.filter(x => x != null),
    localeNumberFormat
  );
  const convertedValues = convertColumn(
    inferredType,
    values,
    localeNumberFormat
  );
  if (hints == null) {
    hints = {};
  }

  switch (inferredType) {
    case DataType.Number: {
      const validValues = convertedValues.filter(x => x != null);
      const minValue = Math.min(...(validValues as number[]));
      const maxValue = Math.max(...(validValues as number[]));
      if (validValues.every((x: number) => Math.round(x) == x)) {
        // All integers
        if (minValue >= 1900 && maxValue <= 2100) {
          // Special case: Year
          return {
            type: DataType.String,
            values: convertedValues.map(x => x.toString()),
            metadata: {
              unit: "__year",
              kind: DataKind.Ordinal,
              orderMode: "alphabetically"
            }
          };
        }
      }
      // let valuesFixed = values
      //   .map(d => +d)
      //   .filter(d => !isNaN(d))
      //   .map(d => d.toFixed(10));
      // valuesFixed = valuesFixed.map(d => {
      //   const m = d.match(/\.([0-9]{10})$/);
      //   if (m) {
      //     return m[1];
      //   } else {
      //     return "0000000000";
      //   }
      // });
      // let k: number;
      // for (k = 10 - 1; k >= 0; k--) {
      //   if (valuesFixed.every(v => v[k] == "0")) {
      //     continue;
      //   } else {
      //     break;
      //   }
      // }
      // const format = `.${k + 1}f`;
      return {
        type: DataType.Number,
        values: convertedValues,
        metadata: {
          kind: DataKind.Numerical,
          unit: hints.unit
        }
      };
    }
    case DataType.Boolean: {
      return {
        type: DataType.Boolean,
        values: convertedValues,
        rawValues: values.map(v => v && v.toLowerCase()),
        metadata: {
          kind: DataKind.Categorical
        }
      };
    }
    case DataType.Date: {
      return {
        type: DataType.Date,
        values: convertedValues,
        rawValues: values,
        metadata: {
          kind: DataKind.Temporal,
          unit: hints.unit,
          format: getDateFormat(values[0])
        }
      };
    }
    case DataType.String: {
      const metadata: ColumnMetadata = {
        kind: DataKind.Categorical,
        unit: hints.unit
      };
      const validValues = convertedValues.filter(x => x != null);
      if (
        validValues.every((x: string) => testAndNormalizeMonthName(x) != null)
      ) {
        // Special case: month names
        // Return as ordinal column with month ordering, use normalized month names
        return {
          type: DataType.String,
          values: convertedValues.map((x: string) =>
            x != null ? testAndNormalizeMonthName(x) : null
          ),
          metadata: {
            kind: DataKind.Ordinal,
            order: monthNames,
            unit: "__month",
          },
        };
      }
      if (hints.order) {
        metadata.order = hints.order.split(",");
        metadata.kind = DataKind.Ordinal;
      } else {
        metadata.orderMode = "order";
        metadata.kind = DataKind.Categorical;
      }
      return {
        type: DataType.String,
        values: convertedValues,
        metadata,
      };
    }
  }
  // We shouldn't get here.
  console.warn("inferAndConvertColumn: inferredType is unexpected");
  return {
    type: inferredType,
    values: convertedValues,
    metadata: { kind: DataKind.Categorical },
  };
}

export function convertColumnType(values: any[], type: DataType): DataValue[] {
  switch (type) {
    case DataType.Boolean: {
      return values.map((v) => {
        if (v == null) {
          return null;
        }
        if (typeof v == "boolean") {
          return v;
        }
        if (typeof v == "number") {
          return v > 0;
        }
        const l = v.toString().toLowerCase();
        return l == "yes" || l == "true";
      });
    }
    case DataType.Number: {
      return values.map(v => {
        // Check for null as well, since +null == 0
        if (v == null) {
          return null;
        }
        const n = +v;
        return isNaN(n) ? null : n;
      });
    }
    case DataType.String: {
      return values.map(v => (v == null ? "" : v.toString()));
    }
    case DataType.Date: {
      return values.map(v => {
        if (v == null) {
          return null;
        }
        if (typeof v == "number") {
          return v;
        }
        return parseDate(v.toString(), true);
      });
    }
  }
}

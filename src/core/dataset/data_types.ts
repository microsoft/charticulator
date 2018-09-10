// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ValueType } from "./dataset";
import { ColumnMetadata } from "./index";

// Infer column type.
// Adapted from datalib: https://github.com/vega/datalib/blob/master/src/import/type.js

export interface DataTypeDescription {
  test: (v: string) => boolean;
  convert: (v: string) => ValueType;
}

export function parseDate(str: string) {
  str = str.trim();
  let m;
  // YYYY-MM-DD
  m = str.match(
    /^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})( +([0-9]{1,2})\:([0-9]{1,2})(\:([0-9]{1,2}))?)?$/
  );
  if (m) {
    if (m[5] != null) {
      if (m[8] != null) {
        return new Date(+m[1], +m[2] - 1, +m[3], +m[5], +m[6], 0, 0).getTime();
      } else {
        return new Date(
          +m[1],
          +m[2] - 1,
          +m[3],
          +m[5],
          +m[6],
          +m[8],
          0
        ).getTime();
      }
    } else {
      return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0).getTime();
    }
  }
  return null;
}

export let dataTypes: { [name: string]: DataTypeDescription } = {
  boolean: {
    test: (x: string) =>
      x.toLowerCase() === "true" || x.toLowerCase() === "false",
    convert: (x: string) => (x.toLowerCase() === "true" ? true : false)
  },
  integer: {
    test: (x: string) =>
      !isNaN(+x.replace(/\,/g, "")) &&
      +x.replace(/\,/g, "") === ~~+x.replace(/\,/g, ""),
    convert: (x: string) => +x.replace(/\,/g, "")
  },
  number: {
    test: (x: string) => !isNaN(+x.replace(/\,/g, "")),
    convert: (x: string) => +x.replace(/\,/g, "")
  },
  date: {
    // date is represented as unix timestamp, in milliseconds
    test: (x: string) => parseDate(x) != null,
    convert: (x: string) => parseDate(x)
  },
  string: {
    test: (x: string) => true,
    convert: (x: string) => x.toString()
  }
};

export function inferColumnType(values: string[]): string {
  const candidates: string[] = ["boolean", "integer", "number", "date"];
  for (let i = 0; i < values.length; i++) {
    let v = values[i];
    // skip empty values
    if (v == null) {
      continue;
    }
    v = v.trim();
    if (v == "") {
      continue;
    }
    // test for remaining candidates
    for (let j = 0; j < candidates.length; j++) {
      if (!dataTypes[candidates[j]].test(v)) {
        // console.log(candidates[j], "fail at", v);
        candidates.splice(j, 1);
        j -= 1;
      }
    }
    // if no types left, return "string"
    if (candidates.length == 0) {
      return "string";
    }
  }
  return candidates[0];
}

export function convertColumn(type: string, values: string[]): ValueType[] {
  const converter = dataTypes[type].convert;
  return values.map(v => {
    if (v == null) {
      return null;
    }
    return converter(v);
  });
}

export function getDistinctValues(values: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!seen.has(v)) {
      result.push(v);
      seen.add(v);
    }
  }
  return result;
}

export function inferColumnMetadata(
  type: string,
  values: string[],
  hints: { [name: string]: string } = {}
): [string, ColumnMetadata] {
  const distinctValues = getDistinctValues(values.filter(x => x != null));

  switch (type) {
    case "integer": {
      // Does it look all like years?
      const distinctRatio = distinctValues.length / values.length;
      if (values.every(x => +x >= 1970 && +x <= 2100)) {
        // Treat as string, categorical; order by value ascending.
        return [
          "string",
          {
            kind: "categorical",
            order: distinctValues.sort((a, b) => +a - +b),
            unit: hints.unit
          }
        ];
      }
      return [
        "number",
        {
          kind: "numerical",
          unit: hints.unit
        }
      ];
    }
    case "number": {
      // Infer number value format
      let valuesFixed = values
        .map(d => +d)
        .filter(d => !isNaN(d))
        .map(d => d.toFixed(10));
      valuesFixed = valuesFixed.map(d => {
        const m = d.match(/\.([0-9]{10})$/);
        if (m) {
          return m[1];
        } else {
          return "0000000000";
        }
      });
      let k: number;
      for (k = 10 - 1; k >= 0; k--) {
        if (valuesFixed.every(v => v[k] == "0")) {
          continue;
        } else {
          break;
        }
      }
      const format = `.${k + 1}f`;
      return [
        "number",
        {
          kind: "numerical",
          format,
          unit: hints.unit
        }
      ];
    }
    case "date": {
      return [
        "date",
        {
          kind: "numerical",
          format: "%Y/%m/%d-%H:%M:%S",
          unit: hints.unit
        }
      ];
    }
    case "string": {
      const metadata: ColumnMetadata = {
        kind: "categorical",
        unit: hints.unit
      };
      if (hints.order) {
        metadata.order = hints.order.split(",");
      } else {
        metadata.order = distinctValues;
      }
      return ["string", metadata];
    }
  }
  return [type, { kind: "categorical" }];
}

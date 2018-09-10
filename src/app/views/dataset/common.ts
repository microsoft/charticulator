// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Dataset } from "../../../core";

export const kind2Icon: { [name: string]: string } = {
  categorical: "type/categorical",
  numerical: "type/numerical",
  boolean: "type/boolean",
  date: "type/numerical"
};

export interface DerivedColumnDescription {
  name: string;
  type: string;
  function: string;
  metadata: Dataset.ColumnMetadata;
}

function makeTwoDigitRange(start: number, end: number): string[] {
  const r: string[] = [];
  for (let i = start; i <= end; i++) {
    let istr = i.toString();
    while (istr.length < 2) {
      istr = "0" + istr;
    }
    r.push(istr);
  }
  return r;
}

export const type2DerivedColumns: {
  [name: string]: DerivedColumnDescription[];
} = {
  string: null,
  number: null,
  integer: null,
  boolean: null,
  date: [
    {
      name: "year",
      type: "string",
      function: "date.year",
      metadata: { kind: "categorical", orderMode: "alphabetically" }
    },
    {
      name: "month",
      type: "string",
      function: "date.month",
      metadata: {
        kind: "categorical",
        order: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec"
        ]
      }
    },
    {
      name: "day",
      type: "string",
      function: "date.day",
      metadata: { kind: "categorical", orderMode: "alphabetically" }
    },
    {
      name: "weekOfYear",
      type: "string",
      function: "date.weekOfYear",
      metadata: { kind: "categorical", orderMode: "alphabetically" }
    },
    {
      name: "dayOfYear",
      type: "string",
      function: "date.dayOfYear",
      metadata: { kind: "categorical", orderMode: "alphabetically" }
    },
    {
      name: "weekday",
      type: "string",
      function: "date.weekday",
      metadata: {
        kind: "categorical",
        order: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      }
    },
    {
      name: "hour",
      type: "string",
      function: "date.hour",
      metadata: { kind: "categorical", order: makeTwoDigitRange(0, 24) }
    },
    {
      name: "minute",
      type: "string",
      function: "date.minute",
      metadata: { kind: "categorical", order: makeTwoDigitRange(0, 59) }
    },
    {
      name: "second",
      type: "string",
      function: "date.second",
      metadata: { kind: "categorical", order: makeTwoDigitRange(0, 59) }
    }
  ]
};

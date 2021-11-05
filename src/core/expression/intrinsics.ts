// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { utcFormat } from "d3-time-format";
import { ValueType } from "./classes";
import { parseDate } from "../dataset/datetime";
import { getFormat } from "../common";

export const constants: { [name: string]: ValueType } = {};
export const functions: {
  // eslint-disable-next-line
  [name: string]: Function | { [name: string]: Function };
} = {};
// eslint-disable-next-line
export const operators: { [name: string]: Function } = {};

export const precedences = {
  LAMBDA_EXPRESSION: 1,
  FUNCTION_ARGUMENT: 0,
  OPERATORS: <{ [name: string]: number[] }>{
    "unary:not": [11, 11],
    and: [12, 12, 12],
    or: [13, 13, 13],
    ">": [14, 14, 15],
    "<": [14, 14, 15],
    ">=": [14, 14, 15],
    "<=": [14, 14, 15],
    "==": [14, 14, 15],
    "!=": [14, 14, 15],
    "+": [16, 16, 16],
    "-": [16, 16, 17],
    "*": [18, 18, 18],
    "/": [18, 18, 19],
    "^": [20, 20, 21],
    "unary:+": [22, 22],
    "unary:-": [23, 23],
  },
  FUNCTION_CALL: 100,
  LAMBDA_FUNCTION: 100,
  VARIABLE: 100,
  FIELD_ACCESS: 100,
  VALUE: 100,
};

// Math constants
constants.PI = Math.PI;
constants.E = Math.E;

/** Make a unary function capable of taking element-wise array input */
function makeArrayCapable1<TA, TRet>(f: (a: TA) => TRet) {
  return (a: TA | TA[]) => {
    if (a instanceof Array) {
      return a.map(f);
    } else {
      return f(a);
    }
  };
}

/** Make a binary function capable of taking element-wise array input */
function makeArrayCapable2<TA, TB, TRet>(f: (a: TA, b: TB) => TRet) {
  return (a: TA | TA[], b: TB | TB[]) => {
    if (a instanceof Array && b instanceof Array) {
      return a.map((ai, i) => f(ai, b[i]));
    } else if (a instanceof Array) {
      return a.map((ai) => f(ai, <TB>b));
    } else if (b instanceof Array) {
      return b.map((bi) => f(<TA>a, <TB>bi));
    } else {
      return f(a, b);
    }
  };
}

// Math functions
functions.abs = makeArrayCapable1(Math.abs);
functions.sign = makeArrayCapable1(Math.sign);
functions.floor = makeArrayCapable1(Math.floor);
functions.ceil = makeArrayCapable1(Math.ceil);
functions.exp = makeArrayCapable1(Math.exp);
functions.log = makeArrayCapable1(Math.log);
functions.log10 = makeArrayCapable1(Math.log10);
functions.sin = makeArrayCapable1(Math.sin);
functions.cos = makeArrayCapable1(Math.cos);
functions.tan = makeArrayCapable1(Math.tan);
functions.asin = makeArrayCapable1(Math.asin);
functions.acos = makeArrayCapable1(Math.acos);
functions.atan = makeArrayCapable1(Math.atan);
functions.atan2 = makeArrayCapable2(Math.atan2);
functions.tanh = makeArrayCapable1(Math.tanh);
functions.sqrt = makeArrayCapable1(Math.sqrt);
functions.pow = makeArrayCapable2(Math.pow);

// List and range
functions.array = (...args: any[]) => args;
functions.list = functions.array;
functions.length = (arg: any[]) => arg.length;
functions.range = (min: number, max: number, step: number = 1) => {
  const opt: number[] = [];
  for (let i = min; i <= max; i += step) {
    opt.push(i);
  }
  return opt;
};

// Object and fields
functions.get = (obj: any, field: string | number) => obj[field];

// Array functions
functions.first = (list: any[]) => list[0];
functions.last = (list: any[]) => list[list.length - 1];
functions.map = (list: any[], func: (item: any) => void) =>
  list.map((item) => func(item));
functions.filter = (list: any[], func: (item: any) => void) =>
  list.filter((item) => func(item));

// Statistics
function stat_foreach(f: (x: number) => void, list: (number | number[])[]) {
  for (let i = 0; i < list.length; i++) {
    const l = list[i];
    if (l instanceof Array) {
      for (let j = 0; j < l.length; j++) {
        if (l[j] != null) {
          f(l[j]);
        }
      }
    } else {
      if (l != null) {
        f(l);
      }
    }
  }
}
function quantile(q: number, list: (number | number[])[]) {
  const values: number[] = [];
  stat_foreach((x) => {
    values.push(x);
  }, list);
  values.sort((a, b) => a - b);
  const pos = (values.length - 1) * q,
    base = Math.floor(pos),
    rest = pos - base;
  return (
    (values[base + 1] &&
      values[base] + rest * (values[base + 1] - values[base])) ||
    values[base]
  );
}
functions.min = (...list: (number | number[])[]) => {
  let r: number = null;
  stat_foreach((x) => {
    if (r == null || x < r) {
      r = x;
    }
  }, list);
  return r;
};
functions.max = (...list: (number | number[])[]) => {
  let r: number = null;
  stat_foreach((x) => {
    if (r == null || x > r) {
      r = x;
    }
  }, list);
  return r;
};
functions.sum = (...list: (number | number[])[]) => {
  let r = 0;
  stat_foreach((x) => (r += x), list);
  return r;
};
functions.count = (...list: (number | number[])[]) => {
  let r = 0;
  // eslint-disable-next-line
  stat_foreach((x) => (r += 1), list);
  return r;
};
functions.stdev = (...list: (number | number[])[]) => {
  let count = 0;
  let sumX = 0;
  let sumX2 = 0;
  stat_foreach((x) => {
    count += 1;
    sumX += x;
    sumX2 += x * x;
  }, list);
  sumX2 /= count;
  sumX /= count;
  return Math.sqrt(sumX2 - sumX * sumX);
};
functions.variance = (...list: (number | number[])[]) => {
  let count = 0;
  let sumX = 0;
  let sumX2 = 0;
  stat_foreach((x) => {
    count += 1;
    sumX += x;
    sumX2 += x * x;
  }, list);
  sumX2 /= count;
  sumX /= count;
  return sumX2 - sumX * sumX;
};
functions.median = (...list: (number | number[])[]) => {
  const values: number[] = [];
  stat_foreach((x) => {
    values.push(x);
  }, list);
  values.sort((a, b) => a - b);
  if (values.length % 2 == 0) {
    return (values[values.length / 2] + values[values.length / 2 + 1]) / 2;
  } else {
    return values[(values.length - 1) / 2];
  }
};
functions.avg = (...list: (number | number[])[]) => {
  let r = 0,
    c = 0;
  stat_foreach((x) => {
    r += x;
    c += 1;
  }, list);
  if (c == 0) {
    return NaN;
  }
  return r / c;
};
functions.mean = functions.avg;
functions.average = functions.avg;
functions.quantile = (q: number, list: (number | number[])[]) =>
  quantile(q, list);
functions.quartile1 = (...list: (number | number[])[]) => quantile(0.25, list);
functions.quartile3 = (...list: (number | number[])[]) => quantile(0.75, list);
functions.iqr = (...list: (number | number[])[]) =>
  quantile(0.75, list) - quantile(0.25, list);

// General operators
operators["+"] = makeArrayCapable2((a: any, b: any) => a + b);
operators["-"] = makeArrayCapable2((a: number, b: number) => a - b);
operators["*"] = makeArrayCapable2((a: number, b: number) => a * b);
operators["/"] = makeArrayCapable2((a: number, b: number) => a / b);
operators["^"] = makeArrayCapable2((a: number, b: number) => Math.pow(a, b));
operators["unary:+"] = makeArrayCapable1((a: number) => +a);
operators["unary:-"] = makeArrayCapable1((a: number) => -a);

operators["<"] = makeArrayCapable2((a: any, b: any) => a < b);
operators[">"] = makeArrayCapable2((a: any, b: any) => a > b);
operators["<="] = makeArrayCapable2((a: any, b: any) => a <= b);
operators[">="] = makeArrayCapable2((a: any, b: any) => a >= b);
operators["=="] = makeArrayCapable2((a: any, b: any) => a == b);
operators["!="] = makeArrayCapable2((a: any, b: any) => a != b);

operators.and = makeArrayCapable2((a: boolean, b: boolean) => a && b);
operators.or = makeArrayCapable2((a: boolean, b: boolean) => a || b);
operators["unary:not"] = makeArrayCapable1((a: boolean) => !a);

// Date operations
functions.date = {
  parse: makeArrayCapable1((x: string) => parseDate(x)),

  year: makeArrayCapable1(utcFormat("%Y")), // year with century as a decimal number.
  month: makeArrayCapable1(utcFormat("%b")), // month as a string "Jan" - "Dec".
  monthnumber: makeArrayCapable1(utcFormat("%m")), // zero-padded number of the month as a decimal number [01,12].
  day: makeArrayCapable1(utcFormat("%d")), // zero-padded day of the month as a decimal number [01,31].
  weekOfYear: makeArrayCapable1(utcFormat("%U")), // Sunday-based week of the year as a decimal number [00,53].
  dayOfYear: makeArrayCapable1(utcFormat("%j")), // day of the year as a decimal number [001,366].
  weekday: makeArrayCapable1(utcFormat("%a")), // abbreviated weekday name.

  hour: makeArrayCapable1(utcFormat("%H")), // hour (24-hour clock) as a decimal number [00,23].
  minute: makeArrayCapable1(utcFormat("%M")), // minute as a decimal number [00,59].
  second: makeArrayCapable1(utcFormat("%S")), // second as a decimal number [00,61].

  timestamp: makeArrayCapable1((d: Date) => d.getTime() / 1000),
};

functions.format = makeArrayCapable2((value: number, spec: string) => {
  return getFormat()(spec)(value);
});

// JSON format
functions.json = {
  parse: makeArrayCapable1((x: string) => JSON.parse(x)),
  stringify: makeArrayCapable1((x: any) => JSON.stringify(x)),
};

// Comparison
functions.sortBy = (
  fieldName: string | ((item: any) => string),
  reversed: boolean = false
) => {
  const SM = reversed ? 1 : -1;
  const LG = reversed ? -1 : 1;
  if (typeof fieldName == "string") {
    return (a: any, b: any) => {
      const fa = a[fieldName];
      const fb = b[fieldName];
      if (fa == fb) {
        return 0;
      }
      return fa < fb ? SM : LG;
    };
  } else {
    return (a: any, b: any) => {
      const fa = fieldName(a);
      const fb = fieldName(b);
      if (fa == fb) {
        return 0;
      }
      return fa < fb ? SM : LG;
    };
  }
};

functions.columnName = (columns: any[] | any, ...names: string[]) => {
  if (columns instanceof Array) {
    return columns
      .filter((column) => names.find((n) => n == column.name))
      .map((column) => column.displayName || column.name);
  } else {
    return columns.displayName || columns.name;
  }
};

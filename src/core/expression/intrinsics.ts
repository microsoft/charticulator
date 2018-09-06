/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { timeFormat } from "d3-time-format";
import { format } from "d3-format";
import { ValueType } from "./classes";

export let constants: { [name: string]: ValueType } = {};
export let functions: {
  [name: string]: Function | { [name: string]: Function };
} = {};
export let operators: { [name: string]: Function } = {};

export let precedences = {
  LAMBDA_EXPRESSION: 1,
  FUNCTION_ARGUMENT: 0,
  OPERATORS: {
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
    "unary:-": [23, 23]
  } as { [name: string]: number[] },
  FUNCTION_CALL: 100,
  LAMBDA_FUNCTION: 100,
  VARIABLE: 100,
  FIELD_ACCESS: 100,
  VALUE: 100
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
      return a.map(ai => f(ai, b as TB));
    } else if (b instanceof Array) {
      return b.map(bi => f(a as TA, bi as TB));
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
functions.length = (...args: any[]) => args.length;
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
functions.map = (list: any[], func: Function) => list.map(item => func(item));
functions.filter = (list: any[], func: Function) =>
  list.filter(item => func(item));

// Statistics
function stat_foreach(f: (x: number) => void, list: Array<number | number[]>) {
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
functions.min = (...list: Array<number | number[]>) => {
  let r: number = null;
  stat_foreach(x => {
    if (r == null || x < r) {
      r = x;
    }
  }, list);
  return r;
};
functions.max = (...list: Array<number | number[]>) => {
  let r: number = null;
  stat_foreach(x => {
    if (r == null || x > r) {
      r = x;
    }
  }, list);
  return r;
};
functions.sum = (...list: Array<number | number[]>) => {
  let r = 0;
  stat_foreach(x => (r += x), list);
  return r;
};
functions.avg = (...list: Array<number | number[]>) => {
  let r = 0,
    c = 0;
  stat_foreach(x => {
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
  parse: makeArrayCapable1((x: string) => new Date(x)),

  year: makeArrayCapable1(timeFormat("%Y")), // year with century as a decimal number.
  month: makeArrayCapable1(timeFormat("%b")), // month as a string "Jan" - "Dec".
  day: makeArrayCapable1(timeFormat("%d")), // zero-padded day of the month as a decimal number [01,31].
  weekOfYear: makeArrayCapable1(timeFormat("%U")), // Sunday-based week of the year as a decimal number [00,53].
  dayOfYear: makeArrayCapable1(timeFormat("%j")), // day of the year as a decimal number [001,366].
  weekday: makeArrayCapable1(timeFormat("%a")), // abbreviated weekday name.

  hour: makeArrayCapable1(timeFormat("%H")), // hour (24-hour clock) as a decimal number [00,23].
  minute: makeArrayCapable1(timeFormat("%M")), // minute as a decimal number [00,59].
  second: makeArrayCapable1(timeFormat("%S")), // second as a decimal number [00,61].

  timestamp: makeArrayCapable1((d: Date) => d.getTime() / 1000)
};

functions.format = makeArrayCapable2((value: number, spec: string) => {
  return format(spec)(value);
});

// JSON format
functions.json = {
  parse: makeArrayCapable1((x: string) => JSON.parse(x)),
  stringify: makeArrayCapable1((x: any) => JSON.stringify(x))
};

// Comparison
functions.sortBy = (
  fieldName: string | Function,
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

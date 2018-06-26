import { timeFormat } from "d3-time-format";
import { ValueType } from "./classes";
import { fields } from "./helpers";

export let intrinsics: { [name: string]: ValueType } = {};
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
intrinsics.PI = Math.PI;
intrinsics.E = Math.E;

// Math functions
intrinsics.abs = Math.abs;
intrinsics.sign = Math.sign;
intrinsics.floor = Math.floor;
intrinsics.ceil = Math.ceil;
intrinsics.exp = Math.exp;
intrinsics.log = Math.log;
intrinsics.log10 = Math.log10;
intrinsics.sin = Math.sin;
intrinsics.cos = Math.cos;
intrinsics.tan = Math.tan;
intrinsics.asin = Math.asin;
intrinsics.acos = Math.acos;
intrinsics.atan = Math.atan;
intrinsics.atan2 = Math.atan2;
intrinsics.tanh = Math.tanh;
intrinsics.sqrt = Math.sqrt;
intrinsics.pow = Math.pow;

// List and range
intrinsics.array = (...args: any[]) => args;
intrinsics.length = (...args: any[]) => args.length;
intrinsics.range = (min: number, max: number, step: number = 1) => {
  const opt: number[] = [];
  for (let i = min; i <= max; i += step) {
    opt.push(i);
  }
  return opt;
};

// Object and fields
intrinsics.get = (obj: any, field: string) => obj[field];

// Array functions
intrinsics.map = (list: any[], func: Function) => list.map(item => func(item));
intrinsics.filter = (list: any[], func: Function) =>
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
intrinsics.min = (...list: Array<number | number[]>) => {
  let r: number = null;
  stat_foreach(x => {
    if (r == null || x < r) {
      r = x;
    }
  }, list);
  return r;
};
intrinsics.max = (...list: Array<number | number[]>) => {
  let r: number = null;
  stat_foreach(x => {
    if (r == null || x > r) {
      r = x;
    }
  }, list);
  return r;
};
intrinsics.sum = (...list: Array<number | number[]>) => {
  let r = 0;
  stat_foreach(x => (r += x), list);
  return r;
};
intrinsics.avg = (...list: Array<number | number[]>) => {
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
intrinsics.mean = intrinsics.avg;
intrinsics.average = intrinsics.avg;

// General operators
operators["+"] = (a: any, b: any) => a + b;
operators["-"] = (a: number, b: number) => a - b;
operators["*"] = (a: number, b: number) => a * b;
operators["/"] = (a: number, b: number) => a / b;
operators["^"] = (a: number, b: number) => Math.pow(a, b);
operators["unary:+"] = (a: number) => +a;
operators["unary:-"] = (a: number) => -a;

operators["<"] = (a: any, b: any) => a < b;
operators[">"] = (a: any, b: any) => a > b;
operators["<="] = (a: any, b: any) => a <= b;
operators[">="] = (a: any, b: any) => a >= b;
operators["=="] = (a: any, b: any) => a == b;
operators["!="] = (a: any, b: any) => a != b;

operators.and = (a: boolean, b: boolean) => a && b;
operators.or = (a: boolean, b: boolean) => a || b;
operators["unary:not"] = (a: boolean) => !a;

// Date operations
intrinsics.date = {
  parse: (x: string) => new Date(x),

  year: timeFormat("%Y"), // year with century as a decimal number.
  month: timeFormat("%b"), // month as a string "Jan" - "Dec".
  day: timeFormat("%d"), // zero-padded day of the month as a decimal number [01,31].
  weekOfYear: timeFormat("%U"), // Sunday-based week of the year as a decimal number [00,53].
  dayOfYear: timeFormat("%j"), // day of the year as a decimal number [001,366].
  weekday: timeFormat("%a"), // abbreviated weekday name.

  hour: timeFormat("%H"), // hour (24-hour clock) as a decimal number [00,23].
  minute: timeFormat("%M"), // minute as a decimal number [00,59].
  second: timeFormat("%S"), // second as a decimal number [00,61].

  timestamp: (d: Date) => d.getTime() / 1000
};

// JSON format
intrinsics.json = {
  parse: (x: string) => JSON.parse(x),
  stringify: (x: any) => JSON.stringify(x)
};

// Comparison
intrinsics.sortBy = (
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

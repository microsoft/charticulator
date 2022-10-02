// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color } from "./color";
import { utcFormat } from "d3-time-format";

import { formatLocale, FormatLocaleDefinition } from "d3-format";
import { Scale } from ".";
import { OrderMode } from "../specification/types";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/** zip two arrays, return an iterator */
export function* zip<T1, T2>(a: T1[], b: T2[]): IterableIterator<[T1, T2]> {
  for (let i = 0; i < a.length; i++) {
    yield [a[i], b[i]];
  }
}

/** zip two arrays, return a new array */
export function zipArray<T1, T2>(a: T1[], b: T2[]): [T1, T2][] {
  if (a.length < b.length) {
    return a.map((elem, idx) => <[T1, T2]>[elem, b[idx]]);
  } else {
    return b.map((elem, idx) => <[T1, T2]>[a[idx], elem]);
  }
}

/** Transpose a matrix r[i][j] = matrix[j][i] */
export function transpose<T>(matrix: T[][]): T[][] {
  if (matrix == undefined) {
    return undefined;
  }
  if (matrix.length == 0) {
    return [];
  }
  const jLength = matrix[0].length;
  const r: T[][] = [];
  for (let j = 0; j < jLength; j++) {
    const rj: T[] = [];
    for (let i = 0; i < matrix.length; i++) {
      rj.push(matrix[i][j]);
    }
    r.push(rj);
  }
  return r;
}

/** Generate a range of integers: [start, end) */
export function makeRange(start: number, end: number) {
  const r: number[] = [];
  for (let i = start; i < end; i++) {
    r.push(i);
  }
  return r;
}

/** Deep clone an object. The object must be JSON-serializable */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function shallowClone<T>(obj: T): T {
  const r = <T>{};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      r[key] = obj[key];
    }
  }
  return r;
}

export function max<T>(
  array: T[],
  accessor: (val: T, index: number, array: T[]) => number
): number {
  // Credit: https://github.com/d3/d3-array/blob/master/src/max.js
  let i: number = -1;
  const n = array.length;
  let value: number;
  let max: number;
  while (++i < n) {
    if ((value = accessor(array[i], i, array)) != null && value >= value) {
      max = value;
      while (++i < n) {
        if ((value = accessor(array[i], i, array)) != null && value > max) {
          max = value;
        }
      }
    }
  }
  return max;
}

export function argMax<T>(
  array: T[],
  accessor: (val: T, index: number, array: T[]) => number
): number {
  let i: number = -1;
  const n = array.length;
  let value: number;
  let max: number;
  let argmax: number = -1;
  while (++i < n) {
    if ((value = accessor(array[i], i, array)) != null && value >= value) {
      max = value;
      argmax = i;
      while (++i < n) {
        if ((value = accessor(array[i], i, array)) != null && value > max) {
          max = value;
          argmax = i;
        }
      }
    }
  }
  return argmax;
}

export function min<T>(
  array: T[],
  accessor: (val: T, index: number, array: T[]) => number
): number {
  // Credit: https://github.com/d3/d3-array/blob/master/src/min.js
  let i: number = -1;
  const n = array.length;
  let value: number;
  let min: number;
  while (++i < n) {
    if ((value = accessor(array[i], i, array)) != null && value >= value) {
      min = value;
      while (++i < n) {
        if ((value = accessor(array[i], i, array)) != null && min > value) {
          min = value;
        }
      }
    }
  }
  return min;
}

export function argMin<T>(
  array: T[],
  accessor: (val: T, index: number, array: T[]) => number
): number {
  let i: number = -1;
  const n = array.length;
  let value: number;
  let min: number;
  let argmin: number;
  while (++i < n) {
    if ((value = accessor(array[i], i, array)) != null && value >= value) {
      min = value;
      argmin = i;
      while (++i < n) {
        if ((value = accessor(array[i], i, array)) != null && min > value) {
          min = value;
          argmin = i;
        }
      }
    }
  }
  return argmin;
}

export type FieldType = string | number | (string | number)[];

export function setField<ObjectType, ValueType>(
  obj: ObjectType,
  field: FieldType,
  value: ValueType
): ObjectType {
  let p = <any>obj;
  if (typeof field == "string" || typeof field == "number") {
    p[field] = value;
  } else {
    for (let i = 0; i < field.length - 1; i++) {
      if (p[field[i]] == undefined) {
        p[field[i]] = {};
      }
      p = p[field[i]];
    }
    p[field[field.length - 1]] = value;
  }
  return obj;
}

export function getField<ObjectType>(
  obj: ObjectType,
  field: FieldType
): ObjectType {
  let p = <any>obj;
  if (typeof field == "string" || typeof field == "number") {
    return p[field];
  } else {
    const fieldList = field;
    for (let i = 0; i < fieldList.length - 1; i++) {
      if (p[fieldList[i]] == undefined) {
        return undefined;
      }
      p = p[fieldList[i]];
    }
    return p[fieldList[fieldList.length - 1]];
  }
}

/** Fill default values into an object */
export function fillDefaults<T extends Record<string, unknown>>(
  obj: Partial<T>,
  defaults: T
): T {
  if (obj == null) {
    obj = <T>{};
  }
  for (const key in defaults) {
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = defaults[key];
      }
    }
  }
  return <T>obj;
}

/** Find the index of the first element that satisfies the predicate, return -1 if not found */
export function indexOf<T>(
  array: T[],
  predicate: (item: T, idx: number) => boolean
) {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i], i)) {
      return i;
    }
  }
  return -1;
}

/** Get the first element with element._id == id, return null if not found */
export function getById<T extends { _id: string }>(array: T[], id: string): T {
  for (let i = 0; i < array.length; i++) {
    if (array[i]._id == id) {
      return array[i];
    }
  }
  return null;
}

/** Get the index of the first element with element._id == id, return -1 if not found */
export function getIndexById<T extends { _id: string }>(
  array: T[],
  id: string
): number {
  for (let i = 0; i < array.length; i++) {
    if (array[i]._id == id) {
      return i;
    }
  }
  return -1;
}

/** Get the first element with element.name == name, return null if not found */
export function getByName<T extends { name: string }>(
  array: T[],
  name: string
): T {
  for (let i = 0; i < array.length; i++) {
    if (array[i].name == name) {
      return array[i];
    }
  }
  return null;
}

/** Get the index of the first element with element.name == name, return -1 if not found */
export function getIndexByName<T extends { name: string }>(
  array: T[],
  name: string
): number {
  for (let i = 0; i < array.length; i++) {
    if (array[i].name == name) {
      return i;
    }
  }
  return -1;
}

export function gather<T>(
  array: T[],
  keyFunction: (item: T, index: number) => string
): T[][] {
  const map = new Map<string, T[]>();
  array.forEach((item, index) => {
    const key = keyFunction(item, index);
    if (map.has(key)) {
      map.get(key).push(item);
    } else {
      map.set(key, [item]);
    }
  });
  const r: T[][] = [];
  for (const array of map.values()) {
    r.push(array);
  }
  return r;
}

/**
 * Sort an array with compare function, make sure when compare(a, b) == 0,
 * a and b are still in the original order (i.e., stable)
 */
export function stableSort<T>(
  array: T[],
  compare: (a: T, b: T) => number
): T[] {
  return (
    array
      // Convert to [ item, index ]
      .map((x, index) => <[T, number]>[x, index])
      // Sort by compare then by index to stabilize
      .sort((a, b) => {
        const c = compare(a[0], b[0]);
        if (c != 0) {
          return c;
        } else {
          return a[1] - b[1];
        }
      })
      // Extract items back
      .map((x) => x[0])
  );
}

/** Sort an array by key given by keyFunction */
export function sortBy<T>(
  array: T[],
  keyFunction: (a: T) => number | string,
  reverse: boolean = false
): T[] {
  if (reverse) {
    return array.sort((a: T, b: T) => {
      const ka = keyFunction(a);
      const kb = keyFunction(b);
      if (ka == kb) {
        return 0;
      }
      return ka < kb ? +1 : -1;
    });
  } else {
    return array.sort((a: T, b: T) => {
      const ka = keyFunction(a);
      const kb = keyFunction(b);
      if (ka == kb) {
        return 0;
      }
      return ka < kb ? -1 : +1;
    });
  }
}

/** Stable sort an array by key given by keyFunction */
export function stableSortBy<T>(
  array: T[],
  keyFunction: (a: T) => number | string,
  reverse: boolean = false
): T[] {
  if (reverse) {
    return stableSort(array, (a: T, b: T) => {
      const ka = keyFunction(a);
      const kb = keyFunction(b);
      if (ka == kb) {
        return 0;
      }
      return ka < kb ? +1 : -1;
    });
  } else {
    return stableSort(array, (a: T, b: T) => {
      const ka = keyFunction(a);
      const kb = keyFunction(b);
      if (ka == kb) {
        return 0;
      }
      return ka < kb ? -1 : +1;
    });
  }
}

/** Map object that maps (Object, string) into ValueType */
export class KeyNameMap<KeyType, ValueType> {
  private mapping = new Map<KeyType, { [name: string]: ValueType }>();

  /** Add a new entry to the map */
  public add(key: KeyType, name: string, value: ValueType) {
    if (this.mapping.has(key)) {
      this.mapping.get(key)[name] = value;
    } else {
      const item: { [name: string]: ValueType } = {};
      item[name] = value;
      this.mapping.set(key, item);
    }
  }

  /** Delete an entry (do nothing if not exist) */
  public delete(key: KeyType, name: string) {
    if (this.mapping.has(key)) {
      delete this.mapping.get(key)[name];
    }
  }

  /** Determine if the map has an entry */
  public has(key: KeyType, name: string) {
    if (this.mapping.has(key)) {
      return Object.prototype.hasOwnProperty.call(this.mapping.get(key), name);
    }
    return false;
  }

  /** Get the value corresponding to an entry, return null if not found */
  public get(key: KeyType, name: string) {
    if (this.mapping.has(key)) {
      const m = this.mapping.get(key);
      if (Object.prototype.hasOwnProperty.call(m, name)) {
        return m[name];
      }
      return null;
    }
    return null;
  }

  public forEach(
    callback: (value: ValueType, key: KeyType, name: string) => void
  ) {
    this.mapping.forEach((v, key) => {
      for (const p in v) {
        if (Object.prototype.hasOwnProperty.call(v, p)) {
          callback(v[p], key, p);
        }
      }
    });
  }
}

export abstract class HashMap<KeyType, ValueType> {
  private map = new Map<string, ValueType>();

  /** Implement this hash function in your map */
  protected abstract hash(key: KeyType): string;

  public set(key: KeyType, value: ValueType) {
    this.map.set(this.hash(key), value);
  }

  public get(key: KeyType) {
    return this.map.get(this.hash(key));
  }

  public has(key: KeyType) {
    return this.map.has(this.hash(key));
  }

  public delete(key: KeyType) {
    this.map.delete(this.hash(key));
  }

  public clear() {
    this.map.clear();
  }

  public values() {
    return this.map.values();
  }
}

export class MultistringHashMap<ValueType> extends HashMap<
  string[],
  ValueType
> {
  // eslint-disable-next-line
  protected separator: string = Math.random().toString(36).substr(2);
  protected hash(key: string[]): string {
    return key.join(this.separator);
  }
}

/** Parsed semver version number */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Parse semver version string into a ParsedVersion */
export function parseVersion(version: string) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return {
    major: +m[1],
    minor: +m[2],
    patch: +m[3],
  };
}

/**
 * Compare two version strings
 * @param version1 version number 1
 * @param version2 version number 2
 * @returns negative if version1 < version2, zero if version1 == version2, positive if version1 > version2
 */
export function compareVersion(version1: string, version2: string) {
  const p1 = parseVersion(version1);
  const p2 = parseVersion(version2);
  // Compare major version first, then minor and patch.
  if (p1.major != p2.major) {
    return p1.major - p2.major;
  }
  if (p1.minor != p2.minor) {
    return p1.minor - p2.minor;
  }
  return p1.patch - p2.patch;
}

function componentToHex(c: number) {
  const hex = Math.round(c).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

/**
 * Converts Color object to Hex
 * @param color Color object
 * @returns Hex representation of color
 */
export function rgbToHex(color: Color) {
  if (!color) {
    return null;
  }
  return (
    "#" +
    componentToHex(color.r) +
    componentToHex(color.g) +
    componentToHex(color.b)
  );
}

/**
 * Converts Hex to Color object
 * @param color Color object
 * @returns Hex representation of color
 */
export function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Return common comparator for two values or sope specific comparator for specific data type
 * testToRange function compares properly, strings with numbers: number-number, number-, number+
 * to sort value ranges list properly
 */
export function getSortFunctionByData(values: string[]) {
  const testToRange = (value: string) => {
    const reg = /(\d-)|(\d+-\d+)|(\d+\+)/;
    const match = value.match(reg);
    if (match && match.length) {
      return true;
    }
    return false;
  };
  if (values.length > 0) {
    const testResult = values
      .map((val) => testToRange(val))
      .reduceRight((a, b) => a && b);
    if (testResult) {
      return (a: any, b: any) => {
        if (a && b) {
          const aNum = a.match(/\d+/)[0];
          const bNum = b.match(/\d+/)[0];
          return +aNum < +bNum
            ? 1
            : +a.split("-").pop() < +b.split("-").pop()
            ? 1
            : -1;
        }
      };
    }
  }

  return (a: any, b: any) => (a < b ? -1 : 1);
}
/**
 * Returns sort direction by comparing the first and the last values of string array
 */
export function getSortDirection(values: string[]): string {
  let direction = "ascending";
  if (values && values[0] && values[(<any[]>values).length - 1]) {
    const a = values[0].toString();
    const b = values[(<any[]>values).length - 1].toString();
    if (b && a && b.localeCompare(a) > -1) {
      direction = "ascending";
    } else {
      direction = "descending";
    }
  }
  return direction;
}

/**
 * Applies timeFormat function of d3 to value
 * @param value date value
 * @param format date format of d3
 */
export function applyDateFormat(value: Date, format: string): string {
  return utcFormat(format)(value);
}

export const colorAttributes = ["fill", "stroke", "color"];

/**
 * Compares attribute names
 */
export function compareMarkAttributeNames(a: string, b: string) {
  if (a === b) {
    return true;
  } else {
    // fill and stroke uses with color. Those properties has the same meaning for marks
    if (colorAttributes.indexOf(b) > -1 && colorAttributes.indexOf(a) > -1) {
      return true;
    }
  }
}

export function refineColumnName(name: string) {
  return name.replace(/[^0-9a-zA-Z_]/g, "_");
}

export function getTimeZoneOffset(date: number) {
  return new Date(date).getTimezoneOffset() * 60 * 1000;
}

export function replaceNewLineBySymbol(str: string) {
  return str?.replace(/\\n/g, "\n");
}

export function splitStringByNewLine(str: string) {
  return str?.split(/\\n/g);
}

export function replaceTabBySymbol(str: string) {
  return str?.replace(/\\t/g, "\t");
}

export function replaceSymbolByNewLine(str: string) {
  return str?.replace(/\n/g, "\\n");
}

export function replaceSymbolByTab(str: string) {
  return str?.replace(/\t/g, "\\t");
}

// eslint-disable-next-line no-var
var formatOptions: FormatLocaleDefinition = {
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""],
};

export function getFormatOptions(): FormatLocaleDefinition {
  return {
    ...formatOptions,
  };
}

export function setFormatOptions(options: FormatLocaleDefinition) {
  formatOptions = {
    ...options,
  };
}

export const tickFormatParserExpression = () => /\{([^}]+)\}/g;

export function getFormat() {
  return formatLocale(formatOptions).format;
}

export function parseSafe(value: string, defaultValue: any = null) {
  try {
    return JSON.parse(value) || defaultValue;
  } catch (ex) {
    return defaultValue;
  }
}

export function getRandom(startRange: number, endRange: number) {
  // eslint-disable-next-line
  return startRange + Math.random() * (endRange - startRange);
}

export function defineCategories(vector: any[]) {
  const scale = new Scale.CategoricalScale();
  vector = (vector as number[]).sort((a, b) => a - b);
  scale.inferParameters(vector as string[], OrderMode.order);
  const categories = new Array<string>(scale.length);
  scale.domain.forEach(
    (index: any, x: any) => (categories[index] = x.toString())
  );
  return categories;
}

import { Color } from "./color";
import { timeFormat } from "d3-time-format";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/** zip two arrays, return an iterator */
export function* zip<T1, T2>(a: T1[], b: T2[]): IterableIterator<[T1, T2]> {
  for (let i = 0; i < a.length; i++) {
    yield [a[i], b[i]];
  }
}

/** zip two arrays, return a new array */
export function zipArray<T1, T2>(a: T1[], b: T2[]): Array<[T1, T2]> {
  if (a.length < b.length) {
    return a.map((elem, idx) => [elem, b[idx]] as [T1, T2]);
  } else {
    return b.map((elem, idx) => [a[idx], elem] as [T1, T2]);
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
  const r = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
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

export type FieldType = string | number | Array<string | number>;

export function setField<ObjectType, ValueType>(
  obj: ObjectType,
  field: FieldType,
  value: ValueType
): ObjectType {
  let p = obj as any;
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

export function getField<ObjectType, ValueType>(
  obj: ObjectType,
  field: FieldType
): ObjectType {
  let p = obj as any;
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
export function fillDefaults<T extends {}>(obj: Partial<T>, defaults: T): T {
  if (obj == null) {
    obj = {} as T;
  }
  for (const key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      if (!obj.hasOwnProperty(key)) {
        obj[key] = defaults[key];
      }
    }
  }
  return obj as T;
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
      .map((x, index) => [x, index] as [T, number])
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
      .map(x => x[0])
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
      return this.mapping.get(key).hasOwnProperty(name);
    }
    return false;
  }

  /** Get the value corresponding to an entry, return null if not found */
  public get(key: KeyType, name: string) {
    if (this.mapping.has(key)) {
      const m = this.mapping.get(key);
      if (m.hasOwnProperty(name)) {
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
        if (v.hasOwnProperty(p)) {
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
  protected separator: string = Math.random()
    .toString(36)
    .substr(2);
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
    patch: +m[3]
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
  const hex = c.toString(16);
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
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Retunrs sort direction by comparing the first and the last values of string array
 */
export function getSortDirection(values: string[]): string {
  let direction = "ascending";
  if (values && values[0] && values[(values as any[]).length - 1]) {
    const a = values[0].toString();
    const b = values[(values as any[]).length - 1].toString();
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
  return timeFormat(format)(value);
}

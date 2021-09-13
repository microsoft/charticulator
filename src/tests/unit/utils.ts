// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { expect } from "chai";
import { AppStoreState } from "../../app/stores";
import { deepClone } from "../../core";
import { DefaultAttributes } from "../../core/prototypes";

export function makeDefaultAttributes(state: AppStoreState) {
  const defaultAttributes: DefaultAttributes = {};
  const { elements } = state.chart;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    defaultAttributes[el._id] = deepClone(
      state.chartState.elements[i].attributes
    );
  }
  return defaultAttributes;
}

/** Test if a deep equals b with tolerance on numeric values */
export function expect_deep_approximately_equals(
  a: any,
  b: any,
  tol: number,
  context?: any
) {
  if (a == null && b == null) {
    return;
  }
  if (a == null || b == null) {
    // If either of a, b is null/undefined
    expect(a).equals(b, `${JSON.stringify(context, null, "")}`);
  } else if (typeof a == "object" && typeof b == "object") {
    if (a instanceof Array && b instanceof Array) {
      // Both are arrays, recursively test for each item in the arrays
      expect(a.length).to.equals(
        b.length,
        `${JSON.stringify(context, null, "")}`
      );
      for (let i = 0; i < a.length; i++) {
        expect_deep_approximately_equals(a[i], b[i], tol, {
          a,
          b,
        });
      }
    } else if (a instanceof Array || b instanceof Array) {
      // One of them is an array, the other one isn't, error
      throw new Error("type mismatch");
    } else {
      // Both are objects, recursively test for each key in the objects
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      expect(keysA).to.deep.equals(
        keysB,
        `${JSON.stringify(context, null, "")}`
      );
      for (const key of keysA) {
        expect_deep_approximately_equals(a[key], b[key], tol, { a, b, key });
      }
    }
  } else {
    try {
      if (!isNaN(+a) && a != null) {
        a = +a;
      }
      if (!isNaN(+b) && b != null) {
        b = +b;
      }
    } catch {}
    if (typeof a == "number" && typeof b == "number") {
      // If both are numbers, test approximately equals
      expect(a as number).to.approximately(
        b as number,
        tol,
        `${JSON.stringify(context, null, "")}`
      );
    } else {
      if (context.key) {
        if (context.key.localeCompare("d") === 0) {
          const aT = parseSVGPath(a);
          const bT = parseSVGPath(b);
          expect_deep_approximately_equals(aT, bT, tol, {
            a,
            b,
            key: context.key,
          });
        }
      }
      const svgTransformA = parseSVGTransform(a);
      const svgTransformB = parseSVGTransform(b);
      if (
        Object.keys(svgTransformA).length &&
        Object.keys(svgTransformB).length
      ) {
        expect_deep_approximately_equals(svgTransformA, svgTransformB, tol, {
          a,
          b,
        });
      }

      // Otherwise, use regular equals
      expect(a).equals(b, `${JSON.stringify(context, null, "")}`);
    }
  }
}

/* tslint:disable */
export function parseSVGTransform(a: any) {
  var b: any = {};
  for (var i in (a = a.match(/(\w+\((\-?\d+\.?\d*e?\-?\d*,?)+\))+/g))) {
    var c = a[i].match(/[\w\.\-]+/g);
    b[c.shift()] = c;
  }
  return b;
}

// The directory containing chart cases
export const pathPrefix = "tests/unit/charts";

export async function loadJSON(url: string) {
  const responce = await fetch(url);
  const json = await responce.text();
  return JSON.parse(json);
}

export async function waitSolver(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 5000));
}

function parseSVGPath(d: string) {
  d = d.replace(/\s{2,}/g, " "); // Remove multiple spaces
  d = d.replace(/\\n/g, "");
  d = d.replace(/([a-zA-Z])\s[0-9]/g, "$1,"); // Add letters to coords group
  const d1 = d.split(" "); // Split on space

  var coords = [];

  for (var i = 0; i < d1.length; i++) {
    var coordString = d1[i];
    const m = coordString.match(/\d+\.*\d*/);
    if (m && m.length) {
      coords.push(Math.round(+m[0]));
    } else {
      coords.push(coordString);
    }
  }
  return coords;
}

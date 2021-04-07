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
export function expect_deep_approximately_equals(a: any, b: any, tol: number) {
  if (a == null || b == null) {
    // If either of a, b is null/undefined
    expect(a).equals(b);
  } else if (typeof a == "object" && typeof b == "object") {
    if (a instanceof Array && b instanceof Array) {
      // Both are arrays, recursively test for each item in the arrays
      expect(a.length).to.equals(b.length);
      for (let i = 0; i < a.length; i++) {
        expect_deep_approximately_equals(a[i], b[i], tol);
      }
    } else if (a instanceof Array || b instanceof Array) {
      // One of them is an array, the other one isn't, error
      throw new Error("type mismatch");
    } else {
      // Both are objects, recursively test for each key in the objects
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      expect(keysA).to.deep.equals(keysB);
      for (const key of keysA) {
        expect_deep_approximately_equals(a[key], b[key], tol);
      }
    }
  } else {
    if (typeof a == "number" && typeof b == "number") {
      // If both are numbers, test approximately equals
      expect(a as number).to.approximately(b as number, tol);
    } else {
      // Otherwise, use regular equals
      expect(a).equals(b);
    }
  }
}

// The directory containing chart cases
export const pathPrefix = "tests/unit/charts";

export async function loadJSON(url: string) {
  const responce = await fetch(url);
  const json = await responce.text();
  return JSON.parse(json);
}

export async function waitSolver(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 1000));
}

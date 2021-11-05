// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { AppStoreState } from "../../app/stores";
import { Prototypes, initialize, deepClone } from "../../core";
import { Migrator } from "../../app/stores/migrator";
import { DefaultAttributes } from "../../core/prototypes";

/** Test if a deep equals b with tolerance on numeric values */
function expect_deep_approximately_equals(a: any, b: any, tol: number) {
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
      expect(<number>a).to.approximately(<number>b, tol);
    } else {
      // Otherwise, use regular equals
      expect(a).equals(b);
    }
  }
}

describe("Chart Solver", () => {
  // The directory containing test cases
  const pathPrefix = "src/tests/unit/charts";

  // Scan for test cases
  const cases = fs.readdirSync(pathPrefix).filter((x) => x.endsWith(".json"));

  // Run tests
  cases.forEach((filename) => {
    it(filename, async () => {
      // The solver has to be initialized, other options can be omitted
      await initialize();

      let state: AppStoreState = JSON.parse(
        fs.readFileSync(path.join(pathPrefix, filename), "utf-8")
      ).state;

      state = new Migrator().migrate(state, "2.0.1");

      const manager = new Prototypes.ChartStateManager(
        state.chart,
        state.dataset,
        null,
        makeDefaultAttributes(state)
      );

      manager.solveConstraints();

      // Solve a second time to converge to higher precision
      // This is necessary because the solver attempts to keep the current values
      // with a weighting mechanism by adding lambda ||x-x0||^2 to the loss function.
      // When starting from scratch, this weighting causes the solved values to bias
      // towards the default values. This bias is in the magnitude of 0.1.
      // A second solveConstraints call can reduce it to 1e-5.
      manager.solveConstraints();

      const solvedState = manager.chartState;
      const expectedState = state.chartState;
      // Test if solvedState deep equals expectedState with tolerance
      expect_deep_approximately_equals(solvedState, expectedState, 1e-5);
    });
  });
});

function makeDefaultAttributes(state: AppStoreState) {
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

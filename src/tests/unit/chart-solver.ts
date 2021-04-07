// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Prototypes, initialize, deepClone } from "../../core";
import { Migrator } from "../../app/stores/migrator";
import {
  expect_deep_approximately_equals,
  loadJSON,
  makeDefaultAttributes,
  pathPrefix,
} from "./utils";
import { APP_VERSION } from "../configuration";

describe("Chart Solver", () => {
  // Scan for test cases
  const cases: string[] = [
    `base/${pathPrefix}/bar-chart.json`,
    `base/${pathPrefix}/side-by-side.json`,
  ];

  // Run tests
  cases.forEach((filename) => {
    it(filename, async () => {
      // The solver has to be initialized, other options can be omitted
      await initialize();

      let state = (await loadJSON(filename)).state;

      state = new Migrator().migrate(state, APP_VERSION);

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

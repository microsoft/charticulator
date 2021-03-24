// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AppStore } from "./../../app/stores";
import { Prototypes, Dataset, CharticulatorCoreConfig } from "./../../core";
import { makeDefaultDataset } from "../../app/default_dataset";
import {
  AttributeMap,
  Chart,
  ChartState,
  ObjectProperties,
} from "../../core/specification";
import { ConstraintStrength } from "../../core/solver";

export function createMockStore() {
  const store = new AppStore(
    {
      solveChartConstraints: (
        chart: Chart<ObjectProperties>,
        chartState: ChartState<AttributeMap>,
        dataset: Dataset.Dataset,
        preSolveValues: [ConstraintStrength, AttributeMap, string, number][],
        mappingOnly?: boolean
      ) => {
        return new Promise((resolve) => {
          const manager = new Prototypes.ChartStateManager(
            chart,
            dataset,
            null,
            {}
          );
          manager.setState(chartState);

          manager.solveConstraints(null, mappingOnly);
          resolve(manager.chartState);
        });
      },
    } as any,
    makeDefaultDataset()
  );
  store.saveHistory = () => {};
  return store;
}

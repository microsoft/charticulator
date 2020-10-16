// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Core from "../core";
import { WorkerHostProcess } from "./communication";

class CharticulatorWorkerProcess extends WorkerHostProcess {
  constructor() {
    super();
    this.registerRPC("initialize", this.initialize.bind(this));
    this.registerRPC(
      "solveChartConstraints",
      this.solveChartConstraints.bind(this)
    );
  }

  public async initialize(config: Core.CharticulatorCoreConfig) {
    await Core.initialize(config);
  }

  public solveChartConstraints(
    chart: Core.Specification.Chart,
    chartState: Core.Specification.ChartState,
    dataset: Core.Dataset.Dataset,
    preSolveValues: Array<
      [
        Core.Solver.ConstraintStrength,
        Core.Specification.AttributeMap,
        string,
        number
      ]
    > = null,
    mappingOnly: boolean = false
  ) {
    if (preSolveValues != null && preSolveValues.length > 0) {
      return this.doSolveChartConstraints(
        chart,
        chartState,
        dataset,
        (solver) => {
          for (const [strength, attrs, attr, value] of preSolveValues) {
            solver.solver.addEqualToConstant(
              strength,
              solver.solver.attr(attrs, attr),
              value
            );
          }
        },
        mappingOnly
      );
    }
    return this.doSolveChartConstraints(
      chart,
      chartState,
      dataset,
      null,
      mappingOnly
    );
  }
  public doSolveChartConstraints(
    chart: Core.Specification.Chart,
    chartState: Core.Specification.ChartState,
    dataset: Core.Dataset.Dataset,
    additional: (solver: Core.Solver.ChartConstraintSolver) => void = null,
    mappingOnly: boolean = false
  ) {
    const chartManager = new Core.Prototypes.ChartStateManager(
      chart,
      dataset,
      chartState
    );
    chartManager.solveConstraints(additional, mappingOnly);
    return chartState;
  }
}

const worker = new CharticulatorWorkerProcess();

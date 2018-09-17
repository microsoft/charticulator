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
        solver => {
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
    let loss: { softLoss: number; hardLoss: number } = null;
    const chartManager = new Core.Prototypes.ChartStateManager(
      chart,
      dataset,
      chartState
    );
    if (mappingOnly) {
      const solver = new Core.Solver.ChartConstraintSolver("glyphs");
      solver.setup(chartManager);
      solver.destroy();
    } else {
      const iterations = additional != null ? 2 : 1;
      for (let i = 0; i < iterations; i++) {
        {
          const t1 = new Date().getTime();
          const solver = new Core.Solver.ChartConstraintSolver("chart");
          solver.setup(chartManager);
          if (additional) {
            additional(solver);
          }
          loss = solver.solve();
          solver.destroy();
          const t2 = new Date().getTime();
          console.log("chart phase", t2 - t1);
        }
        {
          const t1 = new Date().getTime();
          const solver = new Core.Solver.ChartConstraintSolver("glyphs");
          solver.setup(chartManager);
          if (additional) {
            additional(solver);
          }
          loss = solver.solve();
          solver.destroy();
          const t2 = new Date().getTime();
          console.log("glyphs phase", t2 - t1);
        }
        additional = null;
      }
    }
    return chartState;
  }
}

const worker = new CharticulatorWorkerProcess();

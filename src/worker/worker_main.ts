import * as Core from "../core";
import { WorkerHostProcess } from "./communication";

class CharticulatorWorkerProcess extends WorkerHostProcess {
    constructor() {
        super();
        this.registerRPC("initialize", this.initialize.bind(this));
        this.registerRPC("solveChartConstraints", this.solveChartConstraints.bind(this));
    }

    public async initialize(config: Core.CharticulatorCoreConfig) {
        await Core.initialize(config);
    }

    public solveChartConstraints(chart: Core.Specification.Chart, chartState: Core.Specification.ChartState, dataset: Core.Dataset.Dataset, preSolveValues: Array<[Core.Solver.ConstraintStrength, Core.Specification.AttributeMap, string, number]> = null, mappingOnly: boolean = false) {
        if (preSolveValues != null && preSolveValues.length > 0) {
            return this.doSolveChartConstraints(chart, chartState, dataset, (solver) => {
                for (const [strength, attrs, attr, value] of preSolveValues) {
                    solver.solver.addEqualToConstant(strength, solver.solver.attr(attrs, attr), value);
                }
            }, mappingOnly);
        }
        return this.doSolveChartConstraints(chart, chartState, dataset, null, mappingOnly);
    }
    public doSolveChartConstraints(chart: Core.Specification.Chart, chartState: Core.Specification.ChartState, dataset: Core.Dataset.Dataset, additional: (solver: Core.Solver.ChartConstraintSolver) => void = null, mappingOnly: boolean = false) {
        let loss: { softLoss: number, hardLoss: number } = null;
        let iterations = additional != null ? 2 : 2;
        if (mappingOnly) { iterations = 1; }
        const chartManager = new Core.Prototypes.ChartStateManager(chart, dataset, chartState);
        for (let i = 0; i < iterations; i++) {
            const solver = new Core.Solver.ChartConstraintSolver();
            solver.setup(chartManager);
            if (additional) {
                additional(solver);
                additional = null;
            }
            if (!mappingOnly) {
                loss = solver.solve();
                console.log("Loss", loss.hardLoss.toFixed(3), loss.softLoss.toFixed(3));
            }
            solver.destroy();
        }
        return chartState;
    }
}

const worker = new CharticulatorWorkerProcess();
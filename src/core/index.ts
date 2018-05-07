export * from "./common";

export { CharticulatorCoreConfig, getConfig } from "./config";

import * as Expression from "./expression";
import * as Dataset from "./dataset";
import * as Specification from "./specification";
import * as Solver from "./solver";
import * as Prototypes from "./prototypes";
import * as Graphics from "./graphics";

export {
    Expression,
    Specification,
    Prototypes,
    Solver,
    Graphics,
    Dataset
};

import { CharticulatorCoreConfig, setConfig } from "./config";

import { initialize as initialize_WASMSolver } from "./solver/wasm_solver";

export function initialize(config?: CharticulatorCoreConfig): Promise<void> {
    setConfig(config);
    return initialize_WASMSolver();
}
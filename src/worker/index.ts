// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  CharticulatorCoreConfig,
  Dataset,
  Prototypes,
  Solver,
  Specification,
  zipArray,
} from "../core";
import { AttributeMap, ChartState } from "../core/specification";
import { WorkerRPC } from "./communication";

export { CharticulatorWorkerProcess } from "./worker_main";

export interface CharticulatorWorkerInterface {
  initialize(config: CharticulatorCoreConfig): Promise<any>;
  solveChartConstraints: (
    chart: Specification.Chart,
    chartState: Specification.ChartState,
    dataset: Dataset.Dataset,
    preSolveValues: Array<
      [Solver.ConstraintStrength, Specification.AttributeMap, string, number]
    >,
    mappingOnly: boolean
  ) => Promise<any> | any;
}

/** The representation of the background worker. This is used from the main process. */
export class CharticulatorWorker
  extends WorkerRPC
  implements CharticulatorWorkerInterface {
  constructor(workerLocation: string) {
    super(workerLocation);
  }

  public async initialize(config: CharticulatorCoreConfig) {
    await this.rpc("initialize", config);
  }

  public async solveChartConstraints(
    chart: Specification.Chart,
    chartState: Specification.ChartState,
    dataset: Dataset.Dataset,
    preSolveValues: Array<
      [Solver.ConstraintStrength, Specification.AttributeMap, string, number]
    >,
    mappingOnly: boolean = false
  ) {
    const result: Specification.ChartState = await this.rpc(
      "solveChartConstraints",
      chart,
      chartState,
      dataset,
      preSolveValues,
      mappingOnly
    );
    // Copy all attributes from result to chartState
    // let isValidObject = (x: any) => x !== null && typeof (x) == "object";
    // let copyAttributes = (dest: any, src: any) => {
    //     if (src instanceof Array) {
    //         for (let i = 0; i < src.length; i++) {
    //             if (isValidObject(src[i]) && isValidObject(dest[i])) {
    //                 copyAttributes(dest[i], src[i])
    //             } else {
    //                 dest[i] = src[i];
    //             }
    //         }
    //         // Remove extra stuff from dest
    //         if (dest.length > src.length) {
    //             dest.splice(src.length, dest.length - src.length);
    //         }
    //     } else {
    //         for (let i in src) {
    //             if (!src.hasOwnProperty(i)) continue;
    //             if (isValidObject(src[i]) && isValidObject(dest[i])) {
    //                 copyAttributes(dest[i], src[i])
    //             } else {
    //                 dest[i] = src[i];
    //             }
    //         }
    //         for (let i in dest) {
    //             if (!src.hasOwnProperty(i)) {
    //                 delete dest[i];
    //             }
    //         }
    //     }
    // };
    // copyAttributes(chartState, result);

    // Copy only attributes
    const shallowCopyAttributes = (
      dest: Specification.AttributeMap,
      src: Specification.AttributeMap
    ) => {
      for (const key in src) {
        if (src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    };
    shallowCopyAttributes(chartState.attributes, result.attributes);
    for (let i = 0; i < chartState.elements.length; i++) {
      const elementState = chartState.elements[i];
      const resultElementState = result.elements[i];
      shallowCopyAttributes(
        elementState.attributes,
        resultElementState.attributes
      );
      // Is this a plot segment
      if (Prototypes.isType(chart.elements[i].classID, "plot-segment")) {
        const plotSegmentState = elementState as Specification.PlotSegmentState;
        const resultPlotSegmentState = resultElementState as Specification.PlotSegmentState;
        for (const [glyphState, resultGlyphState] of zipArray(
          plotSegmentState.glyphs,
          resultPlotSegmentState.glyphs
        )) {
          shallowCopyAttributes(
            glyphState.attributes,
            resultGlyphState.attributes
          );
          for (const [markState, resultMarkState] of zipArray(
            glyphState.marks,
            resultGlyphState.marks
          )) {
            shallowCopyAttributes(
              markState.attributes,
              resultMarkState.attributes
            );
          }
        }
      }
    }
    for (const [element, resultElement] of zipArray(
      chartState.scales,
      result.scales
    )) {
      shallowCopyAttributes(element.attributes, resultElement.attributes);
    }
    return chartState;
  }
}

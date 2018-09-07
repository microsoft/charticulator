/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { MainStoreState } from "./main_store";
import { compareVersion, zip, Prototypes, Specification } from "../../core";

/** Upgrade old versions of chart spec and state to newer version */
export class Migrator {
  public migrate(state: MainStoreState, targetVersion: string): MainStoreState {
    // First, fix version if missing
    if (!state.version) {
      // Initially we didn't have the version field, so fix it.
      state.version = "1.0.0";
    }

    console.log(`Migrate state from ${state.version} to ${targetVersion}`);

    if (
      compareVersion(state.version, "1.1.0") < 0 &&
      compareVersion(targetVersion, "1.1.0") >= 0
    ) {
      // Major change in spec from 1.1.0: the dataRowIndices are changed from number[] to number[][]
      state = this.fixDataRowIndices(state);
      state = this.fixDataMappingExpressions(state);
      // TODO: also need to fix orderBy expressions
    }

    return state;
  }

  public fixDataRowIndices(state: MainStoreState) {
    // Convert all data row indices in plot segment states to
    for (const [element, elementState] of zip(
      state.chart.chart.elements,
      state.chart.chartState.elements
    )) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegmentState = elementState as Specification.PlotSegmentState;
        plotSegmentState.dataRowIndices = ((plotSegmentState.dataRowIndices as any) as number[]).map(
          i => [i]
        );
      }
    }
    return state;
  }

  public fixDataMappingExpressions(state: MainStoreState) {
    for (const glyph of state.chart.chart.glyphs) {
      for (const mark of glyph.marks) {
        for (const key in mark.mappings) {
          if (mark.mappings.hasOwnProperty(key)) {
            const mapping = mark.mappings[key];
            if (mapping.type == "scale") {
              const scaleMapping = mapping as Specification.ScaleMapping;
              if (scaleMapping.valueType == "number") {
                scaleMapping.expression =
                  "avg(" + scaleMapping.expression + ")";
              } else {
                scaleMapping.expression =
                  "first(" + scaleMapping.expression + ")";
              }
            }
          }
        }
      }
      return state;
    }
    // TODO: fix plot segment axis data mappings as well
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AppStoreState } from "./app_store";
import {
  compareVersion,
  zip,
  Prototypes,
  Specification,
  Expression,
  Dataset,
  deepClone
} from "../../core";
import { TableType } from "../../core/dataset";

/** Upgrade old versions of chart spec and state to newer version */
export class Migrator {
  public migrate(state: AppStoreState, targetVersion: string): AppStoreState {
    // First, fix version if missing
    if (!state.version) {
      // Initially we didn't have the version field, so fix it.
      state.version = "1.0.0";
    }

    // console.log(`Migrate state from ${state.version} to ${targetVersion}`);

    if (
      compareVersion(state.version, "1.3.0") < 0 &&
      compareVersion(targetVersion, "1.3.0") >= 0
    ) {
      // Major change at version 1.3.0: MainStoreState => AppStoreState
      const stateOld = (state as any) as {
        version: string;
        dataset: { dataset: Dataset.Dataset };
        chart: {
          chart: Specification.Chart;
          chartState: Specification.ChartState;
        };
      };
      state = {
        version: stateOld.version, // keep the old version, so the following code can run
        dataset: stateOld.dataset.dataset,
        chart: stateOld.chart.chart,
        chartState: stateOld.chart.chartState
      };
    }

    if (
      compareVersion(state.version, "1.1.0") < 0 &&
      compareVersion(targetVersion, "1.1.0") >= 0
    ) {
      // Major change in spec from 1.1.0: the dataRowIndices are changed from number[] to number[][]
      state = this.fixDataRowIndices(state);
      state = this.fixDataMappingExpressions(state);
    }

    if (
      compareVersion(state.version, "1.4.0") < 0 &&
      compareVersion(targetVersion, "1.4.0") >= 0
    ) {
      // Major change at version 1.4.0: Links are not automatically sorted in rendering now
      state = this.fixLinkOrder_v130(state);
    }

    if (
      compareVersion(state.version, "1.5.0") < 0 &&
      compareVersion(targetVersion, "1.5.0") >= 0
    ) {
      // Major change at version 1.4.0: Links are not automatically sorted in rendering now
      state = this.addScaleMappings(state);
    }
    if (
      compareVersion(state.version, "1.5.1") < 0 &&
      compareVersion(targetVersion, "1.5.1") >= 0
    ) {
      // Major change at version 1.4.0: Links are not automatically sorted in rendering now
      state = this.addTableTypes(state);
    }

    if (
      compareVersion(state.version, "1.6.0") < 0 &&
      compareVersion(targetVersion, "1.6.0") >= 0
    ) {
      // Major change at version 1.4.0: Links are not automatically sorted in rendering now
      state = this.addOriginDataSet(state);
    }

    // After migration, set version to targetVersion
    state.version = targetVersion;

    return state;
  }

  public addOriginDataSet(state: AppStoreState) {
    state.originDataset = deepClone(state.dataset);
    return state;
  }

  public addScaleMappings(state: AppStoreState) {
    state.chart.scaleMappings = [];
    return state;
  }

  public addTableTypes(state: AppStoreState) {
    state.dataset.tables[0].type = TableType.Main;
    if (state.dataset.tables[1]) {
      state.dataset.tables[1].type = TableType.Links;
    }
    // TODO append current mappings
    return state;
  }

  public fixDataRowIndices(state: AppStoreState) {
    // Convert all data row indices in plot segment states to
    for (const [element, elementState] of zip(
      state.chart.elements,
      state.chartState.elements
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

  public addAggregationToExpression(expr: string, valueType: string) {
    if (valueType == "number") {
      return "avg(" + expr + ")";
    } else {
      return "first(" + expr + ")";
    }
  }

  public fixAxisDataMapping(
    mapping: Specification.Types.AxisDataBinding,
    table: string
  ) {
    if (!mapping) {
      return;
    }
    mapping.expression = this.addAggregationToExpression(
      mapping.expression,
      mapping.valueType
    );
  }

  public fixDataMappingExpressions(state: AppStoreState) {
    for (const [element, elementState] of zip(
      state.chart.elements,
      state.chartState.elements
    )) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        this.fixAxisDataMapping(
          plotSegment.properties.xData as any,
          plotSegment.table
        );
        this.fixAxisDataMapping(
          plotSegment.properties.yData as any,
          plotSegment.table
        );
        if (plotSegment.properties.sublayout) {
          const sublayout = plotSegment.properties.sublayout as any;
          if (sublayout.order) {
            const parsed = Expression.parse(sublayout.order);
            let expr = null;
            // This is supposed to be in the form of sortBy((x) => x.Column);
            if (parsed instanceof Expression.FunctionCall) {
              if (parsed.name == "sortBy") {
                if (parsed.args[0] instanceof Expression.LambdaFunction) {
                  const lambda = parsed.args[0] as Expression.LambdaFunction;
                  if (lambda.expr instanceof Expression.FieldAccess) {
                    const field = lambda.expr as Expression.FieldAccess;
                    const column = field.fields[0];
                    expr = Expression.functionCall(
                      "first",
                      Expression.variable(column)
                    ).toString();
                  }
                }
              }
            }
            if (expr) {
              sublayout.order = { expression: expr };
            }
          }
        }
        if (plotSegment.filter) {
          if ((plotSegment.filter.categories as any).column) {
            const column = (plotSegment.filter.categories as any).column;
            delete (plotSegment.filter.categories as any).column;
            plotSegment.filter.categories.expression = Expression.variable(
              column
            ).toString();
          }
        }
      }
    }
    // Fix data mapping on glyphs/marks
    for (const glyph of state.chart.glyphs) {
      for (const mark of glyph.marks) {
        for (const key in mark.mappings) {
          if (mark.mappings.hasOwnProperty(key)) {
            const mapping = mark.mappings[key];
            if (mapping.type == "scale") {
              const scaleMapping = mapping as Specification.ScaleMapping;
              scaleMapping.expression = this.addAggregationToExpression(
                scaleMapping.expression,
                scaleMapping.valueType
              );
            }
            if (mapping.type == "scale" || mapping.type == "text") {
              (mapping as any).table = glyph.table;
            }
          }
        }
      }
    }
    // Fix axis data mappings for data-axes
    for (const glyph of state.chart.glyphs) {
      for (const mark of glyph.marks) {
        if (Prototypes.isType(mark.classID, "mark.data-axis")) {
          const properties = mark.properties as any;
          const valueType: string = properties.axis.valueType;
          properties.axis.expression = this.addAggregationToExpression(
            properties.axis.expression,
            valueType
          );
          if (properties.dataExpressions) {
            properties.dataExpressions = properties.dataExpressions.map(
              (x: string, index: number) => ({
                name: index.toString(),
                expression: this.addAggregationToExpression(x, valueType)
              })
            );
          }
        }
      }
    }
    return state;
  }

  public fixLinkOrder_v130(state: AppStoreState) {
    const linkIndices: number[] = [];
    const otherIndices: number[] = [];
    for (let i = 0; i < state.chart.elements.length; i++) {
      if (Prototypes.isType(state.chart.elements[i].classID, "links")) {
        linkIndices.push(i);
      } else {
        otherIndices.push(i);
      }
    }
    const allIndices = linkIndices.concat(otherIndices);
    state.chart.elements = allIndices.map(i => state.chart.elements[i]);
    state.chartState.elements = allIndices.map(
      i => state.chartState.elements[i]
    );
    return state;
  }
}

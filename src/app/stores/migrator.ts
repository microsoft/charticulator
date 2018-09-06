/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { MainStoreState } from "./main_store";
import {
  compareVersion,
  zip,
  Prototypes,
  Specification,
  Expression
} from "../../core";

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

  public fixDataMappingExpressions(state: MainStoreState) {
    for (const [element, elementState] of zip(
      state.chart.chart.elements,
      state.chart.chartState.elements
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
    for (const glyph of state.chart.chart.glyphs) {
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
    for (const glyph of state.chart.chart.glyphs) {
      for (const mark of glyph.marks) {
        if (Prototypes.isType(mark.classID, "mark.data-axis")) {
          const properties = mark.properties as any;
          console.log(properties);
          const valueType: string = properties.axis.valueType;
          properties.axis.expression = this.addAggregationToExpression(
            properties.axis.expression,
            valueType
          );
          if (properties.dataExpressions) {
            properties.dataExpressions = properties.dataExpressions.map(
              (x: string) => this.addAggregationToExpression(x, valueType)
            );
          }
        }
      }
    }
    return state;
  }
}

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
  deepClone,
} from "../../core";
import { TableType } from "../../core/dataset";
import { upgradeGuidesToBaseline } from "./migrator_baseline";
import { LegendProperties } from "../../core/prototypes/legends/legend";
import { ChartElement, MappingType } from "../../core/specification";
import { NumericalNumberLegendAttributes } from "../../core/prototypes/legends/numerical_legend";
import { forEachObject } from "../../core/prototypes";
import { RectElementProperties } from "../../core/prototypes/marks/rect.attrs";

/** Upgrade old versions of chart spec and state to newer version */
export class Migrator {
  // eslint-disable-next-line
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
        chartState: stateOld.chart.chartState,
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
      // Minor change at version 1.5.0: Links are not automatically sorted in rendering now
      state = this.addScaleMappings(state);
    }
    if (
      compareVersion(state.version, "1.5.1") < 0 &&
      compareVersion(targetVersion, "1.5.1") >= 0
    ) {
      // Minor change at version 1.5.1: Links are not automatically sorted in rendering now
      state = this.addTableTypes(state);
    }

    if (
      compareVersion(state.version, "1.6.0") < 0 &&
      compareVersion(targetVersion, "1.6.0") >= 0
    ) {
      // Minor change at version 1.6.0: Links are not automatically sorted in rendering now
      state = this.addOriginDataSet(state);
    }

    if (
      compareVersion(state.version, "1.7.0") < 0 &&
      compareVersion(targetVersion, "1.7.0") >= 0
    ) {
      // Minor change at version 1.7.0: Interactivity properties for marks
      state = this.addInteractivityProperties(state);
      // Minor change at version 1.7.0: Guides now have a baseline prop
      state = upgradeGuidesToBaseline(state);
    }

    if (
      compareVersion(state.version, "1.8.0") < 0 &&
      compareVersion(targetVersion, "1.8.0") >= 0
    ) {
      // Minor change at version 1.8.0: Add default value for property layout in legend
      state = this.setValueToLayoutPropertyOfLegend(state);
    }

    if (
      compareVersion(state.version, "2.0.0") < 0 &&
      compareVersion(targetVersion, "2.0.0") >= 0
    ) {
      // Major change at version 2.0.0: Add default value for property layout in legend
      state = this.setValueItemShapeOfLegend(state);
    }

    if (
      compareVersion(state.version, "2.0.1") < 0 &&
      compareVersion(targetVersion, "2.0.1") >= 0
    ) {
      // Patch change at version 2.0.1: Add polar/angular legend
      state = this.setPolarAngularLegend(state);
    }

    if (
      compareVersion(state.version, "2.0.2") < 0 &&
      compareVersion(targetVersion, "2.0.2") >= 0
    ) {
      state = this.setAllowFlipToMarks(state);
    }

    // After migration, set version to targetVersion
    state.version = targetVersion;

    return state;
  }

  /**
   * Adds enableTooltips, enableSelection, enableContextMenu properties with default balue true
   * @param state current state
   */
  public addInteractivityProperties(state: AppStoreState) {
    for (const mark of state.chart.elements) {
      mark.properties.enableTooltips = true;
      mark.properties.enableSelection = true;
      mark.properties.enableContextMenu = true;
    }

    for (const glyph of state.chart.glyphs) {
      for (const mark of glyph.marks) {
        mark.properties.enableTooltips = true;
        mark.properties.enableSelection = true;
        mark.properties.enableContextMenu = true;
      }
    }

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
          (i) => [i]
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

  public fixAxisDataMapping(mapping: Specification.Types.AxisDataBinding) {
    if (!mapping) {
      return;
    }
    mapping.expression = this.addAggregationToExpression(
      mapping.expression,
      mapping.valueType
    );
  }

  public fixDataMappingExpressions(state: AppStoreState) {
    for (const [element] of zip(
      state.chart.elements,
      state.chartState.elements
    )) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        this.fixAxisDataMapping(plotSegment.properties.xData as any);
        this.fixAxisDataMapping(plotSegment.properties.yData as any);
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
          // eslint-disable-next-line
          if (mark.mappings.hasOwnProperty(key)) {
            const mapping = mark.mappings[key];
            if (mapping.type == MappingType.scale) {
              const scaleMapping = mapping as Specification.ScaleMapping;
              scaleMapping.expression = this.addAggregationToExpression(
                scaleMapping.expression,
                scaleMapping.valueType
              );
            }
            if (
              mapping.type == MappingType.scale ||
              mapping.type == MappingType.text
            ) {
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
                expression: this.addAggregationToExpression(x, valueType),
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
    state.chart.elements = allIndices.map((i) => state.chart.elements[i]);
    state.chartState.elements = allIndices.map(
      (i) => state.chartState.elements[i]
    );
    return state;
  }

  public setValueToLayoutPropertyOfLegend(state: AppStoreState) {
    for (const element of state.chart.elements) {
      if (
        Prototypes.isType(element.classID, "legend.categorical") ||
        Prototypes.isType(element.classID, "legend.custom")
      ) {
        const legend = element as ChartElement<LegendProperties>;
        if (legend.properties.orientation === undefined) {
          legend.properties.orientation = "vertical";
        }
      }
    }

    return state;
  }

  public setValueItemShapeOfLegend(state: AppStoreState) {
    for (const element of state.chart.elements) {
      if (Prototypes.isType(element.classID, "legend")) {
        const legend = element as ChartElement<LegendProperties>;
        if (legend.properties.markerShape === undefined) {
          legend.properties.markerShape = "circle";
        }
      }
    }

    return state;
  }

  public setPolarAngularLegend(state: AppStoreState) {
    for (let i = 0; i < state.chart.elements.length; i++) {
      const element = state.chart.elements[i];
      if (Prototypes.isType(element.classID, "legend")) {
        const attrs = state.chartState.elements[i]
          .attributes as NumericalNumberLegendAttributes;
        // add new properties
        attrs.cx = 0;
        attrs.cy = 0;
        attrs.radius = 0;
        attrs.startAngle = 0;
        attrs.endAngle = 0;
      }
    }
    return state;
  }

  public setAllowFlipToMarks(state: AppStoreState) {
    for (const item of forEachObject(state.chart)) {
      if (item.kind == "mark") {
        // legend with column names
        if (Prototypes.isType(item.mark.classID, "mark.rect")) {
          (item.mark.properties as RectElementProperties).allowFlipping = true;
        }
      }
    }
    return state;
  }
}

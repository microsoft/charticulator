/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AppStoreState } from "./app_store";
import {
  compareVersion,
  Dataset,
  deepClone,
  Expression,
  Prototypes,
  Specification,
  zip,
} from "../../core";
import { TableType } from "../../core/dataset";
import { upgradeGuidesToBaseline } from "./migrator_baseline";
import { LegendProperties } from "../../core/prototypes/legends/legend";
import {
  ChartElement,
  MappingType,
  Object,
  PlotSegment,
} from "../../core/specification";
import { NumericalNumberLegendAttributes } from "../../core/prototypes/legends/numerical_legend";
import { forEachObject, ObjectItemKind } from "../../core/prototypes";
import { RectElementProperties } from "../../core/prototypes/marks/rect.attrs";
import { CartesianProperties } from "../../core/prototypes/plot_segments/region_2d/cartesian";
import { PolarProperties } from "../../core/prototypes/plot_segments/region_2d/polar";
import { LineGuideProperties } from "../../core/prototypes/plot_segments/line";
import { CurveProperties } from "../../core/prototypes/plot_segments/region_2d/curve";
import { DataAxisProperties } from "../../core/prototypes/marks/data_axis";
import { replaceUndefinedByNull } from "../utils";
import { TickFormatType } from "../../core/specification/types";
import { SymbolElementProperties } from "../../core/prototypes/marks/symbol.attrs";
import { LinearBooleanScaleMode } from "../../core/prototypes/scales/linear";
import { parseDerivedColumnsExpression } from "../../core/prototypes/plot_segments/utils";
import { OrientationType } from "../../core/prototypes/legends/types";
import { NumericalColorLegendClass } from "../../core/prototypes/legends/color_legend";
import { AxisRenderer } from "../../core/prototypes/plot_segments/axis";
import { ArrowType, LinksProperties } from "../../core/prototypes/links";

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

    if (
      compareVersion(state.version, "2.0.4") < 0 &&
      compareVersion(targetVersion, "2.0.4") >= 0
    ) {
      state = this.setMissedProperties(state);
    }
    if (
      compareVersion(state.version, "2.1.0") < 0 &&
      compareVersion(targetVersion, "2.1.0") >= 0
    ) {
      state = this.setMissedGlyphRectProperties(state);
    }

    if (
      compareVersion(state.version, "2.1.1") < 0 &&
      compareVersion(targetVersion, "2.1.1") >= 0
    ) {
      state = this.setMissedSortProperties(state);
    }

    if (
      compareVersion(state.version, "2.1.2") < 0 &&
      compareVersion(targetVersion, "2.1.2") >= 0
    ) {
      state = this.setMissedSortProperties(state);
    }

    if (
      compareVersion(state.version, "2.1.5") < 0 &&
      compareVersion(targetVersion, "2.1.5") >= 0
    ) {
      state = this.setMissedLegendProperties(state);
    }

    if (
      compareVersion(state.version, "2.1.6") < 0 &&
      compareVersion(targetVersion, "2.1.6") >= 0
    ) {
      state = this.setMissedProperties_2_1_6(state);
    }

    // After migration, set version to targetVersion
    state.version = targetVersion;

    return state;
  }

  /**
   * Adds enableTooltips, enableSelection, enableContextMenu properties with default value true
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
          if (Object.prototype.hasOwnProperty.call(mark.mappings, key)) {
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

  private updateAxis(
    axis: Specification.Types.AxisDataBinding
  ): Specification.Types.AxisDataBinding {
    return {
      ...axis,
      side: replaceUndefinedByNull(axis.side),
      type: replaceUndefinedByNull(axis.type),
      visible: replaceUndefinedByNull(axis.visible),
      autoDomainMax: replaceUndefinedByNull(axis.autoDomainMax),
      autoDomainMin: replaceUndefinedByNull(axis.autoDomainMin),
      orderMode: replaceUndefinedByNull(axis.orderMode),
      style: replaceUndefinedByNull(axis.style),
      categories: replaceUndefinedByNull(axis.categories),
      dataKind: replaceUndefinedByNull(axis.dataKind),
      domainMax: replaceUndefinedByNull(axis.domainMax),
      domainMin: replaceUndefinedByNull(axis.domainMin),
      enablePrePostGap: replaceUndefinedByNull(axis.enablePrePostGap),
      expression: replaceUndefinedByNull(axis.expression),
      gapRatio: replaceUndefinedByNull(axis.gapRatio),
      numericalMode: replaceUndefinedByNull(axis.numericalMode),
      order: replaceUndefinedByNull(axis.order),
      rawExpression: replaceUndefinedByNull(axis.rawExpression),
      tickDataExpression: replaceUndefinedByNull(axis.tickDataExpression),
      tickFormat: replaceUndefinedByNull(axis.tickFormat),
      valueType: replaceUndefinedByNull(axis.valueType),
      allowScrolling: replaceUndefinedByNull(axis.allowScrolling),
      windowSize: replaceUndefinedByNull(axis.windowSize),
      barOffset: replaceUndefinedByNull(axis.barOffset),
      offset: replaceUndefinedByNull(axis.offset),
      tickFormatType: replaceUndefinedByNull(axis.tickFormatType),
      numberOfTicks: replaceUndefinedByNull(axis.numberOfTicks),
      autoNumberOfTicks: replaceUndefinedByNull(axis.autoNumberOfTicks),
    };
  }

  public setMissedProperties(state: AppStoreState) {
    for (const item of forEachObject(state.chart)) {
      if (item.kind == ObjectItemKind.Chart) {
        item.object.properties.exposed = true;
      }
      if (item.kind == ObjectItemKind.ChartElement) {
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.cartesian")
        ) {
          const element = item.chartElement as PlotSegment<CartesianProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData === undefined) {
              element.properties.xData = null;
            }
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData === undefined) {
              element.properties.yData = null;
            }
          }
        }
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.polar")
        ) {
          const element = item.chartElement as PlotSegment<PolarProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (Prototypes.isType(item.chartElement.classID, "plot-segment.line")) {
          const element = item.chartElement as PlotSegment<LineGuideProperties>;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
          }
        }
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.curve")
        ) {
          const element = item.chartElement as PlotSegment<CurveProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (Prototypes.isType(item.chartElement.classID, "mark.data-axis")) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          const element = (item.chartElement as unknown) as Object<
            DataAxisProperties
          >;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
          }
          if (element.properties.axis === undefined) {
            element.properties.axis = null;
          }
        }
      }
      if (item.kind == ObjectItemKind.Mark) {
        if (Prototypes.isType(item.mark.classID, "mark.data-axis")) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          const element = (item.mark as unknown) as Object<DataAxisProperties>;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
          }
          if (element.properties.axis === undefined) {
            element.properties.axis = null;
          }
        }
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

  public setMissedGlyphRectProperties(state: AppStoreState) {
    for (const item of forEachObject(state.chart)) {
      if (item.kind == ObjectItemKind.Mark) {
        if (Prototypes.isType(item.mark.classID, "mark.rect")) {
          (item.mark.properties as RectElementProperties).rx = 0;
          (item.mark.properties as RectElementProperties).ry = 0;
        }
        if (Prototypes.isType(item.mark.classID, "mark.symbol")) {
          (item.mark.properties as SymbolElementProperties).rotation = 0;
        }
      }
      if (item.kind == ObjectItemKind.ChartElement) {
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.cartesian")
        ) {
          const element = item.chartElement as PlotSegment<CartesianProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData === undefined) {
              element.properties.xData = null;
            }
            element.properties.xData.offset = 0;
            element.properties.xData.tickFormatType = TickFormatType.None;
            if (element.properties.xData?.style) {
              element.properties.xData.style.showTicks =
                element.properties.xData.style.showTicks ?? true;
              element.properties.xData.style.showBaseline =
                element.properties.xData.style.showBaseline ?? true;
            }
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData === undefined) {
              element.properties.yData = null;
            }
            element.properties.yData.offset = 0;
            element.properties.yData.tickFormatType = TickFormatType.None;
            if (element.properties.yData?.style) {
              element.properties.yData.style.showTicks =
                element.properties.yData.style.showTicks ?? true;
              element.properties.yData.style.showBaseline =
                element.properties.yData.style.showBaseline ?? true;
            }
          }
        }
      }
    }

    //updated visibility number options
    const scales = state.chart.scales;
    if (scales) {
      for (let i = 0; i < scales.length; i++) {
        if (scales[i].classID == "scale.linear<number,boolean>") {
          const scaleProperties = scales[i].properties;
          if (scaleProperties?.mode && scaleProperties?.mode === "interval") {
            scaleProperties.mode = LinearBooleanScaleMode.Between;
          }
          if (scaleProperties?.mode && scaleProperties?.mode === "greater") {
            if (
              scaleProperties?.inclusive &&
              scaleProperties?.inclusive == "true"
            ) {
              scaleProperties.mode =
                LinearBooleanScaleMode.GreaterThanOrEqualTo;
            }
            if (
              scaleProperties?.inclusive &&
              scaleProperties?.inclusive == "false"
            ) {
              scaleProperties.mode = LinearBooleanScaleMode.GreaterThan;
            }
          }
          if (scaleProperties?.mode && scaleProperties?.mode === "less") {
            if (
              scaleProperties?.inclusive &&
              scaleProperties?.inclusive == "true"
            ) {
              scaleProperties.mode = LinearBooleanScaleMode.LessThanOrEqualTo;
            }
            if (
              scaleProperties?.inclusive &&
              scaleProperties?.inclusive == "false"
            ) {
              scaleProperties.mode = LinearBooleanScaleMode.LessThan;
            }
          }
        }
      }
    }

    return state;
  }

  private parseExpression(axisExpression: string) {
    try {
      let expression;
      const parsed = Expression.parse(axisExpression);
      if (parsed instanceof Expression.FunctionCall) {
        expression = parsed.args[0].toString();
        expression = expression?.split("`").join("");
        //need to provide date.year() etc.
        expression = parseDerivedColumnsExpression(expression);
      }
      return expression;
    } catch (e) {
      return axisExpression;
    }
  }

  public setMissedSortProperties(state: AppStoreState) {
    for (const item of forEachObject(state.chart)) {
      if (item.kind == ObjectItemKind.Mark) {
        if (Prototypes.isType(item.mark.classID, "mark.rect")) {
          (item.mark.properties as RectElementProperties).rx = 0;
          (item.mark.properties as RectElementProperties).ry = 0;
        }
        if (Prototypes.isType(item.mark.classID, "mark.symbol")) {
          (item.mark.properties as SymbolElementProperties).rotation = 0;
        }
      }
      if (item.kind == ObjectItemKind.Chart) {
        item.object.properties.exposed = true;
      }
      if (item.kind == ObjectItemKind.ChartElement) {
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.cartesian")
        ) {
          const element = item.chartElement as PlotSegment<CartesianProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData?.style) {
              element.properties.xData.style.showTicks =
                element.properties.xData.style.showTicks ?? true;
              element.properties.xData.style.showBaseline =
                element.properties.xData.style.showBaseline ?? true;
            }
            element.properties.xData.offset = 0;
            element.properties.xData.barOffset = 0;
            if (element.properties.xData.orderByCategories == undefined) {
              element.properties.xData.orderByCategories =
                element.properties.xData.categories;
            }
            if (element.properties.xData.orderByExpression == undefined) {
              element.properties.xData.orderByExpression = this.parseExpression(
                element.properties.xData.expression
              );
            }
            element.properties.xData.enableSelection = true;
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }

          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData?.style) {
              element.properties.yData.style.showTicks =
                element.properties.yData.style.showTicks ?? true;
              element.properties.yData.style.showBaseline =
                element.properties.yData.style.showBaseline ?? true;
            }
            element.properties.yData.offset = 0;
            element.properties.yData.barOffset = 0;
            if (element.properties.yData.orderByCategories == undefined) {
              element.properties.yData.orderByCategories =
                element.properties.yData.categories;
            }
            if (element.properties.yData.orderByExpression == undefined) {
              element.properties.yData.orderByExpression = this.parseExpression(
                element.properties.yData.expression
              );
            }
            element.properties.yData.enableSelection = true;
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.polar")
        ) {
          const element = item.chartElement as PlotSegment<PolarProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData?.style) {
              element.properties.xData.style.showTicks =
                element.properties.xData.style.showTicks ?? true;
              element.properties.xData.style.showBaseline =
                element.properties.xData.style.showBaseline ?? true;
            }
            element.properties.xData.offset = 0;
            element.properties.xData.barOffset = 0;
            if (element.properties.xData.orderByCategories == undefined) {
              element.properties.xData.orderByCategories =
                element.properties.xData.categories;
            }
            if (element.properties.xData.orderByExpression == undefined) {
              element.properties.xData.orderByExpression = this.parseExpression(
                element.properties.xData.expression
              );
            }
            element.properties.xData.enableSelection = true;
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData?.style) {
              element.properties.yData.style.showTicks =
                element.properties.yData.style.showTicks ?? true;
              element.properties.yData.style.showBaseline =
                element.properties.yData.style.showBaseline ?? true;
            }
            if (element.properties.yData.orderByCategories == undefined) {
              element.properties.yData.orderByCategories =
                element.properties.yData.categories;
            }
            if (element.properties.yData.orderByExpression == undefined) {
              element.properties.yData.orderByExpression = this.parseExpression(
                element.properties.yData.expression
              );
            }
            element.properties.yData.offset = 0;
            element.properties.yData.barOffset = 0;
            element.properties.yData.enableSelection = true;
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (Prototypes.isType(item.chartElement.classID, "plot-segment.line")) {
          const element = item.chartElement as PlotSegment<LineGuideProperties>;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
            if (element.properties.axis?.style) {
              element.properties.axis.style.showBaseline =
                element.properties.axis.style.showBaseline ?? true;
              element.properties.axis.style.showTicks =
                element.properties.axis.style.showTicks ?? true;
            }
            if (element.properties.axis.orderByCategories == undefined) {
              element.properties.axis.orderByCategories =
                element.properties.axis.categories;
            }
            if (element.properties.axis.orderByExpression == undefined) {
              element.properties.axis.orderByExpression = this.parseExpression(
                element.properties.axis.expression
              );
            }
            element.properties.axis.enableSelection = true;
            element.properties.axis.barOffset = 0;
          }
        }
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.curve")
        ) {
          const element = item.chartElement as PlotSegment<CurveProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData?.style) {
              element.properties.xData.style.showTicks =
                element.properties.xData.style.showTicks ?? true;
              element.properties.xData.style.showBaseline =
                element.properties.xData.style.showBaseline ?? true;
            }
            element.properties.xData.offset = 0;
            element.properties.xData.barOffset = 0;
            if (element.properties.xData.orderByCategories == undefined) {
              element.properties.xData.orderByCategories =
                element.properties.xData.categories;
            }
            if (element.properties.xData.orderByExpression == undefined) {
              element.properties.xData.orderByExpression = this.parseExpression(
                element.properties.xData.expression
              );
            }
            element.properties.xData.enableSelection = true;
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData?.style) {
              element.properties.yData.style.showTicks =
                element.properties.yData.style.showTicks ?? true;
              element.properties.yData.style.showBaseline =
                element.properties.yData.style.showBaseline ?? true;
            }
            if (element.properties.yData.orderByCategories == undefined) {
              element.properties.yData.orderByCategories =
                element.properties.yData.categories;
            }
            if (element.properties.yData.orderByExpression == undefined) {
              element.properties.yData.orderByExpression = this.parseExpression(
                element.properties.yData.expression
              );
            }
            element.properties.yData.offset = 0;
            element.properties.yData.barOffset = 0;
            element.properties.yData.enableSelection = true;
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (Prototypes.isType(item.chartElement.classID, "mark.data-axis")) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          const element = (item.chartElement as unknown) as Object<
            DataAxisProperties
          >;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
            if (element.properties.axis.orderByCategories == undefined) {
              element.properties.axis.orderByCategories =
                element.properties.axis.categories;
            }
            if (element.properties.axis.orderByExpression == undefined) {
              element.properties.axis.orderByExpression = this.parseExpression(
                element.properties.axis.expression
              );
            }
            element.properties.axis.enableSelection = true;
            element.properties.axis.barOffset = 0;

            if (element.properties.axis?.style) {
              element.properties.axis.style.showBaseline =
                element.properties.axis.style.showBaseline ?? true;
              element.properties.axis.style.showTicks =
                element.properties.axis.style.showTicks ?? true;
            }
          }
          if (element.properties.axis === undefined) {
            element.properties.axis = null;
          }
        }
      }
      if (item.kind == ObjectItemKind.Mark) {
        if (Prototypes.isType(item.mark.classID, "mark.data-axis")) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          const element = (item.mark as unknown) as Object<DataAxisProperties>;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
            element.properties.axis.orderByExpression = this.parseExpression(
              element.properties.axis.expression
            );
            element.properties.axis.orderByCategories =
              element.properties.axis.categories;
            element.properties.axis.enableSelection = true;

            if (element.properties.axis.style) {
              element.properties.axis.style.showBaseline =
                element.properties.axis.style.showBaseline ?? true;
              element.properties.axis.style.showTicks =
                element.properties.axis.style.showTicks ?? true;
            }
          }
          if (element.properties.axis === undefined) {
            element.properties.axis = null;
          }
        }
      }
    }
    return state;
  }

  public setMissedLegendProperties(state: AppStoreState) {
    for (const element of state.chart.elements) {
      if (Prototypes.isType(element.classID, "legend.numerical-color")) {
        const legend = element as ChartElement<LegendProperties>;
        if (legend.properties.orientation === undefined) {
          legend.properties.orientation = OrientationType.VERTICAL;
        }
        if (legend.properties.length === undefined) {
          legend.properties.length =
            NumericalColorLegendClass.defaultLegendLength;
        }
      }
    }
    for (const item of forEachObject(state.chart)) {
      if (item.kind == ObjectItemKind.ChartElement) {
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.cartesian")
        ) {
          const element = item.chartElement as PlotSegment<CartesianProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData.numberOfTicks == undefined) {
              element.properties.xData.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.xData.autoNumberOfTicks == undefined) {
              element.properties.xData.autoNumberOfTicks = true;
            }
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData.numberOfTicks == undefined) {
              element.properties.yData.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.yData.autoNumberOfTicks == undefined) {
              element.properties.yData.autoNumberOfTicks = true;
            }
          }
        }
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.polar")
        ) {
          const element = item.chartElement as PlotSegment<PolarProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData.numberOfTicks == undefined) {
              element.properties.xData.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.xData.autoNumberOfTicks == undefined) {
              element.properties.xData.autoNumberOfTicks = true;
            }
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData.numberOfTicks == undefined) {
              element.properties.yData.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.yData.autoNumberOfTicks == undefined) {
              element.properties.yData.autoNumberOfTicks = true;
            }
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (Prototypes.isType(item.chartElement.classID, "plot-segment.line")) {
          const element = item.chartElement as PlotSegment<LineGuideProperties>;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
            if (element.properties.axis.numberOfTicks == undefined) {
              element.properties.axis.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.axis.autoNumberOfTicks == undefined) {
              element.properties.axis.autoNumberOfTicks = true;
            }
          }
        }
        if (
          Prototypes.isType(item.chartElement.classID, "plot-segment.curve")
        ) {
          const element = item.chartElement as PlotSegment<CurveProperties>;
          if (element.properties.xData) {
            element.properties.xData = this.updateAxis(
              element.properties.xData
            );
            if (element.properties.xData.numberOfTicks == undefined) {
              element.properties.xData.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.xData.autoNumberOfTicks == undefined) {
              element.properties.xData.autoNumberOfTicks = true;
            }
          }
          if (element.properties.xData === undefined) {
            element.properties.xData = null;
          }
          if (element.properties.yData) {
            element.properties.yData = this.updateAxis(
              element.properties.yData
            );
            if (element.properties.yData.numberOfTicks == undefined) {
              element.properties.yData.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.yData.autoNumberOfTicks == undefined) {
              element.properties.yData.autoNumberOfTicks = true;
            }
          }
          if (element.properties.yData === undefined) {
            element.properties.yData = null;
          }
        }
        if (Prototypes.isType(item.chartElement.classID, "mark.data-axis")) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          const element = (item.chartElement as unknown) as Object<
            DataAxisProperties
          >;
          if (element.properties.axis) {
            element.properties.axis = this.updateAxis(element.properties.axis);
            if (element.properties.axis.numberOfTicks == undefined) {
              element.properties.axis.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.axis.autoNumberOfTicks == undefined) {
              element.properties.axis.autoNumberOfTicks = true;
            }
          }
          if (element.properties.axis === undefined) {
            element.properties.axis = null;
          }
        }
      }
      if (item.kind == ObjectItemKind.Mark) {
        if (Prototypes.isType(item.mark.classID, "mark.data-axis")) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          const element = (item.mark as unknown) as Object<DataAxisProperties>;
          if (element.properties.axis) {
            if (element.properties.axis.numberOfTicks == undefined) {
              element.properties.axis.numberOfTicks =
                AxisRenderer.DEFAULT_TICKS_NUMBER;
            }
            if (element.properties.axis.autoNumberOfTicks == undefined) {
              element.properties.axis.autoNumberOfTicks = true;
            }
          }
          if (element.properties.axis === undefined) {
            element.properties.axis = null;
          }
        }
      }
    }
    return state;
  }

  public setMissedProperties_2_1_6(state: AppStoreState) {
    for (const element of state.chart.elements) {
      if (Prototypes.isType(element.classID, "links")) {
        const link = element as ChartElement<LinksProperties>;
        if (link) {
          link.properties.beginArrowType = ArrowType.NO_ARROW;
          link.properties.endArrowType = ArrowType.NO_ARROW;
        }
      }
    }
    for (const item of forEachObject(state.chart)) {
      if (item.kind == "mark") {
        if (Prototypes.isType(item.mark.classID, "mark.rect")) {
          (item.mark.properties as RectElementProperties).orientation =
            OrientationType.VERTICAL;
          (item.mark.properties as RectElementProperties).cometMark = false;
        }
      }
    }
    return state;
  }
}

/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Expression, Prototypes, Solver, Specification } from "../../../core";
import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { ChartElementSelection } from "../selection";
import { ActionHandlerRegistry } from "./registry";
import { BindDataToAxis } from "../../actions/actions";
import {
  MappingType,
  SnappingElementMapping,
} from "../../../core/specification";
import { replaceUndefinedByNull } from "../../utils";

// eslint-disable-next-line
export default function (REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.MapDataToChartElementAttribute, function (action) {
    const inferred =
      (action.hints && action.hints.scaleID) ||
      this.scaleInference(
        { chart: { table: action.table } },
        {
          expression: action.expression,
          valueType: action.valueType,
          valueKind: action.valueMetadata.kind,
          outputType: action.attributeType,
          hints: action.hints,
        }
      );
    if (inferred != null) {
      action.chartElement.mappings[action.attribute] = {
        type: MappingType.scale,
        table: action.table,
        expression: action.expression,
        valueType: action.valueType,
        scale: inferred,
        valueIndex:
          action.hints && action.hints.allowSelectValue != undefined ? 0 : null,
      } as Specification.ScaleMapping;
    } else {
      if (
        (action.valueType == Specification.DataType.String ||
          action.valueType == Specification.DataType.Boolean ||
          action.valueType == Specification.DataType.Number ||
          action.valueType == Specification.DataType.Date) &&
        action.attributeType == Specification.AttributeType.Text
      ) {
        // If the valueType is a number, use a format
        let format;
        if (action.valueType == Specification.DataType.Number) {
          format = ".1f";
        }
        if (action.valueType == Specification.DataType.Date) {
          format = "%m/%d/%Y";
        }
        action.chartElement.mappings[action.attribute] = {
          type: MappingType.text,
          table: action.table,
          textExpression: new Expression.TextExpression([
            { expression: Expression.parse(action.expression), format },
          ]).toString(),
        } as Specification.TextMapping;
      }
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.AddChartElement, function (action) {
    this.saveHistory();

    if (action.classID === "mark.nested-chart") {
      return; // prevent to add nested chart into chart, nested chart can be created only in glyph
    }

    let glyph = this.currentGlyph;
    if (!glyph || this.chart.glyphs.indexOf(glyph) < 0) {
      glyph = this.chart.glyphs[0];
    }

    const newChartElement = this.chartManager.createObject(
      action.classID,
      glyph
    ) as Specification.PlotSegment;
    for (const key in action.properties) {
      newChartElement.properties[key] = action.properties[key];
    }
    // console.log(newPlotSegment);
    if (Prototypes.isType(action.classID, "plot-segment")) {
      newChartElement.filter = null;
      newChartElement.order = null;
    }

    this.chartManager.addChartElement(newChartElement);

    const idx = this.chart.elements.indexOf(newChartElement);
    const elementClass = this.chartManager.getChartElementClass(
      this.chartState.elements[idx]
    );

    for (const key in action.mappings) {
      if (Object.prototype.hasOwnProperty.call(action.mappings, key)) {
        const [value, mapping] = action.mappings[key];
        if (mapping != null) {
          if (mapping.type == MappingType._element) {
            const elementMapping = mapping as SnappingElementMapping;
            this.chartManager.chart.constraints.push({
              type: "snap",
              attributes: {
                element: newChartElement._id,
                attribute: key,
                targetElement: elementMapping.element,
                targetAttribute: elementMapping.attribute,
                gap: 0,
              },
            });
          } else {
            newChartElement.mappings[key] = mapping;
          }
        }
        if (value != null) {
          const idx = this.chart.elements.indexOf(newChartElement);
          this.chartState.elements[idx].attributes[key] = value;
          if (!elementClass.attributes[key].solverExclude) {
            this.addPresolveValue(
              Solver.ConstraintStrength.HARD,
              this.chartState.elements[idx].attributes,
              key,
              value as number
            );
          }
        }
      }
    }

    // TODO fix issue with applying
    if (action.properties.snapToClosestGuide) {
      const idx = this.chart.elements.indexOf(newChartElement);
      const x = this.chartState.elements[idx].attributes.x as number;
      const y = this.chartState.elements[idx].attributes.y as number;
      const [guideX, guideY] = this.getClosestSnappingGuide({
        x,
        y,
      });

      this.chartState.elements[idx].attributes.x = (guideX.guide as any).value;
      this.chartState.elements[idx].attributes.y = (guideY.guide as any).value;
    }

    this.currentSelection = new ChartElementSelection(newChartElement);
    this.emit(AppStore.EVENT_SELECTION);

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetPlotSegmentFilter, function (action) {
    this.saveHistory();
    action.plotSegment.filter = action.filter;
    // Filter updated, we need to regenerate some glyph states
    this.chartManager.remapPlotSegmentGlyphs(action.plotSegment);
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetPlotSegmentGroupBy, function (action) {
    this.saveHistory();
    action.plotSegment.groupBy = action.groupBy;
    // Filter updated, we need to regenerate some glyph states
    this.chartManager.remapPlotSegmentGlyphs(action.plotSegment);
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.UpdateChartElementAttribute, function (action) {
    this.saveHistory();

    const idx = this.chart.elements.indexOf(action.chartElement);
    if (idx < 0) {
      return;
    }
    const layoutState = this.chartState.elements[idx];
    for (const key in action.updates) {
      if (!Object.prototype.hasOwnProperty.call(action.updates, key)) {
        continue;
      }
      // Remove current mapping and any snapping constraint
      delete action.chartElement.mappings[key];
      this.chart.constraints = this.chart.constraints.filter((c) => {
        if (c.type == "snap") {
          if (
            c.attributes.element == action.chartElement._id &&
            c.attributes.attribute == key
          ) {
            return false;
          }
        }
        return true;
      });
      layoutState.attributes[key] = action.updates[key];
      this.addPresolveValue(
        Solver.ConstraintStrength.STRONG,
        layoutState.attributes,
        key,
        action.updates[key] as number
      );
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetChartElementMapping, function (action) {
    this.saveHistory();

    if (action.mapping == null) {
      delete action.chartElement.mappings[action.attribute];
    } else {
      action.chartElement.mappings[action.attribute] = action.mapping;
      this.chart.constraints = this.chart.constraints.filter((c) => {
        if (c.type == "snap") {
          if (
            c.attributes.element == action.chartElement._id &&
            c.attributes.attribute == action.attribute
          ) {
            return false;
          }
        }
        return true;
      });
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SnapChartElements, function (action) {
    this.saveHistory();

    delete action.element.mappings[action.attribute];
    // Remove any existing snapping
    this.chart.constraints = this.chart.constraints.filter((c) => {
      if (c.type == "snap") {
        if (
          c.attributes.element == action.element._id &&
          c.attributes.attribute == action.attribute
        ) {
          return false;
        }
      }
      return true;
    });
    this.chart.constraints.push({
      type: "snap",
      attributes: {
        element: action.element._id,
        attribute: action.attribute,
        targetElement: action.targetElement._id,
        targetAttribute: action.targetAttribute,
        gap: 0,
      },
    });

    this.addPresolveValue(
      Solver.ConstraintStrength.STRONG,
      this.chartManager.getClassById(action.element._id).state.attributes,
      action.attribute,
      this.chartManager.getClassById(action.targetElement._id).state.attributes[
        action.targetAttribute
      ] as number
    );

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetObjectMappingScale, function (action) {
    this.saveHistory();

    if (
      action.scaleId == null ||
      action.object.mappings[action.property].type != MappingType.scale
    ) {
      return;
    } else {
      (action.object.mappings[action.property] as any).scale = action.scaleId;
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetScaleAttribute, function (action) {
    this.saveHistory();

    if (action.mapping == null) {
      delete action.scale.mappings[action.attribute];
    } else {
      action.scale.mappings[action.attribute] = action.mapping;
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.UpdateChartAttribute, function (action) {
    this.saveHistory();

    for (const key in action.updates) {
      if (!Object.prototype.hasOwnProperty.call(action.updates, key)) {
        continue;
      }
      this.chartState.attributes[key] = action.updates[key];
      this.addPresolveValue(
        Solver.ConstraintStrength.STRONG,
        this.chartState.attributes,
        key,
        action.updates[key] as number
      );
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.BindDataToAxis, function (action: BindDataToAxis) {
    this.saveHistory();
    this.bindDataToAxis({
      ...action,
      autoDomainMax: true,
      autoDomainMin: true,
      domainMax: null,
      domainMin: null,
    });
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetChartAttribute, function (action) {
    this.saveHistory();

    if (action.mapping == null) {
      delete this.chart.mappings[action.attribute];
    } else {
      this.chart.mappings[action.attribute] = action.mapping;
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetChartSize, function (action) {
    this.saveHistory();

    this.chartState.attributes.width = action.width;
    this.chartState.attributes.height = action.height;
    this.chart.mappings.width = {
      type: MappingType.value,
      value: action.width,
    } as Specification.ValueMapping;
    this.chart.mappings.height = {
      type: MappingType.value,
      value: action.height,
    } as Specification.ValueMapping;

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetObjectProperty, function (action) {
    this.setProperty(action);
  });

  REG.add(Actions.DeleteObjectProperty, function (action) {
    if (action.property === "name") {
      return;
    }
    this.saveHistory();

    if (action.field == null) {
      delete action.object.properties[action.property];
    } else {
      const obj = action.object.properties[action.property] as any;
      delete obj[action.field as any];
    }

    if (action.noUpdateState) {
      this.emit(AppStore.EVENT_GRAPHICS);
    } else {
      this.solveConstraintsAndUpdateGraphics(action.noComputeLayout);
    }
  });

  REG.add(Actions.ExtendPlotSegment, function (action) {
    this.saveHistory();

    const plotSegment = action.plotSegment as Specification.PlotSegment;
    const plotSegmentState = this.chartState.elements[
      this.chart.elements.indexOf(plotSegment)
    ] as Specification.PlotSegmentState;

    let newClassID: string;
    switch (action.extension) {
      case "cartesian-x": {
        newClassID = "plot-segment.cartesian";
        break;
      }
      case "cartesian-y":
        {
          newClassID = plotSegment.classID;
        }
        break;
      case "polar":
        {
          newClassID = "plot-segment.polar";
        }
        break;
      case "curve":
        {
          newClassID = "plot-segment.curve";
        }
        break;
    }
    if (plotSegment.classID != newClassID) {
      const originalAttributes = plotSegment.mappings;
      plotSegment.classID = newClassID;
      plotSegment.mappings = {};

      if (originalAttributes.x1) {
        plotSegment.mappings.x1 = originalAttributes.x1;
      }
      if (originalAttributes.x2) {
        plotSegment.mappings.x2 = originalAttributes.x2;
      }
      if (originalAttributes.y1) {
        plotSegment.mappings.y1 = originalAttributes.y1;
      }
      if (originalAttributes.y2) {
        plotSegment.mappings.y2 = originalAttributes.y2;
      }

      plotSegment.properties = {
        name: replaceUndefinedByNull(plotSegment.properties.name),
        visible: replaceUndefinedByNull(plotSegment.properties.visible),
        sublayout: replaceUndefinedByNull(plotSegment.properties.sublayout),
        xData: replaceUndefinedByNull(plotSegment.properties.xData),
        yData: replaceUndefinedByNull(plotSegment.properties.yData),
        marginX1: replaceUndefinedByNull(plotSegment.properties.marginX1),
        marginY1: replaceUndefinedByNull(plotSegment.properties.marginY1),
        marginX2: replaceUndefinedByNull(plotSegment.properties.marginX2),
        marginY2: replaceUndefinedByNull(plotSegment.properties.marginY2),
      };

      if (newClassID == "plot-segment.polar") {
        plotSegment.properties.startAngle =
          Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.startAngle;
        plotSegment.properties.endAngle =
          Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.endAngle;
        plotSegment.properties.innerRatio =
          Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.innerRatio;
        plotSegment.properties.outerRatio =
          Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.outerRatio;
      }
      if (newClassID == "plot-segment.curve") {
        plotSegment.properties.curve =
          Prototypes.PlotSegments.CurvePlotSegment.defaultProperties.curve;
        plotSegment.properties.normalStart =
          Prototypes.PlotSegments.CurvePlotSegment.defaultProperties.normalStart;
        plotSegment.properties.normalEnd =
          Prototypes.PlotSegments.CurvePlotSegment.defaultProperties.normalEnd;
      }

      this.chartManager.initializeCache();
      const layoutClass = this.chartManager.getPlotSegmentClass(
        plotSegmentState
      );
      plotSegmentState.attributes = {};
      layoutClass.initializeState();
    } else {
      if (
        action.extension == "cartesian-x" ||
        action.extension == "polar" ||
        action.extension == "curve"
      ) {
        plotSegment.properties.xData = { type: "default", gapRatio: 0.1 };
      }
      if (action.extension == "cartesian-y") {
        plotSegment.properties.yData = { type: "default", gapRatio: 0.1 };
      }
    }
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.ReorderGlyphMark, function (action) {
    this.saveHistory();

    this.chartManager.reorderGlyphElement(
      action.glyph,
      action.fromIndex,
      action.toIndex
    );

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.ToggleLegendForScale, function (action) {
    this.saveHistory();

    this.toggleLegendForScale(action.scale, action.mapping, action.plotSegment);

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.ReorderChartElement, function (action) {
    this.saveHistory();

    this.chartManager.reorderChartElement(action.fromIndex, action.toIndex);

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.AddLinks, function (action) {
    this.saveHistory();

    action.links.properties.name = this.chartManager.findUnusedName("Link");
    // Always add links to the back
    this.chartManager.addChartElement(action.links, 0);
    const selection = new ChartElementSelection(action.links);
    this.currentSelection = selection;

    // Note: currently, links has no constraints to solve
    this.emit(AppStore.EVENT_GRAPHICS);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.DeleteChartElement, function (action) {
    this.saveHistory();

    if (
      this.currentSelection instanceof ChartElementSelection &&
      this.currentSelection.chartElement == action.chartElement
    ) {
      this.currentSelection = null;
      this.emit(AppStore.EVENT_SELECTION);
    }
    this.chartManager.removeChartElement(action.chartElement);

    this.solveConstraintsAndUpdateGraphics();
  });
}

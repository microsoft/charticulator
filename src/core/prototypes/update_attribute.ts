// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { zipArray } from "../common/utils";
import {
  AttributeValue,
  Constraint,
  Glyph,
  PlotSegment,
  PlotSegmentState,
} from "../specification";
import { findObjectById } from "./common";
import { isType } from "./object";
import { CartesianPlotSegment } from "./plot_segments";
import { ChartStateManager } from "./state";

export function onUpdateAttribute(
  manager: ChartStateManager,
  elementID: string,
  attribute: string,
  value: AttributeValue
) {
  const found = zipArray(
    manager.chart.elements,
    manager.chartState.elements
  ).find(([element, elementState]) => {
    return element._id === elementID;
  });
  if (found) {
    const elementState = found[1];
    elementState.attributes[attribute] = value;
  } else {
    for (const [element, elementState] of zipArray(
      manager.chart.elements,
      manager.chartState.elements
    )) {
      if (isType(element.classID, CartesianPlotSegment.type)) {
        const plotSegment = <PlotSegment>element;
        const plotSegmentState = <PlotSegmentState>elementState;
        for (const glyphState of plotSegmentState.glyphs) {
          const glyph = <Glyph>findObjectById(
            manager.chart,
            plotSegment.glyph
          );
          const found = zipArray(glyph.marks, glyphState.marks).find(
            ([element, elementState]) => {
              return element._id === elementID;
            }
          );
          if (found) {
            const elementState = found[1];
            elementState.attributes[attribute] = value;
          }
        }
      }
    }
  }
}

export function snapToAttribute(
  manager: ChartStateManager,
  chartConstraints: Constraint[],
  objectId: string,
  attrName: string,
  attrValue: AttributeValue
) {
  chartConstraints
    .filter(
      (constraint) =>
        constraint.type == "snap" &&
        constraint.attributes.targetAttribute === attrName &&
        constraint.attributes.targetElement === objectId
    )
    .forEach((constraint) => {
      onUpdateAttribute(
        manager,
        constraint.attributes.element,
        constraint.attributes.attribute,
        attrValue
      );
    });
}

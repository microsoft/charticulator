// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AppStoreState } from "./app_store";
import { Specification, uniqueID } from "../../core";
import { GuideClass } from "../../core/prototypes/guides";
import { ParentMapping, ChartElementState } from "../../core/specification";

interface ChartElementRef {
  chartElementItem: Specification.ChartElement<Specification.ObjectProperties>;
  chartElementIndex: number;
  chartElementState: Specification.ChartElementState<
    Specification.AttributeMap
  >;
}

/** Upgrade old versions of chart spec and state to newer version */

export function upgradeGuidesToBaseline(state: AppStoreState) {
  //console.log("migration chartGuides");

  // get chart guides
  const chartGuideRefs: ChartElementRef[] = [];
  const glyphGuides: Array<{
    guide: Specification.ChartElement<Specification.ObjectProperties>;
    idx: number;
  }> = [];

  state.chart.elements.forEach((chartElementItem, chartElementIndex) => {
    if (chartElementItem.classID === GuideClass.classID) {
      const chartElementState = state.chartState.elements[chartElementIndex];
      chartGuideRefs.push({
        chartElementItem,
        chartElementIndex,
        chartElementState
      });
    }
  });

  chartGuideRefs.forEach(guideItem => {
    const { chartElementItem, chartElementState } = guideItem;

    // add new properties
    chartElementItem.properties.baseline = "center";
    chartElementState.attributes.computedBaselineValue =
      chartElementState.attributes.value;

    // convert mappings to actual values
    const valueMapping = chartElementItem.mappings.value as ParentMapping;
    if (valueMapping && valueMapping.type === "parent") {
      if (valueMapping.type === "parent") {
        const { parentAttribute } = valueMapping;
        // set value to actual mapped attr value
        chartElementState.attributes.value = chartElementState.attributes.computedBaselineValue =
          state.chartState.attributes[parentAttribute];
        // remove the mapping
        delete chartElementItem.mappings.value;
      }
    }

    // find other elements constrained to this chartElementItem
    state.chart.constraints.forEach(constraint => {
      if (
        constraint.type === "snap" &&
        constraint.attributes.targetElement === chartElementItem._id
      ) {
        const gap = +chartElementItem.properties.gap;
        if (constraint.attributes.targetAttribute === "value2" && gap) {
          // create a 2nd guide to insert, based on gap property of first

          // const newGuide
          const axis = chartElementItem.properties.axis;
          const newElement = {
            _id: uniqueID(),
            classID: "guide.guide",
            properties: {
              baseline: axis === "x" ? "center" : "middle",
              name: `${chartElementItem.properties.name} gap`,
              axis
            },
            mappings: {}
          };
          //console.log("newElement", newElement);
          const value = +chartElementState.attributes.value + gap;
          const newElementState: ChartElementState = {
            attributes: {
              value,
              computedBaselineValue: value
            }
          };
          state.chart.elements.push(newElement);
          state.chartState.elements.push(newElementState);

          constraint.attributes.targetElement = newElement._id;

          // find constraint object and make value attribute match
          state.chart.elements.forEach((constrainedElement, idx) => {
            if (chartElementItem._id === constraint.attributes.element) {
              const constrainedElementState = state.chartState.elements[idx];
              const attribute = constraint.attributes.attribute as string;
              constrainedElementState.attributes[attribute] = value;
            }
          });
        }
        constraint.attributes.targetAttribute = "computedBaselineValue";
      }
    });

    // remove deleted properties / attributes
    delete chartElementItem.properties.gap;
    delete chartElementItem.properties.value; // unused property in original schema
    delete chartElementItem.properties.value2; // unused property in original schema
    delete chartElementState.attributes.value2;
  });

  // get glyph guides
  state.chart.glyphs.forEach((guide, idx) => {
    if (guide.classID === GuideClass.classID) {
      glyphGuides.push({ guide, idx });
    }
  });

  //console.log(state);
  //console.log(chartGuideRefs);
  //console.log(glyphGuides);

  return state;
}

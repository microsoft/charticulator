// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AppStoreState } from "./app_store";
import { Specification, uniqueID } from "../../core";
import { GuideClass, GuideAxis } from "../../core/prototypes/guides";
import { ParentMapping, ChartElementState } from "../../core/specification";

type Element = Specification.ChartElement<Specification.ObjectProperties>;
type State = Specification.ChartElementState<Specification.AttributeMap>;

interface ChartElementRef {
  element: Element;
  index: number;
  state: State;
}

/** Upgrade old versions of chart spec and state to newer version */

export function upgradeGuidesToBaseline(appStoreState: AppStoreState) {
  upgradeScope(appStoreState.chart, appStoreState.chartState);
  // TODO are nested charts scopes ?

  return appStoreState;
}

function upgradeScope(
  parentElement: Specification.Chart<Specification.ObjectProperties>,
  parentState: Specification.ChartState<Specification.AttributeMap>
) {
  upgradeChartGuides(parentElement, parentState);
  upgradeGlyphGuides(parentElement, parentState);
}

function upgradeChartGuides(
  parentElement: Specification.Chart<Specification.ObjectProperties>,
  parentState: Specification.ChartState<Specification.AttributeMap>
) {
  // get chart guides
  const chartGuideRefs = find(
    parentElement.elements,
    parentState.elements,
    element => element.classID === GuideClass.classID
  );

  chartGuideRefs.forEach(ref => {
    const { element, state } = ref;

    // convert mappings to actual values
    const valueMapping = element.mappings.value as ParentMapping;
    if (valueMapping && valueMapping.type === "parent") {
      const { parentAttribute } = valueMapping;
      // set value to actual mapped attr value
      state.attributes.value = parentState.attributes[parentAttribute];
      // remove the mapping
      delete element.mappings.value;
    } else {
      // guides should not be mapped to anything other than parent
      // Notify user?
    }

    // find other elements constrained to this chartElementItem
    parentElement.constraints.forEach(constraint => {
      if (
        constraint.type === "snap" &&
        constraint.attributes.targetElement === element._id
      ) {
        changeConstraintTarget(
          element,
          constraint,
          +state.attributes.value,
          parentElement.elements,
          parentState.elements
        );
      }
    });

    // add new properties
    element.properties.baseline = "center";
    state.attributes.computedBaselineValue = state.attributes.value;

    // remove deleted properties / attributes
    removeOldGuideProperties(element, state);
  });
}

function upgradeGlyphGuides(
  parentElement: Specification.Chart<Specification.ObjectProperties>,
  parentState: Specification.ChartState<Specification.AttributeMap>
) {
  // get glyph guides
  const glyphGuides: Array<{
    guide: Element;
    idx: number;
  }> = [];

  parentElement.glyphs.forEach((guide, idx) => {
    if (guide.classID === GuideClass.classID) {
      glyphGuides.push({ guide, idx });
    }
  });
}

function find(
  elements: Array<Element>,
  states: Array<State>,
  predicate: (
    element: Element
  ) => boolean
) {
  const refs: ChartElementRef[] = [];
  elements.forEach((element, index) => {
    if (predicate(element)) {
      const state = states[index];
      refs.push({ element, index, state });
    }
  });
  return refs;
}

function changeConstraintTarget(
  element: Element,
  constraint: Specification.Constraint,
  guideValue: number,
  elementCollection: Array<
    Element
  >,
  stateCollection: Array<
    State
  >
) {
  const gap = +element.properties.gap;
  if (constraint.attributes.targetAttribute === "value2" && gap) {
    // create a 2nd guide to insert, based on gap property of first
    const axis = element.properties.axis as GuideAxis;
    const value = guideValue + gap;
    const newGuide = createGuide(axis, element, value);
    elementCollection.push(newGuide.element);
    stateCollection.push(newGuide.state);

    constraint.attributes.targetElement = newGuide.element._id;

    // find constraint object and make value attribute match
    const constrained = find(
      elementCollection,
      stateCollection,
      element => element._id === constraint.attributes.element
    );
    constrained.forEach(ref => {
      const name = constraint.attributes.attribute as string;
      ref.state.attributes[name] = value;
    });
  }
  constraint.attributes.targetAttribute = "computedBaselineValue";
}

function removeOldGuideProperties(
  element: Element,
  state: State
) {
  delete element.properties.gap;
  delete element.properties.value; // unused property in original schema
  delete element.properties.value2; // unused property in original schema
  delete state.attributes.value2;
}

function createGuide(
  axis: GuideAxis,
  chartElementItem: Element,
  value: number
) {
  const element: Element = {
    _id: uniqueID(),
    classID: "guide.guide",
    properties: {
      baseline: axis === "x" ? "center" : "middle",
      name: `${chartElementItem.properties.name} gap`,
      axis
    },
    mappings: {}
  };
  const state: ChartElementState = {
    attributes: {
      value,
      computedBaselineValue: value
    }
  };
  return { element, state };
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Style, ColorFilter } from "../../graphics";
import { MarkClass } from "./mark";
import { ObjectClass } from "../object";
import {
  Object,
  ObjectState,
  EmphasisMethod,
  AttributeMap,
} from "../../specification";

const DEFAULT_EMPHASIS_DESATURATION: ColorFilter = {
  saturation: { multiply: 0.2 },
  lightness: { add: 0.01, pow: 0.2 },
};
const DEFAULT_EMPHASIS_STROKE_COLOR = { r: 255, g: 0, b: 0 };
const DEFAULT_EMPHASIS_STROKE_WIDTH = 1;

/**
 * Represents a mark class that is emphasizable
 */
export abstract class EmphasizableMarkClass<
  PropertiesType extends AttributeMap = AttributeMap,
  AttributesType extends AttributeMap = AttributeMap
> extends MarkClass<PropertiesType, AttributesType> {
  private defaultMethod: EmphasisMethod;
  constructor(
    parent: ObjectClass,
    object: Object<PropertiesType>,
    state: ObjectState<AttributesType>,
    defaultMethod = EmphasisMethod.Saturation
  ) {
    super(parent, object, state);

    this.defaultMethod = defaultMethod;
  }

  /**
   * Generates styling info for styling emphasized marks
   * @param emphasize If true, emphasis will be applied.
   */
  protected generateEmphasisStyle(emphasize?: boolean): Style {
    // If emphasize is undefined (or true), we use full saturation
    const style = <Style>{
      saturation: 1,
    };

    // only if emphasize is explicitly false to we use saturation of .7
    const method = this.object.properties.emphasisMethod || this.defaultMethod;
    if (method === EmphasisMethod.Saturation && emphasize === false) {
      style.colorFilter = DEFAULT_EMPHASIS_DESATURATION;
    }

    if (method === EmphasisMethod.Outline && emphasize) {
      style.strokeColor = DEFAULT_EMPHASIS_STROKE_COLOR;
      style.strokeWidth = DEFAULT_EMPHASIS_STROKE_WIDTH;
    }

    return style;
  }
}

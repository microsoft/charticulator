// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Style } from "../../graphics";
import { MarkClass } from "./index";
import { ObjectClass } from "../object";
import { Object, ObjectState, EmphasisMethod } from "../../specification";

const DEFAULT_EMPHASIS_DESATURATION = 0.7;
const DEFAULT_EMPHASIS_STROKE_COLOR = { r: 255, g: 0, b: 0 };
const DEFAULT_EMPHASIS_STROKE_WIDTH = 1;

/**
 * Represents a mark class that is emphasizable
 */
export class EmphasizableMarkClass extends MarkClass {
  private defaultMethod: EmphasisMethod;
  constructor(
    parent: ObjectClass,
    object: Object,
    state: ObjectState,
    attributes: any,
    defaultMethod = EmphasisMethod.Saturation
  ) {
    super(parent, object, state, attributes);

    this.defaultMethod = defaultMethod;
  }

  /**
   * Generates styling info for styling emphasized marks
   * @param emphasize If true, emphasis will be applied.
   */
  protected generateEmphasisStyle(emphasize?: boolean): Style {
    // If emphasize is undefined (or true), we use full saturation
    const style = {
      saturation: 1
    } as Style;

    // only if emphasize is explicitly false to we use saturation of .7
    const method = this.object.properties.emphasisMethod || this.defaultMethod;
    if (method === EmphasisMethod.Saturation && emphasize === false) {
      style.saturation = DEFAULT_EMPHASIS_DESATURATION;
    }

    if (method === EmphasisMethod.Outline && emphasize) {
      style.strokeColor = DEFAULT_EMPHASIS_STROKE_COLOR;
      style.strokeWidth = DEFAULT_EMPHASIS_STROKE_WIDTH;
    }

    return style;
  }
}

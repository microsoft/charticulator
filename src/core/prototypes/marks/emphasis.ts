import { Style } from "../../graphics";
import { MarkClass } from "./index";
import { ObjectClass, AttributeDescription } from "../object";
import { Object, ObjectState } from "../../specification";

/**
 * Represents the type of method to use when emphasizing this element
 */
export enum EmphasisMethod {
  Saturation = "saturatation",
  Outline = "outline"
}

export interface HasEmphasisAttributes {
  /**
   * Describes the method to use when emphasizing
   */
  emphasisMethod: EmphasisMethod;
}

/**
 * Represents a mark class that is emphasizable
 */
export class EmphasizableMarkClass extends MarkClass {
  private defaultMethod: EmphasisMethod;
  constructor(
    parent: ObjectClass,
    object: Object,
    state: ObjectState,
    attributes: { [name: string]: AttributeDescription },
    defaultMethod = EmphasisMethod.Saturation
  ) {
    Object.assign(attributes, {
      emphasisMethod: {
        name: "emphasisMethod",
        type: "string",
        category: "style",
        displayName: "Emphasis Method",
        solverExclude: true,
        defaultValue: defaultMethod
      }
    });

    super(parent, object, state, attributes);

    this.defaultMethod = defaultMethod;
  }

  public initializeState() {
    const attrs = this.state.attributes;
    attrs.emphasisMethod = this.defaultMethod;
  }

  /**
   *
   * @param emphasize
   */
  protected generateEmphasisStyle(emphasize?: boolean): Style {
    // If emphasize is undefined (or true), we use full saturation
    const style = {
      saturation: 1
    } as Style;

    // only if emphasize is explicitly false to we use saturation of .7
    if (
      this.state.attributes.emphasisMethod === EmphasisMethod.Saturation &&
      emphasize === false
    ) {
      style.saturation = 0.7;
    }

    if (
      this.state.attributes.emphasisMethod === EmphasisMethod.Outline &&
      emphasize
    ) {
      style.strokeColor = { r: 255, g: 0, b: 0 };
      style.strokeWidth = 1;
    }

    return style;
  }
}

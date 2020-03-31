// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ConstraintSolver, Variable } from "../../solver";
import {
  DataValue,
  Scale,
  ScaleState,
  AttributeValue,
  AttributeMap
} from "../../specification";
import {
  DataMappingHints,
  ObjectClass,
  TemplateParameters,
  ObjectClassMetadata
} from "../common";

export interface InferParametersOptions extends DataMappingHints {
  /** Whether to extend the scale domain/range with new data */
  extendScale?: boolean;
  /** Whether to reuse the existing range of the scale, applies to color and image */
  reuseRange?: boolean;
  /** Whether to ensure the domainMin == 0 (for numeric scales) */
  startWithZero?: "default" | "always" | "never";
}

export abstract class ScaleClass<
  PropertiesType extends AttributeMap = AttributeMap,
  AttributesType extends AttributeMap = AttributeMap
> extends ObjectClass<PropertiesType, AttributesType> {
  public readonly object: Scale<PropertiesType>;
  public readonly state: ScaleState<AttributesType>;

  public static metadata: ObjectClassMetadata = {
    displayName: "Scale",
    iconPath: "scale/scale"
  };

  public abstract mapDataToAttribute(data: DataValue): AttributeValue;

  public buildConstraint(
    data: DataValue,
    target: Variable,
    solver: ConstraintSolver
  ): void {}

  public abstract inferParameters(
    column: DataValue[],
    options?: InferParametersOptions
  ): void;

  public getTemplateParameters(): TemplateParameters {
    return {
      inferences: [
        {
          objectID: this.object._id,
          scale: {
            classID: this.object.classID,
            expressions: [],
            properties: {
              mapping: "mapping"
            }
          }
        }
      ]
    };
  }
}

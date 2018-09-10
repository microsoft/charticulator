// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ConstraintSolver, Variable } from "../../solver";
import * as Specification from "../../specification";
import { DataMappingHints, ObjectClass, TemplateParameters } from "../common";

export abstract class ScaleClass extends ObjectClass {
  public readonly object: Specification.Scale;
  public readonly state: Specification.ScaleState;

  public abstract mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue;

  public buildConstraint(
    data: Specification.DataValue,
    target: Variable,
    solver: ConstraintSolver
  ): void {}

  public abstract inferParameters(
    column: Specification.DataValue[],
    hints?: DataMappingHints
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

import "./categorical";
import "./format";
import "./linear";

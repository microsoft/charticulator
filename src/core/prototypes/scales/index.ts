import { ConstraintSolver, Variable } from "../../solver";
import * as Specification from "../../specification";
import { DataMappingHints, ObjectClass } from "../common";

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
}

import "./categorical";
import "./format";
import "./linear";

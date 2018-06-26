import { getIndexById } from "../../common";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";

// Mark-level constraint
export abstract class ConstraintTypeClass {
  public abstract type: string;

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public abstract buildConstraints(
    constraint: Specification.Constraint,
    elements: Specification.Object[],
    states: Specification.ObjectState[],
    solver: ConstraintSolver
  ): void;

  // Register and get mark class
  private static _classes = new Map<string, ConstraintTypeClass>();

  public static register(entry: ConstraintTypeClass) {
    ConstraintTypeClass._classes.set(entry.type, entry);
  }
  public static getClass(type: string) {
    return ConstraintTypeClass._classes.get(type);
  }
}

export class SnapConstraintClass {
  public type: string = "snap";
  public buildConstraints(
    constraint: Specification.Constraint,
    elements: Specification.Object[],
    states: Specification.ObjectState[],
    solver: ConstraintSolver
  ): void {
    const element = constraint.attributes.element as string;
    const attribute = constraint.attributes.attribute as string;
    const targetElement = constraint.attributes.targetElement as string;
    const targetAttribute = constraint.attributes.targetAttribute as string;
    let gap = constraint.attributes.gap as number;
    if (gap == null) {
      gap = 0;
    }

    const idxElement = getIndexById(elements, element);
    const idxTargetElement = getIndexById(elements, targetElement);

    const attr = solver.attr(states[idxElement].attributes, attribute);
    const targetAttr = solver.attr(
      states[idxTargetElement].attributes,
      targetAttribute
    );
    solver.addLinear(ConstraintStrength.HARD, gap, [
      [1, attr],
      [-1, targetAttr]
    ]);
  }
}

ConstraintTypeClass.register(new SnapConstraintClass());

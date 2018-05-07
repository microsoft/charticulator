import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import { getIndexById } from "../../common";

// Mark-level constraint
export abstract class ConstraintTypeClass {
    public abstract type: string;

    // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
    public abstract buildConstraints(constraint: Specification.Constraint, elements: Specification.Object[], states: Specification.ObjectState[], solver: ConstraintSolver): void;

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
    public buildConstraints(constraint: Specification.Constraint, elements: Specification.Object[], states: Specification.ObjectState[], solver: ConstraintSolver): void {
        let element = constraint.attributes["element"] as string;
        let attribute = constraint.attributes["attribute"] as string;
        let targetElement = constraint.attributes["targetElement"] as string;
        let targetAttribute = constraint.attributes["targetAttribute"] as string;
        let gap = constraint.attributes["gap"] as number;
        if (gap == null) gap = 0;

        let idxElement = getIndexById(elements, element);
        let idxTargetElement = getIndexById(elements, targetElement);

        let attr = solver.attr(states[idxElement].attributes, attribute);
        let targetAttr = solver.attr(states[idxTargetElement].attributes, targetAttribute);
        solver.addLinear(ConstraintStrength.HARD, gap, [[1, attr], [-1, targetAttr]]);
    }
}

ConstraintTypeClass.register(new SnapConstraintClass());
import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength, Variable, ConstraintPlugins } from "../../solver";
import * as Graphics from "../../graphics";

import { SnappingGuides, AttributeDescription, DropZones, Handles, OrderDescription, BoundingBox } from "../common";
import { Point, uniqueID, getById } from "../../common";
import { ObjectClasses } from "../object";
import { ChartElementClass } from "../chart_element";
import { ObjectClassMetadata } from "../index";

export interface GuideAttributes extends Specification.AttributeMap {
    value: number;
}

export interface GuideState extends Specification.ObjectState {
    attributes: GuideAttributes;
}

export class GuideClass extends ChartElementClass {
    public static classID = "guide.guide";
    public static type = "guide";

    public static metadata: ObjectClassMetadata = {
        displayName: "Guide",
        iconPath: "guide/x"
    };

    public readonly state: GuideState;

    public static defaultAttributes: Specification.AttributeMap = {
        axis: "x"
    }

    public attributeNames: string[] = ["value"];
    public attributes: { [name: string]: AttributeDescription } = {
        value: { name: "value", type: "number", mode: "positional", strength: VariableStrength.NONE },
    }

    public initializeState() {
        this.state.attributes.value = 0;
    }

    private getAxis() {
        return this.object.properties.axis as "x" | "y";
    }

    /** Get handles given current state */
    public getHandles(): Handles.Description[] {
        let inf = [-1000, 1000];
        return [
            <Handles.Line>{
                type: "line", axis: this.getAxis(),
                actions: [{ type: "attribute", attribute: "value" }],
                value: this.state.attributes.value,
                span: inf
            }
        ];
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        return [
            <SnappingGuides.Axis>{ type: this.getAxis(), value: this.state.attributes.value, attribute: "value", visible: true }
        ];
    }

    // /** Get controls given current state */
    // public getControls(): Controls.Popup {
    //     return null;
    // }
}

ObjectClasses.Register(GuideClass);


export interface GuideCoordinatorAttributes extends Specification.AttributeMap {
    x1: number; y1: number;
    x2: number; y2: number;
}

export interface GuideCoordinatorState extends Specification.ObjectState {
    attributes: GuideCoordinatorAttributes;
}

export class GuideCoordinatorClass extends ChartElementClass {
    public static classID = "guide.guide-coordinator";
    public static type = "guide";

    public static metadata: ObjectClassMetadata = {
        displayName: "GuideCoordinator",
        iconPath: "guide/coordinator-x"
    };

    public readonly state: GuideCoordinatorState;

    public static defaultAttributes: Specification.AttributeMap = {
        axis: "x",
        count: 2
    }

    public buildConstraints(solver: ConstraintSolver) {
        let attrs = this.state.attributes;
        let t1: Variable, t2: Variable;
        if (this.getAxis() == "x") {
            t1 = solver.attr(attrs, "x1");
            t2 = solver.attr(attrs, "x2");
        } else {
            t1 = solver.attr(attrs, "y1");
            t2 = solver.attr(attrs, "y2");
        }
        let length = this.object.properties.count as number;
        this.getValueNames().map((name, index) => {
            let t = (1 + index) / (length + 1);
            solver.addLinear(ConstraintStrength.HARD, 0, [[1 - t, t1], [t, t2]], [[1, solver.attr(attrs, name)]]);
        });
    }

    public getValueNames(): string[] {
        let attrs = [];
        for (let i = 0; i < this.object.properties.count; i++) {
            let name = `value${i}`;
            attrs.push(name);
            if (this.state) {
                if (this.state.attributes[name] == null) {
                    this.state.attributes[name] = 0;
                }
            }
        }
        return attrs;
    }

    public get attributeNames(): string[] {
        return ["x1", "y1", "x2", "y2"].concat(this.getValueNames());
    }

    public get attributes(): { [name: string]: AttributeDescription } {
        let r: { [name: string]: AttributeDescription } = {
            x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
            y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
            x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
            y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE }
        };
        for (let i = 0; i < this.object.properties.count; i++) {
            let name = `value${i}`;
            r[name] = { name: name, type: "number", mode: "positional", strength: VariableStrength.NONE };
        }
        return r;
    }

    public initializeState() {
        let v = this.attributeNames;
        this.state.attributes.x1 = -100;
        this.state.attributes.y1 = -100;
        this.state.attributes.x2 = 100;
        this.state.attributes.y2 = 100;
        for (let name of this.getValueNames()) {
            if (this.state.attributes[name] == null) {
                this.state.attributes[name] = 0;
            }
        }
    }

    private getAxis() {
        return this.object.properties.axis as "x" | "y";
    }

    /** Get handles given current state */
    public getHandles(): Handles.Description[] {
        return [];
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        return this.getValueNames().map(name => {
            return <SnappingGuides.Axis>{
                type: this.getAxis(),
                value: this.state.attributes[name],
                attribute: name,
                visible: true
            };
        });
    }

    // /** Get controls given current state */
    // public getControls(): Controls.Popup {
    //     return null;
    // }
}

ObjectClasses.Register(GuideCoordinatorClass);
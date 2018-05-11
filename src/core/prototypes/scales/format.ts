import * as d3 from "d3";

import { Scale } from "../../common";
import { ConstraintSolver, ConstraintStrength, Variable, VariableStrength } from "../../solver";
import * as Specification from "../../specification";
import { AttributeDescription, Controls, DataMappingHints, ObjectClasses } from "../common";
import { ScaleClass } from "./index";



export class FormatScale extends ScaleClass {
    public static classID = "scale.format<number,string>";
    public static type = "scale";

    public readonly object: { properties: { format: string } } & Specification.Scale;
    public readonly state: Specification.ScaleState;

    public attributeNames: string[] = [];
    public attributes: { [name: string]: AttributeDescription } = {
    };

    public mapDataToAttribute(data: Specification.DataValue): Specification.AttributeValue {
        const number = data as number;
        try {
            const fmt = d3.format(this.object.properties.format);
            return fmt(number);
        } catch (e) {
            return number.toFixed(1);
        }
    }

    public buildConstraint(data: Specification.DataValue, target: Variable, solver: ConstraintSolver) {
    }

    public initializeState(): void {
    }

    public inferParameters(column: Specification.DataValue[], hints: DataMappingHints = {}): void {
        this.object.properties.format = ".1f";
    }

    public getAttributePanelWidgets(m: Controls.WidgetManager): Controls.Widget[] {
        let n = 1;
        const match = this.object.properties.format.match(/^\.(\d+)f$/);
        if (match) {
            n = parseInt(match[1]);
        }
        return [
            m.row("Format", m.horizontal([1, 0, 0],
                m.inputText({ property: "format" }),
                m.setButton({ property: "format" }, `.${Math.max(0, n + 1)}f`, "general/digits-more"),
                m.setButton({ property: "format" }, `.${Math.max(0, n - 1)}f`, "general/digits-less")
            ))
        ];
    }
}

ObjectClasses.Register(FormatScale);
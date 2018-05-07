import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength, Variable } from "../../solver";
import { ObjectClasses, AttributeDescription, Controls, DataMappingHints, TemplateParameters } from "../common";
import { Scale, Color, interpolateColor, interpolateColors } from "../../common";

import { ScaleClass } from "./index";

export interface LinearScaleProperties extends Specification.AttributeMap {
    domainMin: number;
    domainMax: number;
}

export interface LinearScaleAttributes extends Specification.AttributeMap {
    rangeMin: number;
    rangeMax: number;
}

export interface LinearScaleState extends Specification.ScaleState {
    attributes: LinearScaleAttributes;
}

export class LinearScale extends ScaleClass {
    public static classID = "scale.linear<number,number>";
    public static type = "scale";

    public static defaultMappingValues: Specification.AttributeMap = {
        rangeMin: 0
    };

    public readonly object: { properties: LinearScaleProperties } & Specification.Scale;
    public readonly state: LinearScaleState;

    public attributeNames: string[] = ["rangeMin", "rangeMax"];
    public attributes: { [name: string]: AttributeDescription } = {
        rangeMin: { name: "rangeMin", type: "number", category: "scale-range", displayName: "Start", defaultValue: 0 },
        rangeMax: { name: "rangeMax", type: "number", strength: VariableStrength.MEDIUM, category: "scale-range", displayName: "End" }
    }

    public mapDataToAttribute(data: Specification.DataValue): Specification.AttributeValue {
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let x1 = props.domainMin;
        let x2 = props.domainMax;
        let y1 = attrs.rangeMin;
        let y2 = attrs.rangeMax;
        return ((data as number) - x1) / (x2 - x1) * (y2 - y1) + y1;
    }

    public buildConstraint(data: Specification.DataValue, target: Variable, solver: ConstraintSolver) {
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let x1 = props.domainMin;
        let x2 = props.domainMax;
        let k = ((data as number) - x1) / (x2 - x1);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, target]], [[1 - k, solver.attr(attrs, "rangeMin")], [k, solver.attr(attrs, "rangeMax")]])
    }

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.rangeMin = 0;
        attrs.rangeMax = 100;
    }

    public inferParameters(column: Specification.DataValue[], hints: DataMappingHints = {}): void {
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let s = new Scale.NumericalScale();
        let values = column.filter(x => typeof (x) == "number") as number[];
        s.inferParameters(values);

        props.domainMin = s.domainMin;
        props.domainMax = s.domainMax;
        props.domainMin = 0;

        if (hints.rangeNumber) {
            attrs.rangeMin = hints.rangeNumber[0];
            attrs.rangeMax = hints.rangeNumber[1];
        } else {
            attrs.rangeMin = 0;
            attrs.rangeMax = 100;
        }
        this.object.mappings.rangeMin = <Specification.ValueMapping>{ type: "value", value: 0 };
        if (!hints.autoRange) {
            this.object.mappings.rangeMax = <Specification.ValueMapping>{ type: "value", value: attrs.rangeMax };
        }
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        return [
            manager.sectionHeader("Domain"),
            manager.row("Start",
                manager.inputNumber({ property: "domainMin" })
            ),
            manager.row("End",
                manager.inputNumber({ property: "domainMax" })
            ),
            manager.sectionHeader("Range"),
            manager.mappingEditor("Start", "rangeMin", "number", { defaultValue: 0 }),
            manager.mappingEditor("End", "rangeMax", "number", { defaultAuto: true })
        ];
    }

    public getTemplateParameters(): TemplateParameters {
        return {
            inferences: [
                {
                    type: "scale",
                    slotKind: "numerical",
                    rangeType: "number",
                    properties: {
                        min: "domainMin",
                        max: "domainMax"
                    }
                } as Specification.Template.Scale
            ]
        };
    }
}

export interface LinearColorScaleProperties extends LinearScaleProperties {
    range: Specification.Types.ColorGradient;
}

function getDefaultGradient(): Specification.Types.ColorGradient {
    return {
        colorspace: "lab",
        colors: [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }]
    };
}

export class LinearColorScale extends ScaleClass {
    public static classID = "scale.linear<number,color>";
    public static type = "scale";

    public static defaultMappingValues: Specification.AttributeMap = {
        range: getDefaultGradient()
    };

    public readonly object: { properties: LinearColorScaleProperties } & Specification.Scale;

    public attributeNames: string[] = [];
    public attributes: { [name: string]: AttributeDescription } = {
    }

    public mapDataToAttribute(data: Specification.DataValue): Specification.AttributeValue {
        let props = this.object.properties;
        let x1 = props.domainMin;
        let x2 = props.domainMax;
        let t = ((data as number) - x1) / (x2 - x1);
        let c = interpolateColors(props.range.colors, props.range.colorspace);
        return c(t);
    }

    public buildConstraint(data: Specification.DataValue, target: Variable, solver: ConstraintSolver) {
    }

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.range = getDefaultGradient();
    }

    public inferParameters(column: Specification.DataValue[], hints: DataMappingHints = {}): void {
        let props = this.object.properties;
        let s = new Scale.NumericalScale();
        let values = column.filter(x => typeof (x) == "number") as number[];
        s.inferParameters(values);

        props.domainMin = s.domainMin;
        props.domainMax = s.domainMax;
        props.range = getDefaultGradient();
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let range = this.object
        return [
            manager.sectionHeader("Domain"),
            manager.row("Start", manager.inputNumber({ property: "domainMin" })),
            manager.row("End", manager.inputNumber({ property: "domainMax" })),
            manager.sectionHeader("Gradient"),
            manager.inputColorGradient({ property: "range", noComputeLayout: true }, true)
        ];
    }
}

ObjectClasses.Register(LinearScale);
ObjectClasses.Register(LinearColorScale);
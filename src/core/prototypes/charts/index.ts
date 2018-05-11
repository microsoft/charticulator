import { indexOf, Point, uniqueID } from "../../common";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import * as Specification from "../../specification";
import { DataflowManager } from "../dataflow";

import * as Expression from "../../expression";
import * as Graphics from "../../graphics";

import { AttributeDescription, Controls, Handles, ObjectClass, ObjectClasses, ObjectClassMetadata, SnappingGuides, TemplateParameters } from "../common";

import { Color } from "../../common";
import * as Scales from "../scales";

export abstract class ChartClass extends ObjectClass {
    public readonly object: Specification.Chart;
    public readonly state: Specification.ChartState;
    public dataflow: DataflowManager;

    public static metadata: ObjectClassMetadata = {
        iconPath: "chart",
        displayName: "Chart"
    };

    public setDataflow(dataflow: DataflowManager) {
        this.dataflow = dataflow;
    }

    public getBackgroundGraphics(): Graphics.Element {
        return null;
    }

    public resolveMapping<ValueType>(mapping: Specification.Mapping, defaultValue: Specification.AttributeValue): (row: Expression.Context) => Specification.AttributeValue {
        if (mapping) {
            if (mapping.type == "value") {
                const value = (mapping as Specification.ValueMapping).value;
                return () => value;
            }
            if (mapping.type == "scale") {
                const scaleMapping = mapping as Specification.ScaleMapping;
                const idx = indexOf(this.object.scales, x => x._id == scaleMapping.scale);
                const scaleClass = ObjectClasses.Create(this.parent, this.object.scales[idx], this.state.scales[idx]) as Scales.ScaleClass;
                const expr = this.dataflow.cache.parse(scaleMapping.expression);
                return (row: Expression.Context) => scaleClass.mapDataToAttribute(expr.getValue(row) as any);
            }
        }
        return () => defaultValue;
    }

    // Initialize the state of a mark so that everything has a valid value
    public abstract initializeState(): void;

    // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
    public abstract buildIntrinsicConstraints(solver: ConstraintSolver): void;
    public abstract getSnappingGuides(): SnappingGuides.Description[];
    public abstract getHandles(): Handles.Description[];
}

interface RectangleChartAttributes extends Specification.AttributeMap {
    x1: number; y1: number;
    x2: number; y2: number;
    cx: number; cy: number;
    ox1: number; oy1: number;
    ox2: number; oy2: number;
    width: number; height: number;
    marginLeft: number;
    marginRight: number;
    marginTop: number;
    marginBottom: number;
    backgroundColor: Color;
}

interface RectangleChartState extends Specification.ChartState {
    attributes: RectangleChartAttributes;
}

class RectangleChart extends ChartClass {
    public static classID = "chart.rectangle";
    public static type = "chart";

    public static defaultMappingValues: Specification.AttributeMap = {
        width: 900,
        height: 600,
        marginLeft: 50,
        marginRight: 50,
        marginTop: 50,
        marginBottom: 50,
        cx: 0, cy: 0
    };

    public static defaultProperties: Specification.AttributeMap = {
        backgroundColor: null,
        backgroundOpacity: 1
    }

    public readonly object: Specification.Chart & { properties: { backgroundColor: Color, backgroundOpacity: number } };
    public readonly state: RectangleChartState;

    // Get a list of elemnt attributes
    public attributeNames: string[] = ["x1", "y1", "x2", "y2", "ox1", "oy1", "ox2", "oy2", "width", "height", "marginLeft", "marginRight", "marginTop", "marginBottom"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        ox1: { name: "ox1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        oy1: { name: "oy1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        ox2: { name: "ox2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        oy2: { name: "oy2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        width: { name: "width", type: "number", mode: "intrinsic", category: "dimensions", displayName: "Width", strength: VariableStrength.NONE, defaultValue: 900 },
        height: { name: "height", type: "number", mode: "intrinsic", category: "dimensions", displayName: "Height", strength: VariableStrength.NONE, defaultValue: 600 },
        marginLeft: { name: "marginLeft", type: "number", mode: "intrinsic", category: "margins", displayName: "Left", strength: VariableStrength.NONE, defaultValue: 50 },
        marginRight: { name: "marginRight", type: "number", mode: "intrinsic", category: "margins", displayName: "Right", strength: VariableStrength.NONE, defaultValue: 50 },
        marginTop: { name: "marginTop", type: "number", mode: "intrinsic", category: "margins", displayName: "Top", strength: VariableStrength.NONE, defaultValue: 50 },
        marginBottom: { name: "marginBottom", type: "number", mode: "intrinsic", category: "margins", displayName: "Bottom", strength: VariableStrength.NONE, defaultValue: 50 },
    };

    // Initialize the state of a mark so that everything has a valid value
    public initializeState(): void {
        const attrs = this.state.attributes;
        attrs.width = 900;
        attrs.height = 600;
        attrs.marginLeft = 50;
        attrs.marginRight = 50;
        attrs.marginTop = 50;
        attrs.marginBottom = 50;
        attrs.cx = 0;
        attrs.cy = 0;
        attrs.x1 = -attrs.width / 2 + attrs.marginLeft;
        attrs.y1 = -attrs.height / 2 + attrs.marginBottom;
        attrs.x2 = +attrs.width / 2 - attrs.marginRight;
        attrs.y2 = +attrs.height / 2 - attrs.marginTop;
        attrs.ox1 = -attrs.width / 2;
        attrs.oy1 = -attrs.height / 2;
        attrs.ox2 = +attrs.width / 2;
        attrs.oy2 = +attrs.height / 2;
    }

    public getBackgroundGraphics() {
        const attrs = this.state.attributes;
        if (this.object.properties.backgroundColor != null) {
            return Graphics.makeRect(-attrs.width / 2, -attrs.height / 2, attrs.width / 2, attrs.height / 2, {
                fillColor: this.object.properties.backgroundColor,
                fillOpacity: this.object.properties.backgroundOpacity
            })
        }
    }

    // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
    public buildIntrinsicConstraints(solver: ConstraintSolver): void {
        const attrs = this.state.attributes;
        const [x1, y1, x2, y2, ox1, oy1, ox2, oy2, cx, cy, width, height, marginLeft, marginRight, marginTop, marginBottom] = solver.attrs(attrs, [
            "x1", "y1", "x2", "y2", "ox1", "oy1", "ox2", "oy2", "cx", "cy", "width", "height",
            "marginLeft", "marginRight", "marginTop", "marginBottom"
        ]);
        solver.makeConstant(attrs, "width");
        solver.makeConstant(attrs, "height");
        solver.makeConstant(attrs, "marginLeft");
        solver.makeConstant(attrs, "marginRight");
        solver.makeConstant(attrs, "marginTop");
        solver.makeConstant(attrs, "marginBottom");

        solver.addLinear(ConstraintStrength.HARD, 0, [[1, ox1]], [[-0.5, width]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, ox2]], [[+0.5, width]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, oy1]], [[-0.5, height]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, oy2]], [[+0.5, height]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, x1]], [[-0.5, width], [+1, marginLeft]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, x2]], [[+0.5, width], [-1, marginRight]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, y1]], [[-0.5, height], [+1, marginBottom]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, y2]], [[+0.5, height], [-1, marginTop]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        const attrs = this.state.attributes;
        return [
            { type: "x", value: attrs.x1, attribute: "x1", visible: true } as SnappingGuides.Axis,
            { type: "x", value: attrs.x2, attribute: "x2", visible: true } as SnappingGuides.Axis,
            { type: "y", value: attrs.y1, attribute: "y1", visible: true } as SnappingGuides.Axis,
            { type: "y", value: attrs.y2, attribute: "y2", visible: true } as SnappingGuides.Axis,
            // <SnappingGuides.Axis>{ type: "x", value: attrs.ox1, attribute: "ox1", visible: true },
            // <SnappingGuides.Axis>{ type: "x", value: attrs.ox2, attribute: "ox2", visible: true },
            // <SnappingGuides.Axis>{ type: "y", value: attrs.oy1, attribute: "oy1", visible: true },
            // <SnappingGuides.Axis>{ type: "y", value: attrs.oy2, attribute: "oy2", visible: true },
            { type: "x", value: attrs.cx, attribute: "cx", visible: true } as SnappingGuides.Axis,
            { type: "y", value: attrs.cy, attribute: "cy", visible: true } as SnappingGuides.Axis
        ];
    }

    public getHandles(): Handles.Description[] {
        const attrs = this.state.attributes
        const { x1, y1, x2, y2 } = attrs;
        const inf = [-10000, 10000];
        return [
            {
                type: "relative-line", axis: "x",
                actions: [{ type: "attribute-value-mapping", attribute: "marginLeft" }],
                reference: x1 - attrs.marginLeft, sign: 1,
                value: attrs.marginLeft, span: inf
            } as Handles.RelativeLine,
            {
                type: "relative-line", axis: "x",
                actions: [{ type: "attribute-value-mapping", attribute: "marginRight" }],
                reference: x2 + attrs.marginRight, sign: -1,
                value: attrs.marginRight, span: inf
            } as Handles.RelativeLine,
            {
                type: "relative-line", axis: "y",
                actions: [{ type: "attribute-value-mapping", attribute: "marginTop" }],
                reference: y2 + attrs.marginTop, sign: -1,
                value: attrs.marginTop, span: inf
            } as Handles.RelativeLine,
            {
                type: "relative-line", axis: "y",
                actions: [{ type: "attribute-value-mapping", attribute: "marginBottom" }],
                reference: y1 - attrs.marginBottom, sign: 1,
                value: attrs.marginBottom, span: inf
            } as Handles.RelativeLine,
            // <Handles.RelativeLine>{
            //     type: "relative-line", axis: "x",
            //     value: attrs.width, sign: 1,
            //     reference: attrs.ox1,
            //     span: [attrs.oy1, attrs.oy2],
            //     actions: [
            //         { type: "attribute-value-mapping", attribute: "width", minimum: 50 }
            //     ]
            // },
            // <Handles.RelativeLine>{
            //     type: "relative-line", axis: "x",
            //     value: attrs.width, sign: -1,
            //     reference: attrs.ox2,
            //     span: [attrs.oy1, attrs.oy2],
            //     actions: [
            //         { type: "attribute-value-mapping", attribute: "width", minimum: 50 }
            //     ]
            // },
            // <Handles.RelativeLine>{
            //     type: "relative-line", axis: "y",
            //     value: attrs.height, sign: 1,
            //     reference: attrs.oy1,
            //     span: [attrs.ox1, attrs.ox2],

            //     actions: [
            //         { type: "attribute-value-mapping", attribute: "height", minimum: 50 }
            //     ]
            // },
            // <Handles.RelativeLine>{
            //     type: "relative-line", axis: "y",
            //     value: attrs.height, sign: -1,
            //     reference: attrs.oy2,
            //     span: [attrs.ox1, attrs.ox2],
            //     actions: [
            //         { type: "attribute-value-mapping", attribute: "height", minimum: 50 }
            //     ]
            // }
        ]
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        const result = [
            manager.sectionHeader("Dimensions"),
            manager.mappingEditorTOFIX("width"),
            manager.mappingEditorTOFIX("height"),
            manager.sectionHeader("Margins"),
            manager.mappingEditorTOFIX("marginLeft"),
            manager.mappingEditorTOFIX("marginRight"),
            manager.mappingEditorTOFIX("marginTop"),
            manager.mappingEditorTOFIX("marginBottom"),
            manager.sectionHeader("Background"),
            manager.row("Color", manager.inputColor({ property: "backgroundColor" }, { allowNull: true }))
        ];
        if (this.object.properties.backgroundColor != null) {
            result.push(
                manager.row("Opacity", manager.inputNumber({ property: "backgroundOpacity" }, { showSlider: true, sliderRange: [0, 1] }))
            )
        }
        return result;
    }

    public getTemplateParameters(): TemplateParameters {
        if (this.object.mappings.text && this.object.mappings.text.type == "scale") {
            return null;
        } else {
            return {
                properties: [
                    {
                        mode: "attribute",
                        attribute: "marginLeft",
                        displayName: "Margin Left",
                        type: "string",
                        default: this.state.attributes.marginLeft
                    } as Specification.Template.Property,
                    {
                        mode: "attribute",
                        attribute: "marginRight",
                        displayName: "Margin Right",
                        type: "string",
                        default: this.state.attributes.marginRight
                    } as Specification.Template.Property,
                    {
                        mode: "attribute",
                        attribute: "marginTop",
                        displayName: "Margin Top",
                        type: "string",
                        default: this.state.attributes.marginTop
                    } as Specification.Template.Property,
                    {
                        mode: "attribute",
                        attribute: "marginBottom",
                        displayName: "Margin Bottom",
                        type: "string",
                        default: this.state.attributes.marginBottom
                    } as Specification.Template.Property
                ]
            };
        }
    }
}

ObjectClasses.Register(RectangleChart);
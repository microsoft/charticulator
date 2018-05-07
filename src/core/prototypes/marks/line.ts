import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import { Point, Color, uniqueID } from "../../common";

import { ObjectClasses, SnappingGuides, AttributeDescription, DropZones, Handles, BoundingBox, ObjectClassMetadata, CreatingInteraction, Controls } from "../common";
import { MarkClass, CreationParameters } from "./index";

import * as Graphics from "../../graphics";

export interface LineElementAttributes extends Specification.AttributeMap {
    x1: number; y1: number;
    x2: number; y2: number;
    cx: number; cy: number;
    stroke: Color;
    strokeWidth: number;
    opacity: number;
    visible: boolean;
}

export interface LineElementState extends Specification.ObjectState {
    attributes: LineElementAttributes;
}

export class LineElement extends MarkClass {
    public static classID = "mark.line";
    public static type = "mark";

    public static metadata: ObjectClassMetadata = {
        displayName: "Line",
        iconPath: "mark/line",
        creatingInteraction: {
            type: "line-segment",
            mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" }
        }
    };

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    public static defaultMappingValues: Specification.AttributeMap = {
        stroke: { r: 0, g: 0, b: 0 },
        strokeWidth: 1,
        opacity: 1,
        visible: true
    };

    public readonly state: LineElementState;

    // Get a list of elemnt attributes
    public attributeNames: string[] = ["x1", "y1", "x2", "y2", "cx", "cy", "dx", "dy", "stroke", "strokeWidth", "opacity", "visible"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        cx: { name: "cx", type: "number", mode: "positional", strength: VariableStrength.NONE },
        cy: { name: "cy", type: "number", mode: "positional", strength: VariableStrength.NONE },
        dx: { name: "dx", type: "number", category: "dimensions", displayName: "dX", strength: VariableStrength.NONE, defaultRange: [30, 100] },
        dy: { name: "dy", type: "number", category: "dimensions", displayName: "dY", strength: VariableStrength.NONE, defaultRange: [30, 100] },
        stroke: { name: "stroke", type: "color", category: "style", displayName: "Stroke", solverExclude: true, defaultValue: null },
        strokeWidth: { name: "strokeWidth", type: "number", category: "style", displayName: "Width", solverExclude: true, defaultValue: 1, defaultRange: [0, 5] },
        opacity: { name: "opacity", type: "number", category: "style", displayName: "Opacity", solverExclude: true, defaultValue: 1, defaultRange: [0, 1] },
        visible: { name: "visible", type: "boolean", category: "style", displayName: "Visible", solverExclude: true, defaultValue: true }
    }

    // Initialize the state of an element so that everything has a valid value
    public initializeState(): void {
        let defaultWidth = 30;
        let defaultHeight = 50;
        let attrs = this.state.attributes;
        attrs.x1 = -defaultWidth / 2;
        attrs.y1 = -defaultHeight / 2;
        attrs.x2 = +defaultWidth / 2;
        attrs.y2 = +defaultHeight / 2;
        attrs.cx = 0;
        attrs.cy = 0;
        attrs.dx = 0;
        attrs.dy = 0;
        attrs.stroke = { r: 0, g: 0, b: 0 };
        attrs.strokeWidth = 1;
        attrs.opacity = 1;
        attrs.visible = true;
    }

    // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
    public buildConstraints(solver: ConstraintSolver): void {
        let [x1, y1, x2, y2, cx, cy, dx, dy] = solver.attrs(this.state.attributes, ["x1", "y1", "x2", "y2", "cx", "cy", "dx", "dy"]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, dx]], [[1, x2], [-1, x1]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, dy]], [[1, y2], [-1, y1]]);
    }

    // Get the graphical element from the element
    public getGraphics(cs: Graphics.CoordinateSystem, offset: Point): Graphics.Element {
        let attrs = this.state.attributes;
        if (!attrs.visible || !this.object.properties.visible) return null;
        let helper = new Graphics.CoordinateSystemHelper(cs);
        return helper.line(attrs.x1 + offset.x, attrs.y1 + offset.y, attrs.x2 + offset.x, attrs.y2 + offset.y, {
            strokeColor: attrs.stroke,
            strokeOpacity: attrs.opacity,
            strokeWidth: attrs.strokeWidth
        });
    }

    // Get DropZones given current state
    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes as LineElementAttributes;
        let { x1, y1, x2, y2 } = attrs;
        let cx = x1;
        let cy = y1;
        return [
            <DropZones.Line>{
                type: "line",
                p1: { x: x2, y: cy },
                p2: { x: x1, y: cy },
                title: "dx",
                accept: { kind: "numerical" },
                dropAction: { scaleInference: { attribute: "dx", attributeType: "number", hints: { autoRange: true } } }
            },
            <DropZones.Line>{
                type: "line",
                p1: { x: cx, y: y1 },
                p2: { x: cx, y: y2 },
                title: "dy",
                accept: { kind: "numerical" },
                dropAction: { scaleInference: { attribute: "dy", attributeType: "number", hints: { autoRange: true } } }
            }
        ];
    }
    // Get bounding rectangle given current state
    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes as LineElementAttributes;
        let { x1, y1, x2, y2, cx, cy } = attrs;
        return [
            {
                type: "point",
                x: x1, y: y1,
                actions: [
                    { type: "attribute", source: "x", attribute: "x1" },
                    { type: "attribute", source: "y", attribute: "y1" }
                ]
            } as Handles.Point,
            {
                type: "point",
                x: x2, y: y2,
                actions: [
                    { type: "attribute", source: "x", attribute: "x2" },
                    { type: "attribute", source: "y", attribute: "y2" }
                ]
            } as Handles.Point,
            {
                type: "point",
                x: cx, y: cy,
                actions: [
                    { type: "attribute", source: "x", attribute: "cx" },
                    { type: "attribute", source: "y", attribute: "cy" }
                ]
            } as Handles.Point
        ]
    }


    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes as LineElementAttributes;
        let { x1, y1, x2, y2 } = attrs;
        return <BoundingBox.Line>{
            type: "line",
            morphing: true,
            x1: x1, y1: y1,
            x2: x2, y2: y2
        };
    }


    public getSnappingGuides(): SnappingGuides.Description[] {
        let attrs = this.state.attributes as LineElementAttributes;
        let { x1, y1, x2, y2, cx, cy } = attrs;
        return [
            { type: "x", value: x1, attribute: "x1" } as SnappingGuides.Axis,
            { type: "x", value: x2, attribute: "x2" } as SnappingGuides.Axis,
            { type: "x", value: cx, attribute: "cx" } as SnappingGuides.Axis,
            { type: "y", value: y1, attribute: "y1" } as SnappingGuides.Axis,
            { type: "y", value: y2, attribute: "y2" } as SnappingGuides.Axis,
            { type: "y", value: cy, attribute: "cy" } as SnappingGuides.Axis
        ];
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        return [
            manager.sectionHeader("Line"),
            manager.mappingEditor("X Span", "dx", "number", { hints: { autoRange: true }, acceptKinds: ["numerical"], defaultAuto: true }),
            manager.mappingEditor("Y Span", "dy", "number", { hints: { autoRange: true }, acceptKinds: ["numerical"], defaultAuto: true }),
            manager.sectionHeader("Style"),
            manager.mappingEditor("Stroke", "stroke", "color", {}),
            manager.mappingEditor("Line Width", "strokeWidth", "number", { hints: { rangeNumber: [0, 5] }, defaultValue: 1, numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 } }),
            manager.mappingEditor("Opacity", "opacity", "number", { hints: { rangeNumber: [0, 1] }, defaultValue: 1, numberOptions: { showSlider: true, minimum: 0, maximum: 1 } }),
            manager.mappingEditor("Visibility", "visible", "boolean", { defaultValue: true })
        ];
    }
}

ObjectClasses.Register(LineElement);
import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import { Point, uniqueID, Color } from "../../common";

import { ObjectClasses, SnappingGuides, AttributeDescription, DropZones, Handles, BoundingBox, ObjectClassMetadata, CreatingInteraction, LinkAnchor, Controls } from "../common";
import { MarkClass, CreationParameters } from "./index";

import * as Graphics from "../../graphics";

export interface RectElementAttributes extends Specification.AttributeMap {
    x1: number; y1: number;
    x2: number; y2: number;
    cx: number; cy: number;
    width: number;
    height: number;
    stroke: Color;
    fill: Color;
    strokeWidth: number;
    opacity: number;
    visible: boolean;
}

export interface RectElementState extends Specification.MarkState {
    attributes: RectElementAttributes;
}

export class RectElement extends MarkClass {
    public static classID = "mark.rect";
    public static type = "mark";

    public static metadata: ObjectClassMetadata = {
        displayName: "Rectangle",
        iconPath: "mark/rect",
        creatingInteraction: {
            type: "rectangle",
            mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" }
        }
    };

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    public static defaultMappingValues: Specification.AttributeMap = {
        fill: { r: 217, g: 217, b: 217 },
        strokeWidth: 1,
        opacity: 1,
        visible: true
    }

    public readonly state: RectElementState;

    // Get a list of elemnt attributes
    public attributeNames: string[] = ["x1", "y1", "x2", "y2", "cx", "cy", "width", "height", "fill", "stroke", "strokeWidth", "opacity", "visible"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
        cx: { name: "cx", type: "number", mode: "positional", strength: VariableStrength.NONE },
        cy: { name: "cy", type: "number", mode: "positional", strength: VariableStrength.NONE },
        width: { name: "width", type: "number", mode: "intrinsic", category: "dimensions", displayName: "Width", defaultRange: [0, 200], strength: VariableStrength.NONE },
        height: { name: "height", type: "number", mode: "intrinsic", category: "dimensions", displayName: "Height", defaultRange: [0, 200], strength: VariableStrength.NONE },
        fill: { name: "fill", type: "color", category: "style", displayName: "Fill", solverExclude: true, defaultValue: null },
        stroke: { name: "stroke", type: "color", category: "style", displayName: "Stroke", solverExclude: true, defaultValue: null },
        strokeWidth: { name: "strokeWidth", type: "number", category: "style", displayName: "Line Width", solverExclude: true, defaultValue: 1, defaultRange: [0, 5] },
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
        attrs.width = defaultWidth;
        attrs.height = defaultHeight;
        attrs.stroke = null;
        attrs.fill = { r: 200, g: 200, b: 200 };
        attrs.strokeWidth = 1;
        attrs.opacity = 1;
        attrs.visible = true;
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let widgets: Controls.Widget[] = [
            manager.sectionHeader("Rectangle"),
            manager.mappingEditor("Width", "width", "number", { hints: { autoRange: true }, acceptKinds: ["numerical"], defaultAuto: true }),
            manager.mappingEditor("Height", "height", "number", { hints: { autoRange: true }, acceptKinds: ["numerical"], defaultAuto: true }),
            manager.sectionHeader("Style"),
            manager.mappingEditor("Fill", "fill", "color", {}),
            manager.mappingEditor("Stroke", "stroke", "color", {})
        ];
        if (this.object.mappings.stroke != null) {
            widgets.push(
                manager.mappingEditor("Line Width", "strokeWidth", "number", { hints: { rangeNumber: [0, 5] }, defaultValue: 1, numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 } })
            );
        }
        widgets = widgets.concat([
            manager.mappingEditor("Opacity", "opacity", "number", { hints: { rangeNumber: [0, 1] }, defaultValue: 1, numberOptions: { showSlider: true, minimum: 0, maximum: 1 } }),
            manager.mappingEditor("Visibility", "visible", "boolean", { defaultValue: true })
        ]);
        return widgets;
    }

    // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
    public buildConstraints(solver: ConstraintSolver): void {
        let [x1, y1, x2, y2, cx, cy, width, height] = solver.attrs(this.state.attributes, ["x1", "y1", "x2", "y2", "cx", "cy", "width", "height"]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, x2], [-1, x1]], [[1, width]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, y2], [-1, y1]], [[1, height]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
    }

    // Get the graphical element from the element
    public getGraphics(cs: Graphics.CoordinateSystem, offset: Point): Graphics.Element {
        let attrs = this.state.attributes;
        if (!attrs.visible || !this.object.properties.visible) return null;
        let helper = new Graphics.CoordinateSystemHelper(cs);
        return helper.rect(attrs.x1 + offset.x, attrs.y1 + offset.y, attrs.x2 + offset.x, attrs.y2 + offset.y, {
            strokeColor: attrs.stroke,
            strokeWidth: attrs.strokeWidth,
            strokeLinejoin: "miter",
            fillColor: attrs.fill,
            opacity: attrs.opacity
        });
    }

    /** Get link anchors for this mark */
    public getLinkAnchors(): LinkAnchor.Description[] {
        let attrs = this.state.attributes;
        let element = this.object._id;
        return [
            {
                element,
                points: [
                    { x: attrs.x1, y: attrs.y1, xAttribute: "x1", yAttribute: "y1", direction: { x: -1, y: 0 } },
                    { x: attrs.x1, y: attrs.y2, xAttribute: "x1", yAttribute: "y2", direction: { x: -1, y: 0 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.x2, y: attrs.y1, xAttribute: "x2", yAttribute: "y1", direction: { x: 1, y: 0 } },
                    { x: attrs.x2, y: attrs.y2, xAttribute: "x2", yAttribute: "y2", direction: { x: 1, y: 0 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.x1, y: attrs.y1, xAttribute: "x1", yAttribute: "y1", direction: { x: 0, y: -1 } },
                    { x: attrs.x2, y: attrs.y1, xAttribute: "x2", yAttribute: "y1", direction: { x: 0, y: -1 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.x1, y: attrs.y2, xAttribute: "x1", yAttribute: "y2", direction: { x: 0, y: 1 } },
                    { x: attrs.x2, y: attrs.y2, xAttribute: "x2", yAttribute: "y2", direction: { x: 0, y: 1 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.cx, y: attrs.y1, xAttribute: "cx", yAttribute: "y1", direction: { x: 0, y: -1 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.cx, y: attrs.y2, xAttribute: "cx", yAttribute: "y2", direction: { x: 0, y: 1 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.x1, y: attrs.cy, xAttribute: "x1", yAttribute: "cy", direction: { x: -1, y: 0 } }
                ]
            },
            {
                element,
                points: [
                    { x: attrs.x2, y: attrs.cy, xAttribute: "x2", yAttribute: "cy", direction: { x: 1, y: 0 } }
                ]
            }
        ];
    }


    // Get DropZones given current state
    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        return [
            <DropZones.Line>{
                type: "line",
                p1: { x: x2, y: y1 },
                p2: { x: x1, y: y1 },
                title: "width",
                accept: { kind: "numerical" },
                dropAction: { scaleInference: { attribute: "width", attributeType: "number", hints: { autoRange: true } } },
            },
            <DropZones.Line>{
                type: "line",
                p1: { x: x1, y: y1 },
                p2: { x: x1, y: y2 },
                title: "height",
                accept: { kind: "numerical" },
                dropAction: { scaleInference: { attribute: "height", attributeType: "number", hints: { autoRange: true } } },
            }
        ];
    }
    // Get bounding rectangle given current state
    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2, cx, cy } = attrs;
        return [
            <Handles.Line>{
                type: "line", axis: "x",
                actions: [{ type: "attribute", attribute: "x1" }],
                value: x1, span: [y1, y2]
            },
            <Handles.Line>{
                type: "line", axis: "x",
                actions: [{ type: "attribute", attribute: "x2" }],
                value: x2, span: [y1, y2]
            },
            <Handles.Line>{
                type: "line", axis: "y",
                actions: [{ type: "attribute", attribute: "y1" }],
                value: y1, span: [x1, x2]
            },
            <Handles.Line>{
                type: "line", axis: "y",
                actions: [{ type: "attribute", attribute: "y2" }],
                value: y2, span: [x1, x2]
            },
            <Handles.Point>{
                type: "point",
                x: x1, y: y1,
                actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y1" }]
            },
            <Handles.Point>{
                type: "point",
                x: x1, y: y2,
                actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y2" }]
            },
            <Handles.Point>{
                type: "point",
                x: x2, y: y1,
                actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y1" }]
            },
            <Handles.Point>{
                type: "point",
                x: x2, y: y2,
                actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y2" }]
            }
        ]
    }

    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        return <BoundingBox.Rectangle>{
            type: "rectangle",
            cx: (x1 + x2) / 2,
            cy: (y1 + y2) / 2,
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
            rotation: 0
        };
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2, cx, cy } = attrs;
        return [
            <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
            <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
            <SnappingGuides.Axis>{ type: "x", value: cx, attribute: "cx" },
            <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
            <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" },
            <SnappingGuides.Axis>{ type: "y", value: cy, attribute: "cy" },
        ];
    }
}

ObjectClasses.Register(RectElement);
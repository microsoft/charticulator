import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import { Point, uniqueID, Color } from "../../common";

import { ObjectClasses, SnappingGuides, AttributeDescription, DropZones, Handles, BoundingBox, ObjectClassMetadata, CreatingInteraction, LinkAnchor, Controls } from "../common";
import { MarkClass, CreationParameters } from "./index";

import * as Graphics from "../../graphics";

const symbolTypes: string[] = [
    "circle",
    "cross",
    "diamond",
    "square",
    "star",
    "triangle",
    "wye"
];

export interface SymbolElementAttributes extends Specification.AttributeMap {
    x: number;
    y: number;
    size: number;
    fill: Color;
    stroke: Color;
    strokeWidth: number;
    opacity: number;
    visible: boolean;
    symbol: string;
}

export interface SymbolElementState extends Specification.MarkState {
    attributes: SymbolElementAttributes;
}

export class SymbolElement extends MarkClass {
    public static classID = "mark.symbol";
    public static type = "mark";

    public static metadata: ObjectClassMetadata = {
        displayName: "Symbol",
        iconPath: "mark/symbol",
        creatingInteraction: {
            type: "point",
            mapping: { x: "x", y: "y" }
        }
    };

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    public static defaultMappingValues: Specification.AttributeMap = {
        fill: { r: 217, g: 217, b: 217 },
        strokeWidth: 1,
        opacity: 1,
        size: 60,
        visible: true
    }

    public readonly state: SymbolElementState;

    public attributeNames: string[] = ["x", "y", "size", "fill", "stroke", "strokeWidth", "opacity", "visible", "symbol"];
    public attributes: { [name: string]: AttributeDescription } = {
        x: { name: "x", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y: { name: "y", type: "number", mode: "positional", strength: VariableStrength.NONE },
        size: { name: "size", type: "number", mode: "intrinsic", solverExclude: true, category: "dimensions", displayName: "Size", defaultRange: [0, 200 * Math.PI], defaultValue: 60, strength: VariableStrength.NONE },
        fill: { name: "fill", type: "color", category: "style", displayName: "Fill", solverExclude: true, defaultValue: null },
        stroke: { name: "stroke", type: "color", category: "style", displayName: "Stroke", solverExclude: true, defaultValue: null },
        strokeWidth: { name: "strokeWidth", type: "number", category: "style", displayName: "Line Width", solverExclude: true, defaultValue: 1, defaultRange: [0, 5] },
        opacity: { name: "opacity", type: "number", category: "style", displayName: "Opacity", solverExclude: true, defaultValue: 1, defaultRange: [0, 1] },
        visible: { name: "visible", type: "boolean", category: "style", displayName: "Visible", solverExclude: true, defaultValue: true },
        symbol: { name: "symbol", type: "string", solverExclude: true, defaultValue: "circle" }
    };

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.x = 0;
        attrs.y = 0;
        attrs.size = 60;
        attrs.fill = { r: 128, g: 128, b: 128 };
        attrs.strokeWidth = 1;
        attrs.opacity = 1;
        attrs.visible = true;
        attrs.symbol = "circle";
    }

    /** Get link anchors for this mark */
    public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] {
        let attrs = this.state.attributes;
        return [
            {
                element: this.object._id,
                points: [
                    { x: attrs.x, y: attrs.y, xAttribute: "x", yAttribute: "y", direction: { x: mode == "begin" ? 1 : -1, y: 0 } }
                ]
            }
        ];
    }

    // Get the graphical element from the element
    public getGraphics(cs: Graphics.CoordinateSystem, offset: Point): Graphics.Element {
        let attrs = this.state.attributes;
        if (!attrs.visible || !this.object.properties.visible) return null;
        if (attrs.size <= 0) return null;
        let pc = cs.transformPoint(attrs.x + offset.x, attrs.y + offset.y);
        let style = {
            strokeColor: attrs.stroke,
            strokeWidth: attrs.strokeWidth,
            fillColor: attrs.fill,
            opacity: attrs.opacity
        };

        switch (attrs.symbol) {
            case "square": {
                let w = Math.sqrt(attrs.size);
                return <Graphics.Rect>{
                    type: "rect", style: style,
                    x1: pc.x - w / 2, y1: pc.y - w / 2,
                    x2: pc.x + w / 2, y2: pc.y + w / 2,
                }
            }
            case "cross": {
                let r = Math.sqrt(attrs.size / 5) / 2;
                let path = Graphics.makePath(style);
                path.moveTo(pc.x - 3 * r, pc.y - r);
                path.lineTo(pc.x - r, pc.y - r);
                path.lineTo(pc.x - r, pc.y - 3 * r);
                path.lineTo(pc.x + r, pc.y - 3 * r);
                path.lineTo(pc.x + r, pc.y - r);
                path.lineTo(pc.x + 3 * r, pc.y - r);
                path.lineTo(pc.x + 3 * r, pc.y + r);
                path.lineTo(pc.x + r, pc.y + r);
                path.lineTo(pc.x + r, pc.y + 3 * r);
                path.lineTo(pc.x - r, pc.y + 3 * r);
                path.lineTo(pc.x - r, pc.y + r);
                path.lineTo(pc.x - 3 * r, pc.y + r);
                path.closePath();
                return path.path;
            }
            case "diamond": {
                const tan30 = 0.5773502691896257; // Math.sqrt(1 / 3);
                const tan30_2 = 1.1547005383792515; // tan30 * 2;
                let y = Math.sqrt(attrs.size / tan30_2),
                    x = y * tan30;
                let path = Graphics.makePath(style);
                path.moveTo(pc.x, pc.y - y);
                path.lineTo(pc.x + x, pc.y);
                path.lineTo(pc.x, pc.y + y);
                path.lineTo(pc.x - x, pc.y);
                path.closePath();
                return path.path;
            }
            case "star": {
                const ka = 0.89081309152928522810;
                const kr = 0.3819660112501051; // Math.sin(Math.PI / 10) / Math.sin(7 * Math.PI / 10),
                const kx = 0.22451398828979266; // Math.sin(2 * Math.PI / 10) * kr;
                const ky = -0.3090169943749474; // -Math.cos(2 * Math.PI / 10) * kr;
                let r = Math.sqrt(attrs.size * ka), x = kx * r, y = ky * r;
                let path = Graphics.makePath(style);
                path.moveTo(pc.x, pc.y - r);
                path.lineTo(pc.x + x, pc.y + y);
                for (var i = 1; i < 5; ++i) {
                    var a = Math.PI * 2 * i / 5,
                        c = Math.cos(a),
                        s = Math.sin(a);
                    path.lineTo(pc.x + s * r, pc.y - c * r);
                    path.lineTo(pc.x + c * x - s * y, pc.y + s * x + c * y);
                }
                path.closePath();
                return path.path;
            }
            case "triangle": {
                const sqrt3 = Math.sqrt(3);
                let y = -Math.sqrt(attrs.size / (sqrt3 * 3));
                let path = Graphics.makePath(style);
                path.moveTo(pc.x, pc.y + y * 2);
                path.lineTo(pc.x - sqrt3 * y, pc.y - y);
                path.lineTo(pc.x + sqrt3 * y, pc.y - y);
                path.closePath();
                return path.path;
            }
            case "wye": {
                const c = -0.5,
                    s = Math.sqrt(3) / 2,
                    k = 1 / Math.sqrt(12),
                    a = (k / 2 + 1) * 3;
                let r = Math.sqrt(attrs.size / a),
                    x0 = r / 2,
                    y0 = r * k,
                    x1 = x0,
                    y1 = r * k + r,
                    x2 = -x1,
                    y2 = y1;
                let path = Graphics.makePath(style);
                path.moveTo(pc.x + x0, pc.y + y0);
                path.lineTo(pc.x + x1, pc.y + y1);
                path.lineTo(pc.x + x2, pc.y + y2);
                path.lineTo(pc.x + c * x0 - s * y0, pc.y + s * x0 + c * y0);
                path.lineTo(pc.x + c * x1 - s * y1, pc.y + s * x1 + c * y1);
                path.lineTo(pc.x + c * x2 - s * y2, pc.y + s * x2 + c * y2);
                path.lineTo(pc.x + c * x0 + s * y0, pc.y + c * y0 - s * x0);
                path.lineTo(pc.x + c * x1 + s * y1, pc.y + c * y1 - s * x1);
                path.lineTo(pc.x + c * x2 + s * y2, pc.y + c * y2 - s * x2);
                path.closePath();
                return path.path;
            }
            default: {
                return <Graphics.Circle>{
                    type: "circle", style: style,
                    cx: pc.x,
                    cy: pc.y,
                    r: Math.sqrt(attrs.size / Math.PI),
                }
            }
        }
    }

    // Get DropZones given current state
    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes;
        let { x, y, size } = attrs;
        let r = Math.sqrt(size);
        return [
            <DropZones.Line>{
                type: "line",
                p1: { x: x + r, y: y },
                p2: { x: x - r, y: y },
                title: "size",
                dropAction: { scaleInference: { attribute: "size", attributeType: "number" } },
            }
        ]
    }

    // Get bounding rectangle given current state
    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        let { x, y } = attrs;
        return [
            <Handles.Point>{
                type: "point",
                x: x, y: y,
                actions: [
                    { type: "attribute", source: "x", attribute: "x" },
                    { type: "attribute", source: "y", attribute: "y" }
                ]
            }
        ]
    }

    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        let { x, y, size } = attrs;
        return <BoundingBox.Circle>{
            type: "circle",
            cx: x,
            cy: y,
            radius: Math.sqrt(size / Math.PI)
        };
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        let attrs = this.state.attributes;
        let { x, y } = attrs;
        return [
            <SnappingGuides.Axis>{ type: "x", value: x, attribute: "x" },
            <SnappingGuides.Axis>{ type: "y", value: y, attribute: "y" },
        ];
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let widgets = [
            manager.sectionHeader("Symbol"),
            manager.mappingEditor("Shape", "symbol", "string", { acceptKinds: ["categorical"], hints: { rangeString: symbolTypes, stringBehavior: "categorical" }, defaultValue: "circle" }),
            manager.mappingEditor("Size", "size", "number", { acceptKinds: ["numerical"], hints: { rangeNumber: [0, 100] }, defaultValue: 60, numberOptions: { showSlider: true, minimum: 0, sliderRange: [0, 500] } }),
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
}

ObjectClasses.Register(SymbolElement);
import * as Specification from "../../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../../solver";
import * as Graphics from "../../../graphics";

import { SnappingGuides, AttributeDescription, DropZones, Handles, Controls, ObjectClasses, ObjectClassMetadata, BoundingBox, BuildConstraintsContext, TemplateParameters } from "../../common";
import { Point, uniqueID, getById, max } from "../../../common";

import { PlotSegmentClass } from "../index";
import { Region2DPlotSegment, Region2DAttributes, Region2DConstraintBuilder, Region2DProperties, Region2DConfiguration } from "./base";
import { AxisRenderer } from "../axis";

export type PolarAxisMode = "null" | "default" | "numerical" | "categorical";

export interface PolarAttributes extends Region2DAttributes {
    /** Cartesian plot segment region */
    x1: number; y1: number;
    x2: number; y2: number;

    angle1: number; angle2: number;
    radial1: number; radial2: number;
}

export interface PolarState extends Specification.PlotSegmentState {
    attributes: PolarAttributes;
}

export interface PolarProperties extends Region2DProperties {
    startAngle: number;
    endAngle: number;
    innerRatio: number;
    outerRatio: number;
    equalizeArea: boolean;
}

export interface PolarObject extends Specification.PlotSegment {
    properties: PolarProperties;
}

export let polarTerminology: Region2DConfiguration["terminology"] = {
    xAxis: "Angular Axis",
    yAxis: "Radial Axis",
    xMin: "Left", xMinIcon: "align/left",
    xMiddle: "Middle", xMiddleIcon: "align/x-middle",
    xMax: "Right", xMaxIcon: "align/right",
    yMiddle: "Middle", yMiddleIcon: "align/y-middle",
    yMin: "Bottom", yMinIcon: "align/bottom",
    yMax: "Top", yMaxIcon: "align/top",
    dodgeX: "Stack Angular", dodgeXIcon: "sublayout/dodge-angular",
    dodgeY: "Stack Radial", dodgeYIcon: "sublayout/dodge-radial",
    grid: "Grid", gridIcon: "sublayout/polar-grid",
    gridDirectionX: "Angular", gridDirectionY: "Radial",
    packing: "Packing", packingIcon: "sublayout/packing"
};

export class PolarPlotSegment extends Region2DPlotSegment {
    public static classID = "plot-segment.polar";
    public static type = "plot-segment";

    public static metadata: ObjectClassMetadata = {
        displayName: "PlotSegment",
        iconPath: "plot-segment/polar",
        creatingInteraction: {
            type: "rectangle",
            mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" }
        }
    };

    public static defaultProperties: Specification.AttributeMap = {
        marginX1: 0, marginY1: 0,
        marginX2: 0, marginY2: 0,
        visible: true,
        sublayout: {
            type: "dodge-x",
            order: null,
            ratioX: 0.1,
            ratioY: 0.1,
            align: {
                x: "start",
                y: "start"
            },
            grid: {
                direction: "x",
                xCount: null,
                yCount: null
            }
        },
        startAngle: 0,
        endAngle: 360,
        innerRatio: 0.5,
        outerRatio: 0.9
    }

    public readonly state: PolarState;
    public readonly object: PolarObject;

    public attributeNames: string[] = ["x1", "x2", "y1", "y2", "angle1", "angle2", "radial1", "radial2", "gapX", "gapY", "x", "y"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        angle1: { name: "angle1", type: "number", category: "margins", displayName: "Angle Start", strength: VariableStrength.NONE, defaultValue: -90 },
        angle2: { name: "angle2", type: "number", category: "margins", displayName: "Angle End", strength: VariableStrength.NONE, defaultValue: 90 },
        radial1: { name: "radial1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        radial2: { name: "radial2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x: { name: "x", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y: { name: "y", type: "number", mode: "positional", strength: VariableStrength.NONE },
        gapX: { name: "gapX", type: "number", mode: "positional", strength: VariableStrength.NONE },
        gapY: { name: "gapY", type: "number", mode: "positional", strength: VariableStrength.NONE }
    };

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.angle1 = 0;
        attrs.angle2 = 360;
        attrs.radial1 = 10;
        attrs.radial2 = 100;
        attrs.x1 = -100;
        attrs.x2 = 100;
        attrs.y1 = -100;
        attrs.y2 = 100;
        attrs.x = attrs.x1;
        attrs.y = attrs.y2;
        attrs.gapX = 4;
        attrs.gapY = 4;
    }

    public createBuilder(solver?: ConstraintSolver, context?: BuildConstraintsContext) {
        let props = this.object.properties;
        let config = {
            terminology: polarTerminology,
            xAxisPrePostGap: (props.endAngle - props.startAngle) % 360 == 0,
            yAxisPrePostGap: false
        };
        let builder = new Region2DConstraintBuilder(this, config, "angle1", "angle2", "radial1", "radial2", solver, context);
        return builder;
    }

    public buildConstraints(solver: ConstraintSolver, context: BuildConstraintsContext): void {
        let attrs = this.state.attributes;
        let props = this.object.properties;

        let [x1, y1, x2, y2, innerRadius, outerRadius, angle1, angle2] = solver.attrs(attrs, ["x1", "y1", "x2", "y2", "radial1", "radial2", "angle1", "angle2"]);

        attrs.angle1 = props.startAngle;
        attrs.angle2 = props.endAngle;
        solver.makeConstant(attrs, "angle1");
        solver.makeConstant(attrs, "angle2");

        let minRatio = Math.min(props.innerRatio, props.outerRatio);
        let maxRatio = Math.max(props.innerRatio, props.outerRatio);

        if (attrs.x2 - attrs.x1 < attrs.y2 - attrs.y1) {
            solver.addLinear(ConstraintStrength.HARD, 0, [[props.innerRatio, x2], [-props.innerRatio, x1]], [[2, innerRadius]]);
            solver.addLinear(ConstraintStrength.HARD, 0, [[props.outerRatio, x2], [-props.outerRatio, x1]], [[2, outerRadius]]);
        } else {
            solver.addLinear(ConstraintStrength.HARD, 0, [[props.innerRatio, y2], [-props.innerRatio, y1]], [[2, innerRadius]]);
            solver.addLinear(ConstraintStrength.HARD, 0, [[props.outerRatio, y2], [-props.outerRatio, y1]], [[2, outerRadius]]);
        }

        let builder = this.createBuilder(solver, context);
        builder.build();
    }

    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        let { x1, x2, y1, y2 } = attrs;
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
        let { x1, y1, x2, y2 } = attrs;
        return [
            <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
            <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
            <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
            <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" }
        ];
    }

    public getGraphics(): Graphics.Group {
        let builder = this.createBuilder();
        let g = Graphics.makeGroup([]);
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let cx = (attrs.x1 + attrs.x2) / 2;
        let cy = (attrs.y1 + attrs.y2) / 2;
        let [angularMode, radialMode] = this.getAxisModes();
        let radialData = props.yData;
        let angularData = props.xData;
        let angleStart = props.startAngle;
        let angleEnd = props.endAngle;
        let innerRadius = attrs.radial1;
        let outerRadius = attrs.radial2;
        if (radialData && radialData.visible) {
            g.elements.push(
                new AxisRenderer()
                    .setAxisDataBinding(radialData, innerRadius, outerRadius)
                    .renderLine(cx, cy, 90 - (radialData.side == "opposite" ? angleEnd : angleStart), -1)
            );
        }
        if (angularData && angularData.visible) {
            g.elements.push(
                new AxisRenderer()
                    .setAxisDataBinding(angularData, angleStart, angleEnd, builder.config.xAxisPrePostGap)
                    .renderPolar(cx, cy, angularData.side == "opposite" ? innerRadius : outerRadius, angularData.side == "opposite" ? -1 : 1)
            );
        }
        return g;
    }

    public getCoordinateSystem(): Graphics.CoordinateSystem {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        return new Graphics.PolarCoordinates({
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2
        }, attrs.radial1, attrs.radial2, this.object.properties.equalizeArea);
    }

    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes as PolarAttributes;
        let { x1, y1, x2, y2, radial1, radial2 } = attrs;
        let cx = (x1 + x2) / 2;
        let cy = (y1 + y2) / 2;
        let zones: DropZones.Description[] = [];
        zones.push(
            <DropZones.Region>{
                type: "region",
                accept: { scaffolds: ["polar"] },
                dropAction: { extendPlotSegment: {} },
                p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 },
                title: "Add Angular Scaffold"
            },
        );
        zones.push(
            <DropZones.Region>{
                type: "region",
                accept: { scaffolds: ["curve"] },
                dropAction: { extendPlotSegment: {} },
                p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 },
                title: "Convert to Curve Coordinates"
            },
        );
        zones.push(
            <DropZones.Region>{
                type: "region",
                accept: { scaffolds: ["cartesian-x", "cartesian-y"] },
                dropAction: { extendPlotSegment: {} },
                p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 },
                title: "Convert to Cartesian Coordinates"
            },
        );
        zones.push(
            <DropZones.Line>{
                type: "line",
                p1: { x: cx + radial1, y: cy }, p2: { x: cx + radial2, y: cy },
                title: "Radial Axis",
                dropAction: {
                    axisInference: { property: "yData" }
                }
            }
        );
        zones.push(
            <DropZones.Arc>{
                type: "arc",
                center: { x: cx, y: cy },
                radius: radial2,
                angleStart: attrs.angle1, angleEnd: attrs.angle2,
                title: "Angular Axis",
                dropAction: {
                    axisInference: { property: "xData" }
                }
            }
        );
        return zones;
    }

    public getAxisModes(): [PolarAxisMode, PolarAxisMode] {
        let props = this.object.properties;
        return [
            props.xData ? props.xData.type : "null",
            props.yData ? props.yData.type : "null"
        ];
    }

    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let rows = this.parent.dataflow.getTable(this.object.table).rows;
        let { x1, x2, y1, y2 } = attrs;
        let radius = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
        let cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        let builder = this.createBuilder();
        return [
            <Handles.Line>{ type: "line", axis: "y", value: y1, span: [x1, x2], actions: [{ type: "attribute", attribute: "y1" }] },
            <Handles.Line>{ type: "line", axis: "y", value: y2, span: [x1, x2], actions: [{ type: "attribute", attribute: "y2" }] },
            <Handles.Line>{ type: "line", axis: "x", value: x1, span: [y1, y2], actions: [{ type: "attribute", attribute: "x1" }] },
            <Handles.Line>{ type: "line", axis: "x", value: x2, span: [y1, y2], actions: [{ type: "attribute", attribute: "x2" }] },
            <Handles.Point>{ type: "point", x: x1, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y1" }] },
            <Handles.Point>{ type: "point", x: x2, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y1" }] },
            <Handles.Point>{ type: "point", x: x1, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y2" }] },
            <Handles.Point>{ type: "point", x: x2, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y2" }] },
            ...builder.getHandles().map(handle => {
                return {
                    type: "gap-ratio",
                    axis: handle.gap.axis,
                    reference: handle.gap.reference,
                    value: handle.gap.value,
                    scale: handle.gap.scale,
                    span: handle.gap.span,
                    range: [0, 1],
                    coordinateSystem: this.getCoordinateSystem(),
                    actions: [{
                        type: "property",
                        property: handle.gap.property.property,
                        field: handle.gap.property.field,
                    }]
                } as Handles.GapRatio
            }),
            <Handles.Angle>{
                type: "angle",
                actions: [{ type: "property", property: "endAngle" }],
                cx: cx, cy: cy, radius: radius * Math.max(props.innerRatio, props.outerRatio),
                value: props.endAngle,
                clipAngles: [props.startAngle, null],
                icon: "<"
            },
            <Handles.Angle>{
                type: "angle",
                actions: [{ type: "property", property: "startAngle" }],
                cx: cx, cy: cy, radius: radius * Math.max(props.innerRatio, props.outerRatio),
                value: props.startAngle,
                clipAngles: [null, props.endAngle],
                icon: ">"
            },
            <Handles.DistanceRatio>{
                type: "distance-ratio",
                actions: [{ type: "property", property: "outerRatio" }],
                cx, cy,
                value: props.outerRatio, startDistance: 0, endDistance: radius,
                startAngle: props.startAngle, endAngle: props.endAngle, clipRange: [props.innerRatio + 0.01, 1]
            },
            <Handles.DistanceRatio>{
                type: "distance-ratio",
                actions: [{ type: "property", property: "innerRatio" }],
                cx, cy,
                value: props.innerRatio, startDistance: 0, endDistance: radius,
                startAngle: props.startAngle, endAngle: props.endAngle, clipRange: [0, props.outerRatio - 0.01]
            }
        ];
    }

    public getPopupEditor(manager: Controls.WidgetManager): Controls.PopupEditor {
        let builder = this.createBuilder();
        let widgets = builder.buildPopupWidgets(manager);
        if (widgets.length == 0) return null;
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let anchor = { x: attrs.x1, y: attrs.y2 };
        return {
            anchor: anchor,
            widgets: [
                ...widgets
            ]
        };
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let builder = this.createBuilder();
        return [
            manager.sectionHeader("Polar Coordinates"),
            manager.row("Angle", manager.horizontal([1, 0, 1],
                manager.inputNumber({ property: "startAngle" }),
                manager.label("-"),
                manager.inputNumber({ property: "endAngle" })
            )),
            manager.row("Radius", manager.horizontal([0, 1, 0, 1],
                manager.label("Inner:"),
                manager.inputNumber({ property: "innerRatio" }),
                manager.label("Outer:"),
                manager.inputNumber({ property: "outerRatio" })
            )),
            manager.row("", manager.inputBoolean({ property: "equalizeArea" }, { type: "checkbox", label: "Height to Area" })),
            ...builder.buildPanelWidgets(manager)
        ];
    }

    public getTemplateParameters(): TemplateParameters {
        let r: Specification.Template.Inference[] = [];
        if (this.object.properties.xData && this.object.properties.xData.type != "default") {
            r.push({
                type: "axis",
                property: "xData",
                slotKind: this.object.properties.xData.type,
                slotName: this.object.properties.xData.expression
            } as Specification.Template.Axis);
        }
        if (this.object.properties.yData && this.object.properties.yData.type != "default") {
            r.push({
                type: "axis",
                property: "yData",
                slotKind: this.object.properties.yData.type,
                slotName: this.object.properties.yData.expression
            } as Specification.Template.Axis);
        }
        if (this.object.properties.sublayout.order) {
            r.push({
                type: "order",
                property: "sublayout",
                field: "order",
                slotName: this.object.properties.sublayout.order
            } as Specification.Template.Order);
        }
        return { inferences: r };
    }
}

ObjectClasses.Register(PolarPlotSegment);
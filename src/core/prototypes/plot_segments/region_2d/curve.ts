import * as Specification from "../../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../../solver";
import * as Graphics from "../../../graphics";

import { SnappingGuides, AttributeDescription, DropZones, Handles, Controls, ObjectClasses, ObjectClassMetadata, BoundingBox, BuildConstraintsContext, TemplateParameters } from "../../common";
import { Point, uniqueID, getById, max } from "../../../common";

import { PlotSegmentClass } from "../index";
import { Region2DPlotSegment, Region2DAttributes, Region2DConstraintBuilder, Region2DProperties, Region2DConfiguration } from "./base";
import { AxisRenderer } from "../axis";

export type CurveAxisMode = "null" | "default" | "numerical" | "categorical";

export interface CurveAttributes extends Region2DAttributes {
    /** Cartesian plot segment region */
    x1: number; y1: number;
    x2: number; y2: number;

    /**
     * The region in the curve coordinate system
     * tangent1, tangent2: the axis along the curve direction
     * normal1, normal2: the axis perpendicular to the curve direction (these won't be parallel to each other!)
     */
    tangent1: number; tangent2: number;
    normal1: number; normal2: number;
}

export interface CurveState extends Specification.PlotSegmentState {
    attributes: CurveAttributes;
}

export interface CurveProperties extends Region2DProperties {
    /** The bezier curve specification in relative proportions (-1, +1) => (x1, x2) */
    curve: [Point, Point, Point, Point][];
    normalStart: number;
    normalEnd: number;
}

export interface CurveObject extends Specification.PlotSegment {
    properties: CurveProperties;
}

export let curveTerminology: Region2DConfiguration["terminology"] = {
    xAxis: "Tangent Axis",
    yAxis: "Normal Axis",
    xMin: "Left", xMinIcon: "align/left",
    xMiddle: "Middle", xMiddleIcon: "align/x-middle",
    xMax: "Right", xMaxIcon: "align/right",
    yMiddle: "Middle", yMiddleIcon: "align/y-middle",
    yMin: "Bottom", yMinIcon: "align/bottom",
    yMax: "Top", yMaxIcon: "align/top",
    dodgeX: "Stack Tangential", dodgeXIcon: "sublayout/dodge-x",
    dodgeY: "Stack Normal", dodgeYIcon: "sublayout/dodge-y",
    grid: "Grid", gridIcon: "sublayout/grid",
    gridDirectionX: "Tangent", gridDirectionY: "Normal",
    packing: "Packing", packingIcon: "sublayout/packing"
};

export class CurvePlotSegment extends Region2DPlotSegment {
    public static classID = "plot-segment.curve";
    public static type = "plot-segment";

    public static metadata: ObjectClassMetadata = {
        displayName: "PlotSegment",
        iconPath: "plot-segment/curve",
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
        curve: [
            [{ x: -1, y: 0 }, { x: -0.25, y: -0.5 }, { x: 0.25, y: 0.5 }, { x: 1, y: 0 }]
        ],
        normalStart: -0.2,
        normalEnd: 0.2
    }

    public readonly state: CurveState;
    public readonly object: CurveObject;

    public attributeNames: string[] = ["x1", "x2", "y1", "y2", "tangent1", "tangent2", "normal1", "normal2", "gapX", "gapY", "x", "y"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        tangent1: { name: "tangent1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        tangent2: { name: "tangent2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        normal1: { name: "normal1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        normal2: { name: "normal2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x: { name: "x", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y: { name: "y", type: "number", mode: "positional", strength: VariableStrength.NONE },
        gapX: { name: "gapX", type: "number", mode: "positional", strength: VariableStrength.NONE },
        gapY: { name: "gapY", type: "number", mode: "positional", strength: VariableStrength.NONE }
    };

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.tangent1 = 0;
        attrs.tangent2 = 360;
        attrs.normal1 = 10;
        attrs.normal2 = 100;
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
            terminology: curveTerminology,
            xAxisPrePostGap: false,
            yAxisPrePostGap: false
        };
        let builder = new Region2DConstraintBuilder(this, config, "tangent1", "tangent2", "normal1", "normal2", solver, context);
        return builder;
    }

    public getCurveArcLength() {
        return new Graphics.MultiCurveParametrization(
            this.object.properties.curve.map(c => new Graphics.BezierCurveParameterization(c[0], c[1], c[2], c[3]))
        ).getLength();
    }

    public buildConstraints(solver: ConstraintSolver, context: BuildConstraintsContext): void {
        let attrs = this.state.attributes;
        let props = this.object.properties;

        let [x1, y1, x2, y2, tangent1, tangent2, normal1, normal2] = solver.attrs(attrs, ["x1", "y1", "x2", "y2", "tangent1", "tangent2", "normal1", "normal2"]);
        let arcLength = this.getCurveArcLength();

        attrs.tangent1 = 0;
        solver.makeConstant(attrs, "tangent1");

        // tangent2 = arcLength * (x2 - x1) / 2
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, tangent2]], [[arcLength / 2, x2], [-arcLength / 2, x1]]);
        // normal1 = normalStart * (x2 - x1) / 2
        // normal2 = normalEnd * (x2 - x1) / 2
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, normal1]], [[props.normalStart / 2, x2], [-props.normalStart / 2, x1]]);
        solver.addLinear(ConstraintStrength.HARD, 0, [[1, normal2]], [[props.normalEnd / 2, x2], [-props.normalEnd / 2, x1]]);

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
        let { x1, y1, x2, y2, tangent1, tangent2, normal1, normal2 } = this.state.attributes;

        let builder = this.createBuilder();
        let g = Graphics.makeGroup([]);
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let cx = (attrs.x1 + attrs.x2) / 2;
        let cy = (attrs.y1 + attrs.y2) / 2;
        let [angularMode, radialMode] = this.getAxisModes();
        let cs = this.getCoordinateSystem();

        if (props.xData && props.xData.visible) {
            g.elements.push(
                new AxisRenderer()
                    .setAxisDataBinding(props.xData, tangent1, tangent2)
                    .renderCurve(cs, props.xData.side == "opposite" ? normal2 : normal1, props.xData.side == "opposite" ? -1 : 1)
            );
        }
        if (props.yData && props.yData.visible) {
            let tr = cs.getLocalTransform(props.yData.side == "opposite" ? tangent2 : tangent1, 0);
            tr = Graphics.concatTransform(cs.getBaseTransform(), tr);
            g.elements.push(
                new AxisRenderer()
                    .setAxisDataBinding(props.yData, normal1, normal2, false)
                    .renderLine(tr.x, tr.y, tr.angle - 90, props.yData.side == "opposite" ? -1 : 1)
            );
        }
        return g;
    }

    public getCoordinateSystem(): Graphics.CoordinateSystem {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        let cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        let scaler = (x2 - x1) / 2;
        return new Graphics.BezierCurveCoordinates(
            { x: cx, y: cy },
            new Graphics.MultiCurveParametrization(this.object.properties.curve.map(ps => {
                let p = ps.map(p => { return { x: p.x * scaler, y: p.y * scaler } });
                return new Graphics.BezierCurveParameterization(
                    p[0], p[1], p[2], p[3]
                );
            }))
        );
    }

    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes as CurveAttributes;
        let { x1, y1, x2, y2 } = attrs;
        let cx = (x1 + x2) / 2;
        let cy = (y1 + y2) / 2;
        let zones: DropZones.Description[] = [];
        zones.push(
            <DropZones.Region>{
                type: "region",
                accept: { scaffolds: ["polar"] },
                dropAction: { extendPlotSegment: {} },
                p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 },
                title: "Convert to Polar Coordinates"
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
        // zones.push(
        //     <DropZones.Line>{
        //         type: "line",
        //         p1: { x: cx + radial1, y: cy }, p2: { x: cx + radial2, y: cy },
        //         title: "Radial Axis",
        //         dropAction: {
        //             axisInference: { property: "yData" }
        //         }
        //     }
        // );
        // zones.push(
        //     <DropZones.Arc>{
        //         type: "arc",
        //         center: { x: cx, y: cy },
        //         radius: radial2,
        //         angleStart: attrs.angle1, angleEnd: attrs.angle2,
        //         title: "Angular Axis",
        //         dropAction: {
        //             axisInference: { property: "xData" }
        //         }
        //     }
        // );
        return zones;
    }

    public getAxisModes(): [CurveAxisMode, CurveAxisMode] {
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
        let h: Handles.Description[] = [
            <Handles.Line>{ type: "line", axis: "y", value: y1, span: [x1, x2], actions: [{ type: "attribute", attribute: "y1" }] },
            <Handles.Line>{ type: "line", axis: "y", value: y2, span: [x1, x2], actions: [{ type: "attribute", attribute: "y2" }] },
            <Handles.Line>{ type: "line", axis: "x", value: x1, span: [y1, y2], actions: [{ type: "attribute", attribute: "x1" }] },
            <Handles.Line>{ type: "line", axis: "x", value: x2, span: [y1, y2], actions: [{ type: "attribute", attribute: "x2" }] },
            <Handles.Point>{ type: "point", x: x1, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y1" }] },
            <Handles.Point>{ type: "point", x: x2, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y1" }] },
            <Handles.Point>{ type: "point", x: x1, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y2" }] },
            <Handles.Point>{ type: "point", x: x2, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y2" }] },
            <Handles.InputCurve>{ type: "input-curve", x1: x1, y1: y1, x2: x2, y2: y2, actions: [{ type: "property", property: "curve" }] }
        ];
        return h;
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
            manager.sectionHeader("Curve Coordinates"),
            manager.row("Normal", manager.horizontal([1, 0, 1],
                manager.inputNumber({ property: "normalStart" }),
                manager.label("-"),
                manager.inputNumber({ property: "normalEnd" })
            )),
            // manager.row("Radius", manager.horizontal([0, 1, 0, 1],
            //     manager.label("Inner:"),
            //     manager.inputNumber({ property: "innerRatio" }),
            //     manager.label("Outer:"),
            //     manager.inputNumber({ property: "outerRatio" })
            // )),
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

ObjectClasses.Register(CurvePlotSegment);
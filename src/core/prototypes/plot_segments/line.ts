import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import * as Graphics from "../../graphics";

import { ObjectClasses, SnappingGuides, AttributeDescription, DropZones, Handles, BoundingBox, ObjectClassMetadata, Controls } from "../common";
import { Point, uniqueID, getById } from "../../common";

import { PlotSegmentClass } from "./index";
import { buildAxisWidgets, getCategoricalAxis, AxisRenderer } from "./axis";

export interface LineGuideAttributes extends Specification.AttributeMap {
    x1?: number; y1?: number;
    x2?: number; y2?: number;
    x?: number; y?: number;

}

export interface LineGuideState extends Specification.PlotSegmentState {
    attributes: LineGuideAttributes;
}

export interface LineGuideProperties extends Specification.AttributeMap {
    axis?: Specification.Types.AxisDataBinding;
}

export interface LineGuideObject extends Specification.PlotSegment {
    properties: LineGuideProperties;
}

export class LineGuide extends PlotSegmentClass {
    public static classID = "plot-segment.line";
    public static type = "plot-segment";

    public static metadata: ObjectClassMetadata = {
        displayName: "PlotSegment",
        iconPath: "plot-segment/line",
        creatingInteraction: {
            type: "line-segment",
            mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" }
        }
    };

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    public readonly state: LineGuideState;
    public readonly object: LineGuideObject;

    public attributeNames: string[] = ["x1", "x2", "y1", "y2"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE }
    };

    public initializeState(): void {
        let attrs = this.state.attributes as LineGuideAttributes;
        attrs.x1 = -100;
        attrs.x2 = 100;
        attrs.y1 = -100;
        attrs.y2 = 100;
    }


    public buildConstraints(solver: ConstraintSolver): void {
        let chart = this.parent.object;
        let props = this.object.properties;
        let rows = this.parent.dataflow.getTable(this.object.table);
        let [x1, y1, x2, y2] = solver.attrs(this.state.attributes, ["x1", "y1", "x2", "y2"]);
        let attrs = this.state.attributes;

        let count = this.state.dataRowIndices.length;
        let dataIndices = this.state.dataRowIndices;

        for (let [index, markState] of this.state.glyphs.entries()) {
            let t = (0.5 + index) / count;

            if (props.axis == null) {
                t = (0.5 + index) / count;
            } else {
                let data = props.axis;
                switch (data.type) {
                    case "numerical": {
                        let row = rows.getRowContext(dataIndices[index]);
                        let expr = this.parent.dataflow.cache.parse(data.expression);
                        let value = expr.getNumberValue(row);
                        t = (value - data.domainMin) / (data.domainMax - data.domainMin);
                    } break;
                    case "categorical": {
                        let axis = getCategoricalAxis(props.axis, false);
                        let row = rows.getRowContext(dataIndices[index]);
                        let expr = this.parent.dataflow.cache.parse(data.expression);
                        let value = expr.getStringValue(row);
                        let i = data.categories.indexOf(value);
                        t = (axis.ranges[i][0] + axis.ranges[i][1]) / 2;
                    } break;
                    case "default": {
                        t = (0.5 + index) / count;
                    } break;
                }
            }

            solver.addLinear(ConstraintStrength.HARD, 0, [[t, x2], [1 - t, x1]], [[1, solver.attr(markState.attributes, "x")]]);
            solver.addLinear(ConstraintStrength.HARD, 0, [[t, y2], [1 - t, y1]], [[1, solver.attr(markState.attributes, "y")]]);
        }
    }

    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        let zones: DropZones.Description[] = [];
        zones.push(
            <DropZones.Line>{
                type: "line",
                p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 },
                title: "Axis",
                dropAction: {
                    axisInference: { property: "axis" }
                }
            }
        );
        return zones;
    }

    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
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
        ];
    }

    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        let { x1, x2, y1, y2 } = attrs;
        return <BoundingBox.Line>{
            type: "line",
            x1: x1, y1: y1, x2: x2, y2: y2
        };
    }

    public getGraphics(): Graphics.Element {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        let props = this.object.properties;
        let length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        if (props.axis == null) {
            return Graphics.makeLine(x1, y1, x2, y2, {
                strokeColor: { r: 0, g: 0, b: 0 },
                fillColor: null
            });
        }
        if (props.axis && props.axis.visible) {
            let renderer = new AxisRenderer();
            renderer.setAxisDataBinding(props.axis, 0, length, false);
            let g = renderer.renderLine(x1, y1, Math.atan2(y2 - y1, x2 - x1) / Math.PI * 180, 1);
            return g;
        }
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let props = this.object.properties;
        return [
            ...buildAxisWidgets(props.axis, "axis", manager, "Axis")
        ];
    }
}

ObjectClasses.Register(LineGuide);



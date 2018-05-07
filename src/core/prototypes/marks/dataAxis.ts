// This implements Data-Driven Guides (straight line guide)

import * as Specification from "../../specification";
import * as Expression from "../../expression";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import { Point, uniqueID } from "../../common";

import { ObjectClasses, ObjectClassMetadata, SnappingGuides, AttributeDescription, DropZones, Handles, LinkAnchor, Controls, BoundingBox, BuildConstraintsContext, TemplateParameters } from "../common";
import { MarkClass, CreationParameters } from "./index";

import * as Graphics from "../../graphics";
import { buildAxisWidgets, AxisRenderer } from "../plot_segments/axis";

export interface DataAxisAttributes extends Specification.AttributeMap {
    // anchor0, anchor1, ... that corresponds to the data
    [name: string]: number;
    x1: number; y1: number; x2: number; y2: number;
}

export interface DataAxisProperties extends Specification.AttributeMap {
    axis: Specification.Types.AxisDataBinding;
    dataExpressions: string[];
}

export interface DataAxisState extends Specification.MarkState {
    attributes: DataAxisAttributes;
}

export interface DataAxisObject extends Specification.Element {
    properties: DataAxisProperties;
}

export class DataAxis extends MarkClass {
    public static classID = "mark.data-axis";
    public static type = "mark";

    public static metadata: ObjectClassMetadata = {
        displayName: "DataAxis",
        iconPath: "mark/data-axis",
        creatingInteraction: {
            type: "line-segment",
            mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" }
        }
    };

    public static defaultProperties: Specification.AttributeMap = {
        dataExpressions: [],
        axis: null,
        visible: true
    }

    public readonly state: DataAxisState;
    public readonly object: DataAxisObject;

    // Get a list of elemnt attributes
    public get attributeNames(): string[] {
        let r = ["x1", "y1", "x2", "y2"];
        for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
            r.push(`anchorX${i}`);
            r.push(`anchorY${i}`);
        }
        return r;
    };

    public get attributes(): { [name: string]: AttributeDescription } {
        let r: { [name: string]: AttributeDescription } = {
            x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
            y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
            x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
            y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE }
        };
        for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
            r[`anchorX${i}`] = { name: `anchorX${i}`, type: "number", mode: "positional", strength: VariableStrength.NONE };
            r[`anchorY${i}`] = { name: `anchorY${i}`, type: "number", mode: "positional", strength: VariableStrength.NONE };
        }
        return r;
    }

    public buildConstraints(solver: ConstraintSolver, context: BuildConstraintsContext) {
        if (context == null) return;
        let attrs = this.state.attributes;
        let props = this.object.properties;
        let [x1, y1, x2, y2] = solver.attrs(attrs, ["x1", "y1", "x2", "y2"]);
        if (props.axis) {
            if (props.axis.type == "numerical") {
                for (let i = 0; i < props.dataExpressions.length; i++) {
                    let expr = context.getExpressionValue(props.dataExpressions[i], context.rowContext) as number;
                    let t = (expr - props.axis.domainMin) / (props.axis.domainMax - props.axis.domainMin);
                    if (attrs[`anchorX${i}`] == null) {
                        attrs[`anchorX${i}`] = attrs.x1;
                    }
                    if (attrs[`anchorY${i}`] == null) {
                        attrs[`anchorY${i}`] = attrs.y1;
                    }
                    solver.addLinear(ConstraintStrength.HARD, 0, [[t, x2], [1 - t, x1]], [[1, solver.attr(attrs, `anchorX${i}`)]]);
                    solver.addLinear(ConstraintStrength.HARD, 0, [[t, y2], [1 - t, y1]], [[1, solver.attr(attrs, `anchorY${i}`)]]);
                }
            }
        }
    }

    // Initialize the state of an element so that everything has a valid value
    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.x1 = -10;
        attrs.y1 = -10;
        attrs.x2 = 10;
        attrs.y2 = 10;
    }

    // Get bounding rectangle given current state
    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        return [
            <Handles.Point>{
                type: "point",
                x: attrs.x1, y: attrs.y1,
                actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y1" }]
            },
            <Handles.Point>{
                type: "point",
                x: attrs.x2, y: attrs.y2,
                actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y2" }]
            }
        ];
    }

    public getGraphics(cs: Graphics.CoordinateSystem, offset: Point, glyphIndex: number = 0): Graphics.Element {
        let attrs = this.state.attributes;
        let props = this.object.properties;
        if (glyphIndex != 0) return null;
        if (props.axis) {
            if (props.axis.visible) {
                let renderer = new AxisRenderer();
                renderer.setAxisDataBinding(props.axis, 0, Math.sqrt((attrs.x2 - attrs.x1) * (attrs.x2 - attrs.x1) + (attrs.y2 - attrs.y1) * (attrs.y2 - attrs.y1)));
                let g = renderer.renderLine(0, 0, Math.atan2(attrs.y2 - attrs.y1, attrs.x2 - attrs.x1) / Math.PI * 180, -1);
                g.transform = cs.getLocalTransform(attrs.x1 + offset.x, attrs.y1 + offset.y);
                return g;
            } else {
                return null;
            }
        } else {
            let renderer = new AxisRenderer();
            renderer.setAxisDataBinding(null, 0, Math.sqrt((attrs.x2 - attrs.x1) * (attrs.x2 - attrs.x1) + (attrs.y2 - attrs.y1) * (attrs.y2 - attrs.y1)));
            let g = renderer.renderLine(0, 0, Math.atan2(attrs.y2 - attrs.y1, attrs.x2 - attrs.x1) / Math.PI * 180, -1);
            g.transform = cs.getLocalTransform(attrs.x1 + offset.x, attrs.y1 + offset.y);
            return g;
        }
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        let attrs = this.state.attributes;
        let guides: SnappingGuides.Description[] = [];
        if (attrs.x1 != attrs.x2) {
            for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
                let attr = `anchorX${i}`;
                guides.push(<SnappingGuides.Axis>{ type: "x", value: attrs[attr] as number, attribute: attr });
            }
        }
        if (attrs.y1 != attrs.y2) {
            for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
                let attr = `anchorY${i}`;
                guides.push(<SnappingGuides.Axis>{ type: "y", value: attrs[attr] as number, attribute: attr });
            }
        }
        for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
            let attrX = `anchorX${i}`;
            let attrY = `anchorY${i}`;
            guides.push(<SnappingGuides.Label>{ type: "label", x: attrs[attrX] as number, y: attrs[attrY] as number, text: this.object.properties.dataExpressions[i] });
        }
        return guides;
    }

    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        return <BoundingBox.Line>{
            type: "line",
            x1: attrs.x1, y1: attrs.y1,
            x2: attrs.x2, y2: attrs.y2
        };
    }

    // Get DropZones given current state
    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        return [
            {
                type: "line",
                p1: { x: x1, y: y1 },
                p2: { x: x2, y: y2 },
                title: "Data Axis",
                dropAction: {
                    axisInference: {
                        property: "axis",
                        appendToProperty: "dataExpressions"
                    }
                }
            } as DropZones.Line
        ];
    }

    // /** Get link anchors for this mark */
    // public getLinkAnchors(): LinkAnchor.Description[] {
    //     let attrs = this.state.attributes;
    //     return [
    //         {
    //             points: [
    //                 { x: attrs.x, y: attrs.y, xAttribute: "x", yAttribute: "y", direction: { x: 0, y: 1 } }
    //             ]
    //         }
    //     ];
    // }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let props = this.object.properties;
        let axisWidgets = buildAxisWidgets(props.axis, "axis", manager, "Data Axis");
        return [
            ...axisWidgets
        ];
    }

    public getTemplateParameters(): TemplateParameters {
        let props = this.object.properties;
        if (props.dataExpressions && props.dataExpressions.length > 0) {
            return {
                inferences: [
                    {
                        type: "axis",
                        slotName: props.dataExpressions[0],
                        slotKind: props.axis.type,
                        property: "axis"
                    } as Specification.Template.Axis,
                    {
                        type: "slot-list",
                        property: "dataExpressions",
                        slots: props.dataExpressions.map(x => {
                            return {
                                slotName: x,
                                slotKind: props.axis.type
                            };
                        })
                    } as Specification.Template.SlotList
                ]
            }
        }
    }
}

ObjectClasses.Register(DataAxis);
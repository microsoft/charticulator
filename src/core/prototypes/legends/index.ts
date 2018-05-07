import * as Specification from "../../specification";
import * as Graphics from "../../graphics";
import * as Expression from "../../expression";
import * as Scales from "../scales";

import { ChartElementClass, BuildConstraintsContext } from "../chart_element";
import { ObjectClassMetadata, AttributeDescription, ObjectClasses, Handles, BoundingBox, Controls } from "../common";
import { VariableStrength, ConstraintSolver, ConstraintStrength } from "../../solver/abstract";
import { indexOf, Color, interpolateColors } from "../../common";
import { AxisRenderer } from "../plot_segments/axis";

export interface LegendAttributes extends Specification.AttributeMap {
    x: number;
    y: number;
}

export interface LegendProperties extends Specification.AttributeMap {
    scale: string;
    alignX: string;
    alignY: string;
    fontFamily: string;
    fontSize: number;
    textColor: Color;
}

export interface LegendState extends Specification.ObjectState {
    attributes: LegendAttributes;
}

export interface LegendObject extends Specification.Object {
    properties: LegendProperties;
}

export abstract class LegendClass extends ChartElementClass {
    public readonly object: LegendObject;
    public readonly state: LegendState;

    public static metadata: ObjectClassMetadata = {
        displayName: "Legend",
        iconPath: "legend/legend"
    };

    public static defaultProperties = {
        visible: true,
        alignX: "start",
        alignY: "end",
        fontFamily: "Arial",
        fontSize: 14,
        textColor: { r: 0, g: 0, b: 0 }
    };

    public attributeNames: string[] = ["x", "y"];
    public attributes: { [name: string]: AttributeDescription } = {
        x: { name: "x", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y: { name: "y", type: "number", mode: "positional", strength: VariableStrength.NONE }
    };

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.x = 0;
        attrs.y = 0;
    }

    public getLayoutBox(): { x1: number, y1: number, x2: number, y2: number } {
        let { x, y } = this.state.attributes;
        let [width, height] = this.getLegendSize();
        let x1: number, y1: number, x2: number, y2: number;
        switch (this.object.properties.alignX) {
            case "start": x1 = x; x2 = x + width; break;
            case "middle": x1 = x - width / 2; x2 = x + width / 2; break;
            case "end": x1 = x - width; x2 = x; break;
        }
        switch (this.object.properties.alignY) {
            case "start": y1 = y; y2 = y + height; break;
            case "middle": y1 = y - height / 2; y2 = y + height / 2; break;
            case "end": y1 = y - height; y2 = y; break;
        }
        return { x1, y1, x2, y2 };
    }


    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = this.getLayoutBox();
        return <BoundingBox.Rectangle>{
            type: "rectangle",
            cx: (x1 + x2) / 2,
            cy: (y1 + y2) / 2,
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
            rotation: 0
        };
    }

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

    public getScale(): [Specification.Scale, Specification.ScaleState] {
        let scale = this.object.properties.scale;
        let scaleIndex = indexOf(this.parent.object.scales, (x) => x._id == scale);
        if (scaleIndex >= 0) {
            return [this.parent.object.scales[scaleIndex], this.parent.state.scales[scaleIndex]];
        } else {
            return null;
        }
    }

    public getLegendSize(): [number, number] {
        return [10, 10];
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let props = this.object.properties;
        return [
            manager.sectionHeader("Alignment"),
            manager.row("Horizontal",
                manager.inputSelect({ property: "alignX" }, {
                    type: "radio",
                    icons: ["align/left", "align/x-middle", "align/right"],
                    labels: ["Left", "Middle", "Right"],
                    options: ["start", "middle", "end"]
                })
            ),
            manager.row("Vertical",
                manager.inputSelect({ property: "alignY" }, {
                    type: "radio",
                    icons: ["align/top", "align/y-middle", "align/bottom"],
                    labels: ["Top", "Middle", "Bottom"],
                    options: ["end", "middle", "start"]
                })
            ),
            manager.sectionHeader("Labels"),
            manager.row("Font", manager.inputText({ property: "fontFamily" })),
            manager.row("Size", manager.inputNumber({ property: "fontSize" }, { showUpdown: true, updownStyle: "font", updownTick: 2 })),
            manager.row("Color", manager.inputColor({ property: "textColor" }))
        ];
    }
}


export interface CategoricalLegendItem {
    type: "number" | "color" | "boolean";
    label: string;
    value: number | Color | boolean;
}

export class CategoricalLegendClass extends LegendClass {
    public static classID: string = "legend.categorical";
    public static type: string = "legend";

    private textMeasure = new Graphics.TextMeasurer();

    public getLegendItems(): CategoricalLegendItem[] {
        let scale = this.getScale();
        if (scale) {
            let [scaleObject, scaleState] = scale;
            let mapping = scaleObject.properties.mapping as { [name: string]: Color };
            let items: CategoricalLegendItem[] = [];
            for (let key in mapping) {
                if (mapping.hasOwnProperty(key)) {
                    switch (scaleObject.classID) {
                        case "scale.categorical<string,boolean>": {
                            items.push({ type: "boolean", label: key, value: mapping[key] });
                        } break;
                        case "scale.categorical<string,number>": {
                            items.push({ type: "number", label: key, value: mapping[key] });
                        } break;
                        case "scale.categorical<string,color>": {
                            items.push({ type: "color", label: key, value: mapping[key] });
                        } break;
                    }
                }
            }
            items.sort((a, b) => a.label < b.label ? -1 : 1);
            return items;
        } else {
            return [];
        }
    }

    public getLineHeight() {
        return this.object.properties.fontSize + 10;
    }

    public getLegendSize(): [number, number] {
        let items = this.getLegendItems();
        return [100, items.length * this.getLineHeight()];
    }

    public getGraphics(): Graphics.Element {
        let fontFamily = this.object.properties.fontFamily;
        let fontSize = this.object.properties.fontSize;
        let lineHeight = this.getLineHeight();
        this.textMeasure.setFontFamily(fontFamily);
        this.textMeasure.setFontSize(fontSize);

        let g = Graphics.makeGroup([]);
        let items = this.getLegendItems();
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let metrics = this.textMeasure.measure(item.label);
            let offsets = Graphics.TextMeasurer.ComputeTextPosition(lineHeight, lineHeight / 2, metrics, "left", "middle", 5, 0);
            let textLabel = Graphics.makeText(offsets[0], offsets[1], item.label, fontFamily, fontSize, { fillColor: this.object.properties.textColor });
            let gItem = Graphics.makeGroup([textLabel]);
            switch (item.type) {
                case "color": {
                    gItem.elements.push(
                        Graphics.makeRect(8, 4, lineHeight, lineHeight - 4, { fillColor: item.value as Color })
                    );
                } break;
            }
            gItem.transform = { x: 0, y: lineHeight * (items.length - 1 - i), angle: 0 };
            g.elements.push(gItem);
        }
        let { x1, y1 } = this.getLayoutBox();
        g.transform = { x: x1, y: y1, angle: 0 };
        return g;
    }
}

export class NumericalColorLegendClass extends LegendClass {
    public static classID: string = "legend.numerical-color";
    public static type: string = "legend";

    public getLegendSize(): [number, number] {
        return [100, 100];
    }

    public getGraphics(): Graphics.Element {
        let fontFamily = this.object.properties.fontFamily;
        let fontSize = this.object.properties.fontSize;
        let height = this.getLegendSize()[1];
        let marginLeft = 5;
        let gradientWidth = 12;

        let scale = this.getScale();
        if (!scale) return null;

        let range = scale[0].properties.range as Specification.Types.ColorGradient;
        let domainMin = scale[0].properties.domainMin as number;
        let domainMax = scale[0].properties.domainMax as number;

        let axisRenderer = new AxisRenderer();
        axisRenderer.setLinearScale(domainMin, domainMax, 0, height);
        let g = Graphics.makeGroup([]);
        g.elements.push(axisRenderer.renderLine(marginLeft + gradientWidth + 2, 0, 90, 1));

        let ticks = height * 2;
        let interp = interpolateColors(range.colors, range.colorspace);
        for (let i = 0; i < ticks; i++) {
            let t = (i + 0.5) / ticks;
            let color = interp(t);
            let y1 = i / ticks * height;
            let y2 = Math.min(height, (i + 1.5) / ticks * height);
            g.elements.push(Graphics.makeRect(marginLeft, y1, marginLeft + gradientWidth, y2, { fillColor: color }));
        }

        let { x1, y1 } = this.getLayoutBox();
        g.transform = { x: x1, y: y1, angle: 0 };
        return g;
    }
}

export class NumericalNumberLegendClass extends ChartElementClass {
    public static classID: string = "legend.numerical-number";
    public static type: string = "legend";

    public static metadata: ObjectClassMetadata = {
        displayName: "Legend",
        iconPath: "legend/legend"
    };

    public static defaultProperties = {
        visible: true
    };

    public attributeNames: string[] = ["x1", "y1", "x2", "y2"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE }
    };

    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.x1 = 0;
        attrs.y1 = 0;
        attrs.x2 = 0;
        attrs.y2 = 0;
    }

    public getScale(): [Specification.Scale, Specification.ScaleState] {
        let scale = this.object.properties.scale;
        let scaleIndex = indexOf(this.parent.object.scales, (x) => x._id == scale);
        if (scaleIndex >= 0) {
            return [this.parent.object.scales[scaleIndex], this.parent.state.scales[scaleIndex]];
        } else {
            return null;
        }
    }

    public getBoundingBox(): BoundingBox.Description {
        return <BoundingBox.Line>{
            type: "line",
            x1: this.state.attributes.x1,
            y1: this.state.attributes.y1,
            x2: this.state.attributes.x2,
            y2: this.state.attributes.y2
        };
    }

    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        return [
            <Handles.Point>{
                type: "point",
                x: x1, y: y1,
                actions: [
                    { type: "attribute", source: "x", attribute: "x1" },
                    { type: "attribute", source: "y", attribute: "y1" }
                ]
            },
            <Handles.Point>{
                type: "point",
                x: x2, y: y2,
                actions: [
                    { type: "attribute", source: "x", attribute: "x2" },
                    { type: "attribute", source: "y", attribute: "y2" }
                ]
            }
        ]
    }

    public getGraphics(): Graphics.Element {
        let scale = this.getScale();
        if (!scale) return null;

        let rangeMin = scale[1].attributes.rangeMin as number;
        let rangeMax = scale[1].attributes.rangeMax as number;
        let domainMin = scale[0].properties.domainMin as number;
        let domainMax = scale[0].properties.domainMax as number;

        let dx = this.state.attributes.x2 as number - (this.state.attributes.x1 as number);
        let dy = this.state.attributes.y2 as number - (this.state.attributes.y1 as number);
        let length = Math.sqrt(dx * dx + dy * dy);

        let renderer = new AxisRenderer();
        // Extend/shrink range, and update the domain accordingly. Keep the scaling factor.
        let scaling = (rangeMax - rangeMin) / (domainMax - domainMin);
        renderer.setLinearScale(domainMin, domainMin + (length - rangeMin) / scaling, rangeMin, length);

        return renderer.renderLine(this.state.attributes.x1 as number, this.state.attributes.y1 as number, Math.atan2(dy, dx) / Math.PI * 180, -1);
    }
}

ObjectClasses.Register(CategoricalLegendClass);
ObjectClasses.Register(NumericalColorLegendClass);
ObjectClasses.Register(NumericalNumberLegendClass);
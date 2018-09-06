/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
// import * as Specification from "../../specification";
// import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
// import { Point, uniqueID, Color } from "../../common";

// import { ObjectClasses, SnappingGuides, AttributeDescription, DropZones, Handles, BoundingBox, ObjectClassMetadata, CreatingInteraction, Controls } from "../common";
// import { MarkClass, CreationParameters } from "./index";

// import * as Graphics from "../../graphics";

// export interface TextboxElementAttributes extends Specification.AttributeMap {
//     // Rectangle
//     x1: number; y1: number;
//     x2: number; y2: number;
//     width: number; height: number;
//     fill: Color;
//     stroke: Color;
//     strokeWidth: number;

//     text: string;
//     textColor: Color;
//     textOutline: Color;
//     fontFamily: string;
//     fontSize: number;

//     opacity: number;
//     visible: boolean;
// }

// export interface TextboxElementState extends Specification.MarkState {
//     attributes: TextboxElementAttributes;
// }

// export interface TextboxElementProperties extends Specification.AttributeMap {
//     alignment: Specification.Types.TextAlignment;
// }

// export interface TextboxElementObject extends Specification.Element {
//     properties: TextboxElementProperties;
// }

// export class TextboxElement extends MarkClass {
//     public static classID = "mark.textbox";
//     public static type = "mark";

//     public static metadata: ObjectClassMetadata = {
//         displayName: "Textbox",
//         iconPath: "mark/textbox",
//         creatingInteraction: {
//             type: "rectangle",
//             mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" }
//         }
//     };

//     public static defaultMappingValues: Specification.AttributeMap = {
//         fontFamily: "Arial",
//         fontSize: 14,
//         textColor: { r: 0, g: 0, b: 0 },
//         strokeWidth: 1,
//         opacity: 1,
//         visible: true
//     };

//     public static defaultProperties: Specification.AttributeMap = {
//         alignment: { x: "middle", y: "middle", xMargin: 0, yMargin: 0 },
//     };

//     public readonly state: TextboxElementState;
//     public readonly object: TextboxElementObject;

//     private textMeasure = new Graphics.TextMeasurer();

//     // Get a list of elemnt attributes
//     public attributeNames: string[] = ["x1", "y1", "x2", "y2", "width", "height", "fill", "stroke", "strokeWidth", "text", "textColor", "textOutline", "fontFamily", "fontSize", "opacity", "visible"];
//     public attributes: { [name: string]: AttributeDescription } = {
//         x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
//         y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
//         x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
//         y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.WEAKER },
//         width: { name: "width", type: "number", mode: "intrinsic", category: "dimensions", displayName: "Width", defaultRange: [0, 200], strength: VariableStrength.NONE },
//         height: { name: "height", type: "number", mode: "intrinsic", category: "dimensions", displayName: "Height", defaultRange: [0, 200], strength: VariableStrength.NONE },
//         fill: { name: "fill", type: "color", category: "style", displayName: "Fill", solverExclude: true, defaultValue: null },
//         stroke: { name: "stroke", type: "color", category: "style", displayName: "Stroke", solverExclude: true, defaultValue: null },
//         strokeWidth: { name: "strokeWidth", type: "number", category: "style", displayName: "Line Width", solverExclude: true, defaultValue: 1, defaultRange: [0, 5] },
//         text: { name: "text", type: "string", category: "text", displayName: "Text", solverExclude: true },
//         fontFamily: { name: "fontFamily", type: "string", category: "text", displayName: "Font", solverExclude: true, defaultValue: "Arial" },
//         fontSize: { name: "fontSize", type: "number", category: "text", displayName: "Size", solverExclude: true, defaultRange: [0, 24], defaultValue: 14 },
//         textColor: { name: "textColor", type: "color", category: "style", displayName: "Color", solverExclude: true, defaultValue: { r: 0, g: 0, b: 0 } },
//         textOutline: { name: "textOutline", type: "color", category: "style", displayName: "Outline", solverExclude: true, defaultValue: null },
//         opacity: { name: "opacity", type: "number", category: "style", displayName: "Opacity", solverExclude: true, defaultValue: 1, defaultRange: [0, 1] },
//         visible: { name: "visible", type: "boolean", category: "style", displayName: "Visible", solverExclude: true, defaultValue: true }
//     }

//     // Initialize the state of an element so that everything has a valid value
//     public initializeState(): void {
//         let defaultWidth = 30;
//         let defaultHeight = 50;
//         let attrs = this.state.attributes;
//         attrs.x1 = -defaultWidth / 2;
//         attrs.y1 = -defaultHeight / 2;
//         attrs.x2 = +defaultWidth / 2;
//         attrs.y2 = +defaultHeight / 2;
//         attrs.width = attrs.x2 - attrs.x1;
//         attrs.height = attrs.y2 - attrs.y1;
//         attrs.stroke = null;
//         attrs.fill = null;
//         attrs.strokeWidth = 1;
//         attrs.text = "Text";
//         attrs.textColor = { r: 0, g: 0, b: 0 };
//         attrs.textOutline = null;
//         attrs.fontFamily = "Arial";
//         attrs.fontSize = 14;
//         attrs.opacity = 1;
//         attrs.visible = true;
//     }

//     // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
//     public buildConstraints(solver: ConstraintSolver): void {
//         let [x1, y1, x2, y2, width, height] = solver.attrs(this.state.attributes, ["x1", "y1", "x2", "y2", "width", "height"]);
//         solver.addLinear(ConstraintStrength.HARD, 0, [[1, x2], [-1, x1]], [[1, width]]);
//         solver.addLinear(ConstraintStrength.HARD, 0, [[1, y2], [-1, y1]], [[1, height]]);
//     }

//     public getCenterOffset(alignment: Specification.Types.TextAlignment, width: number, height: number): [number, number] {
//         let cx: number = width / 2, cy: number = height / 2;
//         if (alignment.x == "left") {
//             cx = -alignment.xMargin;
//         }
//         if (alignment.x == "right") {
//             cx = width + alignment.xMargin;
//         }
//         if (alignment.y == "bottom") {
//             cy = height + alignment.yMargin
//         }
//         if (alignment.y == "top") {
//             cy = -alignment.yMargin;
//         }
//         return [cx, cy];
//     }

//     // Get the graphical element from the element
//     public getGraphics(): Graphics.Element {
//         let attrs = this.state.attributes;
//         let props = this.object.properties;
//         if (!attrs.visible) return null;
//         let rect = Graphics.makeRect(attrs.x1, attrs.y1, attrs.x2, attrs.y2, {
//             strokeColor: attrs.stroke,
//             strokeWidth: attrs.strokeWidth,
//             strokeLinejoin: "miter",
//             fillColor: attrs.fill,
//             opacity: attrs.opacity
//         });
//         this.textMeasure.setFontFamily(attrs.fontFamily);
//         this.textMeasure.setFontSize(attrs.fontSize);
//         let metrics = this.textMeasure.measure(attrs.text);
//         let cwidth = metrics.width;
//         let cheight = (metrics.middle - metrics.ideographicBaseline) * 2;
//         let [cx, cy] = this.getCenterOffset(props.alignment, cwidth, cheight);
//         let centerX = attrs.x1;
//         if (props.alignment.x == "left") centerX = attrs.x1;
//         else if (props.alignment.x == "middle") centerX = (attrs.x1 + attrs.x2) / 2;
//         else if (props.alignment.x == "right") centerX = attrs.x2;
//         let centerY = attrs.y1;
//         if (props.alignment.y == "top") centerY = attrs.y2;
//         else if (props.alignment.y == "middle") centerY = (attrs.y1 + attrs.y2) / 2;
//         else if (props.alignment.y == "bottom") centerY = attrs.y1;
//         let text = Graphics.makeText(centerX - cx, centerY - cheight + cy - metrics.ideographicBaseline, attrs.text, attrs.fontFamily, attrs.fontSize, {
//             strokeColor: attrs.textOutline,
//             fillColor: attrs.textColor,
//             opacity: attrs.opacity
//         });
//         return Graphics.makeGroup([rect, text]);
//     }

//     // Get DropZones given current state
//     public getDropZones(): DropZones.Description[] {
//         return [];
//     }
//     // Get bounding rectangle given current state
//     public getHandles(): Handles.Description[] {
//         let attrs = this.state.attributes;
//         let { x1, y1, x2, y2, cx, cy } = attrs;
//         return [
//             <Handles.Line>{
//                 type: "line", axis: "x",
//                 attribute: "x1",
//                 value: x1, span: [y1, y2]
//             },
//             <Handles.Line>{
//                 type: "line", axis: "x",
//                 attribute: "x2",
//                 value: x2, span: [y1, y2]
//             },
//             <Handles.Line>{
//                 type: "line", axis: "y",
//                 attribute: "y1",
//                 value: y1, span: [x1, x2]
//             },
//             <Handles.Line>{
//                 type: "line", axis: "y",
//                 attribute: "y2",
//                 value: y2, span: [x1, x2]
//             },
//             <Handles.Point>{
//                 type: "point",
//                 x: x1, y: y1,
//                 xAttribute: "x1", yAttribute: "y1"
//             },
//             <Handles.Point>{
//                 type: "point",
//                 x: x1, y: y2,
//                 xAttribute: "x1", yAttribute: "y2"
//             },
//             <Handles.Point>{
//                 type: "point",
//                 x: x2, y: y1,
//                 xAttribute: "x2", yAttribute: "y1"
//             },
//             <Handles.Point>{
//                 type: "point",
//                 x: x2, y: y2,
//                 xAttribute: "x2", yAttribute: "y2"
//             }
//         ]
//     }

//     public getBoundingBox(): BoundingBox.Description {
//         let attrs = this.state.attributes;
//         let { x1, y1, x2, y2 } = attrs;
//         return <BoundingBox.Rectangle>{
//             type: "rectangle",
//             cx: (x1 + x2) / 2,
//             cy: (y1 + y2) / 2,
//             width: Math.abs(x2 - x1),
//             height: Math.abs(y2 - y1),
//             rotation: 0
//         };
//     }

//     public getSnappingGuides(): SnappingGuides.Description[] {
//         let attrs = this.state.attributes;
//         let { x1, y1, x2, y2 } = attrs;
//         return [
//             <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
//             <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
//             <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
//             <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" }
//         ];
//     }

//     public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
//         let props = this.object.properties;
//         return [
//             manager.sectionHeader("Dimensions"),
//             manager.mappingEditorTOFIX("width"),
//             manager.mappingEditorTOFIX("height"),
//             manager.sectionHeader("Text"),
//             manager.mappingEditorTOFIX("text"),
//             manager.sectionHeader("Box Style"),
//             manager.mappingEditorTOFIX("fill"),
//             manager.mappingEditorTOFIX("stroke"),
//             manager.sectionHeader("Text Style"),
//             manager.mappingEditorTOFIX("textColor"),
//             manager.mappingEditorTOFIX("textOutline"),
//             manager.mappingEditorTOFIX("fontFamily"),
//             manager.mappingEditorTOFIX("fontSize"),
//             manager.row("Alignment X", manager.horizontal([0, 1],
//                 manager.inputSelect({ property: "alignment", field: "x" }, {
//                     type: "radio",
//                     icons: ["align/left", "align/x-middle", "align/right"],
//                     labels: ["Left", "Middle", "Right"],
//                     options: ["left", "middle", "right"]
//                 }),
//                 props.alignment.x != "middle" ? manager.horizontal([0, 1], manager.label("Margin:"), manager.inputNumber({ property: "alignment", field: "xMargin" })) : null,
//             )),
//             manager.row("Alignment Y", manager.horizontal([0, 1],
//                 manager.inputSelect({ property: "alignment", field: "y" }, {
//                     type: "radio",
//                     icons: ["align/top", "align/y-middle", "align/bottom"],
//                     labels: ["Top", "Middle", "Bottom"],
//                     options: ["top", "middle", "bottom"]
//                 }),
//                 props.alignment.y != "middle" ? manager.horizontal([0, 1], manager.label("Margin:"), manager.inputNumber({ property: "alignment", field: "yMargin" })) : null
//             )),
//             manager.mappingEditorTOFIX("opacity"),
//             manager.mappingEditorTOFIX("visible")
//         ];
//     }
// }

// ObjectClasses.Register(TextboxElement);

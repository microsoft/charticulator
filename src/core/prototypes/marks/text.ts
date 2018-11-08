// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Point } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver } from "../../solver";
import * as Specification from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  textAttributes,
  TextElementAttributes,
  TextElementProperties
} from "./text.attrs";

export { TextElementAttributes, TextElementProperties };

export class TextElementClass extends EmphasizableMarkClass<
  TextElementProperties,
  TextElementAttributes
> {
  public static classID = "mark.text";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Text",
    iconPath: "mark/text",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" }
    }
  };

  public static defaultMappingValues: Partial<TextElementAttributes> = {
    text: "Text",
    fontFamily: "Arial",
    fontSize: 14,
    color: { r: 0, g: 0, b: 0 },
    opacity: 1,
    visible: true
  };

  public static defaultProperties: Partial<TextElementProperties> = {
    alignment: { x: "middle", y: "top", xMargin: 5, yMargin: 5 },
    rotation: 0,
    visible: true
  };

  public attributes = textAttributes;
  public attributeNames = Object.keys(textAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    const attrs = this.state.attributes as TextElementAttributes;
    attrs.x = 0;
    attrs.y = 0;
    attrs.text = "Text";
    attrs.fontFamily = "Arial";
    attrs.fontSize = 14;
    attrs.color = {
      r: 0,
      g: 0,
      b: 0
    };
    attrs.visible = true;
    attrs.outline = null;
    attrs.opacity = 1;
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public buildConstraints(solver: ConstraintSolver): void {}

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex = 0,
    manager: ChartStateManager,
    empasized?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const metrics = Graphics.TextMeasurer.Measure(
      attrs.text,
      attrs.fontFamily,
      attrs.fontSize
    );
    const [dx, dy] = Graphics.TextMeasurer.ComputeTextPosition(
      0,
      0,
      metrics,
      props.alignment.x,
      props.alignment.y,
      props.alignment.xMargin,
      props.alignment.yMargin
    );
    const p = cs.getLocalTransform(attrs.x + offset.x, attrs.y + offset.y);
    p.angle += props.rotation;
    const text = Graphics.makeText(
      dx,
      dy,
      attrs.text,
      attrs.fontFamily,
      attrs.fontSize,
      {
        strokeColor: attrs.outline,
        fillColor: attrs.color,
        opacity: attrs.opacity,
        ...this.generateEmphasisStyle(empasized)
      }
    );
    const g = Graphics.makeGroup([text]);
    g.transform = p;
    return g;
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const props = this.object.properties;
    const attrs = this.state.attributes;
    const metrics = Graphics.TextMeasurer.Measure(
      attrs.text,
      attrs.fontFamily,
      attrs.fontSize
    );
    const [dx, dy] = Graphics.TextMeasurer.ComputeTextPosition(
      0,
      0,
      metrics,
      props.alignment.x,
      props.alignment.y,
      props.alignment.xMargin,
      props.alignment.yMargin
    );
    const cx = dx + metrics.width / 2;
    const cy = dy + metrics.middle;

    const rotation = this.object.properties.rotation;
    const cos = Math.cos((rotation / 180) * Math.PI);
    const sin = Math.sin((rotation / 180) * Math.PI);
    return [
      {
        type: "rectangle",
        ...this.getBoundingRectangle(),
        title: "text",
        dropAction: {
          scaleInference: {
            attribute: "text",
            attributeType: Specification.AttributeType.Text
          }
        }
      } as DropZones.Rectangle
    ];
    // return [
    //     <DropZones.Line>{
    //         type: "line",
    //         p1: { x: x - cx, y: y + cy + metrics.ideographicBaseline },
    //         p2: { x: x - cx + cwidth, y: y + cy + metrics.ideographicBaseline },
    //         title: "text",
    //         dropAction: { scaleInference: { attribute: "text", attributeType: "string" } },
    //     }
    // ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const { x, y, x1, y1, x2, y2 } = attrs;
    const bbox = this.getBoundingRectangle();
    return [
      {
        type: "point",
        x,
        y,
        actions: [
          { type: "attribute", source: "x", attribute: "x" },
          { type: "attribute", source: "y", attribute: "y" }
        ]
      } as Handles.Point,
      // <Handles.TextInput>{
      //     type: "text-input",
      //     cx: bbox.cx, cy: bbox.cy, width: bbox.width, height: bbox.height, rotation: bbox.rotation,
      //     text: attrs.text,
      //     attribute: "text"
      // },
      {
        type: "text-alignment",
        actions: [
          { type: "property", source: "alignment", property: "alignment" },
          { type: "property", source: "rotation", property: "rotation" },
          { type: "attribute-value-mapping", source: "text", attribute: "text" }
        ],
        textWidth: bbox.width,
        textHeight: bbox.height,
        anchorX: x,
        anchorY: y,
        text: attrs.text,
        alignment: props.alignment,
        rotation: props.rotation
      } as Handles.TextAlignment
    ];
  }

  public getBoundingRectangle() {
    const props = this.object.properties;
    const attrs = this.state.attributes;
    const metrics = Graphics.TextMeasurer.Measure(
      attrs.text,
      attrs.fontFamily,
      attrs.fontSize
    );
    const [dx, dy] = Graphics.TextMeasurer.ComputeTextPosition(
      0,
      0,
      metrics,
      props.alignment.x,
      props.alignment.y,
      props.alignment.xMargin,
      props.alignment.yMargin
    );
    const cx = dx + metrics.width / 2;
    const cy = dy + metrics.middle;

    const rotation = this.object.properties.rotation;
    const cos = Math.cos((rotation / 180) * Math.PI);
    const sin = Math.sin((rotation / 180) * Math.PI);
    return {
      cx: attrs.x + cx * cos - cy * sin,
      cy: attrs.y + cx * sin + cy * cos,
      width: metrics.width,
      height: (metrics.middle - metrics.ideographicBaseline) * 2,
      rotation
    };
  }

  public getBoundingBox(): BoundingBox.Description {
    const rect = this.getBoundingRectangle();
    const attrs = this.state.attributes;
    return {
      type: "anchored-rectangle",
      anchorX: attrs.x,
      anchorY: attrs.y,
      cx: rect.cx - attrs.x,
      cy: rect.cy - attrs.y,
      width: rect.width,
      height: rect.height,
      rotation: rect.rotation
    } as BoundingBox.AnchoredRectangle;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x, y, x1, y1, x2, y2 } = attrs;
    return [
      { type: "x", value: x, attribute: "x" } as SnappingGuides.Axis,
      { type: "y", value: y, attribute: "y" } as SnappingGuides.Axis
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    return [
      manager.sectionHeader("Text"),
      manager.mappingEditor("Text", "text", {}),
      manager.mappingEditor("Font", "fontFamily", {
        defaultValue: "Arial"
      }),
      manager.mappingEditor("Size", "fontSize", {
        hints: { rangeNumber: [0, 36] },
        defaultValue: 14,
        numberOptions: {
          showUpdown: true,
          updownStyle: "font",
          minimum: 0,
          updownTick: 2
        }
      }),
      manager.sectionHeader("Anchor & Rotation"),
      manager.row(
        "Anchor X",
        manager.horizontal(
          [0, 1],
          manager.inputSelect(
            { property: "alignment", field: "x" },
            {
              type: "radio",
              icons: [
                "text-align/left",
                "text-align/x-middle",
                "text-align/right"
              ],
              labels: ["Left", "Middle", "Right"],
              options: ["left", "middle", "right"]
            }
          ),
          props.alignment.x != "middle"
            ? manager.horizontal(
                [0, 1],
                manager.label("Margin:"),
                manager.inputNumber(
                  { property: "alignment", field: "xMargin" },
                  {
                    updownTick: 1,
                    showUpdown: true
                  }
                )
              )
            : null
        )
      ),
      manager.row(
        "Anchor Y",
        manager.horizontal(
          [0, 1],
          manager.inputSelect(
            { property: "alignment", field: "y" },
            {
              type: "radio",
              icons: [
                "text-align/top",
                "text-align/y-middle",
                "text-align/bottom"
              ],
              labels: ["Top", "Middle", "Bottom"],
              options: ["top", "middle", "bottom"]
            }
          ),
          props.alignment.y != "middle"
            ? manager.horizontal(
                [0, 1],
                manager.label("Margin:"),
                manager.inputNumber(
                  { property: "alignment", field: "yMargin" },
                  {
                    updownTick: 1,
                    showUpdown: true
                  }
                )
              )
            : null
        )
      ),
      // manager.row("Rotation", manager.inputNumber({ property: "rotation" })),
      manager.sectionHeader("Style"),
      manager.mappingEditor("Color", "color", {}),
      manager.mappingEditor("Outline", "outline", {}),
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      }),
      manager.mappingEditor("Visibility", "visible", {
        defaultValue: true
      })
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    if (
      this.object.mappings.text &&
      this.object.mappings.text.type != "value"
    ) {
      return null;
    } else {
      return {
        properties: [
          {
            objectID: this.object._id,
            target: {
              attribute: "text"
            },
            type: Specification.AttributeType.Text,
            default: this.state.attributes.text
          }
        ]
      };
    }
  }
}

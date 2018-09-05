import { Color, Point } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver } from "../../solver";
import * as Specification from "../../specification";
import {
  AttributeDescription,
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClasses,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters
} from "../common";
import { MarkClass } from "./index";

export interface TextElementAttributes extends Specification.AttributeMap {
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: Color;
  outline: Color;
  opacity: number;
  visible: boolean;
}

export interface TextElementProperties extends Specification.AttributeMap {
  alignment: Specification.Types.TextAlignment;
  rotation: number;
}

export interface TextElementState extends Specification.MarkState {
  attributes: TextElementAttributes;
}

export interface TextElementObject extends Specification.Element {
  properties: TextElementProperties;
}

export class TextElement extends MarkClass {
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

  public static defaultMappingValues: Specification.AttributeMap = {
    text: "Text",
    fontFamily: "Arial",
    fontSize: 14,
    color: { r: 0, g: 0, b: 0 },
    opacity: 1,
    visible: true
  };

  public static defaultProperties: Specification.AttributeMap = {
    alignment: { x: "middle", y: "top", xMargin: 5, yMargin: 5 },
    rotation: 0,
    visible: true
  };

  public readonly state: TextElementState;
  public readonly object: TextElementObject;

  private textMeasure = new Graphics.TextMeasurer();

  // Get a list of elemnt attributes
  public attributeNames: string[] = [
    "x",
    "y",
    "text",
    "fontFamily",
    "fontSize",
    "color",
    "outline",
    "opacity",
    "visible"
  ];
  public attributes: { [name: string]: AttributeDescription } = {
    x: { name: "x", type: "number", mode: "positional" },
    y: { name: "y", type: "number", mode: "positional" },
    text: {
      name: "text",
      type: "string",
      category: "text",
      displayName: "Text",
      solverExclude: true,
      defaultValue: ""
    },
    fontFamily: {
      name: "fontFamily",
      type: "string",
      category: "text",
      displayName: "Font",
      solverExclude: true,
      defaultValue: "Arial"
    },
    fontSize: {
      name: "fontSize",
      type: "number",
      category: "text",
      displayName: "Size",
      solverExclude: true,
      defaultRange: [0, 24],
      defaultValue: 14
    },
    color: {
      name: "color",
      type: "color",
      category: "style",
      displayName: "Color",
      solverExclude: true,
      defaultValue: null
    },
    outline: {
      name: "outline",
      type: "color",
      category: "style",
      displayName: "Outline",
      solverExclude: true,
      defaultValue: null
    },
    opacity: {
      name: "opacity",
      type: "number",
      category: "style",
      displayName: "Opacity",
      solverExclude: true,
      defaultValue: 1,
      defaultRange: [0, 1]
    },
    visible: {
      name: "visible",
      type: "boolean",
      category: "style",
      displayName: "Visible",
      solverExclude: true,
      defaultValue: true
    }
  };

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

  public getCenterOffset(
    alignment: Specification.Types.TextAlignment,
    width: number,
    height: number
  ): [number, number] {
    let cx: number = width / 2,
      cy: number = height / 2;
    if (alignment.x == "left") {
      cx = -alignment.xMargin;
    }
    if (alignment.x == "right") {
      cx = width + alignment.xMargin;
    }
    if (alignment.y == "top") {
      cy = -alignment.yMargin;
    }
    if (alignment.y == "bottom") {
      cy = height + alignment.yMargin;
    }
    return [cx, cy];
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public buildConstraints(solver: ConstraintSolver): void {}

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    this.textMeasure.setFontFamily(attrs.fontFamily);
    this.textMeasure.setFontSize(attrs.fontSize);
    const metrics = this.textMeasure.measure(attrs.text);
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
        opacity: attrs.opacity
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
    this.textMeasure.setFontFamily(attrs.fontFamily);
    this.textMeasure.setFontSize(attrs.fontSize);
    const metrics = this.textMeasure.measure(attrs.text);
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
    const cos = Math.cos(rotation / 180 * Math.PI);
    const sin = Math.sin(rotation / 180 * Math.PI);
    return [
      {
        type: "rectangle",
        ...this.getBoundingRectangle(),
        title: "text",
        dropAction: {
          scaleInference: { attribute: "text", attributeType: "string" }
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
    this.textMeasure.setFontFamily(attrs.fontFamily);
    this.textMeasure.setFontSize(attrs.fontSize);
    const metrics = this.textMeasure.measure(attrs.text);
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
    const cos = Math.cos(rotation / 180 * Math.PI);
    const sin = Math.sin(rotation / 180 * Math.PI);
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
      manager.mappingEditor("Text", "text", "string", {}),
      manager.mappingEditor("Font", "fontFamily", "font-family", {
        defaultValue: "Arial"
      }),
      manager.mappingEditor("Size", "fontSize", "number", {
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
                manager.inputNumber({ property: "alignment", field: "xMargin" })
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
                manager.inputNumber({ property: "alignment", field: "yMargin" })
              )
            : null
        )
      ),
      // manager.row("Rotation", manager.inputNumber({ property: "rotation" })),
      manager.sectionHeader("Style"),
      manager.mappingEditor("Color", "color", "color", {}),
      manager.mappingEditor("Outline", "outline", "color", {}),
      manager.mappingEditor("Opacity", "opacity", "number", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      }),
      manager.mappingEditor("Visibility", "visible", "boolean", {
        defaultValue: true
      })
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    if (
      this.object.mappings.text &&
      this.object.mappings.text.type == "scale"
    ) {
      return null;
    } else {
      return {
        properties: [
          {
            mode: "attribute",
            attribute: "text",
            type: "string",
            default: this.state.attributes.text
          } as Specification.Template.Property
        ]
      };
    }
  }
}

ObjectClasses.Register(TextElement);

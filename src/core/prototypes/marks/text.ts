/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { defaultFont, defaultFontSize } from "../../../app/stores/defaults";
import { strings } from "../../../strings";
import {
  Point,
  replaceNewLineBySymbol,
  splitStringByNewLine,
  rgbToHex,
  Geometry,
  getRandomNumber,
} from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver } from "../../solver";
import * as Specification from "../../specification";
import { MappingType } from "../../specification";
import {
  TextAlignmentHorizontal,
  TextAlignmentVertical,
} from "../../specification/types";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClass,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters,
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  textAttributes,
  TextElementAttributes,
  TextElementProperties,
} from "./text.attrs";
import { RectangleGlyph } from "../glyphs";

export { TextElementAttributes, TextElementProperties };

export class TextElementClass extends EmphasizableMarkClass<
  TextElementProperties,
  TextElementAttributes
> {
  public static classID = "mark.text";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Text",
    iconPath: "FontColorA",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" },
    },
  };

  public static defaultMappingValues: Partial<TextElementAttributes> = {
    ...ObjectClass.defaultProperties,
    text: "Text",
    fontFamily: defaultFont,
    fontSize: defaultFontSize,
    color: { r: 0, g: 0, b: 0 },
    opacity: 1,
    visible: true,
  };

  public static defaultProperties: Partial<TextElementProperties> = {
    ...ObjectClass.defaultProperties,
    alignment: {
      x: TextAlignmentHorizontal.Middle,
      y: TextAlignmentVertical.Top,
      xMargin: 5,
      yMargin: 5,
    },
    rotation: 0,
    visible: true,
  };

  public attributes = textAttributes;
  public attributeNames = Object.keys(textAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    const attrs = <TextElementAttributes>this.state.attributes;
    attrs.x = 0;
    attrs.y = 0;
    attrs.text = "Text";
    attrs.fontFamily = defaultFont;
    attrs.fontSize = defaultFontSize;
    attrs.color = {
      r: 0,
      g: 0,
      b: 0,
    };
    attrs.backgroundColor = null;
    attrs.backgroundColorFilterId = `text-color-filter-${getRandomNumber()}`;
    attrs.visible = true;
    attrs.outline = null;
    attrs.opacity = 1;
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  // eslint-disable-next-line
  public buildConstraints(solver: ConstraintSolver): void {}

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    // eslint-disable-next-line
    glyphIndex = 0,
    // eslint-disable-next-line
    manager: ChartStateManager,
    emphasized?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    if (!attrs.backgroundColorFilterId) {
      attrs.backgroundColorFilterId = `text-color-filter-${getRandomNumber()}`;
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
    let text: Graphics.Element = null;
    const textContent =
      attrs.text && splitStringByNewLine(replaceNewLineBySymbol(attrs.text));
    if (textContent && textContent.length > 1) {
      const height = attrs.fontSize;
      const lines: Graphics.Element[] = [];
      for (let index = 0; index < textContent.length; index++) {
        lines.push(
          Graphics.makeText(
            dx,
            dy - height * index,
            textContent[index],
            attrs.fontFamily,
            attrs.fontSize,
            {
              strokeColor: attrs.outline,
              fillColor: attrs.color,
              backgroundColor: attrs.backgroundColor,
              backgroundColorId: attrs.backgroundColorFilterId,
              opacity: attrs.opacity,
              ...this.generateEmphasisStyle(emphasized),
            }
          )
        );
      }
      text = Graphics.makeGroup(lines);
    } else {
      text = Graphics.makeText(
        dx,
        dy,
        attrs.text,
        attrs.fontFamily,
        attrs.fontSize,
        {
          strokeColor: attrs.outline,
          fillColor: attrs.color,
          backgroundColor: attrs.backgroundColor,
          backgroundColorId: attrs.backgroundColorFilterId,
          opacity: attrs.opacity,
          ...this.generateEmphasisStyle(emphasized),
        }
      );
    }
    const g = Graphics.makeGroup([text]);
    g.transform = p;
    return g;
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    return [
      <DropZones.Rectangle>{
        type: "rectangle",
        ...this.getBoundingRectangle(),
        title: "text",
        dropAction: {
          scaleInference: {
            attribute: "text",
            attributeType: Specification.AttributeType.Text,
          },
        },
        accept: {
          table: (this.parent as RectangleGlyph).object.table,
        },
      },
    ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const { x, y } = attrs;
    const bbox = this.getBoundingRectangle();
    return [
      <Handles.Point>{
        type: "point",
        x,
        y,
        actions: [
          { type: "attribute", source: "x", attribute: "x" },
          { type: "attribute", source: "y", attribute: "y" },
        ],
      },
      <Handles.TextAlignment>{
        type: "text-alignment",
        actions: [
          { type: "property", source: "alignment", property: "alignment" },
          { type: "property", source: "rotation", property: "rotation" },
          {
            type: "attribute-value-mapping",
            source: "text",
            attribute: "text",
          },
        ],
        textWidth: bbox.width,
        textHeight: bbox.height,
        anchorX: x,
        anchorY: y,
        text: attrs.text,
        alignment: props.alignment,
        rotation: props.rotation,
      },
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
    const cos = Math.cos(Geometry.degreesToRadians(rotation));
    const sin = Math.sin(Geometry.degreesToRadians(rotation));
    return {
      cx: attrs.x + cx * cos - cy * sin,
      cy: attrs.y + cx * sin + cy * cos,
      width: metrics.width,
      height: (metrics.middle - metrics.ideographicBaseline) * 2,
      rotation,
    };
  }

  public getBoundingBox(): BoundingBox.Description {
    const rect = this.getBoundingRectangle();
    const attrs = this.state.attributes;
    return <BoundingBox.AnchoredRectangle>{
      type: "anchored-rectangle",
      anchorX: attrs.x,
      anchorY: attrs.y,
      cx: rect.cx - attrs.x,
      cy: rect.cy - attrs.y,
      width: rect.width,
      height: rect.height,
      rotation: rect.rotation,
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x, y } = attrs;
    return [
      <SnappingGuides.Axis>{ type: "x", value: x, attribute: "x" },
      <SnappingGuides.Axis>{ type: "y", value: y, attribute: "y" },
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const parentWidgets = super.getAttributePanelWidgets(manager);
    const props = this.object.properties;
    return [
      manager.verticalGroup(
        {
          header: strings.objects.general,
        },
        [
          manager.mappingEditor(strings.toolbar.text, "text", {
            searchSection: strings.objects.general,
          }),
          manager.mappingEditor(strings.objects.font, "fontFamily", {
            defaultValue: defaultFont,
            searchSection: strings.objects.general,
          }),
          manager.mappingEditor(strings.objects.size, "fontSize", {
            hints: { rangeNumber: [0, 36] },
            defaultValue: defaultFontSize,
            numberOptions: {
              showUpdown: true,
              updownStyle: "font",
              minimum: 0,
              updownTick: 2,
            },
            searchSection: strings.objects.general,
          }),
          manager.mappingEditor(
            strings.objects.visibleOn.visibility,
            "visible",
            {
              defaultValue: true,
              searchSection: strings.objects.general,
            }
          ),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.anchorAndRotation,
        },
        [
          manager.inputSelect(
            { property: "alignment", field: "x" },
            {
              type: "radio",
              icons: [
                "AlignHorizontalLeft",
                "AlignHorizontalCenter",
                "AlignHorizontalRight",
              ],
              labels: ["Left", "Middle", "Right"],
              options: ["left", "middle", "right"],
              label: strings.objects.anchorX,
              searchSection: strings.objects.anchorAndRotation,
            }
          ),
          props.alignment.x != "middle"
            ? manager.inputNumber(
                { property: "alignment", field: "xMargin" },
                {
                  updownTick: 1,
                  showUpdown: true,
                  label: "Margin",
                  searchSection: strings.objects.anchorAndRotation,
                }
              )
            : null,
          manager.inputSelect(
            { property: "alignment", field: "y" },
            {
              type: "radio",
              icons: [
                "AlignVerticalTop",
                "AlignVerticalCenter",
                "AlignVerticalBottom",
              ],
              labels: ["Top", "Middle", "Bottom"],
              options: ["top", "middle", "bottom"],
              label: strings.objects.anchorY,
              searchSection: strings.objects.anchorAndRotation,
            }
          ),
          props.alignment.y != "middle"
            ? manager.inputNumber(
                { property: "alignment", field: "yMargin" },
                {
                  updownTick: 1,
                  showUpdown: true,
                  label: strings.objects.text.margin,
                  searchSection: strings.objects.anchorAndRotation,
                }
              )
            : null,
          manager.inputNumber(
            { property: "rotation" },
            {
              label: strings.objects.rotation,
              showUpdown: true,
              updownTick: 1,
              searchSection: strings.objects.anchorAndRotation,
            }
          ),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.style,
        },
        [
          manager.mappingEditor(strings.objects.color, "color", {
            searchSection: strings.objects.style,
          }),
          manager.mappingEditor(strings.objects.outline, "outline", {
            searchSection: strings.objects.style,
          }),
          manager.mappingEditor(strings.objects.background, "backgroundColor", {
            defaultValue: null,
            searchSection: strings.objects.style,
          }),
          manager.mappingEditor(strings.objects.opacity, "opacity", {
            hints: { rangeNumber: [0, 1] },
            defaultValue: 1,
            numberOptions: {
              showSlider: true,
              minimum: 0,
              maximum: 1,
              step: 0.1,
            },
            searchSection: strings.objects.style,
          }),
        ]
      ),
    ].concat(parentWidgets);
  }

  public getTemplateParameters(): TemplateParameters {
    const properties = [];
    if (
      this.object.mappings.fontFamily &&
      this.object.mappings.fontFamily.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "fontFamily",
        },
        type: Specification.AttributeType.FontFamily,
        default: this.state.attributes.fontFamily,
      });
    }
    if (
      this.object.mappings.fontSize &&
      this.object.mappings.fontSize.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "fontSize",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.fontSize,
      });
    }
    if (
      this.object.mappings.color &&
      this.object.mappings.color.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "color",
        },
        type: Specification.AttributeType.Color,
        default: rgbToHex(this.state.attributes.color),
      });
    }
    if (
      this.object.mappings.backgroundColor &&
      this.object.mappings.backgroundColor.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "backgroundColor",
        },
        type: Specification.AttributeType.Color,
        default: null,
      });
    }
    if (
      this.object.mappings.visible &&
      this.object.mappings.visible.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "visible",
        },
        type: Specification.AttributeType.Boolean,
        default: this.state.attributes.visible,
      });
    }
    if (
      this.object.mappings.opacity &&
      this.object.mappings.opacity.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "opacity",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.opacity,
      });
    }
    if (
      this.object.mappings.text &&
      this.object.mappings.text.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "text",
        },
        type: Specification.AttributeType.Text,
        default: this.state.attributes.text,
      });
    }

    return {
      properties,
    };
  }
}

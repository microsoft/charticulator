// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { defaultFont, defaultFontSize } from "../../../app/stores/defaults";
import { strings } from "../../../strings";
import {
  getRandomNumber,
  Point,
  replaceNewLineBySymbol,
  replaceSymbolByNewLine,
  replaceSymbolByTab,
  rgbToHex,
  splitStringByNewLine,
} from "../../common";
import * as Graphics from "../../graphics";
import { splitByWidth } from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { MappingType } from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClass,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters,
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  textboxAttributes,
  TextboxElementAttributes,
  TextboxElementProperties,
} from "./textbox.attrs";
import { RectangleGlyph } from "../glyphs";

export { TextboxElementAttributes, TextboxElementProperties };

export class TextboxElementClass extends EmphasizableMarkClass<
  TextboxElementProperties,
  TextboxElementAttributes
> {
  public static classID = "mark.textbox";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Textbox",
    iconPath: "TextField",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public static defaultProperties: Partial<TextboxElementProperties> = {
    ...ObjectClass.defaultProperties,
    visible: true,
    paddingX: 0,
    paddingY: 0,
    alignX: "middle",
    alignY: "middle",
    wordWrap: false,
    overFlow: true,
    alignText: "start",
  };

  public static defaultMappingValues: Partial<TextboxElementAttributes> = {
    text: "Text",
    fontFamily: defaultFont,
    fontSize: defaultFontSize,
    color: { r: 0, g: 0, b: 0 },
    opacity: 1,
    visible: true,
  };

  public attributes = textboxAttributes;
  public attributeNames = Object.keys(textboxAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    const defaultWidth = 30;
    const defaultHeight = 50;
    const attrs = this.state.attributes;
    attrs.x1 = -defaultWidth / 2;
    attrs.y1 = -defaultHeight / 2;
    attrs.x2 = +defaultWidth / 2;
    attrs.y2 = +defaultHeight / 2;
    attrs.cx = 0;
    attrs.cy = 0;
    attrs.width = defaultWidth;
    attrs.height = defaultHeight;
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
    attrs.text = null;
    attrs.fontFamily = defaultFont;
    attrs.fontSize = defaultFontSize;
  }

  // eslint-disable-next-line
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const parentWidgets = super.getAttributePanelWidgets(manager);
    const widgets: Controls.Widget[] = [
      manager.verticalGroup(
        {
          header: strings.objects.general,
        },
        [
          manager.mappingEditor(strings.objects.width, "width", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.objects.general,
          }),
          manager.mappingEditor(strings.objects.height, "height", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
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
          header: strings.toolbar.text,
        },
        [
          manager.mappingEditor(strings.toolbar.text, "text", {
            searchSection: strings.toolbar.text,
          }),
          manager.mappingEditor(strings.objects.font, "fontFamily", {
            defaultValue: defaultFont,
            searchSection: strings.toolbar.text,
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
            searchSection: strings.toolbar.text,
          }),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.layout,
        },
        [
          manager.inputSelect(
            { property: "alignX" },
            {
              type: "radio",
              options: ["start", "middle", "end"],
              icons: [
                "AlignHorizontalLeft",
                "AlignHorizontalCenter",
                "AlignHorizontalRight",
              ],
              labels: [
                strings.alignment.left,
                strings.alignment.middle,
                strings.alignment.right,
              ],
              label: strings.objects.alignX,
              searchSection: strings.objects.layout,
            }
          ),
          props.alignX != "middle"
            ? manager.inputNumber(
                { property: "paddingX" },
                {
                  updownTick: 1,
                  showUpdown: true,
                  label: strings.objects.text.margin,
                  searchSection: strings.objects.layout,
                }
              )
            : null,
          manager.inputSelect(
            { property: "alignY" },
            {
              type: "radio",
              options: ["start", "middle", "end"],
              icons: [
                "AlignVerticalBottom",
                "AlignVerticalCenter",
                "AlignVerticalTop",
              ],
              labels: [
                strings.alignment.bottom,
                strings.alignment.middle,
                strings.alignment.top,
              ],
              label: strings.objects.alignX,
              searchSection: strings.objects.layout,
            }
          ),
          props.alignY != "middle"
            ? manager.inputNumber(
                { property: "paddingY" },
                {
                  updownTick: 1,
                  showUpdown: true,
                  label: strings.objects.text.margin,
                  searchSection: strings.objects.layout,
                }
              )
            : null,
          manager.inputBoolean(
            { property: "wordWrap" },
            {
              type: "checkbox",
              headerLabel: strings.objects.text.textDisplaying,
              label: strings.objects.text.wrapText,
              searchSection: strings.objects.layout,
            }
          ),
          props.wordWrap
            ? manager.inputBoolean(
                { property: "overFlow" },
                {
                  type: "checkbox",
                  label: strings.objects.text.overflow,
                  searchSection: strings.objects.layout,
                }
              )
            : null,
          props.wordWrap
            ? manager.inputSelect(
                { property: "alignText" },
                {
                  type: "radio",
                  options: ["end", "middle", "start"],
                  icons: [
                    "AlignVerticalBottom",
                    "AlignVerticalCenter",
                    "AlignVerticalTop",
                  ],
                  labels: [
                    strings.alignment.bottom,
                    strings.alignment.middle,
                    strings.alignment.top,
                  ],
                  label: strings.alignment.alignment,
                  searchSection: strings.objects.layout,
                }
              )
            : null,
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
    ];
    return widgets.concat(parentWidgets);
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public buildConstraints(solver: ConstraintSolver): void {
    const [x1, y1, x2, y2, cx, cy, width, height] = solver.attrs(
      this.state.attributes,
      ["x1", "y1", "x2", "y2", "cx", "cy", "width", "height"]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [
        [1, x2],
        [-1, x1],
      ],
      [[1, width]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [
        [1, y2],
        [-1, y1],
      ],
      [[1, height]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, cx]],
      [
        [1, x1],
        [1, x2],
      ]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, cy]],
      [
        [1, y1],
        [1, y2],
      ]
    );
  }

  // Get the graphical element from the element
  // eslint-disable-next-line
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    // eslint-disable-next-line
    glyphIndex: number,
    // eslint-disable-next-line
    manager: ChartStateManager
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (
      !attrs.text ||
      (!attrs.color && !attrs.outline) ||
      !attrs.visible ||
      attrs.opacity == 0
    ) {
      return Graphics.makeGroup([]);
    }
    if (!attrs.backgroundColorFilterId) {
      attrs.backgroundColorFilterId = `text-color-filter-${getRandomNumber()}`;
    }
    const metrics = Graphics.TextMeasurer.Measure(
      attrs.text,
      attrs.fontFamily,
      attrs.fontSize
    );
    const helper = new Graphics.CoordinateSystemHelper(cs);
    const cheight = (metrics.middle - metrics.ideographicBaseline) * 2;
    let y = 0;
    switch (props.alignY) {
      case "start":
        {
          y = attrs.y1 - metrics.ideographicBaseline + props.paddingY;
        }
        break;
      case "middle":
        {
          y = attrs.cy - cheight / 2 - metrics.ideographicBaseline;
        }
        break;
      case "end":
        {
          y = attrs.y2 - cheight - metrics.ideographicBaseline - props.paddingY;
        }
        break;
    }
    let textElement: Graphics.Element;
    const applyStyles = (
      textElement: Graphics.TextOnPath,
      attrs: TextboxElementAttributes
    ) => {
      if (attrs.outline) {
        if (attrs.color) {
          const g = Graphics.makeGroup([
            <Graphics.TextOnPath>{
              ...textElement,
              style: {
                strokeColor: attrs.outline,
              },
            },
            <Graphics.TextOnPath>{
              ...textElement,
              style: {
                fillColor: attrs.color,
              },
            },
          ]);
          g.style = { opacity: attrs.opacity };
          return g;
        } else {
          return <Graphics.TextOnPath>{
            ...textElement,
            style: {
              strokeColor: attrs.outline,
              opacity: attrs.opacity,
            },
          };
        }
      } else {
        return <Graphics.TextOnPath>{
          ...textElement,
          style: {
            fillColor: attrs.color,
            opacity: attrs.opacity,
          },
        };
      }
    };
    const textContent = replaceNewLineBySymbol(attrs.text);
    if (
      (textContent && splitStringByNewLine(textContent).length > 1) ||
      props.wordWrap
    ) {
      const height = attrs.fontSize;
      // set limit of lines depends of height bounding box
      let maxLines = 1000;
      // if option enabled and no space for rest of text, set limit of lines count
      if (!props.overFlow) {
        maxLines = Math.floor(Math.abs(attrs.y2 - attrs.y1) / height);
      }

      let textContentList = [textContent];
      // auto wrap text content
      if (props.wordWrap) {
        textContentList = splitByWidth(
          replaceSymbolByTab(replaceSymbolByNewLine(attrs.text)),
          Math.abs(attrs.x2 - attrs.x1) - 10,
          maxLines,
          attrs.fontFamily,
          attrs.fontSize
        );
      }
      // add user input wrap
      textContentList = textContentList.flatMap((line) =>
        splitStringByNewLine(line)
      );
      const lines: Graphics.Element[] = [];
      let textBoxShift = 0;

      switch (props.alignY) {
        case "start":
          {
            switch (props.alignText) {
              case "start":
                textBoxShift = -height;
                break;
              case "middle":
                textBoxShift = (textContentList.length * height) / 2 - height;
                break;
              case "end":
                textBoxShift = textContentList.length * height - height;
                break;
            }
          }
          break;
        case "middle":
          {
            switch (props.alignText) {
              case "start":
                textBoxShift = -height / 2;
                break;
              case "middle":
                textBoxShift =
                  (textContentList.length * height) / 2 - height / 2;
                break;
              case "end":
                textBoxShift = textContentList.length * height - height / 2;
                break;
            }
          }
          break;
        case "end":
          {
            switch (props.alignText) {
              case "start":
                textBoxShift = 0;
                break;
              case "middle":
                textBoxShift = (textContentList.length * height) / 2;
                break;
              case "end":
                textBoxShift = textContentList.length * height;
                break;
            }
          }
          break;
      }

      for (let index = 0; index < textContentList.length; index++) {
        const pathMaker = new Graphics.PathMaker();
        helper.lineTo(
          pathMaker,
          attrs.x1 + offset.x + props.paddingX,
          y + offset.y + textBoxShift - height * index,
          attrs.x2 + offset.x - props.paddingX,
          y + offset.y + textBoxShift - height * index,
          true
        );
        const cmds = pathMaker.path.cmds;

        const textElement = applyStyles(
          <Graphics.TextOnPath>{
            key: index,
            type: "text-on-path",
            pathCmds: cmds,
            text: textContentList[index],
            fontFamily: attrs.fontFamily,
            fontSize: attrs.fontSize,
            align: props.alignX,
          },
          attrs
        );
        lines.push(textElement);
      }

      return Graphics.makeGroup(lines);
    } else {
      const pathMaker = new Graphics.PathMaker();
      helper.lineTo(
        pathMaker,
        attrs.x1 + offset.x + props.paddingX,
        y + offset.y,
        attrs.x2 + offset.x - props.paddingX,
        y + offset.y,
        true
      );
      const cmds = pathMaker.path.cmds;
      textElement = <Graphics.TextOnPath>{
        type: "text-on-path",
        pathCmds: cmds,
        text: attrs.text,
        fontFamily: attrs.fontFamily,
        fontSize: attrs.fontSize,
        align: props.alignX,
      };
      const background = <Graphics.Rect>{
        type: "rect",
        x1: attrs.x1 + offset.x,
        y1: attrs.y1 + offset.y,
        x2: attrs.x2 + offset.x,
        y2: attrs.y2 + offset.y,
        style: {
          fillColor: attrs.backgroundColor,
        },
      };
      return Graphics.makeGroup([
        background,
        applyStyles(<Graphics.TextOnPath>textElement, attrs),
      ]);
    }
  }

  /** Get link anchors for this mark */
  // eslint-disable-next-line
  public getLinkAnchors(): LinkAnchor.Description[] {
    const attrs = this.state.attributes;
    const element = this.object._id;
    return [
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y1,
            xAttribute: "x1",
            yAttribute: "y1",
            direction: { x: -1, y: 0 },
          },
          {
            x: attrs.x1,
            y: attrs.y2,
            xAttribute: "x1",
            yAttribute: "y2",
            direction: { x: -1, y: 0 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.x2,
            y: attrs.y1,
            xAttribute: "x2",
            yAttribute: "y1",
            direction: { x: 1, y: 0 },
          },
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: 1, y: 0 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y1,
            xAttribute: "x1",
            yAttribute: "y1",
            direction: { x: 0, y: -1 },
          },
          {
            x: attrs.x2,
            y: attrs.y1,
            xAttribute: "x2",
            yAttribute: "y1",
            direction: { x: 0, y: -1 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y2,
            xAttribute: "x1",
            yAttribute: "y2",
            direction: { x: 0, y: 1 },
          },
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: 0, y: 1 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.cx,
            y: attrs.y1,
            xAttribute: "cx",
            yAttribute: "y1",
            direction: { x: 0, y: -1 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.cx,
            y: attrs.y2,
            xAttribute: "cx",
            yAttribute: "y2",
            direction: { x: 0, y: 1 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.cy,
            xAttribute: "x1",
            yAttribute: "cy",
            direction: { x: -1, y: 0 },
          },
        ],
      },
      {
        element,
        points: [
          {
            x: attrs.x2,
            y: attrs.cy,
            xAttribute: "x2",
            yAttribute: "cy",
            direction: { x: 1, y: 0 },
          },
        ],
      },
    ];
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      <DropZones.Line>{
        type: "line",
        p1: { x: x2, y: y1 },
        p2: { x: x1, y: y1 },
        title: "width",
        accept: {
          kind: Specification.DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
        dropAction: {
          scaleInference: {
            attribute: "width",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      },
      <DropZones.Line>{
        type: "line",
        p1: { x: x1, y: y1 },
        p2: { x: x1, y: y2 },
        title: "height",
        accept: {
          kind: Specification.DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
        dropAction: {
          scaleInference: {
            attribute: "height",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      },
    ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      <Handles.Line>{
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x1" }],
        value: x1,
        span: [y1, y2],
      },
      <Handles.Line>{
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2],
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2],
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2],
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return <BoundingBox.Rectangle>{
      type: "rectangle",
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0,
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
      <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
      <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
      <SnappingGuides.Axis>{ type: "x", value: cx, attribute: "cx" },
      <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
      <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" },
      <SnappingGuides.Axis>{ type: "y", value: cy, attribute: "cy" },
    ];
  }

  // eslint-disable-next-line
  public getTemplateParameters(): TemplateParameters {
    const properties = [];
    if (
      this.object.mappings.visible &&
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
    if (this.object.properties.wordWrap !== undefined) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "wordWrap",
        },
        type: Specification.AttributeType.Boolean,
        default: this.object.properties.wordWrap,
      });
    }

    return {
      properties,
    };
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color, Point, rgbToHex } from "../../common";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { DataKind, MappingType } from "../../specification";
import {
  lineAttributes,
  LineElementAttributes,
  LineElementProperties,
} from "./line.attrs";

import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClass,
  ObjectClassMetadata,
  SnappingGuides,
  strokeStyleToDashArray,
  TemplateParameters,
} from "../common";

import * as Graphics from "../../graphics";
import { EmphasizableMarkClass } from "./emphasis";
import { ChartStateManager } from "../state";
import { strings } from "../../../strings";
import { RectangleGlyph } from "../glyphs";

export { LineElementAttributes, LineElementProperties };

export class LineElementClass extends EmphasizableMarkClass<
  LineElementProperties,
  LineElementAttributes
> {
  public static classID = "mark.line";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Line",
    iconPath: "Line",
    creatingInteraction: {
      type: "line-segment",
      mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" },
    },
  };

  public static defaultProperties: Partial<LineElementProperties> = {
    ...ObjectClass.defaultProperties,
    strokeStyle: "solid",
    visible: true,
  };

  public static defaultMappingValues: Partial<LineElementAttributes> = {
    stroke: { r: 0, g: 0, b: 0 },
    strokeWidth: 1,
    opacity: 1,
    visible: true,
  };

  public attributes = lineAttributes;
  public attributeNames = Object.keys(lineAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    super.initializeState();

    const defaultWidth = 30;
    const defaultHeight = 50;
    const attrs = this.state.attributes;
    attrs.x1 = -defaultWidth / 2;
    attrs.y1 = -defaultHeight / 2;
    attrs.x2 = +defaultWidth / 2;
    attrs.y2 = +defaultHeight / 2;
    attrs.cx = 0;
    attrs.cy = 0;
    attrs.dx = 0;
    attrs.dy = 0;
    attrs.stroke = { r: 0, g: 0, b: 0 };
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
  }

  /** Get link anchors for this mark */
  public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] {
    const attrs = this.state.attributes;
    return [
      {
        element: this.object._id,
        points: [
          {
            x: attrs.cx,
            y: attrs.cy,
            xAttribute: "cx",
            yAttribute: "cy",
            direction: { x: mode == "begin" ? 1 : -1, y: 0 },
          },
        ],
      },
      {
        element: this.object._id,
        points: [
          {
            x: attrs.x1,
            y: attrs.y1,
            xAttribute: "x1",
            yAttribute: "y1",
            direction: { x: mode == "begin" ? 1 : -1, y: 0 },
          },
        ],
      },
      {
        element: this.object._id,
        points: [
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: mode == "begin" ? 1 : -1, y: 0 },
          },
        ],
      },
    ];
  }

  /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(solver: ConstraintSolver): void {
    const [x1, y1, x2, y2, cx, cy, dx, dy] = solver.attrs(
      this.state.attributes,
      ["x1", "y1", "x2", "y2", "cx", "cy", "dx", "dy"]
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
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, dx]],
      [
        [1, x2],
        [-1, x1],
      ]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, dy]],
      [
        [1, y2],
        [-1, y1],
      ]
    );
  }

  /** Get the graphical element from the element */
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    // eslint-disable-next-line
    glyphIndex = 0,
    // eslint-disable-next-line
    manager: ChartStateManager,
    emphasize?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const helper = new Graphics.CoordinateSystemHelper(cs);
    return helper.line(
      attrs.x1 + offset.x,
      attrs.y1 + offset.y,
      attrs.x2 + offset.x,
      attrs.y2 + offset.y,
      {
        strokeColor: attrs.stroke,
        strokeOpacity: attrs.opacity,
        strokeWidth: attrs.strokeWidth,
        strokeDasharray: strokeStyleToDashArray(
          this.object.properties.strokeStyle
        ),
        ...this.generateEmphasisStyle(emphasize),
      },
      `${this.object._id}`
    );
  }

  /** Get DropZones given current state */
  public getDropZones(): DropZones.Description[] {
    const attrs = <LineElementAttributes>this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const cx = x1;
    const cy = y1;
    return [
      <DropZones.Line>{
        type: "line",
        p1: { x: x2, y: cy },
        p2: { x: x1, y: cy },
        title: "dx",
        accept: {
          kind: DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
        dropAction: {
          scaleInference: {
            attribute: "dx",
            attributeType: "number",
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      },
      <DropZones.Line>{
        type: "line",
        p1: { x: cx, y: y1 },
        p2: { x: cx, y: y2 },
        title: "dy",
        accept: {
          kind: DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
        dropAction: {
          scaleInference: {
            attribute: "dy",
            attributeType: "number",
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      },
    ];
  }

  /** Get bounding rectangle given current state */
  public getHandles(): Handles.Description[] {
    const attrs = <LineElementAttributes>this.state.attributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
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
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: cx,
        y: cy,
        actions: [
          { type: "attribute", source: "x", attribute: "cx" },
          { type: "attribute", source: "y", attribute: "cy" },
        ],
      },
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = <LineElementAttributes>this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return <BoundingBox.Line>{
      type: "line",
      morphing: true,
      x1,
      y1,
      x2,
      y2
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = <LineElementAttributes>this.state.attributes;
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

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const parentWidgets = super.getAttributePanelWidgets(manager);
    return [
      manager.verticalGroup(
        {
          header: strings.toolbar.line,
        },
        [
          manager.mappingEditor(strings.objects.line.xSpan, "dx", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.toolbar.line,
          }),
          manager.mappingEditor(strings.objects.line.ySpan, "dy", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.toolbar.line,
          }),
          manager.mappingEditor(
            strings.objects.visibleOn.visibility,
            "visible",
            {
              defaultValue: true,
              searchSection: strings.toolbar.line,
            }
          ),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.style,
        },
        [
          manager.mappingEditor(strings.objects.stroke, "stroke", {
            searchSection: strings.objects.style,
          }),
          manager.mappingEditor(strings.objects.strokeWidth, "strokeWidth", {
            hints: { rangeNumber: [0, 5] },
            defaultValue: 1,
            numberOptions: {
              showSlider: true,
              sliderRange: [0, 10],
              minimum: 0,
            },
            searchSection: strings.objects.style,
          }),
          manager.inputSelect(
            { property: "strokeStyle" },
            {
              type: "dropdown",
              showLabel: true,
              icons: ["stroke/solid", "stroke/dashed", "stroke/dotted"],
              isLocalIcons: true,
              labels: [
                strings.objects.links.solid,
                strings.objects.links.dashed,
                strings.objects.links.dotted,
              ],
              options: ["solid", "dashed", "dotted"],
              label: strings.objects.line.lineStyle,
              searchSection: strings.objects.style,
            }
          ),
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
    const properties: Specification.Template.Property[] = [];
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
      this.object.mappings.stroke &&
      this.object.mappings.stroke.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "stroke",
        },
        type: Specification.AttributeType.Color,
        default:
          this.state.attributes.stroke &&
          rgbToHex(<Color>this.state.attributes.stroke),
      });
    }
    if (
      this.object.mappings.strokeWidth &&
      this.object.mappings.strokeWidth.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "strokeWidth",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.strokeWidth,
      });
      properties.push({
        objectID: this.object._id,
        target: {
          property: "strokeStyle",
        },
        type: Specification.AttributeType.Enum,
        default: this.object.properties.strokeStyle,
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
    return {
      properties,
    };
  }
}

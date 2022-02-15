/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Point, rgbToHex } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { AttributeType, DataKind, MappingType } from "../../specification";
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
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  rectAttributes,
  RectElementAttributes,
  RectElementProperties,
} from "./rect.attrs";
import { strings } from "../../../strings";
import { RectangleGlyph } from "../glyphs";
import { OrientationType } from "../legends/types";

export { RectElementAttributes, RectElementProperties };

export enum ShapeType {
  Rectangle = "rectangle",
  Triangle = "triangle",
  Ellips = "ellipse",
}

export class RectElementClass extends EmphasizableMarkClass<
  RectElementProperties,
  RectElementAttributes
> {
  public static classID = "mark.rect";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Shape",
    iconPath: "RectangleShape",
    creatingInteraction: {
      type: ShapeType.Rectangle,
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public static defaultProperties: Partial<RectElementProperties> = {
    ...ObjectClass.defaultProperties,
    visible: true,
    strokeStyle: "solid",
    shape: ShapeType.Rectangle,
    allowFlipping: true,
    rx: 0,
    ry: 0,
    orientation: OrientationType.VERTICAL,
  };

  public static defaultMappingValues: Partial<RectElementAttributes> = {
    fill: { r: 17, g: 141, b: 255 },
    strokeWidth: 1,
    opacity: 1,
    visible: true,
  };

  public attributes = rectAttributes;
  public attributeNames = Object.keys(rectAttributes);

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
    attrs.width = defaultWidth;
    attrs.height = defaultHeight;
    attrs.stroke = null;
    attrs.fill = { r: 200, g: 200, b: 200 };
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
  }

  public getTemplateParameters(): TemplateParameters {
    const properties: Specification.Template.Property[] = [];

    if (
      this.object.mappings.fill &&
      this.object.mappings.fill.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "fill",
        },
        type: Specification.AttributeType.Color,
        default: rgbToHex(this.state.attributes.fill),
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
      this.object.mappings.stroke &&
      this.object.mappings.stroke.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "stroke",
        },
        type: Specification.AttributeType.Color,
        default: rgbToHex(this.state.attributes.stroke),
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
    properties.push({
      objectID: this.object._id,
      target: {
        property: "rx",
      },
      type: Specification.AttributeType.Number,
      default: 0,
    });

    properties.push({
      objectID: this.object._id,
      target: {
        property: "ry",
      },
      type: Specification.AttributeType.Number,
      default: 0,
    });

    return {
      properties,
    };
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const parentWidgets = super.getAttributePanelWidgets(manager);

    let widgets: Controls.Widget[] = [
      manager.verticalGroup(
        {
          header: strings.objects.general,
        },
        [
          manager.mappingEditor(strings.objects.width, "width", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [DataKind.Numerical],
            defaultAuto: true,
          }),
          manager.mappingEditor(strings.objects.height, "height", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [DataKind.Numerical],
            defaultAuto: true,
          }),
          manager.inputSelect(
            { property: "shape" },
            {
              type: "dropdown",
              showLabel: true,
              label: strings.objects.rect.shape,
              icons: ["RectangleShape", "TriangleShape", "Ellipse"],
              labels: [
                strings.objects.rect.shapes.rectangle,
                strings.objects.rect.shapes.triangle,
                strings.objects.rect.shapes.ellipse,
              ],
              options: [
                ShapeType.Rectangle,
                ShapeType.Triangle,
                ShapeType.Ellips,
              ],
            }
          ),
          manager.inputBoolean(
            { property: "allowFlipping" },
            {
              type: "checkbox",
              label: strings.objects.rect.flipping,
              styles: {
                marginTop: 5,
              },
            }
          ),
          this.object.properties.shape === ShapeType.Triangle
            ? manager.inputSelect(
                { property: "orientation" },
                {
                  type: "radio",
                  showLabel: false,
                  icons: ["GripperBarVertical", "GripperBarHorizontal"],
                  labels: [
                    strings.objects.legend.vertical,
                    strings.objects.legend.horizontal,
                  ],
                  options: [
                    OrientationType.VERTICAL,
                    OrientationType.HORIZONTAL,
                  ],
                  label: strings.objects.legend.orientation,
                }
              )
            : null,
          manager.mappingEditor(
            strings.objects.visibleOn.visibility,
            "visible",
            {
              defaultValue: true,
            }
          ),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.style,
        },
        [
          manager.mappingEditor(strings.objects.fill, "fill", {}),
          manager.mappingEditor(strings.objects.stroke, "stroke", {}),
          this.object.mappings.stroke != null
            ? manager.mappingEditor(
                strings.objects.strokeWidth,
                "strokeWidth",
                {
                  hints: { rangeNumber: [0, 5] },
                  defaultValue: 1,
                  numberOptions: {
                    showSlider: true,
                    sliderRange: [0, 5],
                    minimum: 0,
                  },
                }
              )
            : null,
          this.object.mappings.stroke != null
            ? manager.inputSelect(
                { property: "strokeStyle" },
                {
                  type: "dropdown",
                  showLabel: true,
                  label: "Line Style",
                  icons: ["line", "stroke/dashed", "stroke/dotted"],
                  isLocalIcons: true,
                  labels: [
                    strings.objects.links.solid,
                    strings.objects.links.dashed,
                    strings.objects.links.dotted,
                  ],
                  options: ["solid", "dashed", "dotted"],
                }
              )
            : null,
          manager.mappingEditor(strings.objects.opacity, "opacity", {
            hints: { rangeNumber: [0, 1] },
            defaultValue: 1,
            numberOptions: {
              showSlider: true,
              minimum: 0,
              maximum: 1,
              step: 0.1,
            },
          }),
          this.object.properties.shape === ShapeType.Rectangle
            ? manager.inputNumber(
                {
                  property: "rx",
                },
                {
                  label: strings.objects.roundX,
                  showUpdown: true,
                  updownTick: 1,
                  minimum: 0,
                }
              )
            : null,
          this.object.properties.shape === ShapeType.Rectangle
            ? manager.inputNumber(
                {
                  property: "ry",
                },
                {
                  label: strings.objects.roundY,
                  showUpdown: true,
                  updownTick: 1,
                  minimum: 0,
                }
              )
            : null,
        ]
      ),
    ];

    widgets = widgets.concat(parentWidgets);
    return widgets;
  }

  /**
   * Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
   *   -------------- y1
   *   |            |     |
   *   |      *     | yc  height
   *   |            |     |
   *   -------------- y2
   *  x1     xc     x2
   *  <----width---->
   */
  public buildConstraints(solver: ConstraintSolver): void {
    // take variables for attributes
    const [x1, y1, x2, y2, cx, cy, width, height] = solver.attrs(
      this.state.attributes,
      ["x1", "y1", "x2", "y2", "cx", "cy", "width", "height"]
    );
    // Describes intrinsic relations of reactangle
    // add constraint x2 - x1 = width
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [
        [1, x2],
        [-1, x1],
      ],
      [[1, width]]
    );
    // add constraint y2 - y1 = height
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [
        [1, y2],
        [-1, y1],
      ],
      [[1, height]]
    );
    // add constraint x1 + x2 = 2 * xc
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, cx]],
      [
        [1, x1],
        [1, x2],
      ]
    );
    // add constraint y1 + y2 = 2 * yc
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, cy]],
      [
        [1, y1],
        [1, y2],
      ]
    );

    if (
      !this.object.properties.allowFlipping &&
      this.object.properties.allowFlipping !== undefined
    ) {
      // Additional constraint to prevent flipping mark objects
      // add constraint x2 >= x1
      solver.addSoftInequality(
        ConstraintStrength.WEAKER,
        0,
        [[1, x2]],
        [[1, x1]]
      );

      // add constraint y2 >= y1
      solver.addSoftInequality(
        ConstraintStrength.WEAKER,
        0,
        [[1, y2]],
        [[1, y1]]
      );
    }
  }

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    // eslint-disable-next-line
    glyphIndex = 0,
    // eslint-disable-next-line
    manager: ChartStateManager,
    empasized?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const properties = this.object.properties;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const helper = new Graphics.CoordinateSystemHelper(cs);
    switch (this.object.properties.shape) {
      case ShapeType.Ellips: {
        return helper.ellipse(
          attrs.x1 + offset.x,
          attrs.y1 + offset.y,
          attrs.x2 + offset.x,
          attrs.y2 + offset.y,
          {
            strokeColor: attrs.stroke,
            strokeWidth: attrs.strokeWidth,
            strokeLinejoin: "miter",
            strokeDasharray: strokeStyleToDashArray(
              this.object.properties.strokeStyle
            ),
            fillColor: attrs.fill,
            opacity: attrs.opacity,
            ...this.generateEmphasisStyle(empasized),
          }
        );
      }
      case ShapeType.Triangle: {
        const pathMaker = new Graphics.PathMaker();
        if (this.object.properties.orientation == OrientationType.HORIZONTAL) {
          helper.lineTo(
            pathMaker,
            attrs.x1 + offset.x,
            attrs.y1 + offset.y,
            attrs.x1 + offset.x,
            attrs.y2 + offset.y,
            true
          );
          helper.lineTo(
            pathMaker,
            attrs.x1 + offset.x,
            attrs.y2 + offset.y,
            attrs.x2 + offset.x,
            (attrs.y1 + attrs.y2) / 2 + offset.y,
            false
          );
        } else {
          helper.lineTo(
            pathMaker,
            attrs.x1 + offset.x,
            attrs.y1 + offset.y,
            (attrs.x1 + attrs.x2) / 2 + offset.x,
            attrs.y2 + offset.y,
            true
          );
          helper.lineTo(
            pathMaker,
            (attrs.x1 + attrs.x2) / 2 + offset.x,
            attrs.y2 + offset.y,
            attrs.x2 + offset.x,
            attrs.y1 + offset.y,
            false
          );
        }
        pathMaker.closePath();
        const path = pathMaker.path;
        path.style = {
          strokeColor: attrs.stroke,
          strokeWidth: attrs.strokeWidth,
          strokeLinejoin: "miter",
          strokeDasharray: strokeStyleToDashArray(
            this.object.properties.strokeStyle
          ),
          fillColor: attrs.fill,
          opacity: attrs.opacity,
          ...this.generateEmphasisStyle(empasized),
        };
        return path;
      }
      case ShapeType.Rectangle:
      default: {
        return helper.rect(
          attrs.x1 + offset.x,
          attrs.y1 + offset.y,
          attrs.x2 + offset.x,
          attrs.y2 + offset.y,
          {
            strokeColor: attrs.stroke,
            strokeWidth: attrs.strokeWidth,
            strokeLinejoin: "miter",
            strokeDasharray: strokeStyleToDashArray(
              this.object.properties.strokeStyle
            ),
            fillColor: attrs.fill,
            opacity: attrs.opacity,
            ...this.generateEmphasisStyle(empasized),
          },
          properties.rx,
          properties.ry
        );
      }
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
          kind: DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
        dropAction: {
          scaleInference: {
            attribute: "width",
            attributeType: AttributeType.Number,
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
          kind: DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
        dropAction: {
          scaleInference: {
            attribute: "height",
            attributeType: AttributeType.Number,
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
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Line>{
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2],
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2],
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2],
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
        options: {
          snapToClosestPoint: true,
        },
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
        options: {
          snapToClosestPoint: true,
        },
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
}

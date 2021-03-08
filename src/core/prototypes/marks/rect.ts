// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Point, rgbToHex } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import { DataKind, AttributeType, MappingType } from "../../specification";
import * as Specification from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  LinkAnchor,
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

export { RectElementAttributes, RectElementProperties };

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
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public static defaultProperties: Partial<RectElementProperties> = {
    visible: true,
    strokeStyle: "solid",
    shape: "rectangle",
  };

  public static defaultMappingValues: Partial<RectElementAttributes> = {
    fill: { r: 217, g: 217, b: 217 },
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

    return {
      properties,
    };
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const parentWidgets = super.getAttributePanelWidgets(manager);

    let widgets: Controls.Widget[] = [
      manager.sectionHeader("Size & Shape"),
      manager.mappingEditor("Width", "width", {
        hints: { autoRange: true, startWithZero: "always" },
        acceptKinds: [DataKind.Numerical],
        defaultAuto: true,
      }),
      manager.mappingEditor("Height", "height", {
        hints: { autoRange: true, startWithZero: "always" },
        acceptKinds: [DataKind.Numerical],
        defaultAuto: true,
      }),
      manager.inputSelect(
        { property: "shape" },
        {
          type: "dropdown",
          showLabel: true,
          label: "Shape",
          icons: ["RectangleShape", "TriangleShape", "Ellipse"],
          labels: ["Rectangle", "Triangle", "Ellipse"],
          options: ["rectangle", "triangle", "ellipse"],
        }
      ),
      manager.sectionHeader("Style"),
      manager.mappingEditor("Fill", "fill", {}),
      manager.mappingEditor("Stroke", "stroke", {}),
    ];
    if (this.object.mappings.stroke != null) {
      widgets.push(
        manager.mappingEditor("Line Width", "strokeWidth", {
          hints: { rangeNumber: [0, 5] },
          defaultValue: 1,
          numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 },
        })
      );
      manager.inputSelect(
        { property: "strokeStyle" },
        {
          type: "dropdown",
          showLabel: true,
          label: "Line Style",
          icons: ["stroke/solid", "stroke/dashed", "stroke/dotted"],
          labels: ["Solid", "Dashed", "Dotted"],
          options: ["solid", "dashed", "dotted"],
        }
      );
    }

    widgets = widgets.concat([
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 },
      }),
      manager.mappingEditor("Visibility", "visible", {
        defaultValue: true,
      }),
    ]);

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
  }

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex = 0,
    manager: ChartStateManager,
    empasized?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const helper = new Graphics.CoordinateSystemHelper(cs);
    switch (this.object.properties.shape) {
      case "ellipse": {
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
      case "triangle": {
        const pathMaker = new Graphics.PathMaker();
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
      case "rectangle":
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
          }
        );
      }
    }
  }

  /** Get link anchors for this mark */
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
      {
        type: "line",
        p1: { x: x2, y: y1 },
        p2: { x: x1, y: y1 },
        title: "width",
        accept: { kind: DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "width",
            attributeType: AttributeType.Number,
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      } as DropZones.Line,
      {
        type: "line",
        p1: { x: x1, y: y1 },
        p2: { x: x1, y: y2 },
        title: "height",
        accept: { kind: DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "height",
            attributeType: AttributeType.Number,
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      } as DropZones.Line,
    ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x1" }],
        value: x1,
        span: [y1, y2],
      } as Handles.Line,
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2],
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2],
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2],
      } as Handles.Line,
      {
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      } as Handles.Point,
      {
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      } as Handles.Point,
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return {
      type: "rectangle",
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0,
    } as BoundingBox.Rectangle;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
      { type: "x", value: x1, attribute: "x1" } as SnappingGuides.Axis,
      { type: "x", value: x2, attribute: "x2" } as SnappingGuides.Axis,
      { type: "x", value: cx, attribute: "cx" } as SnappingGuides.Axis,
      { type: "y", value: y1, attribute: "y1" } as SnappingGuides.Axis,
      { type: "y", value: y2, attribute: "y2" } as SnappingGuides.Axis,
      { type: "y", value: cy, attribute: "cy" } as SnappingGuides.Axis,
    ];
  }
}

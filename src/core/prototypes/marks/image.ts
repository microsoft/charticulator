// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Geometry, Point } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClassMetadata,
  SnappingGuides
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  imageAttributes,
  ImageElementAttributes,
  ImageElementProperties
} from "./image.attrs";

export const imagePlaceholder: Specification.Types.Image = {
  src:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHRpdGxlPmljb25zPC90aXRsZT48cmVjdCB4PSI1LjE1MTI0IiB5PSI2LjY4NDYyIiB3aWR0aD0iMjEuNjk3NTIiIGhlaWdodD0iMTguNjEyNSIgc3R5bGU9ImZpbGw6bm9uZTtzdHJva2U6IzAwMDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLXdpZHRoOjAuOTI2MTg0MTE3Nzk0MDM2OXB4Ii8+PHBvbHlnb24gcG9pbnRzPSIyMC4xNSAxMi45NDMgMTMuODExIDIxLjQwNCAxMC4xNTQgMTYuNDk4IDUuMTUxIDIzLjE3NiA1LjE1MSAyNS4zMDYgMTAuODg4IDI1LjMwNiAxNi43MTkgMjUuMzA2IDI2Ljg0OSAyNS4zMDYgMjYuODQ5IDIxLjkzIDIwLjE1IDEyLjk0MyIgc3R5bGU9ImZpbGwtb3BhY2l0eTowLjI7c3Ryb2tlOiMwMDA7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS13aWR0aDowLjcwMDAwMDAwMDAwMDAwMDFweCIvPjxjaXJjbGUgY3g9IjExLjkyMDI3IiBjeT0iMTIuMzk5MjMiIHI9IjEuOTAyMTYiIHN0eWxlPSJmaWxsLW9wYWNpdHk6MC4yO3N0cm9rZTojMDAwO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MC43MDAwMDAwMDAwMDAwMDAxcHgiLz48L3N2Zz4=",
  width: 100,
  height: 100
};

export { ImageElementAttributes, ImageElementProperties };

export class ImageElementClass extends EmphasizableMarkClass<
  ImageElementProperties,
  ImageElementAttributes
> {
  public static classID = "mark.image";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Image",
    iconPath: "mark/image",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" }
    }
  };

  public static defaultProperties: Partial<ImageElementProperties> = {
    visible: true,
    imageMode: "letterbox",
    paddingX: 0,
    paddingY: 0,
    alignX: "middle",
    alignY: "middle"
  };

  public static defaultMappingValues: Partial<ImageElementAttributes> = {
    strokeWidth: 1,
    opacity: 1,
    visible: true
  };

  public attributes = imageAttributes;
  public attributeNames = Object.keys(imageAttributes);

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
    attrs.stroke = null;
    attrs.fill = null;
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
    attrs.image = null;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    let widgets: Controls.Widget[] = [
      manager.sectionHeader("Size"),
      manager.mappingEditor("Width", "width", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.mappingEditor("Height", "height", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.sectionHeader("Image"),
      manager.mappingEditor("Image", "image", {}),
      manager.row(
        "Resize Mode",
        manager.inputSelect(
          { property: "imageMode" },
          {
            type: "dropdown",
            showLabel: true,
            labels: ["Letterbox", "Stretch"],
            options: ["letterbox", "stretch"]
          }
        )
      ),
      ...(this.object.properties.imageMode == "letterbox"
        ? [
            manager.row(
              "Align",
              manager.horizontal(
                [0, 1],
                manager.inputSelect(
                  { property: "alignX" },
                  {
                    type: "radio",
                    options: ["start", "middle", "end"],
                    icons: ["align/left", "align/x-middle", "align/right"],
                    labels: ["Left", "Middle", "Right"]
                  }
                ),
                manager.inputSelect(
                  { property: "alignY" },
                  {
                    type: "radio",
                    options: ["start", "middle", "end"],
                    icons: ["align/bottom", "align/y-middle", "align/top"],
                    labels: ["Bottom", "Middle", "Top"]
                  }
                )
              )
            )
          ]
        : []),
      manager.row(
        "Padding",
        manager.horizontal(
          [0, 2, 0, 2],
          manager.label("x:"),
          manager.inputNumber(
            { property: "paddingX" },
            {
              updownTick: 1,
              showUpdown: true
            }
          ),
          manager.label("y:"),
          manager.inputNumber(
            { property: "paddingY" },
            {
              updownTick: 1,
              showUpdown: true
            }
          )
        )
      ),
      manager.sectionHeader("Style"),
      manager.mappingEditor("Fill", "fill", {}),
      manager.mappingEditor("Stroke", "stroke", {})
    ];
    if (this.object.mappings.stroke != null) {
      widgets.push(
        manager.mappingEditor("Line Width", "strokeWidth", {
          hints: { rangeNumber: [0, 5] },
          defaultValue: 1,
          numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 }
        })
      );
    }
    widgets = widgets.concat([
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      }),
      manager.mappingEditor("Visibility", "visible", {
        defaultValue: true
      })
    ]);
    return widgets;
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
      [[1, x2], [-1, x1]],
      [[1, width]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, y2], [-1, y1]],
      [[1, height]]
    );
    solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
  }

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex: number,
    manager: ChartStateManager
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const paddingX = props.paddingX || 0;
    const paddingY = props.paddingY || 0;
    const alignX = props.alignX || "middle";
    const alignY = props.alignY || "middle";
    let image = attrs.image || imagePlaceholder;
    if (typeof image == "string") {
      // Be compatible with old version
      image = { src: image, width: 100, height: 100 };
    }

    const helper = new Graphics.CoordinateSystemHelper(cs);
    const g = Graphics.makeGroup([]);

    // If fill color is specified, draw a background rect
    if (attrs.fill) {
      g.elements.push(
        helper.rect(
          attrs.x1 + offset.x,
          attrs.y1 + offset.y,
          attrs.x2 + offset.x,
          attrs.y2 + offset.y,
          {
            strokeColor: null,
            fillColor: attrs.fill
          }
        )
      );
    }

    // Center in local coordiantes
    const cx = (attrs.x1 + attrs.x2) / 2;
    const cy = (attrs.y1 + attrs.y2) / 2;

    // Decide the width/height of the image area
    // For special coordinate systems, use the middle lines' length as width/height
    const containerWidth = Geometry.pointDistance(
      cs.transformPoint(attrs.x1 + offset.x, cy + offset.y),
      cs.transformPoint(attrs.x2 + offset.x, cy + offset.y)
    );
    const containerHeight = Geometry.pointDistance(
      cs.transformPoint(cx + offset.x, attrs.y1 + offset.y),
      cs.transformPoint(cx + offset.x, attrs.y2 + offset.y)
    );

    const boxWidth = Math.max(0, containerWidth - paddingX * 2);
    const boxHeight = Math.max(0, containerHeight - paddingY * 2);

    // Fit image into boxWidth x boxHeight, based on the specified option
    let imageWidth: number;
    let imageHeight: number;
    switch (props.imageMode) {
      case "stretch":
        {
          imageWidth = boxWidth;
          imageHeight = boxHeight;
        }
        break;
      case "letterbox":
      default:
        {
          if (image.width / image.height > boxWidth / boxHeight) {
            imageWidth = boxWidth;
            imageHeight = (image.height / image.width) * boxWidth;
          } else {
            imageHeight = boxHeight;
            imageWidth = (image.width / image.height) * boxHeight;
          }
        }
        break;
    }

    // Decide the anchor position (px, py) in local coordinates
    let px = cx;
    let py = cy;
    let imgX = -imageWidth / 2;
    let imgY = -imageHeight / 2;
    if (alignX == "start") {
      px = attrs.x1;
      imgX = paddingX;
    } else if (alignX == "end") {
      px = attrs.x2;
      imgX = -imageWidth - paddingX;
    }
    if (alignY == "start") {
      py = attrs.y1;
      imgY = paddingY;
    } else if (alignY == "end") {
      py = attrs.y2;
      imgY = -imageHeight - paddingY;
    }

    // Create the image element
    const gImage = Graphics.makeGroup([
      {
        type: "image",
        src: image.src,
        x: imgX,
        y: imgY,
        width: imageWidth,
        height: imageHeight,
        mode: "stretch"
      } as Graphics.Image
    ]);
    gImage.transform = cs.getLocalTransform(px + offset.x, py + offset.y);
    g.elements.push(gImage);

    // If stroke color is specified, stroke a foreground rect
    if (attrs.stroke) {
      g.elements.push(
        helper.rect(
          attrs.x1 + offset.x,
          attrs.y1 + offset.y,
          attrs.x2 + offset.x,
          attrs.y2 + offset.y,
          {
            strokeColor: attrs.stroke,
            strokeWidth: attrs.strokeWidth,
            strokeLinejoin: "miter",
            fillColor: null
          }
        )
      );
    }

    // Apply the opacity
    g.style = {
      opacity: attrs.opacity
    };
    return g;
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
            direction: { x: -1, y: 0 }
          },
          {
            x: attrs.x1,
            y: attrs.y2,
            xAttribute: "x1",
            yAttribute: "y2",
            direction: { x: -1, y: 0 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x2,
            y: attrs.y1,
            xAttribute: "x2",
            yAttribute: "y1",
            direction: { x: 1, y: 0 }
          },
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: 1, y: 0 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y1,
            xAttribute: "x1",
            yAttribute: "y1",
            direction: { x: 0, y: -1 }
          },
          {
            x: attrs.x2,
            y: attrs.y1,
            xAttribute: "x2",
            yAttribute: "y1",
            direction: { x: 0, y: -1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y2,
            xAttribute: "x1",
            yAttribute: "y2",
            direction: { x: 0, y: 1 }
          },
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: 0, y: 1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.cx,
            y: attrs.y1,
            xAttribute: "cx",
            yAttribute: "y1",
            direction: { x: 0, y: -1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.cx,
            y: attrs.y2,
            xAttribute: "cx",
            yAttribute: "y2",
            direction: { x: 0, y: 1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.cy,
            xAttribute: "x1",
            yAttribute: "cy",
            direction: { x: -1, y: 0 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x2,
            y: attrs.cy,
            xAttribute: "x2",
            yAttribute: "cy",
            direction: { x: 1, y: 0 }
          }
        ]
      }
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
        accept: { kind: Specification.DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "width",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true }
          }
        }
      } as DropZones.Line,
      {
        type: "line",
        p1: { x: x1, y: y1 },
        p2: { x: x1, y: y2 },
        title: "height",
        accept: { kind: Specification.DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "height",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true }
          }
        }
      } as DropZones.Line
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
        span: [y1, y2]
      } as Handles.Line,
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2]
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2]
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2]
      } as Handles.Line,
      {
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" }
        ]
      } as Handles.Point
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
      rotation: 0
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
      { type: "y", value: cy, attribute: "cy" } as SnappingGuides.Axis
    ];
  }
}

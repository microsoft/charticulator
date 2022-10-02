// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../../strings";
import { Geometry, Point, rgbToHex } from "../../common";
import * as Graphics from "../../graphics";
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
import { DEFAULT_POWER_BI_OPACITY, EmphasizableMarkClass } from "./emphasis";
import {
  imageAttributes,
  ImageElementAttributes,
  ImageElementProperties,
} from "./image.attrs";
import { RectangleGlyph } from "../glyphs";

export const imagePlaceholder: Specification.Types.Image = {
  src:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHRpdGxlPmljb25zPC90aXRsZT48cmVjdCB4PSI1LjE1MTI0IiB5PSI2LjY4NDYyIiB3aWR0aD0iMjEuNjk3NTIiIGhlaWdodD0iMTguNjEyNSIgc3R5bGU9ImZpbGw6bm9uZTtzdHJva2U6IzAwMDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLXdpZHRoOjAuOTI2MTg0MTE3Nzk0MDM2OXB4Ii8+PHBvbHlnb24gcG9pbnRzPSIyMC4xNSAxMi45NDMgMTMuODExIDIxLjQwNCAxMC4xNTQgMTYuNDk4IDUuMTUxIDIzLjE3NiA1LjE1MSAyNS4zMDYgMTAuODg4IDI1LjMwNiAxNi43MTkgMjUuMzA2IDI2Ljg0OSAyNS4zMDYgMjYuODQ5IDIxLjkzIDIwLjE1IDEyLjk0MyIgc3R5bGU9ImZpbGwtb3BhY2l0eTowLjI7c3Ryb2tlOiMwMDA7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS13aWR0aDowLjcwMDAwMDAwMDAwMDAwMDFweCIvPjxjaXJjbGUgY3g9IjExLjkyMDI3IiBjeT0iMTIuMzk5MjMiIHI9IjEuOTAyMTYiIHN0eWxlPSJmaWxsLW9wYWNpdHk6MC4yO3N0cm9rZTojMDAwO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MC43MDAwMDAwMDAwMDAwMDAxcHgiLz48L3N2Zz4=",
  width: 100,
  height: 100,
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
    iconPath: "FileImage",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public static defaultProperties: Partial<ImageElementProperties> = {
    ...ObjectClass.defaultProperties,
    visible: true,
    imageMode: "letterbox",
    paddingX: 0,
    paddingY: 0,
    alignX: "middle",
    alignY: "middle",
  };

  public static defaultMappingValues: Partial<ImageElementAttributes> = {
    strokeWidth: 1,
    opacity: 1,
    visible: true,
  };

  public attributes = imageAttributes;
  public attributeNames = Object.keys(imageAttributes);

  /** Initialize the state of an element so that everything has a valid value */
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

  // eslint-disable-next-line
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
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
      // manager.sectionHeader(strings.objects.size),
      manager.verticalGroup(
        {
          header: strings.toolbar.image,
        },
        [
          manager.mappingEditor(strings.objects.icon.image, "image", {
            searchSection: strings.toolbar.image,
          }),
          manager.inputSelect(
            { property: "imageMode" },
            {
              type: "dropdown",
              showLabel: true,
              labels: [
                strings.objects.image.letterbox,
                strings.objects.image.stretch,
              ],
              options: ["letterbox", "stretch"],
              label: strings.objects.image.imageMode,
              searchSection: strings.toolbar.image,
            }
          ),
          ...(this.object.properties.imageMode == "letterbox"
            ? [
                manager.searchWrapper(
                  {
                    searchPattern: [
                      strings.alignment.align,
                      strings.objects.icon.image,
                    ],
                  },
                  manager.label(strings.alignment.align),
                  manager.horizontal(
                    [0, 1],
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
                        ignoreSearch: true,
                      }
                    ),
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
                        ignoreSearch: true,
                      }
                    )
                  )
                ),
              ]
            : []),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.alignment.padding,
        },
        [
          // manager.label(strings.coordinateSystem.x),
          manager.inputNumber(
            { property: "paddingX" },
            {
              updownTick: 1,
              showUpdown: true,
              label: strings.coordinateSystem.x,
              searchSection: strings.alignment.padding,
            }
          ),
          // manager.label(strings.coordinateSystem.y),
          manager.inputNumber(
            { property: "paddingY" },
            {
              updownTick: 1,
              showUpdown: true,
              label: strings.coordinateSystem.y,
              searchSection: strings.alignment.padding,
            }
          ),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.style,
        },
        [
          manager.mappingEditor(strings.objects.fill, "fill", {
            searchSection: strings.objects.style,
          }),
          manager.mappingEditor(strings.objects.stroke, "stroke", {
            searchSection: strings.objects.style,
          }),
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
                  searchSection: strings.objects.style,
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
            searchSection: strings.objects.style,
          }),
        ]
      ),
    ];
    return widgets.concat(parentWidgets);
  }

  /**
   * Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
   * See description of {@link RectElementClass.buildConstraints} method for details. Image has the same shape, except center point.
   */
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
    manager: ChartStateManager,
    emphasized?: boolean
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
            fillColor: attrs.fill,
          }
        )
      );
    }

    // Center in local coordinates
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
      <Graphics.Image>{
        type: "image",
        src: image.src,
        x: imgX,
        y: imgY,
        width: imageWidth,
        height: imageHeight,
        mode: "stretch",
        style: {
          ...this.generateEmphasisStyle(emphasized),
          colorFilter: emphasized
            ? `alpha(opacity=${DEFAULT_POWER_BI_OPACITY * 100})`
            : null,
        },
      },
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
            fillColor: null,
          }
        )
      );
    }

    // Apply the opacity
    g.style = {
      opacity: attrs.opacity,
    };
    return g;
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

  public getTemplateParameters(): TemplateParameters {
    const properties = [];
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
      this.object.mappings.visible &&
      this.object.mappings.visible.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "visible",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.visible,
      });
    }
    if (
      this.object.mappings.image &&
      this.object.mappings.image.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "image",
        },
        type: Specification.AttributeType.Image,
        default: this.state.attributes.image?.src,
      });
    }
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
    return {
      properties,
    };
  }
}

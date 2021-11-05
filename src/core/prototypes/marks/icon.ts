/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../../strings";
import { Geometry, Point } from "../../common";
import * as Graphics from "../../graphics";
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
  LinkAnchor,
  ObjectClass,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters,
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  iconAttributes,
  IconElementAttributes,
  IconElementProperties,
} from "./icon.attrs";
import { imagePlaceholder } from "./image";

export { IconElementAttributes, IconElementProperties };

export class IconElementClass extends EmphasizableMarkClass<
  IconElementProperties,
  IconElementAttributes
> {
  public static classID = "mark.icon";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Icon",
    iconPath: "ImagePixel",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" },
    },
  };

  public static defaultProperties: Partial<IconElementProperties> = {
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

  public static defaultMappingValues: Partial<IconElementAttributes> = {
    opacity: 1,
    size: 400,
    visible: true,
  };

  public attributes = iconAttributes;
  public attributeNames = Object.keys(iconAttributes);

  public initializeState(): void {
    super.initializeState();

    const attrs = this.state.attributes;
    attrs.x = 0;
    attrs.y = 0;
    attrs.size = 400;
    attrs.opacity = 1;
    attrs.visible = true;
    attrs.image = null;
  }

  /** Get link anchors for this mark */
  public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] {
    const attrs = this.state.attributes;
    return [
      {
        element: this.object._id,
        points: [
          {
            x: attrs.x,
            y: attrs.y,
            xAttribute: "x",
            yAttribute: "y",
            direction: { x: mode == "begin" ? 1 : -1, y: 0 },
          },
        ],
      },
    ];
  }

  public getLayoutProps() {
    const attrs = this.state.attributes;
    let image = attrs.image || imagePlaceholder;
    if (typeof image == "string") {
      // Be compatible with old version
      image = { src: image, width: 100, height: 100 };
    }
    if (attrs.size <= 0) {
      return { width: 0, height: 0, dx: 0, dy: 0 };
    }
    const h = Math.sqrt((attrs.size * image.height) / image.width);
    const w = (h * image.width) / image.height;
    const offsets = this.getCenterOffset(
      this.object.properties.alignment,
      w,
      h
    );
    return {
      width: w,
      height: h,
      dx: offsets[0],
      dy: offsets[1],
    };
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
    if (alignment.y == "bottom") {
      cy = -alignment.yMargin;
    }
    if (alignment.y == "top") {
      cy = height + alignment.yMargin;
    }
    return [cx, cy];
  }

  /** Get the graphical element from the element */
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    // eslint-disable-next-line
    glyphIndex = 0,
    // eslint-disable-next-line
    manager: ChartStateManager,
    // eslint-disable-next-line
    emphasize?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    if (attrs.size <= 0) {
      return null;
    }
    let image = attrs.image || imagePlaceholder;
    if (typeof image == "string") {
      // Be compatible with old version
      image = { src: image, width: 100, height: 100 };
    }
    // Compute w, h to resize the image to the desired size
    const layout = this.getLayoutProps();
    const gImage = Graphics.makeGroup([
      <Graphics.Image>{
        type: "image",
        src: image.src,
        x: -layout.dx,
        y: -layout.dy,
        width: layout.width,
        height: layout.height,
        mode: "stretch",
      },
    ]);
    gImage.transform = cs.getLocalTransform(
      attrs.x + offset.x,
      attrs.y + offset.y
    );
    gImage.transform.angle += this.object.properties.rotation;

    // Apply the opacity
    gImage.style = {
      opacity: attrs.opacity,
    };
    return gImage;
  }

  /** Get DropZones given current state */
  public getDropZones(): DropZones.Description[] {
    return [
      <DropZones.Rectangle>{
        type: "rectangle",
        ...this.getBoundingRectangle(),
        title: "size",
        dropAction: {
          scaleInference: {
            attribute: "size",
            attributeType: Specification.AttributeType.Number,
          },
        },
      },
    ];
  }

  /** Get bounding rectangle given current state */
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x, y } = attrs;
    const bbox = this.getBoundingRectangle();
    const props = this.object.properties;
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
        text: null,
        alignment: props.alignment,
        rotation: props.rotation,
      },
    ];
  }

  public getBoundingRectangle() {
    const attrs = this.state.attributes;
    const rotation = this.object.properties.rotation;
    const layout = this.getLayoutProps();
    const cos = Math.cos(Geometry.degreesToRadians(rotation));
    const sin = Math.sin(Geometry.degreesToRadians(rotation));
    const dx = layout.dx - layout.width / 2;
    const dy = layout.dy - layout.height / 2;
    return {
      cx: attrs.x - dx * cos + dy * sin,
      cy: attrs.y - dx * sin - dy * cos,
      width: layout.width,
      height: layout.height,
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
    let widgets = [
      manager.verticalGroup(
        {
          header: strings.toolbar.icon,
        },
        [
          manager.mappingEditor(strings.objects.icon.image, "image", {}),
          manager.mappingEditor(strings.objects.size, "size", {
            acceptKinds: [Specification.DataKind.Numerical],
            hints: { rangeNumber: [0, 100] },
            defaultValue: 400,
            numberOptions: {
              showSlider: true,
              minimum: 0,
              sliderRange: [0, 3600],
              sliderFunction: "sqrt",
            },
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
          }),
          manager.mappingEditor(
            strings.objects.visibleOn.visibility,
            "visible",
            {
              defaultValue: true,
            }
          ),
        ]
      ),
    ];

    widgets = widgets.concat([
      manager.verticalGroup(
        {
          header: strings.objects.anchorAndRotation,
        },
        [
          manager.horizontal(
            [0, 1],
            manager.inputSelect(
              { property: "alignment", field: "x" },
              {
                type: "radio",
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
                options: ["left", "middle", "right"],
                label: strings.objects.anchorX,
              }
            ),
            props.alignment.x != "middle"
              ? manager.inputNumber(
                  { property: "alignment", field: "xMargin" },
                  {
                    label: strings.margins.margin,
                  }
                )
              : null
          ),
          manager.horizontal(
            [0, 1],
            manager.inputSelect(
              { property: "alignment", field: "y" },
              {
                type: "radio",
                icons: [
                  "AlignVerticalTop",
                  "AlignVerticalCenter",
                  "AlignVerticalBottom",
                ],
                labels: [
                  strings.alignment.top,
                  strings.alignment.middle,
                  strings.alignment.bottom,
                ],
                options: ["top", "middle", "bottom"],
                label: strings.objects.anchorY,
              }
            ),
            props.alignment.y != "middle"
              ? manager.inputNumber(
                  { property: "alignment", field: "yMargin" },
                  {
                    label: strings.margins.margin,
                  }
                )
              : null
          ),
        ]
      ),
    ]);
    return widgets.concat(parentWidgets);
  }

  public getTemplateParameters(): TemplateParameters {
    const properties = [];

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
      this.object.mappings.size &&
      this.object.mappings.size.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "size",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.size,
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

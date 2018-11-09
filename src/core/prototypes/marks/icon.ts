// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Point } from "../../common";
import * as Graphics from "../../graphics";
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
  iconAttributes,
  IconElementAttributes,
  IconElementProperties
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
    iconPath: "mark/icon",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" }
    }
  };

  public static defaultProperties: Partial<IconElementProperties> = {
    alignment: { x: "middle", y: "top", xMargin: 5, yMargin: 5 },
    rotation: 0,
    visible: true
  };

  public static defaultMappingValues: Partial<IconElementAttributes> = {
    opacity: 1,
    size: 400,
    visible: true
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
            direction: { x: mode == "begin" ? 1 : -1, y: 0 }
          }
        ]
      }
    ];
  }

  public getLayoutProps() {
    const attrs = this.state.attributes;
    const image = attrs.image || imagePlaceholder;
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
      dy: offsets[1]
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

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex = 0,
    manager: ChartStateManager,
    emphasize?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    if (attrs.size <= 0) {
      return null;
    }
    const image = attrs.image || imagePlaceholder;
    // Compute w, h to resize the image to the desired size
    const layout = this.getLayoutProps();
    const gImage = Graphics.makeGroup([
      {
        type: "image",
        src: image.src,
        x: -layout.dx,
        y: -layout.dy,
        width: layout.width,
        height: layout.height,
        mode: "stretch"
      } as Graphics.Image
    ]);
    gImage.transform = cs.getLocalTransform(
      attrs.x + offset.x,
      attrs.y + offset.y
    );
    gImage.transform.angle += this.object.properties.rotation;
    return gImage;
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    return [
      {
        type: "rectangle",
        ...this.getBoundingRectangle(),
        title: "size",
        dropAction: {
          scaleInference: {
            attribute: "size",
            attributeType: Specification.AttributeType.Number
          }
        }
      } as DropZones.Rectangle
    ];
  }

  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x, y } = attrs;
    const bbox = this.getBoundingRectangle();
    const props = this.object.properties;
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
        text: null,
        alignment: props.alignment,
        rotation: props.rotation
      } as Handles.TextAlignment
    ];
  }

  public getBoundingRectangle() {
    const attrs = this.state.attributes;
    const rotation = this.object.properties.rotation;
    const layout = this.getLayoutProps();
    const cos = Math.cos((rotation / 180) * Math.PI);
    const sin = Math.sin((rotation / 180) * Math.PI);
    const dx = layout.dx - layout.width / 2;
    const dy = layout.dy - layout.height / 2;
    return {
      cx: attrs.x - dx * cos + dy * sin,
      cy: attrs.y - dx * sin - dy * cos,
      width: layout.width,
      height: layout.height,
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
    const { x, y } = attrs;
    return [
      { type: "x", value: x, attribute: "x" } as SnappingGuides.Axis,
      { type: "y", value: y, attribute: "y" } as SnappingGuides.Axis
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    let widgets = [
      manager.sectionHeader("Icon"),
      manager.mappingEditor("Image", "image", {}),
      manager.mappingEditor("Size", "size", {
        acceptKinds: [Specification.DataKind.Numerical],
        hints: { rangeNumber: [0, 100] },
        defaultValue: 400,
        numberOptions: {
          showSlider: true,
          minimum: 0,
          sliderRange: [0, 3600],
          sliderFunction: "sqrt"
        }
      })
    ];

    widgets = widgets.concat([
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
      manager.sectionHeader("Style"),
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
}

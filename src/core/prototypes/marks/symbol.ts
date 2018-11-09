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
  symbolAttributes,
  SymbolElementAttributes,
  SymbolElementProperties,
  symbolTypes
} from "./symbol.attrs";

export { SymbolElementAttributes, SymbolElementProperties };

export class SymbolElementClass extends EmphasizableMarkClass<
  SymbolElementProperties,
  SymbolElementAttributes
> {
  public static classID = "mark.symbol";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Symbol",
    iconPath: "mark/symbol",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" }
    }
  };

  public static defaultProperties: Partial<SymbolElementProperties> = {
    visible: true
  };

  public static defaultMappingValues: Partial<SymbolElementAttributes> = {
    fill: { r: 217, g: 217, b: 217 },
    strokeWidth: 1,
    opacity: 1,
    size: 60,
    visible: true
  };

  public attributes = symbolAttributes;
  public attributeNames = Object.keys(symbolAttributes);

  public initializeState(): void {
    super.initializeState();

    const attrs = this.state.attributes;
    attrs.x = 0;
    attrs.y = 0;
    attrs.size = 60;
    attrs.fill = { r: 128, g: 128, b: 128 };
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
    attrs.symbol = "circle";
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
    const pc = cs.transformPoint(attrs.x + offset.x, attrs.y + offset.y);
    const style = {
      strokeColor: attrs.stroke,
      strokeWidth: attrs.strokeWidth,
      fillColor: attrs.fill,
      opacity: attrs.opacity,
      ...this.generateEmphasisStyle(emphasize)
    };

    switch (attrs.symbol) {
      case "square": {
        const w = Math.sqrt(attrs.size);
        return {
          type: "rect",
          style,
          x1: pc.x - w / 2,
          y1: pc.y - w / 2,
          x2: pc.x + w / 2,
          y2: pc.y + w / 2
        } as Graphics.Rect;
      }
      case "cross": {
        const r = Math.sqrt(attrs.size / 5) / 2;
        const path = Graphics.makePath(style);
        path.moveTo(pc.x - 3 * r, pc.y - r);
        path.lineTo(pc.x - r, pc.y - r);
        path.lineTo(pc.x - r, pc.y - 3 * r);
        path.lineTo(pc.x + r, pc.y - 3 * r);
        path.lineTo(pc.x + r, pc.y - r);
        path.lineTo(pc.x + 3 * r, pc.y - r);
        path.lineTo(pc.x + 3 * r, pc.y + r);
        path.lineTo(pc.x + r, pc.y + r);
        path.lineTo(pc.x + r, pc.y + 3 * r);
        path.lineTo(pc.x - r, pc.y + 3 * r);
        path.lineTo(pc.x - r, pc.y + r);
        path.lineTo(pc.x - 3 * r, pc.y + r);
        path.closePath();
        return path.path;
      }
      case "diamond": {
        const tan30 = 0.5773502691896257; // Math.sqrt(1 / 3);
        const tan30_2 = 1.1547005383792515; // tan30 * 2;
        const y = Math.sqrt(attrs.size / tan30_2),
          x = y * tan30;
        const path = Graphics.makePath(style);
        path.moveTo(pc.x, pc.y - y);
        path.lineTo(pc.x + x, pc.y);
        path.lineTo(pc.x, pc.y + y);
        path.lineTo(pc.x - x, pc.y);
        path.closePath();
        return path.path;
      }
      case "star": {
        const ka = 0.8908130915292852281;
        const kr = 0.3819660112501051; // Math.sin(Math.PI / 10) / Math.sin(7 * Math.PI / 10),
        const kx = 0.22451398828979266; // Math.sin(2 * Math.PI / 10) * kr;
        const ky = -0.3090169943749474; // -Math.cos(2 * Math.PI / 10) * kr;
        const r = Math.sqrt(attrs.size * ka),
          x = kx * r,
          y = ky * r;
        const path = Graphics.makePath(style);
        path.moveTo(pc.x, pc.y - r);
        path.lineTo(pc.x + x, pc.y + y);
        for (let i = 1; i < 5; ++i) {
          const a = (Math.PI * 2 * i) / 5,
            c = Math.cos(a),
            s = Math.sin(a);
          path.lineTo(pc.x + s * r, pc.y - c * r);
          path.lineTo(pc.x + c * x - s * y, pc.y + s * x + c * y);
        }
        path.closePath();
        return path.path;
      }
      case "triangle": {
        const sqrt3 = Math.sqrt(3);
        const y = -Math.sqrt(attrs.size / (sqrt3 * 3));
        const path = Graphics.makePath(style);
        path.moveTo(pc.x, pc.y + y * 2);
        path.lineTo(pc.x - sqrt3 * y, pc.y - y);
        path.lineTo(pc.x + sqrt3 * y, pc.y - y);
        path.closePath();
        return path.path;
      }
      case "wye": {
        const c = -0.5,
          s = Math.sqrt(3) / 2,
          k = 1 / Math.sqrt(12),
          a = (k / 2 + 1) * 3;
        const r = Math.sqrt(attrs.size / a),
          x0 = r / 2,
          y0 = r * k,
          x1 = x0,
          y1 = r * k + r,
          x2 = -x1,
          y2 = y1;
        const path = Graphics.makePath(style);
        path.moveTo(pc.x + x0, pc.y + y0);
        path.lineTo(pc.x + x1, pc.y + y1);
        path.lineTo(pc.x + x2, pc.y + y2);
        path.lineTo(pc.x + c * x0 - s * y0, pc.y + s * x0 + c * y0);
        path.lineTo(pc.x + c * x1 - s * y1, pc.y + s * x1 + c * y1);
        path.lineTo(pc.x + c * x2 - s * y2, pc.y + s * x2 + c * y2);
        path.lineTo(pc.x + c * x0 + s * y0, pc.y + c * y0 - s * x0);
        path.lineTo(pc.x + c * x1 + s * y1, pc.y + c * y1 - s * x1);
        path.lineTo(pc.x + c * x2 + s * y2, pc.y + c * y2 - s * x2);
        path.closePath();
        return path.path;
      }
      default: {
        return {
          type: "circle",
          style,
          cx: pc.x,
          cy: pc.y,
          r: Math.sqrt(attrs.size / Math.PI)
        } as Graphics.Circle;
      }
    }
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes;
    const { x, y, size } = attrs;
    const r = Math.sqrt(size);
    return [
      {
        type: "line",
        p1: { x: x + r, y },
        p2: { x: x - r, y },
        title: "size",
        dropAction: {
          scaleInference: {
            attribute: "size",
            attributeType: Specification.AttributeType.Number
          }
        }
      } as DropZones.Line
    ];
  }

  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x, y } = attrs;
    return [
      {
        type: "point",
        x,
        y,
        actions: [
          { type: "attribute", source: "x", attribute: "x" },
          { type: "attribute", source: "y", attribute: "y" }
        ]
      } as Handles.Point
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x, y, size } = attrs;
    return {
      type: "circle",
      cx: x,
      cy: y,
      radius: Math.sqrt(size / Math.PI)
    } as BoundingBox.Circle;
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
    let widgets = [
      manager.sectionHeader("Symbol"),
      manager.mappingEditor("Shape", "symbol", {
        acceptKinds: [Specification.DataKind.Categorical],
        hints: { rangeEnum: symbolTypes },
        defaultValue: "circle"
      }),
      manager.mappingEditor("Size", "size", {
        acceptKinds: [Specification.DataKind.Numerical],
        hints: { rangeNumber: [0, 200 * Math.PI] },
        defaultValue: 60,
        numberOptions: {
          showSlider: true,
          minimum: 0,
          sliderRange: [0, 3600],
          sliderFunction: "sqrt"
        }
      }),
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
}

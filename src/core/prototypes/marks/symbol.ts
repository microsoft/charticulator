// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../../strings";
import { Color, Point, rgbToHex } from "../../common";
import * as Graphics from "../../graphics";
import { makeCircleSymbol, makeCross, makeDiamond, makeSquare, makeStar, makeTriangle, makeWye } from "../../graphics";
import * as Specification from "../../specification";
import { DataKind, MappingType } from "../../specification";
import {
  AttributeDescriptions,
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
  symbolAttributes,
  SymbolElementAttributes,
  SymbolElementProperties,
  symbolTypes,
} from "./symbol.attrs";
import { RectangleGlyph } from "../glyphs";

export const symbolTypesList = symbolTypes;

export { SymbolElementAttributes, SymbolElementProperties };

export class SymbolElementClass extends EmphasizableMarkClass<
  SymbolElementProperties,
  SymbolElementAttributes
> {
  public static classID = "mark.symbol";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Symbol",
    iconPath: "Shapes",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" },
    },
  };

  public static defaultProperties: Partial<SymbolElementProperties> = {
    ...ObjectClass.defaultProperties,
    visible: true,
    rotation: 0,
  };

  public static defaultMappingValues: Partial<SymbolElementAttributes> = {
    fill: { r: 17, g: 141, b: 255 },
    strokeWidth: 1,
    opacity: 1,
    size: 60,
    visible: true,
  };

  public attributes: AttributeDescriptions = symbolAttributes;
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
            direction: { x: mode == "begin" ? 1 : -1, y: 0 },
          },
        ],
      },
    ];
  }

  // Get the graphical element from the element
  // eslint-disable-next-line
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
    if (attrs.size <= 0) {
      return null;
    }
    const pc = cs.transformPoint(attrs.x + offset.x, attrs.y + offset.y);
    const rotation = this.object.properties.rotation;

    const style: Graphics.Style = {
      strokeColor: attrs.stroke,
      strokeWidth: attrs.strokeWidth,
      fillColor: attrs.fill,
      opacity: attrs.opacity,
      ...this.generateEmphasisStyle(emphasize),
    };
    
    const key = `${glyphIndex}-${this.object._id}`;
    switch (attrs.symbol) {
      case "square": {
        const size = attrs.size;
        return makeSquare(pc.x, pc.y, size, rotation, key, style);
      }
      case "cross": {
        return makeCross(pc.x, pc.y, attrs.size, rotation, key, style);
      }
      case "diamond": {
        const size = attrs.size;
        return makeDiamond(pc.x, pc.y, size, rotation, key, style);
      }
      case "star": {
        const size = attrs.size;
        const x = pc.x;
        const y = pc.y;
        return makeStar(x, y, size, rotation, key, style);
      }
      case "triangle": {
        const size = attrs.size;
        const x = pc.x;
        const y = pc.y;
        return makeTriangle(x, y, size, rotation, key, style);
      }
      case "wye": {
        const x = pc.x;
        const y = pc.y;
        const size = attrs.size;
        return makeWye(x, y, size, rotation, key, style);
      }
      default: {
        const size = attrs.size;
        const x = pc.x;
        const y = pc.y;
        return makeCircleSymbol(x, y, size, key, style);
      }
    }
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes;
    const { x, y, size } = attrs;
    const r = Math.sqrt(size);
    return [
      <DropZones.Line>{
        type: "line",
        p1: { x: x + r, y },
        p2: { x: x - r, y },
        title: "size",
        dropAction: {
          scaleInference: {
            attribute: "size",
            attributeType: Specification.AttributeType.Number,
            hints: { rangeNumber: [0, 200 * Math.PI] },
          },
        },
        accept: {
          kind: DataKind.Numerical,
          table: (this.parent as RectangleGlyph).object.table,
        },
      },
    ];
  }

  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x, y } = attrs;
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
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x, y, size } = attrs;
    return <BoundingBox.Circle>{
      type: "circle",
      cx: x,
      cy: y,
      radius: Math.sqrt(size / Math.PI)
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
    let widgets = [
      manager.verticalGroup(
        {
          header: strings.objects.general,
        },
        [
          manager.mappingEditor(strings.objects.rect.shape, "symbol", {
            acceptKinds: [Specification.DataKind.Categorical],
            hints: { rangeEnum: symbolTypes },
            defaultValue: "circle",
            searchSection: strings.objects.general,
          }),
          manager.mappingEditor(strings.objects.size, "size", {
            acceptKinds: [Specification.DataKind.Numerical],
            hints: { rangeNumber: [0, 200 * Math.PI] },
            defaultValue: 60,
            numberOptions: {
              showSlider: true,
              minimum: 0,
              sliderRange: [0, 3600],
              sliderFunction: "sqrt",
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
          manager.inputNumber(
            { property: "rotation" },
            {
              label: strings.objects.rotation,
              showUpdown: true,
              updownTick: 5,
              searchSection: strings.objects.general,
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
    widgets = widgets.concat([]);

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
      this.object.mappings.fill &&
      this.object.mappings.fill.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "fill",
        },
        type: Specification.AttributeType.Color,
        default: rgbToHex(<Color>this.state.attributes.fill),
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
    if (
      this.object.mappings.symbol &&
      this.object.mappings.symbol.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "symbol",
        },
        type: Specification.AttributeType.Enum,
        default: this.state.attributes.symbol,
      });
    }

    return {
      properties,
    };
  }
}

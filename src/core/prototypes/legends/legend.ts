// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color, indexOf, rgbToHex } from "../../common";
import * as Specification from "../../specification";
import { ChartElementClass } from "../chart_element";
import {
  AttributeDescription,
  BoundingBox,
  Controls,
  Handles,
  ObjectClassMetadata,
  TemplateParameters,
} from "../common";

export interface LegendAttributes extends Specification.AttributeMap {
  x: number;
  y: number;
}

export interface LegendProperties extends Specification.AttributeMap {
  scale: string;
  alignX: string;
  alignY: string;
  fontFamily: string;
  fontSize: number;
  textColor: Color;
}

export interface LegendState extends Specification.ObjectState {
  attributes: LegendAttributes;
}

export interface LegendObject extends Specification.Object {
  properties: LegendProperties;
}

export abstract class LegendClass extends ChartElementClass {
  public readonly object: LegendObject;
  public readonly state: LegendState;

  public static metadata: ObjectClassMetadata = {
    displayName: "Legend",
    iconPath: "legend/legend",
  };

  public static defaultProperties: LegendProperties = {
    scale: null,
    visible: true,
    alignX: "start",
    alignY: "end",
    fontFamily: "Arial",
    fontSize: 14,
    textColor: { r: 0, g: 0, b: 0 },
    dataSource: "columnValues",
    dataExpressions: [],
  };

  public attributeNames: string[] = ["x", "y"];
  public attributes: { [name: string]: AttributeDescription } = {
    x: {
      name: "x",
      type: Specification.AttributeType.Number,
    },
    y: {
      name: "y",
      type: Specification.AttributeType.Number,
    },
  };

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x = 0;
    attrs.y = 0;
  }

  public getLayoutBox(): { x1: number; y1: number; x2: number; y2: number } {
    const { x, y } = this.state.attributes;
    const [width, height] = this.getLegendSize();
    let x1: number, y1: number, x2: number, y2: number;
    switch (this.object.properties.alignX) {
      case "start":
        x1 = x;
        x2 = x + width;
        break;
      case "middle":
        x1 = x - width / 2;
        x2 = x + width / 2;
        break;
      case "end":
        x1 = x - width;
        x2 = x;
        break;
    }
    switch (this.object.properties.alignY) {
      case "start":
        y1 = y;
        y2 = y + height;
        break;
      case "middle":
        y1 = y - height / 2;
        y2 = y + height / 2;
        break;
      case "end":
        y1 = y - height;
        y2 = y;
        break;
    }
    return { x1, y1, x2, y2 };
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = this.getLayoutBox();
    return {
      type: "rectangle",
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0,
    } as BoundingBox.Rectangle;
  }

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
          { type: "attribute", source: "y", attribute: "y" },
        ],
        options: {
          snapToClosestPoint: true,
        },
      } as Handles.Point,
    ];
  }

  public getScale(): [Specification.Scale, Specification.ScaleState] {
    const scale = this.object.properties.scale;
    const scaleIndex = indexOf(
      this.parent.object.scales,
      (x) => x._id == scale
    );
    if (scaleIndex >= 0) {
      return [
        this.parent.object.scales[scaleIndex],
        this.parent.state.scales[scaleIndex],
      ];
    } else {
      return null;
    }
  }

  public getLegendSize(): [number, number] {
    return [10, 10];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const widget = [
      manager.sectionHeader("Labels"),
      manager.row("Font", manager.inputFontFamily({ property: "fontFamily" })),
      manager.row(
        "Size",
        manager.inputNumber(
          { property: "fontSize" },
          { showUpdown: true, updownStyle: "font", updownTick: 2 }
        )
      ),
      manager.row("Color", manager.inputColor({ property: "textColor" })),
      manager.sectionHeader("Layout"),
      manager.row(
        "Alignment",
        manager.horizontal(
          [1, 1],
          manager.inputSelect(
            { property: "alignX" },
            {
              type: "radio",
              icons: ["align/left", "align/x-middle", "align/right"],
              labels: ["Left", "Middle", "Right"],
              options: ["start", "middle", "end"],
            }
          ),
          manager.inputSelect(
            { property: "alignY" },
            {
              type: "radio",
              icons: ["align/top", "align/y-middle", "align/bottom"],
              labels: ["Top", "Middle", "Bottom"],
              options: ["end", "middle", "start"],
            }
          )
        )
      ),
    ];

    return widget;
  }

  public getTemplateParameters(): TemplateParameters {
    const properties = [];
    if (this.object.properties.fontFamily) {
      properties.push({
        objectID: this.object._id,
        target: {
          property: "fontFamily",
        },
        type: Specification.AttributeType.FontFamily,
        default: this.object.properties.fontFamily,
      });
    }
    if (this.object.properties.fontSize) {
      properties.push({
        objectID: this.object._id,
        target: {
          property: "fontSize",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.fontSize,
      });
    }
    if (this.object.properties.textColor) {
      properties.push({
        objectID: this.object._id,
        target: {
          property: "textColor",
        },
        type: Specification.AttributeType.Color,
        default: rgbToHex(this.object.properties.textColor),
      });
    }
    if (this.object.properties.alignY) {
      properties.push({
        objectID: this.object._id,
        target: {
          property: "alignY",
        },
        type: Specification.AttributeType.Enum,
        default: this.object.properties.alignY,
      });
    }
    if (this.object.properties.alignX) {
      properties.push({
        objectID: this.object._id,
        target: {
          property: "alignX",
        },
        type: Specification.AttributeType.Enum,
        default: this.object.properties.alignX,
      });
    }
    return {
      properties,
    };
  }
}

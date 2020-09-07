// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color, deepClone } from "../../common";
import * as Specification from "../../specification";
import {
  AttributeDescription,
  Controls,
  ObjectClassMetadata,
  BoundingBox,
  Handles
} from "../common";
import { DataAxisExpression } from "../marks/data_axis.attrs";
import { LegendProperties, LegendState, LegendClass } from "./legend";
import {
  defaultAxisStyle,
  buildAxisAppearanceWidgets
} from "../plot_segments/axis";

export type LegendSourceType = "columnNames" | "columnValues";

export type LegendType = "color" | "numerical" | "categorical";

export type LegendOrientation = "horizontal" | "vertical";

import { ChartStateManager } from "../state";
import { CategoricalLegendClass } from "./categorical_legend";

export interface CustomLegendProperties extends LegendProperties {
  legendType: LegendType;
  orientation: LegendOrientation;
  dataSource: LegendSourceType;
  dataExpressions: DataAxisExpression[];
  axis: {
    visible: boolean;
    side: string;
    style: Specification.Types.AxisRenderingStyle;
  };
}

export interface CustomLegendObject extends Specification.Object {
  properties: CustomLegendProperties;
}

export interface CustomLegendState extends LegendState {}

export interface CustomLegendItem {
  type: "number" | "color" | "boolean";
  label: string;
  value: number | Color | boolean;
}

export class CustomLegendClass extends CategoricalLegendClass {
  public static classID: string = "legend.custom";
  public static type: string = "legend";

  public readonly object: CustomLegendObject;
  public readonly state: CustomLegendState;

  private manager?: ChartStateManager;

  public static metadata: ObjectClassMetadata = {
    displayName: "Legend",
    iconPath: "legend/legend",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" }
    }
  };

  public static defaultProperties: CustomLegendProperties = {
    scale: null,
    visible: true,
    alignX: "start",
    alignY: "end",
    fontFamily: "Arial",
    fontSize: 14,
    textColor: { r: 0, g: 0, b: 0 },
    dataSource: "columnValues",
    dataExpressions: [],
    legendType: "color",
    orientation: "vertical",
    axis: {
      side: "default",
      visible: true,
      style: deepClone(defaultAxisStyle)
    }
  };

  public attributes: { [name: string]: AttributeDescription } = {
    x: {
      name: "x",
      type: Specification.AttributeType.Number
    },
    y: {
      name: "y",
      type: Specification.AttributeType.Number
    },
    x1: {
      name: "x1",
      type: Specification.AttributeType.Number
    },
    y1: {
      name: "y1",
      type: Specification.AttributeType.Number
    },
    x2: {
      name: "x2",
      type: Specification.AttributeType.Number
    },
    y2: {
      name: "y2",
      type: Specification.AttributeType.Number
    }
  };

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x1 = 0;
    attrs.y1 = 0;
    attrs.x2 = 0;
    attrs.y2 = 0;
  }

  public getLayoutBox(): { x1: number; y1: number; x2: number; y2: number } {
    if (this.object.properties.orientation === "vertical") {
      return super.getLayoutBox();
    }

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

  public getLineHeight(): number {
    return this.object.properties.fontSize + 10;
  }

  public getLineWidth(): number {
    let width = 0;
    const items = this.getLegendItems();
    if (this.object.properties.orientation === "horizontal") {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const metrics = this.textMeasure.measure(item.label);
        width += 10 + metrics.width;
      }
    } else {
      width = (items[0] && this.textMeasure.measure(items[0].label).width) || 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const metrics = this.textMeasure.measure(item.label);
        if (10 + metrics.width > width) {
          width = 10 + metrics.width;
        }
      }
    }

    return width;
  }

  public getLegendSize(): [number, number] {
    const items = this.getLegendItems();
    if (this.object.properties.orientation === "vertical") {
      return [
        this.getLineWidth() + this.getLineHeight(),
        items.length * this.getLineHeight()
      ];
    } else {
      return [
        this.getLineWidth() + items.length * this.getLineHeight(),
        this.getLineHeight()
      ];
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const widget = super.getAttributePanelWidgets(manager);

    const scale = this.getScale();
    if (scale) {
      widget.push(
        manager.row(
          "Scale",
          manager.scaleEditor("mappingOptions", "Edit scale colors")
        )
      );
    }

    if (this.object.properties.legendType === "numerical") {
      const props = this.object.properties;
      widget.push(manager.sectionHeader("Axis"));
      widget.push(
        buildAxisAppearanceWidgets(props.axis.visible, "axis", manager)
      );
    } else {
      widget.push(
        manager.row(
          "Orientation",
          manager.inputSelect(
            { property: "orientation" },
            {
              type: "radio",
              showLabel: false,
              icons: ["align/x-middle", "align/y-middle"],
              labels: ["Vertical", "Horizontal"],
              options: ["vertical", "horizontal"]
            }
          )
        )
      );
    }

    return widget;
  }
}

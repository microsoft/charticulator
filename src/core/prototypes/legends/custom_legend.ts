// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color, indexOf, deepClone } from "../../common";
import * as Graphics from "../../graphics";
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
import { AxisRenderer, defaultAxisStyle } from "../plot_segments/axis";

export type LegendSourceType = "columnNames" | "columnValues";

export type LegendType = "color" | "numerical" | "categorical";

export type LegendOrientation = "horizontal" | "vertical";

import { ChartStateManager } from "../state";
import { TableType } from "../../dataset";
import { Expression, Prototypes } from "../..";

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

export interface CustomLegendState extends LegendState { }

export interface CustomLegendItem {
  type: "number" | "color" | "boolean";
  label: string;
  value: number | Color | boolean;
}

export class CustomLegendClass extends LegendClass {
  public static classID: string = "legend.custom";
  public static type: string = "legend";

  public readonly object: CustomLegendObject;
  public readonly state: CustomLegendState;

  private textMeasure = new Graphics.TextMeasurer();

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

  public getCustomScale(
    manager: ChartStateManager = this.manager
  ): [Specification.Scale, Specification.ScaleState] {
    if (!manager) {
      return null;
    }
    let scale: string = null;

    if (this.object.properties.scale) {
      scale = this.object.properties.scale;
    }
    if (indexOf(this.parent.object.scales, x => x._id === scale) === -1) {
      this.object.properties.scale = scale = null;
    }
    if (!scale) {
      const valueType: Specification.DataType = Specification.DataType.String;
      const valueKind: Specification.DataKind =
        Specification.DataKind.Categorical;
      const outputType: Specification.AttributeType =
        Specification.AttributeType.Color;
      // create scale for column names
      const scaleClassID = Prototypes.Scales.inferScaleType(
        valueType,
        valueKind,
        outputType
      );

      if (scaleClassID != null) {
        const tableName = this.parent.dataflow.context.dataset.tables.find(
          t => t.type === TableType.Main
        ).name;
        const table = this.parent.dataflow.getTable(tableName);
        const data = (this.object.properties.dataExpressionColumns as any[])
          .map(ex => {
            const expression = `columnName(${ex.table}.columns, "${
              ex.columnName
              }")`;
            const parsedExpression = this.parent.dataflow.cache.parse(
              expression
            );
            try {
              const table = this.parent.dataflow.getTable(ex.table);
              return parsedExpression.getValue(table); // to do add check before apply
            } catch (ex) {
              console.error(ex);
              return null;
            }
          })
          .filter(v => v != null);

        const newScale = manager.createObject(
          scaleClassID
        ) as Specification.Scale;
        newScale.properties.name = manager.findUnusedName("Scale");
        newScale.inputType = valueType;
        newScale.outputType = outputType;
        manager.addScale(newScale);
        const scaleClass = manager.getClassById(
          newScale._id
        ) as Prototypes.Scales.ScaleClass;

        scaleClass.inferParameters(data as Specification.DataValue[], {});

        this.object.properties.scale = scale = newScale._id;

        // expression returns array of column names for selected columns
        const expression = `columnName(${tableName}.columns, ${(this.object
          .properties.dataExpressionColumns as any[])
          .map(ex => {
            return `"${ex.columnName}"`;
          })
          .join(",")})`;

        this.object.mappings.mappingOptions = {
          type: "scale",
          table: tableName,
          expression,
          valueType,
          scale: newScale._id,
          allowSelectValue: true
        } as Specification.ScaleMapping;
      }
    }

    // this.attributes.mappingOptions = this.object.properties.dataExpressionColumns as any;

    const scaleIndex = indexOf(this.parent.object.scales, x => x._id == scale);
    if (scaleIndex >= 0) {
      return [
        this.parent.object.scales[scaleIndex],
        this.parent.state.scales[scaleIndex]
      ];
    } else {
      return null;
    }
  }

  public getScale(): [Specification.Scale, Specification.ScaleState] {
    let scale: string = null;
    scale =
      this.object.properties.mappingOptions &&
      (this.object.properties.mappingOptions as any).scale;

    // this.attributes.mappingOptions = this.object.properties.dataExpressionColumns as any;
    this.object.properties.scale = scale;
    if (
      this.object.properties.mappingOptions &&
      (this.object.properties.mappingOptions as any).scale
    ) {
      this.object.mappings.mappingOptions = this.object.properties
        .mappingOptions as any;
    }

    const scaleIndex = indexOf(this.parent.object.scales, x => x._id == scale);
    if (scaleIndex >= 0) {
      return [
        this.parent.object.scales[scaleIndex],
        this.parent.state.scales[scaleIndex]
      ];
    } else {
      return null;
    }
  }

  public getLegendItems(): CustomLegendItem[] {
    let scale;
    if (this.object.properties.dataSource === "columnNames") {
      scale = this.getCustomScale(this.manager);
    } else {
      scale = this.getScale();
    }

    if (!scale) {
      return [];
    }
    if (this.object.properties.legendType === "color") {
      const [scaleObject, scaleState] = scale;
      const mapping = scaleObject.properties.mapping as {
        [name: string]: Color;
      };
      const items: CustomLegendItem[] = [];
      for (const key in mapping) {
        if (mapping.hasOwnProperty(key)) {
          switch (scaleObject.classID) {
            case "scale.categorical<string,boolean>":
              {
                items.push({
                  type: "boolean",
                  label: key,
                  value: mapping[key]
                });
              }
              break;
            case "scale.categorical<string,number>":
              {
                items.push({ type: "number", label: key, value: mapping[key] });
              }
              break;
            case "scale.categorical<string,color>":
              {
                items.push({ type: "color", label: key, value: mapping[key] });
              }
              break;
          }
        }
      }
      items.sort((a, b) => (a.label < b.label ? -1 : 1));
      return items;
    }
    if (this.object.properties.legendType === "categorical") {
      const [scaleObject, scaleState] = scale;
      const mapping = scaleObject.properties.mapping as {
        [name: string]: Color;
      };
      const items: CustomLegendItem[] = [];
      for (const key in mapping) {
        if (mapping.hasOwnProperty(key)) {
          switch (scaleObject.classID) {
            case "scale.categorical<string,boolean>":
              {
                items.push({
                  type: "boolean",
                  label: key,
                  value: mapping[key]
                });
              }
              break;
            case "scale.categorical<string,number>":
              {
                items.push({ type: "number", label: key, value: mapping[key] });
              }
              break;
            case "scale.categorical<string,color>":
              {
                items.push({ type: "color", label: key, value: mapping[key] });
              }
              break;
          }
        }
      }
      items.sort((a, b) => (a.label < b.label ? -1 : 1));
      return items;
    }
  }

  public getBoundingBox(): BoundingBox.Description {
    if (this.object.properties.legendType === "numerical") {
      return {
        type: "line",
        x1: this.state.attributes.x1,
        y1: this.state.attributes.y1,
        x2: this.state.attributes.x2,
        y2: this.state.attributes.y2
      } as BoundingBox.Line;
    } else {
      return super.getBoundingBox();
    }
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

  public getHandles(): Handles.Description[] {
    if (this.object.properties.legendType === "numerical") {
      const attrs = this.state.attributes;
      const { x1, y1, x2, y2 } = attrs;
      return [
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
          x: x2,
          y: y2,
          actions: [
            { type: "attribute", source: "x", attribute: "x2" },
            { type: "attribute", source: "y", attribute: "y2" }
          ]
        } as Handles.Point
      ];
    } else {
      return super.getHandles();
    }
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
      width = this.textMeasure.measure(items[0].label).width;
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

  public getGraphics(manager: ChartStateManager): Graphics.Element {
    this.manager = manager;
    if (this.object.properties.legendType == "numerical") {
      const scale = this.getScale();
      if (!scale) {
        return null;
      }

      if (!this.object.properties.axis.visible) {
        return null;
      }

      const rangeMin = scale[1].attributes.rangeMin as number;
      const rangeMax = scale[1].attributes.rangeMax as number;
      const domainMin = scale[0].properties.domainMin as number;
      const domainMax = scale[0].properties.domainMax as number;

      const dx =
        (this.state.attributes.x2 as number) -
        (this.state.attributes.x1 as number);
      const dy =
        (this.state.attributes.y2 as number) -
        (this.state.attributes.y1 as number);
      const length = Math.sqrt(dx * dx + dy * dy);

      const renderer = new AxisRenderer();
      // Extend/shrink range, and update the domain accordingly. Keep the scaling factor.
      const scaling = (rangeMax - rangeMin) / (domainMax - domainMin);
      renderer.setLinearScale(
        domainMin,
        domainMin + (length - rangeMin) / scaling,
        rangeMin,
        length,
        null
      );
      renderer.setStyle(this.object.properties.axis.style);

      return renderer.renderLine(
        this.state.attributes.x1 as number,
        this.state.attributes.y1 as number,
        (Math.atan2(dy, dx) / Math.PI) * 180,
        -1
      );
    } else {
      const fontFamily = this.object.properties.fontFamily;
      const fontSize = this.object.properties.fontSize;
      const lineHeight = this.getLineHeight();
      this.textMeasure.setFontFamily(fontFamily);
      this.textMeasure.setFontSize(fontSize);

      const g = Graphics.makeGroup([]);
      const items = this.getLegendItems();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const metrics = this.textMeasure.measure(item.label);
        const offsets = Graphics.TextMeasurer.ComputeTextPosition(
          lineHeight,
          lineHeight / 2,
          metrics,
          "left",
          "middle",
          5,
          0
        );
        const textLabel = Graphics.makeText(
          offsets[0],
          offsets[1],
          item.label,
          fontFamily,
          fontSize,
          { fillColor: this.object.properties.textColor }
        );
        const gItem = Graphics.makeGroup([textLabel]);
        switch (item.type) {
          case "color":
            {
              gItem.elements.push(
                Graphics.makeRect(8, 4, lineHeight, lineHeight - 4, {
                  fillColor: item.value as Color
                })
              );
            }
            break;
        }
        if (this.object.properties.orientation === "vertical") {
          gItem.transform = {
            x: 0,
            y: lineHeight * (items.length - 1 - i),
            angle: 0
          };
        } else {
          gItem.transform = {
            x: (metrics.width + lineHeight) * (items.length - 1 - i),
            y: 0,
            angle: 0
          };
        }
        g.elements.push(gItem);
      }
      const { x1, y1 } = this.getLayoutBox();
      g.transform = { x: x1, y: y1, angle: 0 };

      return g;
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const widget = super.getAttributePanelWidgets(manager);

    const scale = this.getCustomScale();
    if (scale) {
      widget.push(
        manager.row(
          "Scale",
          manager.scaleEditor("mappingOptions", "Edit scale colors")
        )
      );
    }

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

    return widget;
  }
}

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

import { ChartStateManager } from "../state";
import { TableType } from "../../dataset";
import { Expression, Prototypes } from "../..";
import { color } from "d3";

export interface CustomLegendProperties extends LegendProperties {
  legendType: LegendType;
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

export class CustomLegendClass extends LegendClass {
  public static classID: string = "legend.custom";
  public static type: string = "legend";

  public readonly object: CustomLegendObject;
  public readonly state: CustomLegendState;

  private textMeasure = new Graphics.TextMeasurer();

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
    dataExpression: {
      name: "dataExpression",
      defaultValue: null,
      type: Specification.AttributeType.Color
    },
    dataExpressionColor: {
      name: "dataExpressionColor",
      defaultValue: null,
      type: Specification.AttributeType.Color
    },
    dataExpressionNumber: {
      name: "dataExpressionNumber",
      defaultValue: null,
      type: Specification.AttributeType.Number
    },
    dataExpressionCategory: {
      name: "dataExpressionCategory",
      defaultValue: null,
      type: Specification.AttributeType.Text
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
    manager: ChartStateManager
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
        const data = this.object.properties.dataExpressions
          .map(expression => {
            if (expression.expression) {
              const parsedExpression = this.parent.dataflow.cache.parse(
                expression.expression
              );
              try {
                return parsedExpression.getValue(table); // to do add check before apply
              } catch (ex) {
                console.error(ex);
                return null;
              }
            } else {
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
      }
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

  public getScale(): [Specification.Scale, Specification.ScaleState] {
    let scale: string = null;
    if (this.object.properties.legendType == "color") {
      scale =
        this.object.mappings.dataExpressionColor &&
        (this.object.mappings.dataExpressionColor as any).scale;
    }
    if (this.object.properties.legendType == "categorical") {
      scale =
        this.object.mappings.dataExpressionCategory &&
        (this.object.mappings.dataExpressionCategory as any).scale;
    }
    if (this.object.properties.legendType == "numerical") {
      scale =
        this.object.mappings.dataExpressionNumber &&
        (this.object.mappings.dataExpressionNumber as any).scale;
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

  public getLegendItems(manager?: ChartStateManager): CustomLegendItem[] {
    let scale;

    if (this.object.properties.dataSource === "columnNames") {
      scale = this.getCustomScale(manager);
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

  public getLineHeight() {
    return this.object.properties.fontSize + 10;
  }

  public getLegendSize(): [number, number] {
    const items = this.getLegendItems();
    return [100, items.length * this.getLineHeight()];
  }

  public getGraphics(manager: ChartStateManager): Graphics.Element {
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
      const items = this.getLegendItems(manager);
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
        gItem.transform = {
          x: 0,
          y: lineHeight * (items.length - 1 - i),
          angle: 0
        };
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
    const props = this.object.properties;

    // widget.push(
    //   manager.row(
    //     "Legend type",
    //     manager.inputSelect(
    //       { property: "legendType" },
    //       {
    //         type: "dropdown",
    //         // icons: ["align/top", "align/y-middle"],
    //         labels: ["Color", "Numerical", "Categorical"],
    //         options: ["color", "numerical", "categorical"],
    //         showLabel: true
    //       }
    //     )
    //   )
    // );

    // widget.push(
    //   manager.row(
    //     "Data source",
    //     manager.inputSelect(
    //       { property: "dataSource" },
    //       {
    //         type: "radio",
    //         // icons: ["align/top", "align/y-middle"],
    //         labels: ["Column names", "Column values"],
    //         options: ["columnNames", "columnValues"],
    //         showLabel: true
    //       }
    //     )
    //   )
    // );
    // let typeProperty = "dataExpression";
    // if (props.legendType == "color") {
    //   typeProperty += "Color";
    // }
    // if (props.legendType == "numerical") {
    //   typeProperty += "Number";
    // }
    // if (props.legendType == "categorical") {
    //   typeProperty += "Category";
    // }
    // if (props.dataSource === "columnValues") {
    //   widget.push(manager.mappingEditor("Data column", typeProperty, {}));
    // }
    // if (props.dataSource === "columnNames") {
    //   if (props.dataExpressions.length > 0) {
    //     widget.push(manager.sectionHeader("Data Expressions"));
    //     widget.push(
    //       manager.arrayWidget(
    //         { property: "dataExpressions" },
    //         item => {
    //           return manager.inputExpression(
    //             {
    //               property: "dataExpressions",
    //               field:
    //                 item.field instanceof Array
    //                   ? [...item.field, "expression"]
    //                   : [item.field, "expression"]
    //             }
    //             // { table: this.getGlyphClass().object.table }
    //           );
    //         },
    //         {
    //           allowDelete: true,
    //           allowReorder: true
    //         }
    //       )
    //     );
    //   }

    // widget.push(
    //   manager.inputExpression(
    //     {
    //       property: "dataExpressions",
    //       field: [props.dataExpressions.length, "expression"]
    //     }
    //     // { table: this.getGlyphClass().object.table }
    //   )
    // );
    // }
    return widget;
  }
}

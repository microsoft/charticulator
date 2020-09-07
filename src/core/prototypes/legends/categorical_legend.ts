// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color, indexOf } from "../../common";
import * as Graphics from "../../graphics";

import { LegendClass } from "./legend";

export interface CategoricalLegendItem {
  type: "number" | "color" | "boolean";
  label: string;
  value: number | Color | boolean;
}

export class CategoricalLegendClass extends LegendClass {
  public static classID: string = "legend.categorical";
  public static type: string = "legend";

  protected textMeasure = new Graphics.TextMeasurer();

  public getLegendItems(): CategoricalLegendItem[] {
    const scale = this.getScale();
    if (scale) {
      const [scaleObject, scaleState] = scale;
      const mapping = scaleObject.properties.mapping as {
        [name: string]: Color;
      };
      const items: CategoricalLegendItem[] = [];
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
    } else {
      return [];
    }
  }

  public getLineHeight() {
    return this.object.properties.fontSize + 10;
  }

  public getLegendSize(): [number, number] {
    const items = this.getLegendItems();
    return [100, items.length * this.getLineHeight()];
  }

  public getGraphics(): Graphics.Element {
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

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { interpolateColors } from "../../common";
import * as Graphics from "../../graphics";
import * as Specification from "../../specification";

import { AxisRenderer } from "../plot_segments/axis";
import { LegendClass } from "./legend";

export class NumericalColorLegendClass extends LegendClass {
  public static classID: string = "legend.numerical-color";
  public static type: string = "legend";

  public getLegendSize(): [number, number] {
    return [100, 100];
  }

  public getGraphics(): Graphics.Element {
    const height = this.getLegendSize()[1];
    const marginLeft = 5;
    const gradientWidth = 12;

    const scale = this.getScale();
    if (!scale) {
      return null;
    }

    const range = scale[0].properties
      .range as Specification.Types.ColorGradient;
    const domainMin = scale[0].properties.domainMin as number;
    const domainMax = scale[0].properties.domainMax as number;

    const axisRenderer = new AxisRenderer();
    axisRenderer.setLinearScale(domainMin, domainMax, 0, height, null);
    axisRenderer.setStyle({
      tickColor: this.object.properties.textColor,
      fontSize: this.object.properties.fontSize,
      fontFamily: this.object.properties.fontFamily,
      lineColor: this.object.properties.textColor
    });
    const g = Graphics.makeGroup([]);
    g.elements.push(
      axisRenderer.renderLine(marginLeft + gradientWidth + 2, 0, 90, 1)
    );

    const ticks = height * 2;
    const interp = interpolateColors(range.colors, range.colorspace);
    for (let i = 0; i < ticks; i++) {
      const t = (i + 0.5) / ticks;
      const color = interp(t);
      const y1 = (i / ticks) * height;
      const y2 = Math.min(height, ((i + 1.5) / ticks) * height);
      g.elements.push(
        Graphics.makeRect(marginLeft, y1, marginLeft + gradientWidth, y2, {
          fillColor: color
        })
      );
    }

    const { x1, y1 } = this.getLayoutBox();
    g.transform = { x: x1, y: y1, angle: 0 };
    return g;
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { interpolateColors } from "../../common";
import * as Graphics from "../../graphics";
import * as Specification from "../../specification";

import { AxisRenderer } from "../plot_segments/axis";
import { LegendClass, LegendProperties } from "./legend";
import { Controls } from "../common";
import { CharticulatorPropertyAccessors } from "../../../app/views/panels/widgets/types";
import { strings } from "../../../strings";
import { OrientationType } from "./types";

export class NumericalColorLegendClass extends LegendClass {
  public static classID: string = "legend.numerical-color";
  public static type: string = "legend";

  public getLegendSize(): [number, number] {
    return [100, 100];
  }

  public static defaultProperties: LegendProperties = {
    ...LegendClass.defaultProperties,
    orientation: OrientationType.VERTICAL,
  };

  public getGraphics(): Graphics.Element {
    const height = this.getLegendSize()[1];
    const props = this.object.properties;
    const marginLeft = 5;
    const gradientWidth = 12;
    const axisMargin = 2;
    const horizontalShift = this.getLegendSize()[1] - gradientWidth;

    const scale = this.getScale();
    if (!scale) {
      return null;
    }

    const isVertical = props.orientation === OrientationType.VERTICAL;
    const range = <Specification.Types.ColorGradient>scale[0].properties.range;
    const domainMin = <number>scale[0].properties.domainMin;
    const domainMax = <number>scale[0].properties.domainMax;

    const axisRenderer = new AxisRenderer();
    axisRenderer.setLinearScale(domainMin, domainMax, 0, height, null);
    axisRenderer.setStyle({
      tickColor: this.object.properties.textColor,
      fontSize: this.object.properties.fontSize,
      fontFamily: this.object.properties.fontFamily,
      lineColor: this.object.properties.textColor,
    });
    const g = Graphics.makeGroup([]);
    if (isVertical) {
      g.elements.push(
        axisRenderer.renderLine(
          marginLeft + gradientWidth + axisMargin,
          0,
          90,
          1
        )
      );
    } else {
      g.elements.push(axisRenderer.renderLine(0, -axisMargin, 0, 1));
    }

    const ticks = height * 2;
    const interp = interpolateColors(range.colors, range.colorspace);
    for (let i = 0; i < ticks; i++) {
      const t = (i + 0.5) / ticks;
      const color = interp(t);
      const y1 = (i / ticks) * height;
      const y2 = Math.min(height, ((i + 1.5) / ticks) * height);
      if (isVertical) {
        g.elements.push(
          Graphics.makeRect(marginLeft, y1, marginLeft + gradientWidth, y2, {
            fillColor: color,
          })
        );
      } else {
        g.elements.push(
          Graphics.makeRect(y1, 0, y2, gradientWidth, {
            fillColor: color,
          })
        );
      }
    }

    const { x1, y1 } = this.getLayoutBox();
    if (isVertical) {
      g.transform = { x: x1, y: y1, angle: 0 };
    } else {
      g.transform = { x: x1, y: y1 + horizontalShift, angle: 0 };
    }
    return g;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager & CharticulatorPropertyAccessors
  ): Controls.Widget[] {
    const widgets = super.getAttributePanelWidgets(manager);

    return [
      ...widgets,
      manager.verticalGroup(
        {
          header: strings.objects.legend.numericalColorLegend,
        },
        [
          manager.inputSelect(
            { property: "orientation" },
            {
              type: "radio",
              showLabel: false,
              icons: ["AlignHorizontalCenter", "AlignVerticalCenter"],
              labels: [
                strings.objects.legend.vertical,
                strings.objects.legend.horizontal,
              ],
              options: [OrientationType.VERTICAL, OrientationType.HORIZONTAL],
              label: strings.objects.legend.orientation,
            }
          ),
        ]
      ),
    ];
  }
}

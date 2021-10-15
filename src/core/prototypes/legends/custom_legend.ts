// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color } from "../../common";
import * as Specification from "../../specification";
import { Controls, ObjectClassMetadata } from "../common";
import { DataAxisExpression } from "../marks/data_axis.attrs";
import { LegendProperties, LegendState } from "./legend";
import { CategoricalLegendClass } from "./categorical_legend";
import { strings } from "../../../strings";

import { CharticulatorPropertyAccessors } from "../../../app/views/panels/widgets/manager";

export type LegendSourceType = "columnNames" | "columnValues";

export type LegendType = "color" | "numerical" | "categorical";

export type LegendOrientation = "horizontal" | "vertical";

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

export type CustomLegendState = LegendState;

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

  public static metadata: ObjectClassMetadata = {
    displayName: strings.objects.legend.legend,
    iconPath: "CharticulatorLegend",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" },
    },
  };
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager & CharticulatorPropertyAccessors
  ): Controls.Widget[] {
    const widget = super.getAttributePanelWidgets(manager);

    const scale = this.getScale();
    if (scale) {
      widget.push(
        manager.vertical(
          manager.label(strings.objects.colors, {
            addMargins: true,
          }),
          manager.horizontal(
            [1],
            manager.scaleEditor(
              "mappingOptions",
              strings.objects.legend.editColors
            )
          )
        )
      );
    }

    return widget;
  }
}

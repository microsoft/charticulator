// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color, deepClone } from "../../common";
import * as Specification from "../../specification";
import { AttributeDescription, Controls, ObjectClassMetadata } from "../common";
import { DataAxisExpression } from "../marks/data_axis.attrs";
import { LegendProperties, LegendState, LegendClass } from "./legend";
import { defaultAxisStyle } from "../plot_segments/axis";

export type LegendSourceType = "columnNames" | "columnValues";

export type LegendType = "color" | "numerical" | "categorical";

export type LegendOrientation = "horizontal" | "vertical";

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

  public static metadata: ObjectClassMetadata = {
    displayName: "Legend",
    iconPath: "legend/legend",
    creatingInteraction: {
      type: "point",
      mapping: { x: "x", y: "y" }
    }
  };

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

    return widget;
  }
}

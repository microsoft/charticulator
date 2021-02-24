// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { deepClone, indexOf } from "../../common";
import * as Graphics from "../../graphics";
import * as Specification from "../../specification";
import { AxisSide } from "../../specification/types";
import { ChartElementClass } from "../chart_element";
import {
  AttributeDescription,
  BoundingBox,
  Controls,
  Handles,
  ObjectClassMetadata,
} from "../common";
import {
  AxisRenderer,
  buildAxisAppearanceWidgets,
  defaultAxisStyle,
} from "../plot_segments/axis";

export interface NumericalNumberLegendAttributes
  extends Specification.AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface NumericalNumberLegendProperties
  extends Specification.AttributeMap {
  axis: {
    visible: boolean;
    side: AxisSide;
    style: Specification.Types.AxisRenderingStyle;
  };
}

export class NumericalNumberLegendClass extends ChartElementClass<
  NumericalNumberLegendProperties,
  NumericalNumberLegendAttributes
> {
  public static classID: string = "legend.numerical-number";
  public static type: string = "legend";

  public static metadata: ObjectClassMetadata = {
    displayName: "Legend",
    iconPath: "legend/legend",
  };

  public static defaultProperties: NumericalNumberLegendProperties = {
    visible: true,
    axis: {
      side: "default",
      visible: true,
      style: deepClone(defaultAxisStyle),
    },
  };

  public attributeNames: string[] = ["x1", "y1", "x2", "y2"];
  public attributes: { [name: string]: AttributeDescription } = {
    x1: {
      name: "x1",
      type: Specification.AttributeType.Number,
    },
    y1: {
      name: "y1",
      type: Specification.AttributeType.Number,
    },
    x2: {
      name: "x2",
      type: Specification.AttributeType.Number,
    },
    y2: {
      name: "y2",
      type: Specification.AttributeType.Number,
    },
  };

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x1 = 0;
    attrs.y1 = 0;
    attrs.x2 = 0;
    attrs.y2 = 0;
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

  public getBoundingBox(): BoundingBox.Description {
    return {
      type: "line",
      x1: this.state.attributes.x1,
      y1: this.state.attributes.y1,
      x2: this.state.attributes.x2,
      y2: this.state.attributes.y2,
    } as BoundingBox.Line;
  }

  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      {
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
        options: {
          snapToClosestPoint: true,
        },
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
        options: {
          snapToClosestPoint: true,
        },
      } as Handles.Point,
    ];
  }

  public getGraphics(): Graphics.Element {
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
    renderer.oppositeSide = this.object.properties.axis.side === "opposite";

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
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;

    return [
      manager.sectionHeader("Axis"),
      buildAxisAppearanceWidgets(props.axis.visible, "axis", manager),
    ];
  }
}

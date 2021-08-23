// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../../strings";
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

export enum NumericalNumberLegendAttributeNames {
  x1 = "x1",
  y1 = "y1",
  x2 = "x2",
  y2 = "y2",
  cx = "cx",
  cy = "cy",
  radius = "radius",
  startAngle = "startAngle",
  endAngle = "endAngle",
}

export interface NumericalNumberLegendAttributes
  extends Specification.AttributeMap {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

interface NumericalNumberLegendAttributeDescription
  extends AttributeDescription {
  name: NumericalNumberLegendAttributeNames;
}

export interface NumericalNumberLegendProperties
  extends Specification.AttributeMap {
  axis: {
    visible: boolean;
    side: AxisSide;
    style: Specification.Types.AxisRenderingStyle;
  };
  polarAngularMode?: boolean;
}
const PRECISION = 1e-3;

export class NumericalNumberLegendClass extends ChartElementClass<
  NumericalNumberLegendProperties,
  NumericalNumberLegendAttributes
> {
  public static classID: string = "legend.numerical-number";
  public static type: string = "legend";

  public static metadata: ObjectClassMetadata = {
    displayName: "Legend",
    iconPath: "CharticulatorLegend",
  };

  public static defaultProperties: NumericalNumberLegendProperties = {
    visible: true,
    axis: {
      side: "default",
      visible: true,
      style: deepClone(defaultAxisStyle),
    },
  };

  public attributeNames: NumericalNumberLegendAttributeNames[] = [
    NumericalNumberLegendAttributeNames.x1,
    NumericalNumberLegendAttributeNames.y1,
    NumericalNumberLegendAttributeNames.x2,
    NumericalNumberLegendAttributeNames.y2,
    NumericalNumberLegendAttributeNames.cx,
    NumericalNumberLegendAttributeNames.cy,
    NumericalNumberLegendAttributeNames.radius,
    NumericalNumberLegendAttributeNames.startAngle,
    NumericalNumberLegendAttributeNames.endAngle,
  ];
  public attributes: {
    [name in NumericalNumberLegendAttributeNames]: NumericalNumberLegendAttributeDescription;
  } = {
    x1: {
      name: NumericalNumberLegendAttributeNames.x1,
      type: Specification.AttributeType.Number,
    },
    y1: {
      name: NumericalNumberLegendAttributeNames.y1,
      type: Specification.AttributeType.Number,
    },
    x2: {
      name: NumericalNumberLegendAttributeNames.x2,
      type: Specification.AttributeType.Number,
    },
    y2: {
      name: NumericalNumberLegendAttributeNames.y2,
      type: Specification.AttributeType.Number,
    },
    cx: {
      name: NumericalNumberLegendAttributeNames.cx,
      type: Specification.AttributeType.Number,
    },
    cy: {
      name: NumericalNumberLegendAttributeNames.cx,
      type: Specification.AttributeType.Number,
    },
    radius: {
      name: NumericalNumberLegendAttributeNames.radius,
      type: Specification.AttributeType.Number,
    },
    startAngle: {
      name: NumericalNumberLegendAttributeNames.startAngle,
      type: Specification.AttributeType.Number,
    },
    endAngle: {
      name: NumericalNumberLegendAttributeNames.endAngle,
      type: Specification.AttributeType.Number,
    },
  };

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x1 = 0;
    attrs.y1 = 0;
    attrs.x2 = 0;
    attrs.y2 = 0;
    attrs.cx = 0;
    attrs.cy = 0;
    attrs.radius = 0;
    attrs.startAngle = 0;
    attrs.endAngle = 0;
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
    if (this.object.properties.polarAngularMode) {
      const { cx, cy, radius } = this.state.attributes;
      const bbox: BoundingBox.Circle = {
        type: "circle",
        cx,
        cy,
        radius,
      };
      return bbox;
    } else {
      const { x1, y1, x2, y2 } = this.state.attributes;
      const bbox: BoundingBox.Line = {
        type: "line",
        x1,
        y1,
        x2,
        y2,
      };
      return bbox;
    }
  }

  public getHandles(): Handles.Description[] {
    const { attributes } = this.state;
    if (this.object.properties.polarAngularMode) {
      const { cx, cy } = attributes;
      // TODO is there a circle handle?????
      const points: Handles.Point[] = [
        {
          type: "point",
          x: cx,
          y: cy,
          actions: [
            {
              type: "attribute",
              source: "x",
              attribute: NumericalNumberLegendAttributeNames.cx,
            },
            {
              type: "attribute",
              source: "y",
              attribute: NumericalNumberLegendAttributeNames.cy,
            },
          ],
          options: {
            snapToClosestPoint: true,
          },
        },
      ];
      return points;
    } else {
      const { x1, y1, x2, y2 } = attributes;
      const points: Handles.Point[] = [
        {
          type: "point",
          x: x1,
          y: y1,
          actions: [
            {
              type: "attribute",
              source: "x",
              attribute: NumericalNumberLegendAttributeNames.x1,
            },
            {
              type: "attribute",
              source: "y",
              attribute: NumericalNumberLegendAttributeNames.y1,
            },
          ],
          options: {
            snapToClosestPoint: true,
          },
        },
        {
          type: "point",
          x: x2,
          y: y2,
          actions: [
            {
              type: "attribute",
              source: "x",
              attribute: NumericalNumberLegendAttributeNames.x2,
            },
            {
              type: "attribute",
              source: "y",
              attribute: NumericalNumberLegendAttributeNames.y2,
            },
          ],
          options: {
            snapToClosestPoint: true,
          },
        },
      ];
      return points;
    }
  }

  public getGraphics(): Graphics.Element {
    const scale = this.getScale();
    if (!scale) {
      return null;
    }

    if (!this.object.properties.axis.visible) {
      return null;
    }

    const rangeMin = <number>scale[1].attributes.rangeMin;
    const rangeMax = <number>scale[1].attributes.rangeMax;
    const domainMin = <number>scale[0].properties.domainMin;
    const domainMax = <number>scale[0].properties.domainMax;

    if (this.object.properties.polarAngularMode) {
      return this.getPolarAxisGraphics(
        rangeMin,
        rangeMax,
        domainMin,
        domainMax
      );
    } else {
      return Graphics.makeGroup([
        this.getLineAxisGraphics(rangeMin, rangeMax, domainMin, domainMax),
        this.getGridLineGraphics(rangeMin, rangeMax, domainMin, domainMax),
      ]);
    }
  }

  private getPolarAxisGraphics(
    rangeMin: number,
    rangeMax: number,
    domainMin: number,
    domainMax: number
  ): Graphics.Element {
    const renderer = new AxisRenderer();
    renderer.oppositeSide = this.object.properties.axis.side === "opposite";

    const { startAngle, endAngle } = this.state.attributes;
    const length = endAngle - startAngle;

    const scaling = (rangeMax - rangeMin) / (domainMax - domainMin);
    renderer.setLinearScale(
      domainMin,
      domainMin + (length - rangeMin / 360) / scaling,
      startAngle,
      endAngle,
      null
    );
    renderer.setStyle(this.object.properties.axis.style);

    return renderer.renderPolar(
      this.state.attributes.cx,
      this.state.attributes.cy,
      this.state.attributes.radius,
      renderer.oppositeSide ? -1 : 1
    );
  }

  private getLineAxisGraphics(
    rangeMin: number,
    rangeMax: number,
    domainMin: number,
    domainMax: number
  ): Graphics.Element {
    const dx =
      <number>this.state.attributes.x2 - <number>this.state.attributes.x1;
    const dy =
      <number>this.state.attributes.y2 - <number>this.state.attributes.y1;
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
      <number>this.state.attributes.x1,
      <number>this.state.attributes.y1,
      (Math.atan2(dy, dx) / Math.PI) * 180,
      -1
    );
  }

  public getGridLineGraphics(
    rangeMin: number,
    rangeMax: number,
    domainMin: number,
    domainMax: number
  ): Graphics.Element {
    const legendId = this.object._id;
    const chartConstrains = this.parent.object.constraints;

    if (chartConstrains.length > 0) {
      //x1, y1, x2, y2
      //check if 4 constrain for legend
      const amountLegendConstrain = chartConstrains.filter(
        (elem) => elem.attributes?.element === legendId
      );
      if (amountLegendConstrain.length === 4) {
        const targetConstrain = chartConstrains?.find(
          (constant) => constant?.attributes?.element === legendId
        );
        const targetId = targetConstrain?.attributes?.targetElement;
        const plotSIdx = this.parent.object.elements.findIndex(
          (element) => element._id === targetId
        );
        const plotSAttributes = this.parent.state.elements[plotSIdx]
          ?.attributes;

        const x1 = this.state.attributes.x1;
        const x2 = this.state.attributes.x2;
        const y1 = this.state.attributes.y1;
        const y2 = this.state.attributes.y2;

        const isXEquals = Math.abs(<number>x2 - <number>x1) < PRECISION;
        const isYEquals = Math.abs(<number>y2 - <number>y1) < PRECISION;

        if (!isXEquals && !isYEquals) {
          return null;
        }

        const angle = isYEquals ? 0 : 90;

        const dx = <number>plotSAttributes?.x2 - <number>plotSAttributes?.x1;
        const dy = <number>plotSAttributes?.y2 - <number>plotSAttributes?.y1;

        const length = isYEquals ? dx : dy;
        const renderer = new AxisRenderer();

        const scaling = (rangeMax - rangeMin) / (domainMax - domainMin);
        renderer.setLinearScale(
          domainMin,
          domainMin + (length - rangeMin) / scaling,
          rangeMin,
          length,
          null
        );
        renderer.setStyle({
          ...defaultAxisStyle,
          ...this.object.properties?.axis?.style,
        });

        //gridline should be in PlotSegment
        let side = 1;
        if (isXEquals) {
          if (y1 > y2) {
            if (Math.abs(x1 - <number>plotSAttributes?.x1) < PRECISION) {
              side = -1;
            } else {
              side = 1;
            }
          } else {
            if (Math.abs(x1 - <number>plotSAttributes?.x1) < PRECISION) {
              side = -1;
            } else {
              side = 1;
            }
          }
        }
        if (isYEquals) {
          if (x1 > x2) {
            if (Math.abs(y1 - <number>plotSAttributes?.y1) < PRECISION) {
              side = 1;
            } else {
              side = -1;
            }
          } else {
            if (Math.abs(y1 - <number>plotSAttributes?.y1) < PRECISION) {
              side = 1;
            } else {
              side = -1;
            }
          }
        }

        return renderer.renderGridLine(
          <number>x1 > <number>x2 ? <number>x2 : <number>x1,
          <number>y1 > <number>y2 ? <number>y2 : <number>y1,
          angle,
          side,
          isYEquals ? dy : dx
        );
      }
    }
    return null;
  }

  public getGridLineAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.verticalGroup(
        {
          header: strings.objects.plotSegment.gridline,
        },
        [
          manager.inputSelect(
            {
              property: "axis",
              field: ["style", "gridlineStyle"],
            },
            {
              type: "dropdown",
              showLabel: true,
              icons: [
                "ChromeClose",
                "stroke/solid",
                "stroke/dashed",
                "stroke/dotted",
              ],
              options: ["none", "solid", "dashed", "dotted"],
              labels: ["None", "Solid", "Dashed", "Dotted"],
              label: strings.objects.style,
            }
          ),
          manager.inputColor(
            {
              property: "axis",
              field: ["style", "gridlineColor"],
            },
            {
              label: strings.objects.color,
              labelKey: strings.objects.color,
            }
          ),
          manager.inputNumber(
            {
              property: "axis",
              field: ["style", "gridlineWidth"],
            },
            {
              minimum: 0,
              maximum: 100,
              showUpdown: true,
              label: strings.objects.width,
            }
          ),
        ]
      ),
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;

    return [
      manager.sectionHeader(strings.objects.axis),
      buildAxisAppearanceWidgets("axis", manager, {
        isVisible: props.axis.visible,
        wordWrap: props.axis.style.wordWrap,
      }),
      ...this.getGridLineAttributePanelWidgets(manager),
    ];
  }
}

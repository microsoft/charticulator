// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { deepClone, fillDefaults, Scale } from "../../common";
import {
  CoordinateSystem,
  Group,
  makeGroup,
  makeLine,
  makeText,
  Style
} from "../../graphics";
import { TextMeasurer } from "../../graphics/renderer/text_measurer";
import { Specification } from "../../index";
import { Controls } from "../common";
import { format } from "d3-format";

export let defaultAxisStyle: Specification.Types.AxisRenderingStyle = {
  tickColor: { r: 0, g: 0, b: 0 },
  lineColor: { r: 0, g: 0, b: 0 },
  fontFamily: "Arial",
  fontSize: 12,
  tickSize: 5
};

function fillDefaultAxisStyle(
  style?: Partial<Specification.Types.AxisRenderingStyle>
) {
  return fillDefaults(style, defaultAxisStyle);
}

export interface TickDescription {
  position: number;
  label: string;
}

export class AxisRenderer {
  public ticks: TickDescription[] = [];
  public style: Specification.Types.AxisRenderingStyle = defaultAxisStyle;
  public rangeMin: number = 0;
  public rangeMax: number = 1;
  public valueToPosition: (value: any) => number;
  public oppositeSide: boolean = false;

  private static textMeasurer = new TextMeasurer();

  public setStyle(style?: Partial<Specification.Types.AxisRenderingStyle>) {
    if (!style) {
      this.style = defaultAxisStyle;
    } else {
      this.style = fillDefaultAxisStyle(deepClone(style));
    }
    return this;
  }

  public setAxisDataBinding(
    data: Specification.Types.AxisDataBinding,
    rangeMin: number,
    rangeMax: number,
    enablePrePostGap: boolean,
    reverse: boolean
  ) {
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;

    if (!data) {
      return this;
    }
    this.setStyle(data.style);
    this.oppositeSide = data.side == "opposite";
    switch (data.type) {
      case "numerical":
        {
          if (!data.numericalMode || data.numericalMode == "linear") {
            this.setLinearScale(
              data.domainMin,
              data.domainMax,
              rangeMin,
              rangeMax,
              data.tickFormat
            );
          }
          if (data.numericalMode == "logarithmic") {
            this.setLogarithmicScale(
              data.domainMin,
              data.domainMax,
              rangeMin,
              rangeMax,
              data.tickFormat
            );
          }
          if (data.numericalMode == "temporal") {
            this.setTemporalScale(
              data.domainMin,
              data.domainMax,
              rangeMin,
              rangeMax
            );
          }
        }
        break;
      case "categorical":
        {
          this.setCategoricalScale(
            data.categories,
            getCategoricalAxis(data, enablePrePostGap, reverse).ranges,
            rangeMin,
            rangeMax
          );
        }
        break;
      case "default":
        {
        }
        break;
    }
    return this;
  }

  public ticksData: Array<{ tick: any; value: any }>;
  public setTicksByData(ticks: Array<{ tick: any; value: any }>) {
    const position2Tick = new Map<number, string>();
    for (const tick of ticks) {
      const pos = this.valueToPosition(tick.value);
      position2Tick.set(pos, tick.tick as string);
    }
    this.ticks = [];
    for (const [pos, tick] of position2Tick.entries()) {
      this.ticks.push({
        position: pos,
        label: tick
      });
    }
  }

  public getTickFormat(
    tickFormat: string,
    defaultFormat: (d: number) => string
  ) {
    if (tickFormat == null || tickFormat == "") {
      return defaultFormat;
    } else {
      // {.0%}
      return (value: number) => {
        return tickFormat.replace(/\{([^}]+)\}/g, (_, spec) => {
          return format(spec)(value);
        });
      };
    }
  }

  public setLinearScale(
    domainMin: number,
    domainMax: number,
    rangeMin: number,
    rangeMax: number,
    tickFormat: string
  ) {
    const scale = new Scale.LinearScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    const ticks = scale.ticks(Math.round(Math.min(10, rangeLength / 40)));
    const defaultFormat = scale.tickFormat(
      Math.round(Math.min(10, rangeLength / 40))
    );

    const resolvedFormat = this.getTickFormat(tickFormat, defaultFormat);

    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((ticks[i] - domainMin) / (domainMax - domainMin)) *
          (rangeMax - rangeMin) +
        rangeMin;
      r.push({
        position: tx,
        label: resolvedFormat(ticks[i])
      });
    }
    this.valueToPosition = value =>
      ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin) +
      rangeMin;
    this.ticks = r;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    return this;
  }

  public setLogarithmicScale(
    domainMin: number,
    domainMax: number,
    rangeMin: number,
    rangeMax: number,
    tickFormat: string
  ) {
    const scale = new Scale.LogarithmicScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    const ticks = scale.ticks(Math.round(Math.min(10, rangeLength / 40)));
    const defaultFormat = scale.tickFormat(
      Math.round(Math.min(10, rangeLength / 40))
    );

    const resolvedFormat = this.getTickFormat(tickFormat, defaultFormat);

    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((Math.log(ticks[i]) - Math.log(domainMin)) /
          (Math.log(domainMax) - Math.log(domainMin))) *
          (rangeMax - rangeMin) +
        rangeMin;
      r.push({
        position: tx,
        label: resolvedFormat(ticks[i])
      });
    }
    this.valueToPosition = value =>
      ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin) +
      rangeMin;
    this.ticks = r;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    return this;
  }

  public setTemporalScale(
    domainMin: number,
    domainMax: number,
    rangeMin: number,
    rangeMax: number
  ) {
    const scale = new Scale.DateScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    const ticks = scale.ticks(Math.round(Math.min(10, rangeLength / 40)));
    const tickFormat = scale.tickFormat(
      Math.round(Math.min(10, rangeLength / 40))
    );
    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((ticks[i] - domainMin) / (domainMax - domainMin)) *
          (rangeMax - rangeMin) +
        rangeMin;
      r.push({
        position: tx,
        label: tickFormat(ticks[i])
      });
    }
    this.valueToPosition = value =>
      ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin) +
      rangeMin;
    this.ticks = r;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    return this;
  }

  public setCategoricalScale(
    domain: string[],
    range: Array<[number, number]>,
    rangeMin: number,
    rangeMax: number
  ) {
    const r: TickDescription[] = [];
    for (let i = 0; i < domain.length; i++) {
      r.push({
        position:
          ((range[i][0] + range[i][1]) / 2) * (rangeMax - rangeMin) + rangeMin,
        label: domain[i]
      });
    }
    this.valueToPosition = value => {
      const i = domain.indexOf(value);
      if (i >= 0) {
        return (
          ((range[i][0] + range[i][1]) / 2) * (rangeMax - rangeMin) + rangeMin
        );
      } else {
        return 0;
      }
    };
    this.ticks = r;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    return this;
  }

  public renderLine(x: number, y: number, angle: number, side: number): Group {
    const g = makeGroup([]);
    const style = this.style;
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const tickSize = style.tickSize;
    const lineStyle: Style = {
      strokeLinecap: "square",
      strokeColor: style.lineColor
    };
    AxisRenderer.textMeasurer.setFontFamily(style.fontFamily);
    AxisRenderer.textMeasurer.setFontSize(style.fontSize);
    if (this.oppositeSide) {
      side = -side;
    }

    const cos = Math.cos((angle / 180) * Math.PI);
    const sin = Math.sin((angle / 180) * Math.PI);
    const x1 = x + rangeMin * cos;
    const y1 = y + rangeMin * sin;
    const x2 = x + rangeMax * cos;
    const y2 = y + rangeMax * sin;
    // Base line
    g.elements.push(makeLine(x1, y1, x2, y2, lineStyle));
    // Ticks
    for (const tickPosition of this.ticks
      .map(x => x.position)
      .concat([rangeMin, rangeMax])) {
      const tx = x + tickPosition * cos,
        ty = y + tickPosition * sin;
      const dx = side * tickSize * sin,
        dy = -side * tickSize * cos;
      g.elements.push(makeLine(tx, ty, tx + dx, ty + dy, lineStyle));
    }
    // Tick texts
    const ticks = this.ticks.map(x => {
      return {
        position: x.position,
        label: x.label,
        measure: AxisRenderer.textMeasurer.measure(x.label)
      };
    });
    let maxTextWidth = 0;
    let maxTickDistance = 0;
    for (let i = 0; i < ticks.length; i++) {
      maxTextWidth = Math.max(maxTextWidth, ticks[i].measure.width);
      if (i > 0) {
        maxTickDistance = Math.max(
          maxTickDistance,
          Math.abs(ticks[i - 1].position - ticks[i].position)
        );
      }
    }
    for (const tick of ticks) {
      const tx = x + tick.position * cos,
        ty = y + tick.position * sin;
      const offset = 3;
      const dx = side * (tickSize + offset) * sin,
        dy = -side * (tickSize + offset) * cos;

      if (Math.abs(cos) < 0.5) {
        // 60 ~ 120 degree
        const [px, py] = TextMeasurer.ComputeTextPosition(
          0,
          0,
          tick.measure,
          side * sin < 0 ? "right" : "left",
          "middle",
          0
        );
        const gText = makeGroup([
          makeText(px, py, tick.label, style.fontFamily, style.fontSize, {
            fillColor: style.tickColor
          })
        ]);
        gText.transform = {
          x: tx + dx,
          y: ty + dy,
          angle: 0
        };
        g.elements.push(gText);
      } else if (Math.abs(cos) < Math.sqrt(3) / 2) {
        const [px, py] = TextMeasurer.ComputeTextPosition(
          0,
          0,
          tick.measure,
          side * sin < 0 ? "right" : "left",
          "middle",
          0
        );
        const gText = makeGroup([
          makeText(px, py, tick.label, style.fontFamily, style.fontSize, {
            fillColor: style.tickColor
          })
        ]);
        gText.transform = {
          x: tx + dx,
          y: ty + dy,
          angle: 0
        };
        g.elements.push(gText);
      } else {
        if (maxTextWidth > maxTickDistance) {
          const [px, py] = TextMeasurer.ComputeTextPosition(
            0,
            0,
            tick.measure,
            side * cos > 0 ? "right" : "left",
            side * cos > 0 ? "top" : "bottom",
            0
          );
          const gText = makeGroup([
            makeText(px, py, tick.label, style.fontFamily, style.fontSize, {
              fillColor: style.tickColor
            })
          ]);
          gText.transform = {
            x: tx + dx,
            y: ty + dy,
            angle: cos > 0 ? 36 + angle : 36 + angle - 180
          };
          g.elements.push(gText);
        } else {
          const [px, py] = TextMeasurer.ComputeTextPosition(
            0,
            0,
            tick.measure,
            "middle",
            side * cos > 0 ? "top" : "bottom",
            0
          );
          const gText = makeGroup([
            makeText(px, py, tick.label, style.fontFamily, style.fontSize, {
              fillColor: style.tickColor
            })
          ]);
          gText.transform = {
            x: tx + dx,
            y: ty + dy,
            angle: 0
          };
          g.elements.push(gText);
        }
      }
    }
    return g;
  }

  public renderCartesian(x: number, y: number, axis: "x" | "y"): Group {
    switch (axis) {
      case "x": {
        return this.renderLine(x, y, 0, 1);
      }
      case "y": {
        return this.renderLine(x, y, 90, -1);
      }
    }
  }

  public renderPolar(
    cx: number,
    cy: number,
    radius: number,
    side: number
  ): Group {
    const style = this.style;
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const tickSize = style.tickSize;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.lineColor
    };
    const g = makeGroup([]);
    g.transform.x = cx;
    g.transform.y = cy;

    const hintStyle = {
      strokeColor: { r: 0, g: 0, b: 0 },
      strokeOpacity: 0.1
    };
    AxisRenderer.textMeasurer.setFontFamily(style.fontFamily);
    AxisRenderer.textMeasurer.setFontSize(style.fontSize);

    for (const tick of this.ticks) {
      const angle = tick.position;
      const radians = (angle / 180) * Math.PI;
      const tx = Math.sin(radians) * radius;
      const ty = Math.cos(radians) * radius;

      const metrics = AxisRenderer.textMeasurer.measure(tick.label);
      const [textX, textY] = TextMeasurer.ComputeTextPosition(
        0,
        style.tickSize * side,
        metrics,
        "middle",
        side > 0 ? "bottom" : "top",
        0,
        2
      );
      const gt = makeGroup([
        makeLine(0, 0, 0, style.tickSize * side, lineStyle),
        makeText(textX, textY, tick.label, style.fontFamily, style.fontSize, {
          fillColor: style.tickColor
        })
      ]);

      gt.transform.angle = -angle;
      gt.transform.x = tx;
      gt.transform.y = ty;
      g.elements.push(gt);
    }
    return g;
  }

  public renderCurve(
    coordinateSystem: CoordinateSystem,
    y: number,
    side: number
  ): Group {
    const style = this.style;
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const tickSize = style.tickSize;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.lineColor
    };
    const g = makeGroup([]);
    g.transform = coordinateSystem.getBaseTransform();

    const hintStyle = {
      strokeColor: { r: 0, g: 0, b: 0 },
      strokeOpacity: 0.1
    };
    AxisRenderer.textMeasurer.setFontFamily(style.fontFamily);
    AxisRenderer.textMeasurer.setFontSize(style.fontSize);

    for (const tick of this.ticks) {
      const tangent = tick.position;

      const metrics = AxisRenderer.textMeasurer.measure(tick.label);
      const [textX, textY] = TextMeasurer.ComputeTextPosition(
        0,
        -style.tickSize * side,
        metrics,
        "middle",
        side < 0 ? "bottom" : "top",
        0,
        2
      );
      const gt = makeGroup([
        makeLine(0, 0, 0, -style.tickSize * side, lineStyle),
        makeText(textX, textY, tick.label, style.fontFamily, style.fontSize, {
          fillColor: style.tickColor
        })
      ]);

      gt.transform = coordinateSystem.getLocalTransform(tangent, y);
      g.elements.push(gt);
    }
    return g;
  }
}

export function getCategoricalAxis(
  data: Specification.Types.AxisDataBinding,
  enablePrePostGap: boolean,
  reverse: boolean
) {
  if (data.enablePrePostGap) {
    enablePrePostGap = true;
  }
  const chunkSize = (1 - data.gapRatio) / data.categories.length;
  let preGap: number, postGap: number, gap: number, gapScale: number;
  if (enablePrePostGap) {
    gap = data.gapRatio / data.categories.length;
    gapScale = 1 / data.categories.length;
    preGap = gap / 2;
    postGap = gap / 2;
  } else {
    if (data.categories.length == 1) {
      gap = 0;
      gapScale = 1;
    } else {
      gap = data.gapRatio / (data.categories.length - 1);
      gapScale = 1 / (data.categories.length - 1);
    }
    preGap = 0;
    postGap = 0;
  }
  const chunkRanges = data.categories.map((c, i) => {
    return [
      preGap + (gap + chunkSize) * i,
      preGap + (gap + chunkSize) * i + chunkSize
    ] as [number, number];
  });
  if (reverse) {
    chunkRanges.reverse();
  }
  return {
    gap,
    preGap,
    postGap,
    gapScale,
    ranges: chunkRanges
  };
}

export function getNumericalInterpolate(
  data: Specification.Types.AxisDataBinding
) {
  if (data.numericalMode == "logarithmic") {
    const p1 = Math.log(data.domainMin);
    const p2 = Math.log(data.domainMax);
    const pdiff = p2 - p1;
    return (x: number) => (Math.log(x) - p1) / pdiff;
  } else {
    const p1 = data.domainMin;
    const p2 = data.domainMax;
    const pdiff = p2 - p1;
    return (x: number) => (x - p1) / pdiff;
  }
}

export function buildAxisAppearanceWidgets(
  isVisible: boolean,
  axisProperty: string,
  m: Controls.WidgetManager
) {
  if (isVisible) {
    return m.row(
      "Visible",
      m.horizontal(
        [0, 0, 1, 0],
        m.inputBoolean(
          { property: axisProperty, field: "visible" },
          { type: "checkbox" }
        ),
        m.label("Position:"),
        m.inputSelect(
          { property: axisProperty, field: "side" },
          {
            type: "dropdown",
            showLabel: true,
            options: ["default", "opposite"],
            labels: ["Default", "Opposite"]
          }
        ),
        m.detailsButton(
          m.sectionHeader("Axis Style"),
          m.row(
            "Line Color",
            m.inputColor({
              property: axisProperty,
              field: ["style", "lineColor"]
            })
          ),
          m.row(
            "Tick Color",
            m.inputColor({
              property: axisProperty,
              field: ["style", "tickColor"]
            })
          ),
          m.row(
            "Tick Size",
            m.inputNumber({
              property: axisProperty,
              field: ["style", "tickSize"]
            })
          ),
          m.row(
            "Font Family",
            m.inputFontFamily({
              property: axisProperty,
              field: ["style", "fontFamily"]
            })
          ),
          m.row(
            "Font Size",
            m.inputNumber(
              { property: axisProperty, field: ["style", "fontSize"] },
              { showUpdown: true, updownStyle: "font", updownTick: 2 }
            )
          )
        )
      )
    );
  } else {
    return m.row(
      "Visible",
      m.inputBoolean(
        { property: axisProperty, field: "visible" },
        { type: "checkbox" }
      )
    );
  }
}

export function buildAxisWidgets(
  data: Specification.Types.AxisDataBinding,
  axisProperty: string,
  m: Controls.WidgetManager,
  axisName: string
): Controls.Widget[] {
  const widgets = [];
  const dropzoneOptions: Controls.RowOptions = {
    dropzone: {
      type: "axis-data-binding",
      property: axisProperty,
      prompt: axisName + ": drop here to assign data"
    }
  };
  const makeAppearance = () => {
    return buildAxisAppearanceWidgets(data.visible, axisProperty, m);
  };
  if (data != null) {
    switch (data.type) {
      case "numerical":
        {
          widgets.push(
            m.sectionHeader(
              axisName + ": Numerical",
              m.clearButton({ property: axisProperty }),
              dropzoneOptions
            )
          );
          if (axisName != "Data Axis") {
            widgets.push(
              m.row(
                "Data",
                m.inputExpression({
                  property: axisProperty,
                  field: "expression"
                })
              )
            );
          }
          widgets.push(
            m.row(
              "Range",
              m.horizontal(
                [1, 0, 1],
                m.inputNumber({ property: axisProperty, field: "domainMin" }),
                m.label(" - "),
                m.inputNumber({ property: axisProperty, field: "domainMax" })
              )
            )
          );
          if (data.numericalMode != "temporal") {
            widgets.push(
              m.row(
                "Mode",
                m.inputSelect(
                  { property: axisProperty, field: "numericalMode" },
                  {
                    options: ["linear", "logarithmic"],
                    labels: ["Linear", "Logarithmic"],
                    showLabel: true,
                    type: "dropdown"
                  }
                )
              )
            );
          }
          widgets.push(
            m.row(
              "Tick Data",
              m.inputExpression({
                property: axisProperty,
                field: "tickDataExpression"
              })
            )
          );
          widgets.push(
            m.row(
              "Tick Format",
              m.inputText(
                {
                  property: axisProperty,
                  field: "tickFormat"
                },
                "(auto)"
              )
            )
          );
          widgets.push(makeAppearance());
        }
        break;
      case "categorical":
        {
          widgets.push(
            m.sectionHeader(
              axisName + ": Categorical",
              m.clearButton({ property: axisProperty }),
              dropzoneOptions
            )
          );
          widgets.push(
            m.row(
              "Data",
              m.horizontal(
                [1, 0],
                m.inputExpression({
                  property: axisProperty,
                  field: "expression"
                }),
                m.reorderWidget({ property: axisProperty, field: "categories" })
              )
            )
          );
          widgets.push(
            m.row(
              "Gap",
              m.inputNumber(
                { property: axisProperty, field: "gapRatio" },
                { minimum: 0, maximum: 1, percentage: true, showSlider: true }
              )
            )
          );
          widgets.push(makeAppearance());
        }
        break;
      case "default":
        {
          widgets.push(
            m.sectionHeader(
              axisName + ": Stacking",
              m.clearButton({ property: axisProperty }),
              dropzoneOptions
            )
          );
          widgets.push(
            m.row(
              "Gap",
              m.inputNumber(
                { property: axisProperty, field: "gapRatio" },
                { minimum: 0, maximum: 1, percentage: true, showSlider: true }
              )
            )
          );
        }
        break;
    }
  } else {
    widgets.push(m.sectionHeader(axisName + ": (none)", null, dropzoneOptions));
  }
  return widgets;
}

export function buildAxisInference(
  plotSegment: Specification.PlotSegment,
  property: string
): Specification.Template.Inference {
  const axis = plotSegment.properties[
    property
  ] as Specification.Types.AxisDataBinding;
  return {
    objectID: plotSegment._id,
    dataSource: {
      table: plotSegment.table,
      groupBy: plotSegment.groupBy
    },
    axis: {
      expression: axis.expression,
      type: axis.type,
      property
    }
  };
}

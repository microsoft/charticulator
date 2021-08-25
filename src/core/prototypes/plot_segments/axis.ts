/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  deepClone,
  fillDefaults,
  Scale,
  rgbToHex,
  splitStringByNewLine,
  replaceSymbolByTab,
  replaceSymbolByNewLine,
  Color,
  Geometry,
  getFormat,
  tickFormatParserExpression,
} from "../../common";
import {
  CoordinateSystem,
  Group,
  makeGroup,
  makeLine,
  makeText,
  makePath,
  Style,
} from "../../graphics";
import {
  splitByWidth,
  TextMeasurer,
} from "../../graphics/renderer/text_measurer";
import { Graphics, Specification } from "../../index";
import { Controls, strokeStyleToDashArray } from "../common";
import { AttributeMap, DataType } from "../../specification";
import { strings } from "../../../strings";
import { defaultFont, defaultFontSize } from "../../../app/stores/defaults";
import { AxisDataBindingType, NumericalMode } from "../../specification/types";

import { VirtualScrollBar, VirtualScrollBarPropertes } from "./virtualScroll";
import React = require("react");

export const defaultAxisStyle: Specification.Types.AxisRenderingStyle = {
  tickColor: { r: 0, g: 0, b: 0 },
  lineColor: { r: 0, g: 0, b: 0 },
  fontFamily: defaultFont,
  fontSize: defaultFontSize,
  tickSize: 5,
  wordWrap: false,
  verticalText: false,
  gridlineStyle: "none",
  gridlineColor: <Color>{
    r: 234,
    g: 234,
    b: 234,
  },
  gridlineWidth: 1,
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

export enum AxisMode {
  X = "x",
  Y = "y",
}

export class AxisRenderer {
  public ticks: TickDescription[] = [];
  public style: Specification.Types.AxisRenderingStyle = defaultAxisStyle;
  public rangeMin: number = 0;
  public rangeMax: number = 1;
  public valueToPosition: (value: any) => number;
  public oppositeSide: boolean = false;
  private axisDataBindingType: AxisDataBindingType = null;

  public static SCROLL_BAR_SIZE = 10;

  private static textMeasurer = new TextMeasurer();

  private scrollRequired: boolean = false;

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
    reverse: boolean,
    getTickFormat?: (value: any) => string
  ) {
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;

    if (!data) {
      return this;
    }
    this.axisDataBindingType = data.type;
    this.setStyle(data.style);
    this.oppositeSide = data.side == "opposite";
    this.scrollRequired = data.allowScrolling;
    //&&
    // data.allCategories &&
    // data.allCategories.length > data.windowSize;
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
              rangeMax,
              data.tickFormat
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
            rangeMax,
            getTickFormat
          );
        }
        break;
      // case "default":
      //   {
      //   }
      //   break;
    }
    return this;
  }

  public ticksData: { tick: any; value: any }[];
  public setTicksByData(ticks: { tick: any; value: any }[]) {
    const position2Tick = new Map<number, string>();
    for (const tick of ticks) {
      const pos = this.valueToPosition(tick.value);
      position2Tick.set(pos, <string>tick.tick);
    }
    this.ticks = [];
    for (const [pos, tick] of position2Tick.entries()) {
      this.ticks.push({
        position: pos,
        label: tick,
      });
    }
  }

  public static getTickFormat(
    tickFormat: string,
    defaultFormat: (d: number) => string
  ) {
    if (tickFormat == null || tickFormat == "") {
      return defaultFormat;
    } else {
      // {.0%}
      return (value: number) => {
        return tickFormat.replace(tickFormatParserExpression(), (_, spec) => {
          return getFormat()(spec)(value);
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

    const resolvedFormat = AxisRenderer.getTickFormat(
      tickFormat,
      defaultFormat
    );

    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((ticks[i] - domainMin) / (domainMax - domainMin)) *
          (rangeMax - rangeMin) +
        rangeMin;
      r.push({
        position: tx,
        label: resolvedFormat(ticks[i]),
      });
    }
    this.valueToPosition = (value) =>
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

    const resolvedFormat = AxisRenderer.getTickFormat(
      tickFormat,
      defaultFormat
    );

    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((Math.log(ticks[i]) - Math.log(domainMin)) /
          (Math.log(domainMax) - Math.log(domainMin))) *
          (rangeMax - rangeMin) +
        rangeMin;
      r.push({
        position: tx,
        label: resolvedFormat(ticks[i]),
      });
    }
    this.valueToPosition = (value) =>
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
    rangeMax: number,
    tickFormatString: string
  ) {
    const scale = new Scale.DateScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    const ticksCount = Math.round(Math.min(10, rangeLength / 40));
    const ticks = scale.ticks(ticksCount);
    const tickFormat = scale.tickFormat(
      ticksCount,
      tickFormatString?.replace(tickFormatParserExpression(), "$1")
    );
    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((ticks[i] - domainMin) / (domainMax - domainMin)) *
          (rangeMax - rangeMin) +
        rangeMin;
      r.push({
        position: tx,
        label: tickFormat(ticks[i]),
      });
    }
    this.valueToPosition = (value) =>
      ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin) +
      rangeMin;
    this.ticks = r;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    return this;
  }

  public setCategoricalScale(
    domain: string[],
    range: [number, number][],
    rangeMin: number,
    rangeMax: number,
    tickFormat?: (value: any) => string
  ) {
    const r: TickDescription[] = [];
    for (let i = 0; i < domain.length; i++) {
      r.push({
        position:
          ((range[i][0] + range[i][1]) / 2) * (rangeMax - rangeMin) + rangeMin,
        label: tickFormat ? tickFormat(domain[i]) : domain[i],
      });
    }
    this.valueToPosition = (value) => {
      const i = domain.indexOf(value);
      if (i >= 0) {
        return (
          ((range[i][0] + range[i][1]) / 2) * (rangeMax - rangeMin) + rangeMin
        );
      } else {
        return 0;
      }
    };

    // TODO get 30 from glyph width
    // if (Math.abs(rangeMax - rangeMin) < 600) {
    //   this.scrollRequired = true;
    // }

    this.ticks = r;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    return this;
  }

  public renderGridLine(
    x: number,
    y: number,
    angle: number,
    side: number,
    size: number
  ) {
    const style = this.style;
    if (style.gridlineStyle === "none") {
      return;
    }

    if (this.axisDataBindingType === AxisDataBindingType.Categorical) {
      return;
    }

    const g = makeGroup([]);
    const cos = Math.cos(Geometry.degreesToRadians(angle));
    const sin = Math.sin(Geometry.degreesToRadians(angle));
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const x1 = x + rangeMin * cos;
    const y1 = y + rangeMin * sin;
    const x2 = x + rangeMax * cos;
    const y2 = y + rangeMax * sin;
    const tickSize = size;
    const lineStyle: Style = {
      strokeLinecap: "round",
      // strokeColor: style.lineColor,
      strokeColor: style.gridlineColor,
      strokeWidth: style.gridlineWidth,
      strokeDasharray: strokeStyleToDashArray(style.gridlineStyle),
    };
    // Base line
    g.elements.push(makeLine(x1, y1, x2, y2, lineStyle));
    // Ticks
    for (const tickPosition of this.ticks
      .map((x) => x.position)
      .concat([rangeMin, rangeMax])) {
      const tx = x + tickPosition * cos;
      const ty = y + tickPosition * sin;
      const dx = -side * tickSize * sin;
      const dy = side * tickSize * cos;
      g.elements.push(makeLine(tx, ty, tx + dx, ty + dy, lineStyle));
    }

    return g;
  }

  public renderGridlinesForAxes(
    x: number,
    y: number,
    axis: AxisMode,
    size: number
  ): Group {
    switch (axis) {
      case AxisMode.X: {
        return this.renderGridLine(x, y, 0, 1, size);
      }
      case AxisMode.Y: {
        return this.renderGridLine(x, y, 90, -1, size);
      }
    }
  }

  // eslint-disable-next-line
  public renderLine(x: number, y: number, angle: number, side: number): Group {
    const g = makeGroup([]);
    const style = this.style;
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const tickSize = style.tickSize;
    const lineStyle: Style = {
      strokeLinecap: "square",
      strokeColor: style.lineColor,
    };
    AxisRenderer.textMeasurer.setFontFamily(style.fontFamily);
    AxisRenderer.textMeasurer.setFontSize(style.fontSize);
    if (this.oppositeSide) {
      side = -side;
    }
    //shift axis for scrollbar space
    if (this.scrollRequired) {
      if (angle === 90) {
        x += side * AxisRenderer.SCROLL_BAR_SIZE;
      }
      if (angle === 0) {
        y += -side * AxisRenderer.SCROLL_BAR_SIZE;
      }
    }

    const cos = Math.cos(Geometry.degreesToRadians(angle));
    const sin = Math.sin(Geometry.degreesToRadians(angle));
    const x1 = x + rangeMin * cos;
    const y1 = y + rangeMin * sin;
    const x2 = x + rangeMax * cos;
    const y2 = y + rangeMax * sin;
    // Base line
    g.elements.push(makeLine(x1, y1, x2, y2, lineStyle));
    // Ticks
    for (const tickPosition of this.ticks
      .map((x) => x.position)
      .concat([rangeMin, rangeMax])) {
      const tx = x + tickPosition * cos;
      const ty = y + tickPosition * sin;
      const dx = side * tickSize * sin;
      const dy = -side * tickSize * cos;
      g.elements.push(makeLine(tx, ty, tx + dx, ty + dy, lineStyle));
    }
    // Tick texts
    const ticks = this.ticks.map((x) => {
      return {
        position: x.position,
        label: x.label,
        measure: AxisRenderer.textMeasurer.measure(x.label),
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
        if (style.wordWrap || splitStringByNewLine(tick.label).length > 1) {
          let textContent: string[] = splitByWidth(
            replaceSymbolByTab(replaceSymbolByNewLine(tick.label)),
            maxTickDistance,
            10000,
            style.fontFamily,
            style.fontSize
          );
          textContent = textContent.flatMap((line) =>
            splitStringByNewLine(line)
          );
          const lines: Graphics.Element[] = [];
          for (let index = 0; index < textContent.length; index++) {
            const [px, py] = TextMeasurer.ComputeTextPosition(
              0,
              0,
              AxisRenderer.textMeasurer.measure(textContent[index]),
              style.verticalText ? "middle" : side * sin < 0 ? "right" : "left",
              style.verticalText
                ? side * sin < 0
                  ? "bottom"
                  : "top"
                : "middle",
              0
            );
            const text = makeText(
              px,
              py -
                style.fontSize * index +
                (side * cos > 0
                  ? 0
                  : (textContent.length * style.fontSize - style.fontSize) / 2),
              textContent[index],
              style.fontFamily,
              style.fontSize,
              {
                fillColor: style.tickColor,
              }
            );
            lines.push(text);
          }
          const gText = makeGroup(lines);
          gText.transform = {
            x: tx + dx,
            y: ty + dy,
            angle: style.verticalText ? angle : 0,
          };
          g.elements.push(gText);
        } else {
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
              fillColor: style.tickColor,
            }),
          ]);
          gText.transform = {
            x: tx + dx,
            y: ty + dy,
            angle: style.verticalText ? (sin > 0 ? angle - 90 : angle + 90) : 0,
          };
          g.elements.push(gText);
        }
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
            fillColor: style.tickColor,
          }),
        ]);
        gText.transform = {
          x: tx + dx,
          y: ty + dy,
          angle: style.verticalText ? (sin > 0 ? angle - 90 : angle + 90) : 0,
        };
        g.elements.push(gText);
      } else {
        if (
          !style.wordWrap &&
          maxTextWidth > maxTickDistance &&
          splitStringByNewLine(tick.label).length === 1
        ) {
          const [px, py] = TextMeasurer.ComputeTextPosition(
            0,
            0,
            tick.measure,
            style.verticalText
              ? side * cos > 0
                ? "right"
                : "left"
              : style.wordWrap
              ? "middle"
              : side * cos > 0
              ? "right"
              : "left",
            style.verticalText
              ? "middle"
              : style.wordWrap
              ? "middle"
              : side * cos > 0
              ? "top"
              : "bottom",
            0
          );
          const gText = makeGroup([
            makeText(px, py, tick.label, style.fontFamily, style.fontSize, {
              fillColor: style.tickColor,
            }),
          ]);
          gText.transform = {
            x: tx + dx,
            y: ty + dy,
            angle: style.verticalText
              ? cos > 0
                ? 90 + angle
                : 90 + angle - 180
              : cos > 0
              ? 36 + angle
              : 36 + angle - 180,
          };
          g.elements.push(gText);
        } else {
          if (style.wordWrap || splitStringByNewLine(tick.label).length > 1) {
            let textContent = [
              replaceSymbolByTab(replaceSymbolByNewLine(tick.label)),
            ];
            if (style.wordWrap) {
              textContent = splitByWidth(
                replaceSymbolByTab(replaceSymbolByNewLine(tick.label)),
                maxTickDistance,
                10000,
                style.fontFamily,
                style.fontSize
              );
            }
            textContent = textContent.flatMap((line) =>
              splitStringByNewLine(line)
            );
            const lines: Graphics.Element[] = [];
            for (let index = 0; index < textContent.length; index++) {
              const [px, py] = TextMeasurer.ComputeTextPosition(
                0,
                0,
                AxisRenderer.textMeasurer.measure(textContent[index]),
                style.wordWrap ? "middle" : side * cos > 0 ? "right" : "left",
                side * cos > 0 ? "top" : "bottom",
                0
              );
              const text = makeText(
                px,
                py -
                  style.fontSize * index +
                  (side * cos > 0 ? 0 : textContent.length * style.fontSize),
                textContent[index],
                style.fontFamily,
                style.fontSize,
                {
                  fillColor: style.tickColor,
                }
              );
              lines.push(text);
            }
            const gText = makeGroup(lines);

            gText.transform = {
              x: tx + dx,
              y: ty + dy,
              angle: style.verticalText
                ? style.wordWrap
                  ? 0
                  : cos > 0
                  ? 90 + angle
                  : 90 + angle - 180
                : style.wordWrap
                ? 0
                : cos > 0
                ? 36 + angle
                : 36 + angle - 180,
            };
            g.elements.push(gText);
          } else {
            const [px, py] = TextMeasurer.ComputeTextPosition(
              0,
              0,
              tick.measure,
              style.verticalText
                ? side * cos > 0
                  ? "right"
                  : "left"
                : "middle",
              style.verticalText ? "middle" : side * cos > 0 ? "top" : "bottom",
              0
            );
            const gText = makeGroup([
              makeText(px, py, tick.label, style.fontFamily, style.fontSize, {
                fillColor: style.tickColor,
              }),
            ]);
            gText.transform = {
              x: tx + dx,
              y: ty + dy,
              angle: style.verticalText ? 90 + angle : 0,
            };
            g.elements.push(gText);
          }
        }
      }
    }
    return g;
  }

  public renderCartesian(x: number, y: number, axis: AxisMode): Group {
    switch (axis) {
      case AxisMode.X: {
        return this.renderLine(x, y, 0, 1);
      }
      case AxisMode.Y: {
        return this.renderLine(x, y, 90, -1);
      }
    }
  }

  public renderPolarRadialGridLine(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number
  ) {
    const style = this.style;
    if (style.gridlineStyle === "none") {
      return;
    }
    const g = makeGroup([]);
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const gridineArcRotate = 90;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.gridlineColor,
      strokeWidth: style.gridlineWidth,
      strokeDasharray: strokeStyleToDashArray(style.gridlineStyle),
    };
    for (const tickPosition of this.ticks
      .map((x) => x.position)
      .concat([rangeMin, rangeMax])) {
      const cos = Math.cos(
        Geometry.degreesToRadians(-tickPosition + gridineArcRotate)
      );
      const sin = Math.sin(
        Geometry.degreesToRadians(-tickPosition + gridineArcRotate)
      );
      const tx1 = x + cos * innerRadius;
      const ty1 = y + sin * innerRadius;
      const tx2 = x + cos * outerRadius;
      const ty2 = y + sin * outerRadius;
      g.elements.push(makeLine(tx1, ty1, tx2, ty2, lineStyle));
    }

    return g;
  }

  public renderPolarArcGridLine(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) {
    const style = this.style;
    if (style.gridlineStyle === "none") {
      return;
    }
    const g = makeGroup([]);
    const startCos = Math.cos(Geometry.degreesToRadians(startAngle));
    const startSin = Math.sin(Geometry.degreesToRadians(startAngle));
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const gridineArcRotate = 90;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.gridlineColor,
      strokeWidth: style.gridlineWidth,
      strokeDasharray: strokeStyleToDashArray(style.gridlineStyle),
    };
    let radius = (outerRadius - innerRadius) / this.ticks.length;
    for (const tickPosition of this.ticks
      .map((x) => x.position)
      .concat([rangeMin, rangeMax])) {
      const tx1 = x + tickPosition * startCos;
      const ty1 = y + tickPosition * startSin;
      const arc = makePath(lineStyle);
      arc.moveTo(tx1, ty1);
      arc.polarLineTo(
        x,
        y,
        -startAngle + gridineArcRotate,
        tickPosition,
        -endAngle + gridineArcRotate,
        tickPosition,
        true
      );
      g.elements.push(arc.path);
      radius += radius;
    }

    return g;
  }

  // eslint-disable-next-line
  public renderPolar(
    cx: number,
    cy: number,
    radius: number,
    side: number
  ): Group {
    const style = this.style;
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.lineColor,
    };
    const g = makeGroup([]);
    g.transform.x = cx;
    g.transform.y = cy;

    AxisRenderer.textMeasurer.setFontFamily(style.fontFamily);
    AxisRenderer.textMeasurer.setFontSize(style.fontSize);

    const margins = 10;
    const maxTickDistance =
      Geometry.degreesToRadians(
        radius * ((rangeMax - rangeMin) / this.ticks.length)
      ) -
      margins * 2; // lenght of arc for all ticks
    for (const tick of this.ticks) {
      const angle = tick.position;
      const radians = Geometry.degreesToRadians(angle);
      const tx = Math.sin(radians) * radius;
      const ty = Math.cos(radians) * radius;

      const lablel =
        tick.label && replaceSymbolByTab(replaceSymbolByNewLine(tick.label));
      if (
        lablel &&
        (style.wordWrap || splitStringByNewLine(lablel).length > 1)
      ) {
        let textContent = [lablel];
        if (style.wordWrap) {
          textContent = splitByWidth(
            lablel,
            maxTickDistance,
            10000,
            style.fontFamily,
            style.fontSize
          );
        }
        textContent = textContent.flatMap((line) => splitStringByNewLine(line));
        const lines: Graphics.Element[] = [];
        for (let index = 0; index < textContent.length; index++) {
          const [textX, textY] = TextMeasurer.ComputeTextPosition(
            0,
            style.tickSize * side,
            AxisRenderer.textMeasurer.measure(textContent[index]),
            "middle",
            side > 0 ? "bottom" : "top",
            0,
            2
          );

          const gt = makeText(
            textX,
            textY -
              style.fontSize * index +
              (side > 0
                ? style.fontSize * textContent.length - style.fontSize
                : 0),
            textContent[index],
            style.fontFamily,
            style.fontSize,
            {
              fillColor: style.tickColor,
            }
          );
          lines.push(gt);
        }

        const gt = makeGroup([
          makeLine(0, 0, 0, style.tickSize * side, lineStyle),
          ...lines,
        ]);

        gt.transform.angle = -angle;
        gt.transform.x = tx;
        gt.transform.y = ty;
        g.elements.push(gt);
      } else {
        const [textX, textY] = TextMeasurer.ComputeTextPosition(
          0,
          style.tickSize * side,
          AxisRenderer.textMeasurer.measure(tick.label),
          "middle",
          side > 0 ? "bottom" : "top",
          0,
          2
        );
        const gt = makeGroup([
          makeLine(0, 0, 0, style.tickSize * side, lineStyle),
          makeText(textX, textY, tick.label, style.fontFamily, style.fontSize, {
            fillColor: style.tickColor,
          }),
        ]);

        gt.transform.angle = -angle;
        gt.transform.x = tx;
        gt.transform.y = ty;
        g.elements.push(gt);
      }
    }
    return g;
  }

  public renderCurve(
    coordinateSystem: CoordinateSystem,
    y: number,
    side: number
  ): Group {
    const style = this.style;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.lineColor,
    };
    const g = makeGroup([]);
    g.transform = coordinateSystem.getBaseTransform();

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
          fillColor: style.tickColor,
        }),
      ]);

      gt.transform = coordinateSystem.getLocalTransform(tangent, y);
      g.elements.push(gt);
    }
    return g;
  }

  public renderVirtualScrollBar(
    x: number,
    y: number,
    axis: AxisMode,
    scrollPosition: number,
    onScroll: (position: number) => void
  ) {
    switch (axis) {
      case AxisMode.X: {
        return this.renderScrollBar(x, y, 0, 1, scrollPosition, onScroll);
      }
      case AxisMode.Y: {
        return this.renderScrollBar(x, y, 90, -1, scrollPosition, onScroll);
      }
    }
  }

  private renderScrollBar(
    x: number,
    y: number,
    angle: number,
    side: number,
    handlePosition: number,
    onScroll: (position: number) => void
  ): React.ReactElement {
    if (!this.scrollRequired) {
      return null;
    }

    const cos = Math.cos(Geometry.degreesToRadians(angle));
    const sin = Math.sin(Geometry.degreesToRadians(angle));
    const rangeMin = this.rangeMin;
    const rangeMax = this.rangeMax;

    let x1 = x + rangeMin * cos;
    let y1 = y + rangeMin * sin;
    let x2 = x + rangeMax * cos;
    let y2 = y + rangeMax * sin;

    if (this.oppositeSide) {
      side = -side;
    }

    if (!this.oppositeSide) {
      if (angle === 90) {
        x1 += side * AxisRenderer.SCROLL_BAR_SIZE;
        x2 += side * AxisRenderer.SCROLL_BAR_SIZE;
      }
      if (angle === 0) {
        y1 += -side * AxisRenderer.SCROLL_BAR_SIZE;
        y2 += -side * AxisRenderer.SCROLL_BAR_SIZE;
      }
    }

    let width = 0;
    let height = 0;

    if (angle === 90) {
      height += Math.abs(y2 - y1);
      width = AxisRenderer.SCROLL_BAR_SIZE;
    }
    if (angle === 0) {
      width += Math.abs(x2 - x1);
      height = AxisRenderer.SCROLL_BAR_SIZE;
    }

    return React.createElement(VirtualScrollBar, <VirtualScrollBarPropertes>{
      onScroll,
      handlerBarWidth: AxisRenderer.SCROLL_BAR_SIZE,
      height,
      width,
      x: x1,
      y: y1,
      initialPosition: handlePosition,
      vertical: angle === 90,
    });
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
    return <[number, number]>[
      preGap + (gap + chunkSize) * i,
      preGap + (gap + chunkSize) * i + chunkSize,
    ];
  });
  if (reverse) {
    chunkRanges.reverse();
  }
  return {
    gap,
    preGap,
    postGap,
    gapScale,
    ranges: chunkRanges,
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

interface AxisAppearanceWidgets {
  isVisible: boolean;
  wordWrap: boolean;
}

export function buildAxisAppearanceWidgets(
  axisProperty: string,
  manager: Controls.WidgetManager,
  options: AxisAppearanceWidgets
) {
  if (options.isVisible) {
    let vertical = null;
    if (!options.wordWrap) {
      vertical = manager.inputBoolean(
        { property: axisProperty, field: ["style", "verticalText"] },
        {
          type: "checkbox",
          label: "Vertical text",
        }
      );
    }

    return [
      manager.vertical(
        manager.verticalGroup(
          {
            header: strings.objects.appearance,
          },
          [
            manager.inputBoolean(
              { property: axisProperty, field: "visible" },
              { type: "checkbox", label: "Visible", headerLabel: "Appearance" }
            ),
            manager.inputSelect(
              { property: axisProperty, field: "side" },
              {
                type: "dropdown",
                showLabel: true,
                label: "Position:",
                options: ["default", "opposite"],
                labels: ["Default", "Opposite"],
              }
            ),
          ]
        ),
        manager.verticalGroup(
          {
            header: strings.objects.style,
          },
          [
            manager.inputColor(
              {
                property: axisProperty,
                field: ["style", "lineColor"],
              },
              {
                label: strings.objects.axes.lineColor,
                labelKey: strings.objects.axes.lineColor,
              }
            ),
            manager.inputColor(
              {
                property: axisProperty,
                field: ["style", "tickColor"],
              },
              {
                label: strings.objects.axes.tickColor,
                labelKey: strings.objects.axes.tickColor,
              }
            ),
            manager.inputNumber(
              {
                property: axisProperty,
                field: ["style", "tickSize"],
              },
              {
                label: "Tick Size",
              }
            ),
            manager.inputFontFamily(
              {
                property: axisProperty,
                field: ["style", "fontFamily"],
              },
              {
                label: "Font Family",
              }
            ),
            manager.inputNumber(
              { property: axisProperty, field: ["style", "fontSize"] },
              {
                showUpdown: true,
                updownStyle: "font",
                updownTick: 2,
                label: "Font Size",
              }
            ),
            manager.inputBoolean(
              { property: axisProperty, field: ["style", "wordWrap"] },
              {
                type: "checkbox",
                headerLabel: "Text displaying",
                label: "Wrap text",
              }
            ),
            vertical,
          ]
        )
      ),
    ];
  } else {
    return manager.verticalGroup(
      {
        header: strings.objects.appearance,
      },
      [
        manager.inputBoolean(
          { property: axisProperty, field: "visible" },
          { type: "checkbox", label: "Visible", headerLabel: "Appearance" }
        ),
      ]
    );
  }
}

// eslint-disable-next-line
export function buildAxisWidgets(
  data: Specification.Types.AxisDataBinding,
  axisProperty: string,
  manager: Controls.WidgetManager,
  axisName: string
): Controls.Widget[] {
  const widgets = [];
  const dropzoneOptions: Controls.RowOptions = {
    dropzone: {
      type: "axis-data-binding",
      property: axisProperty,
      prompt: axisName + ": drop here to assign data",
    },
  };
  const makeAppearance = () => {
    return buildAxisAppearanceWidgets(axisProperty, manager, {
      isVisible: data.visible,
      wordWrap: data.style.wordWrap,
    });
  };
  if (data != null) {
    switch (data.type) {
      case "numerical":
        {
          widgets.push(
            manager.verticalGroup(
              {
                header: axisName + strings.objects.axes.numericalSuffix,
              },
              [
                manager.sectionHeader(
                  axisName + strings.objects.axes.numericalSuffix,
                  manager.clearButton({ property: axisProperty }, null, true),
                  dropzoneOptions
                ),
                manager.inputExpression(
                  {
                    property: axisProperty,
                    field: "expression",
                  },
                  {
                    label: "Data",
                  }
                ),
                data.valueType === "date" ? manager.label("Range") : null,
                data.valueType === "date"
                  ? manager.inputDate(
                      { property: axisProperty, field: "domainMin" },
                      { label: "Start" }
                    )
                  : null,
                data.valueType === "date"
                  ? manager.inputDate(
                      { property: axisProperty, field: "domainMax" },
                      { label: "End" }
                    )
                  : null,
                data.valueType !== "date" ? manager.label("Range") : null,
                data.valueType !== "date"
                  ? manager.inputNumber(
                      { property: axisProperty, field: "domainMin" },
                      {
                        label: strings.objects.axes.from,
                        observerConfig: {
                          isObserver: true,
                          properties: {
                            property: axisProperty,
                            field: "autoDomainMin",
                          },

                          value: false,
                        },
                      }
                    )
                  : null,
                data.valueType !== "date"
                  ? manager.inputNumber(
                      { property: axisProperty, field: "domainMax" },
                      {
                        label: strings.objects.axes.to,
                        observerConfig: {
                          isObserver: true,
                          properties: {
                            property: axisProperty,
                            field: "autoDomainMax",
                          },
                          value: false,
                        },
                      }
                    )
                  : null,
                data.numericalMode != "temporal"
                  ? manager.inputSelect(
                      { property: axisProperty, field: "numericalMode" },
                      {
                        options: ["linear", "logarithmic"],
                        labels: ["Linear", "Logarithmic"],
                        showLabel: true,
                        type: "dropdown",
                        label: "Mode",
                      }
                    )
                  : null,
                manager.inputExpression(
                  {
                    property: axisProperty,
                    field: "tickDataExpression",
                  },
                  {
                    label: "Tick Data",
                  }
                ),
                manager.inputFormat(
                  {
                    property: axisProperty,
                    field: "tickFormat",
                  },
                  {
                    blank: strings.core.auto,
                    isDateField:
                      data.numericalMode === NumericalMode.Temporal ||
                      data.valueType === DataType.Date,
                    label: strings.objects.axes.tickFormat,
                  }
                ),
                m.inputBoolean(
                  {
                    property: axisProperty,
                    field: "allowScrolling",
                  },
                  {
                    type: "checkbox",
                    label: strings.objects.dataAxis.allowScrolling,
                  }
                ),
                data.allowScrolling ? (
                  m.row(
                    strings.objects.dataAxis.windowSize,
                    m.inputNumber(
                      {
                        property: axisProperty,
                        field: "windowSize",
                      },
                      {
                        maximum: 1000000,
                        minimum: 1,
                      }
                    )
                  )
                ) : null
              ]
            )
          );
          widgets.push(m.sectionHeader(strings.objects.dataAxis.scrolling));
          widgets.push(
            m.inputBoolean(
              {
                property: axisProperty,
                field: "allowScrolling",
              },
              {
                type: "checkbox",
                label: strings.objects.dataAxis.allowScrolling,
              }
            )
          );
          if (data.allowScrolling) {
            widgets.push(
              m.row(
                strings.objects.dataAxis.windowSize,
                m.inputNumber(
                  {
                    property: axisProperty,
                    field: "windowSize",
                  },
                  {
                    maximum: 1000,
                    minimum: 1,
                  }
                )
              )
            );
          }
          widgets.push(makeAppearance());
        }
        break;
      case "categorical":
        {
          widgets.push(
            manager.verticalGroup(
              {
                header: axisName + ": Categorical",
              },
              [
                manager.sectionHeader(
                  "Data",
                  manager.clearButton({ property: axisProperty }, null, true),
                  dropzoneOptions
                ),
                manager.vertical(
                  manager.label("Data"),
                  manager.horizontal(
                    [1, 0],
                    manager.inputExpression({
                      property: axisProperty,
                      field: "expression",
                    }),
                    manager.reorderWidget(
                      { property: axisProperty, field: "categories" },
                      { allowReset: true }
                    )
                  ),
                  manager.inputNumber(
                    { property: axisProperty, field: "gapRatio" },
                    {
                      minimum: 0,
                      maximum: 1,
                      percentage: true,
                      showSlider: true,
                      label: "Gap",
                    }
                  ),
                  data.valueType === "date"
                    ? (manager.inputExpression(
                        {
                          property: axisProperty,
                          field: "tickDataExpression",
                        },
                        {
                          label: "Tick Data",
                        }
                      ),
                      manager.row(
                        "Tick Format",
                        manager.inputFormat(
                          {
                            property: axisProperty,
                            field: "tickFormat",
                          },
                          {
                            blank: strings.core.auto,
                            isDateField:
                              data.numericalMode === NumericalMode.Temporal ||
                              data.valueType === DataType.Date,
                          }
                        )
                      ))
                    : null
                ),
              ]
            )
          );
          widgets.push(makeAppearance());
        }
        break;
      case "default":
        {
          widgets.push(
            manager.verticalGroup(
              {
                header: axisName + ": Stacking",
              },
              [
                manager.sectionHeader(
                  axisName + ": Stacking",
                  manager.clearButton({ property: axisProperty }, null, true),
                  dropzoneOptions
                ),
                manager.inputNumber(
                  { property: axisProperty, field: "gapRatio" },
                  {
                    minimum: 0,
                    maximum: 1,
                    percentage: true,
                    showSlider: true,
                    label: "Gap",
                  }
                ),
              ]
            )
          );
        }
        break;
    }
    widgets.push(
      manager.verticalGroup(
        {
          header: axisName + strings.objects.dataAxis.exportProperties,
        },
        [
          manager.inputBoolean(
            {
              property: axisProperty,
              field: "autoDomainMin",
            },
            {
              type: "checkbox",
              label: strings.objects.dataAxis.autoMin,
            }
          ),
          manager.inputBoolean(
            {
              property: axisProperty,
              field: "autoDomainMax",
            },
            {
              type: "checkbox",
              label: strings.objects.dataAxis.autoMax,
            }
          ),
        ]
      )
    );
  } else {
    widgets.push(
      manager.sectionHeader(
        axisName + ": " + strings.core.none,
        null,
        dropzoneOptions
      )
    );
  }
  return widgets;
}

export function buildAxisInference(
  plotSegment: Specification.PlotSegment,
  property: string
): Specification.Template.Inference {
  const axis = <Specification.Types.AxisDataBinding>(
    plotSegment.properties[property]
  );
  return {
    objectID: plotSegment._id,
    dataSource: {
      table: plotSegment.table,
      groupBy: plotSegment.groupBy,
    },
    axis: {
      expression: axis.expression,
      type: axis.type,
      style: axis.style,
      order: axis.order,
      orderMode: axis.orderMode,
      rawExpression: axis.rawExpression,
      property,
      defineCategories: true,
    },
  };
}

export function buildAxisProperties(
  plotSegment: Specification.PlotSegment,
  property: string
): Specification.Template.Property[] {
  const axisObject = <AttributeMap>plotSegment.properties[property];
  const style: any = axisObject.style;
  if (!style) {
    return [];
  }
  return [
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "style",
          subfield: "tickSize",
        },
      },
      type: Specification.AttributeType.Number,
      default: style.tickSize,
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "style",
          subfield: "fontSize",
        },
      },
      type: Specification.AttributeType.Number,
      default: style.fontSize,
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "style",
          subfield: "fontFamily",
        },
      },
      type: Specification.AttributeType.FontFamily,
      default: style.fontFamily,
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "style",
          subfield: "lineColor",
        },
      },
      type: Specification.AttributeType.Color,
      default: rgbToHex(style.lineColor),
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "style",
          subfield: "tickColor",
        },
      },
      type: Specification.AttributeType.Color,
      default: rgbToHex(style.tickColor),
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "tickFormat",
        },
      },
      type: Specification.AttributeType.Text,
      default: null,
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "tickDataExpression",
        },
      },
      type: Specification.AttributeType.Text,
      default: null,
    },
  ];
}

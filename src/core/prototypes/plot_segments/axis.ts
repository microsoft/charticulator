/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  applyDateFormat,
  Color,
  deepClone,
  fillDefaults,
  Geometry,
  getFormat,
  getRandomNumber,
  makeRange,
  replaceSymbolByNewLine,
  replaceSymbolByTab,
  rgbToHex,
  Scale,
  splitStringByNewLine,
  tickFormatParserExpression,
  ZoomInfo,
} from "../../common";
import {
  CoordinateSystem,
  Group,
  makeGroup,
  makeLine,
  makePath,
  makeText,
  Style,
} from "../../graphics";
import {
  splitByWidth,
  TextMeasurer,
} from "../../graphics/renderer/text_measurer";
import { Graphics, Prototypes, Specification } from "../../index";
import { Controls, strokeStyleToDashArray } from "../common";
import { AttributeMap, DataType } from "../../specification";
import { strings } from "../../../strings";
import { defaultFont, defaultFontSize } from "../../../app/stores/defaults";
import {
  AxisDataBinding,
  AxisDataBindingType,
  NumericalMode,
  OrderMode,
} from "../../specification/types";
import { VirtualScrollBar, VirtualScrollBarPropertes } from "./virtualScroll";
import {
  getTableColumns,
  parseDerivedColumnsExpression,
  shouldShowTickFormatForTickExpression,
  transformOrderByExpression,
} from "./utils";
import { DataflowManager, DataflowTable } from "../dataflow";
import * as Expression from "../../expression";
import { CompiledGroupBy } from "../group_by";
import { CharticulatorPropertyAccessors } from "../../../app/views/panels/widgets/types";
import { type2DerivedColumns } from "../../../app/views/dataset/common";
import React = require("react");

export const defaultAxisStyle: Specification.Types.AxisRenderingStyle = {
  tickColor: { r: 0, g: 0, b: 0 },
  tickTextBackgroudColor: null,
  tickTextBackgroudColorId: null,
  showTicks: true,
  showBaseline: true,
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
  public static SCROLL_BAR_SIZE = 10;

  //axis tick selection
  private plotSegment: Specification.PlotSegment;
  private dataFlow: DataflowManager;
  private data: Specification.Types.AxisDataBinding;

  private static textMeasurer = new TextMeasurer();

  private scrollRequired: boolean = false;
  private shiftAxis: boolean = true;
  private hiddenCategoriesRatio: number = 0;
  private handlerSize: number = 0;
  private dataType: AxisDataBindingType = AxisDataBindingType.Default;
  private windowSize: number = 0;

  public setStyle(style?: Partial<Specification.Types.AxisRenderingStyle>) {
    if (!style) {
      this.style = defaultAxisStyle;
    } else {
      this.style = fillDefaultAxisStyle(deepClone(style));
    }
    this.style.tickTextBackgroudColorId =
      "axis-tick-filter-" + getRandomNumber();
    return this;
  }

  public setAxisDataBinding(
    data: Specification.Types.AxisDataBinding,
    rangeMin: number,
    rangeMax: number,
    enablePrePostGap: boolean,
    reverse: boolean,
    getTickFormat?: (value: any) => string,
    plotSegment?: Specification.PlotSegment,
    dataflow?: DataflowManager
  ) {
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    if (!data) {
      return this;
    }
    this.plotSegment = plotSegment;
    this.dataFlow = dataflow;
    this.data = data;
    this.setStyle(data.style);
    this.oppositeSide = data.side == "opposite";
    this.scrollRequired = data.allowScrolling;
    this.shiftAxis =
      data.allowScrolling &&
      (data.barOffset == null || data.barOffset === 0) &&
      ((data.allCategories && data.windowSize < data.allCategories?.length) ||
        Math.abs(data.dataDomainMax - data.dataDomainMin) > data.windowSize);

    this.dataType = data.type;
    if (this.shiftAxis) {
      this.hiddenCategoriesRatio =
        data.windowSize /
        (data.allCategories
          ? data.allCategories.length
          : Math.abs(data.dataDomainMax - data.dataDomainMin));
      this.handlerSize = rangeMax / this.hiddenCategoriesRatio;
      if (
        data.windowSize > data.allCategories?.length ||
        data.windowSize > Math.abs(data.dataDomainMax - data.dataDomainMin)
      ) {
        this.windowSize = data.allCategories
          ? data.allCategories.length
          : Math.abs(data.dataDomainMax - data.dataDomainMin);
      } else {
        this.windowSize = data.windowSize;
      }
    }

    switch (data.type) {
      case "numerical":
        {
          if (!data.numericalMode || data.numericalMode == "linear") {
            this.setLinearScale(
              data.domainMin,
              data.domainMax,
              rangeMin,
              rangeMax,
              data.tickFormat,
              data.numberOfTicks,
              data.autoNumberOfTicks
            );
          }
          if (data.numericalMode == "logarithmic") {
            this.setLogarithmicScale(
              data.domainMin,
              data.domainMax,
              rangeMin,
              rangeMax,
              data.tickFormat,
              data.numberOfTicks,
              data.autoNumberOfTicks
            );
          }
          if (data.numericalMode == "temporal") {
            this.setTemporalScale(
              data.domainMin,
              data.domainMax,
              rangeMin,
              rangeMax,
              data.tickFormat,
              data.numberOfTicks,
              data.autoNumberOfTicks
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
  public isStringTickDataType: boolean = false;
  public setTicksByData(
    ticks: { tick: any; value: any }[],
    tickFormatString: string
  ) {
    const position2Tick = new Map<number, string>();
    for (const tick of ticks) {
      const pos = this.valueToPosition(tick.value);
      let label;
      const tickFormat = tickFormatString
        ? tickFormatString?.replace(tickFormatParserExpression(), "$1")
        : null;
      if (!tickFormat || typeof tick.tick == "string") {
        label = <string>tick.tick;
        this.isStringTickDataType = true;
      } else {
        try {
          //try parse numeric format
          label = getFormat()(tickFormat)(tick.tick);
          this.isStringTickDataType = false;
        } catch (e) {
          try {
            //try parse date format
            label = applyDateFormat(new Date(tick.tick), tickFormat);
            this.isStringTickDataType = false;
          } catch (ex) {
            //use string format
            label = <string>tick.tick;
            this.isStringTickDataType = true;
          }
        }
      }
      position2Tick.set(pos, label);
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
    tickFormat: string,
    numberOfTicks: number = 10,
    autoTickNumber: boolean = true
  ) {
    const scale = new Scale.LinearScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    let tickNumber = numberOfTicks;
    if (autoTickNumber) {
      tickNumber = Math.round(Math.min(10, rangeLength / 40));
    }
    const ticks = scale.ticks(tickNumber);

    const defaultFormat = scale.tickFormat(tickNumber);

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
      if (!isNaN(tx)) {
        r.push({
          position: tx,
          label: resolvedFormat(ticks[i]),
        });
      }
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
    tickFormat: string,
    numberOfTicks: number = 10,
    autoTickNumber: boolean = true
  ) {
    const scale = new Scale.LogarithmicScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    let tickNumber = numberOfTicks;
    if (autoTickNumber) {
      tickNumber = Math.round(Math.min(10, rangeLength / 40));
    }
    const ticks = scale.ticks(tickNumber);
    const defaultFormat = scale.tickFormat(tickNumber);

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
      if (!isNaN(tx)) {
        r.push({
          position: tx,
          label: resolvedFormat(ticks[i]),
        });
      }
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
    tickFormatString: string,
    numberOfTicks: number = 10,
    autoTickNumber: boolean = true
  ) {
    const scale = new Scale.DateScale();
    scale.domainMin = domainMin;
    scale.domainMax = domainMax;
    const rangeLength = Math.abs(rangeMax - rangeMin);
    let tickNumber = numberOfTicks;
    if (autoTickNumber) {
      tickNumber = Math.round(Math.min(10, rangeLength / 40));
    }
    const ticks = scale.ticks(tickNumber);
    const tickFormat = scale.tickFormat(
      tickNumber,
      tickFormatString?.replace(tickFormatParserExpression(), "$1")
    );
    const r: TickDescription[] = [];
    for (let i = 0; i < ticks.length; i++) {
      const tx =
        ((ticks[i] - domainMin) / (domainMax - domainMin)) *
          (rangeMax - rangeMin) +
        rangeMin;
      if (!isNaN(tx)) {
        r.push({
          position: tx,
          label: tickFormat(ticks[i]),
        });
      }
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
      const position =
        ((range[i][0] + range[i][1]) / 2) * (rangeMax - rangeMin) + rangeMin;
      if (!isNaN(position)) {
        r.push({
          position,
          label: tickFormat ? tickFormat(domain[i]) : domain[i],
        });
      }
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
    if (this.oppositeSide) {
      side = -side;
    }
    const g = makeGroup([]);
    const cos = Math.cos(Geometry.degreesToRadians(angle));
    const sin = Math.sin(Geometry.degreesToRadians(angle));
    const tickSize = size;
    const lineStyle: Style = {
      strokeLinecap: "round",
      // strokeColor: style.lineColor,
      strokeColor: style.gridlineColor,
      strokeWidth: style.gridlineWidth,
      strokeDasharray: strokeStyleToDashArray(style.gridlineStyle),
    };

    // Ticks
    const ticksData = this.ticks.map((x) => x.position);
    for (const tickPosition of ticksData) {
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
  public renderLine(
    x: number,
    y: number,
    angle: number,
    side: number,
    offset?: number
  ): Group {
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
    if (this.scrollRequired && this.shiftAxis) {
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
    if (style.showBaseline) {
      g.elements.push(makeLine(x1, y1, x2, y2, lineStyle));
    }
    // Ticks
    const ticksData = this.ticks.map((x) => x.position);
    const visibleTicks = ticksData.concat([rangeMin, rangeMax]);

    if (style.showTicks) {
      for (const tickPosition of visibleTicks) {
        const tx = x + tickPosition * cos;
        const ty = y + tickPosition * sin;
        const dx = side * tickSize * sin;
        const dy = -side * tickSize * cos;
        g.elements.push(makeLine(tx, ty, tx + dx, ty + dy, lineStyle));
      }
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
        if (
          style.wordWrap ||
          (typeof tick.label === "string" &&
            splitStringByNewLine(tick.label).length > 1)
        ) {
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
                backgroundColor: style.tickTextBackgroudColor,
                backgroundColorId: style.tickTextBackgroudColorId,
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
            makeText(
              px,
              py,
              tick.label,
              style.fontFamily,
              style.fontSize,
              {
                fillColor: style.tickColor,
                backgroundColor: style.tickTextBackgroudColor,
                backgroundColorId: style.tickTextBackgroudColorId,
              },
              this.plotSegment && this.dataFlow
                ? {
                    enableSelection: this.data.enableSelection,
                    glyphIndex: 1,
                    rowIndices: applySelectionFilter(
                      this.data,
                      this.plotSegment.table,
                      ticks.indexOf(tick),
                      this.dataFlow
                    ),
                    plotSegment: this.plotSegment,
                  }
                : undefined
            ),
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
          makeText(
            px,
            py,
            tick.label,
            style.fontFamily,
            style.fontSize,
            {
              fillColor: style.tickColor,
              backgroundColor: style.tickTextBackgroudColor,
              backgroundColorId: style.tickTextBackgroudColorId,
            },
            this.plotSegment && this.dataFlow
              ? {
                  enableSelection: this.data.enableSelection,
                  glyphIndex: 1,
                  rowIndices: applySelectionFilter(
                    this.data,
                    this.plotSegment.table,
                    ticks.indexOf(tick),
                    this.dataFlow
                  ),
                  plotSegment: this.plotSegment,
                }
              : undefined
          ),
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
          typeof tick.label === "string" &&
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
            makeText(
              px,
              py,
              tick.label,
              style.fontFamily,
              style.fontSize,
              {
                fillColor: style.tickColor,
                backgroundColor: style.tickTextBackgroudColor,
                backgroundColorId: style.tickTextBackgroudColorId,
              },
              this.plotSegment && this.dataFlow
                ? {
                    enableSelection: this.data.enableSelection,
                    glyphIndex: 1,
                    rowIndices: applySelectionFilter(
                      this.data,
                      this.plotSegment.table,
                      ticks.indexOf(tick),
                      this.dataFlow
                    ),
                    plotSegment: this.plotSegment,
                  }
                : undefined
            ),
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
          if (
            style.wordWrap ||
            (typeof tick.label === "string" &&
              splitStringByNewLine(tick.label).length > 1)
          ) {
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
                  backgroundColor: style.tickTextBackgroudColor,
                  backgroundColorId: style.tickTextBackgroudColorId,
                },
                this.plotSegment && this.dataFlow
                  ? {
                      enableSelection: this.data.enableSelection,
                      glyphIndex: 1,
                      rowIndices: applySelectionFilter(
                        this.data,
                        this.plotSegment.table,
                        ticks.indexOf(tick),
                        this.dataFlow
                      ),
                      plotSegment: this.plotSegment,
                    }
                  : undefined
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
              makeText(
                px,
                py,
                tick.label,
                style.fontFamily,
                style.fontSize,
                {
                  fillColor: style.tickColor,
                  backgroundColor: style.tickTextBackgroudColor,
                  backgroundColorId: style.tickTextBackgroudColorId,
                },
                this.plotSegment && this.dataFlow
                  ? {
                      enableSelection: this.data.enableSelection,
                      glyphIndex: 1,
                      rowIndices: applySelectionFilter(
                        this.data,
                        this.plotSegment.table,
                        ticks.indexOf(tick),
                        this.dataFlow
                      ),
                      plotSegment: this.plotSegment,
                    }
                  : undefined
              ),
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

    if (offset) {
      g.transform = {
        x: angle == 90 ? offset : 0,
        y: angle == 90 ? 0 : offset,
        angle: 0,
      };
    }
    return g;
  }

  public renderCartesian(
    x: number,
    y: number,
    axis: AxisMode,
    offset?: number
  ): Group {
    switch (axis) {
      case AxisMode.X: {
        return this.renderLine(x, y, 0, 1, offset);
      }
      case AxisMode.Y: {
        return this.renderLine(x, y, 90, -1, offset);
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
    const gridineArcRotate = 90;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.gridlineColor,
      strokeWidth: style.gridlineWidth,
      strokeDasharray: strokeStyleToDashArray(style.gridlineStyle),
    };
    for (const tickPosition of this.ticks.map((x) => x.position)) {
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
    const gridineArcRotate = 90;
    const lineStyle: Style = {
      strokeLinecap: "round",
      strokeColor: style.gridlineColor,
      strokeWidth: style.gridlineWidth,
      strokeDasharray: strokeStyleToDashArray(style.gridlineStyle),
    };
    let radius = (outerRadius - innerRadius) / this.ticks.length;
    for (const tickPosition of this.ticks.map((x) => x.position)) {
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
        (style.wordWrap ||
          (typeof tick.label === "string" &&
            splitStringByNewLine(lablel).length > 1))
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
              backgroundColor: style.tickTextBackgroudColor,
              backgroundColorId: style.tickTextBackgroudColorId,
            }
          );
          lines.push(gt);
        }

        const line = makeLine(0, 0, 0, style.tickSize * side, lineStyle);
        const gt = makeGroup([style.showTicks ? line : null, ...lines]);

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
        const line = makeLine(0, 0, 0, style.tickSize * side, lineStyle);
        const gt = makeGroup([
          style.showTicks ? line : null,
          makeText(textX, textY, tick.label, style.fontFamily, style.fontSize, {
            fillColor: style.tickColor,
            backgroundColor: style.tickTextBackgroudColor,
            backgroundColorId: style.tickTextBackgroudColorId,
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
      const line = makeLine(0, 0, 0, -style.tickSize * side, lineStyle);
      const gt = makeGroup([
        style.showTicks ? line : null,
        makeText(textX, textY, tick.label, style.fontFamily, style.fontSize, {
          fillColor: style.tickColor,
          backgroundColor: style.tickTextBackgroudColor,
          backgroundColorId: style.tickTextBackgroudColorId,
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
    onScroll: (position: number) => void,
    zoom: ZoomInfo
  ) {
    switch (axis) {
      case AxisMode.X: {
        return this.renderScrollBar(x, y, 0, 1, scrollPosition, onScroll, zoom);
      }
      case AxisMode.Y: {
        return this.renderScrollBar(
          x,
          y,
          90,
          -1,
          scrollPosition,
          onScroll,
          zoom
        );
      }
    }
  }

  private renderScrollBar(
    x: number,
    y: number,
    angle: number,
    side: number,
    handlePosition: number,
    onScroll: (position: number) => void,
    zoom: ZoomInfo
  ): React.ReactElement<any> {
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
      zoom,
      scrollBarRatio: this.hiddenCategoriesRatio,
      windowSize: this.windowSize,
      dataType: this.dataType,
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
  isOffset: boolean;
  isOnTop: boolean;
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
          label: strings.objects.axes.verticalText,
        }
      );
    }

    return [
      manager.vertical(
        manager.verticalGroup(
          {
            header: strings.objects.visibilityAndPosition,
          },
          [
            manager.inputBoolean(
              { property: axisProperty, field: "visible" },
              {
                type: "checkbox",
                label: strings.objects.visibleOn.visible,
              }
            ),
            options.isOnTop
              ? manager.inputBoolean(
                  { property: axisProperty, field: "onTop" },
                  {
                    type: "checkbox",
                    label: strings.objects.onTop,
                  }
                )
              : null,
            manager.inputSelect(
              { property: axisProperty, field: "side" },
              {
                type: "dropdown",
                showLabel: true,
                label: strings.objects.position,
                options: ["default", "opposite"],
                labels: [strings.objects.default, strings.objects.opposite],
              }
            ),
            options.isOffset
              ? manager.inputNumber(
                  {
                    property: axisProperty,
                    field: ["offset"],
                  },
                  {
                    label: strings.objects.axes.offSet,
                    showUpdown: true,
                    updownTick: 10,
                  }
                )
              : null,
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
                allowNull: true,
              }
            ),
            manager.inputBoolean(
              { property: axisProperty, field: ["style", "showTicks"] },
              {
                type: "checkbox",
                label: strings.objects.axes.showTickLine,
                checkBoxStyles: {
                  root: {
                    marginTop: 5,
                  },
                },
              }
            ),
            manager.inputBoolean(
              { property: axisProperty, field: ["style", "showBaseline"] },
              {
                type: "checkbox",
                label: strings.objects.axes.showBaseline,
                checkBoxStyles: {
                  root: {
                    marginTop: 5,
                  },
                },
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
                allowNull: true,
              }
            ),
            manager.inputColor(
              {
                property: axisProperty,
                field: ["style", "tickTextBackgroudColor"],
              },
              {
                label: strings.objects.axes.tickTextBackgroudColor,
                labelKey: strings.objects.axes.tickTextBackgroudColor,
                allowNull: true,
              }
            ),
            manager.inputNumber(
              {
                property: axisProperty,
                field: ["style", "tickSize"],
              },
              {
                label: strings.objects.axes.ticksize,
                showUpdown: true,
                updownTick: 1,
              }
            ),
            manager.inputFontFamily(
              {
                property: axisProperty,
                field: ["style", "fontFamily"],
              },
              {
                label: strings.objects.font,
              }
            ),
            manager.inputNumber(
              { property: axisProperty, field: ["style", "fontSize"] },
              {
                showUpdown: true,
                updownStyle: "font",
                updownTick: 2,
                label: strings.objects.fontSize,
                minimum: 1,
              }
            ),
            manager.inputBoolean(
              { property: axisProperty, field: ["style", "wordWrap"] },
              {
                type: "checkbox",
                headerLabel: strings.objects.text.textDisplaying,
                label: strings.objects.text.wrapText,
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
        header: strings.objects.visibilityAndPosition,
      },
      [
        manager.inputBoolean(
          { property: axisProperty, field: "visible" },
          {
            type: "checkbox",
            label: strings.objects.visibleOn.visible,
          }
        ),
      ]
    );
  }
}

function buildInteractivityGroup(
  axisProperty: string,
  manager: Controls.WidgetManager
) {
  return manager.verticalGroup(
    {
      header: "Interactivity",
    },
    [
      manager.inputBoolean(
        { property: axisProperty, field: "enableSelection" },
        {
          type: "checkbox",
          label: "Selection",
        }
      ),
    ]
  );
}

interface AxisWidgetsConfig {
  showOffset: boolean;
  showScrolling: boolean;
  showOnTop: boolean;
}

const defaultAxisWidgetsConfig: AxisWidgetsConfig = {
  showOffset: true,
  showScrolling: true,
  showOnTop: true,
};

function buildScrollingAxisWidgets(
  data: Specification.Types.AxisDataBinding,
  axisProperty: string,
  manager: Controls.WidgetManager,
  axisName: string,
  onChange?: () => void
) {
  return [
    manager.label(strings.objects.dataAxis.scrolling),
    manager.inputBoolean(
      {
        property: axisProperty,
        field: "allowScrolling",
      },
      {
        type: "checkbox",
        label: strings.objects.dataAxis.allowScrolling,
        observerConfig: {
          isObserver: true,
          properties: {
            property: axisProperty,
            field: "windowSize",
          },
          value: 10,
        },
        onChange: onChange,
      }
    ),
    data.allowScrolling
      ? manager.inputNumber(
          {
            property: axisProperty,
            field: "windowSize",
          },
          {
            maximum: 1000000,
            minimum: 1,
            label: strings.objects.dataAxis.windowSize,
          }
        )
      : null,
    data.allowScrolling
      ? manager.inputNumber(
          {
            property: axisProperty,
            field: "barOffset",
          },
          {
            maximum: 1000000,
            minimum: -1000000,
            label: strings.objects.dataAxis.barOffset,
          }
        )
      : null,
  ];
}

// eslint-disable-next-line
export function buildAxisWidgets(
  data: Specification.Types.AxisDataBinding,
  axisProperty: string,
  manager: Controls.WidgetManager,
  axisName: string,
  axisWidgetsConfig: AxisWidgetsConfig = defaultAxisWidgetsConfig,
  onChange?: () => void
): Controls.Widget[] {
  const widgets = [];
  const dropzoneOptions: Controls.RowOptions = {
    dropzone: {
      type: "axis-data-binding",
      property: axisProperty,
      prompt: axisName + ": " + strings.objects.dropData,
    },
    noLineHeight: true,
  };
  const makeAppearance = () => {
    return buildAxisAppearanceWidgets(axisProperty, manager, {
      isVisible: data.visible,
      wordWrap: data.style?.wordWrap ?? false,
      isOffset: axisWidgetsConfig.showOffset,
      isOnTop: axisWidgetsConfig.showOnTop,
    });
  };
  if (data != null) {
    const isDateExpression = data.expression
      ? data.expression?.includes("date.")
      : false;
    const scrollingWidgets = axisWidgetsConfig.showScrolling
      ? buildScrollingAxisWidgets(
          data,
          axisProperty,
          manager,
          axisName,
          onChange
        )
      : [];
    const tickFormatAndTickDataFields = getTickDataAndTickFormatFields(
      data,
      axisProperty,
      manager
    );
    const categoricalTickFormatAndTickDataFields =
      data.valueType === "date" ? tickFormatAndTickDataFields : [];
    switch (data.type) {
      case "numerical":
        {
          widgets.push(
            manager.verticalGroup(
              {
                header: strings.objects.general,
              },
              [
                // manager.sectionHeader(
                //   axisName + strings.objects.axes.numericalSuffix,
                //   manager.clearButton({ property: axisProperty }, null, true),
                //   dropzoneOptions
                // ),
                manager.label(strings.objects.axes.data),
                manager.styledHorizontal(
                  {
                    alignItems: "start",
                  },
                  [1, 0],
                  manager.sectionHeader(
                    null,
                    manager.inputExpression(
                      {
                        property: axisProperty,
                        field: "expression",
                      },
                      {}
                    ),
                    dropzoneOptions
                  ),
                  manager.clearButton({ property: axisProperty }, null, true, {
                    marginTop: "1px",
                  })
                ),
                data.valueType === "date"
                  ? manager.label(strings.objects.dataAxis.range)
                  : null,
                data.valueType === "date"
                  ? manager.inputDate(
                      { property: axisProperty, field: "domainMin" },
                      { label: strings.objects.dataAxis.start }
                    )
                  : null,
                data.valueType === "date"
                  ? manager.inputDate(
                      { property: axisProperty, field: "domainMax" },
                      { label: strings.objects.dataAxis.end }
                    )
                  : null,
                data.valueType !== "date"
                  ? manager.label(strings.objects.dataAxis.range)
                  : null,
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
                        labels: [
                          strings.scale.linear,
                          strings.scale.logarithmic,
                        ],
                        showLabel: true,
                        type: "dropdown",
                        label: "Mode",
                      }
                    )
                  : null,
                ...tickFormatAndTickDataFields,
                ...scrollingWidgets,
              ]
            )
          );
          widgets.push(makeAppearance());
        }
        break;
      case "categorical":
        {
          widgets.push(
            manager.verticalGroup(
              {
                header: strings.objects.general,
              },
              [
                // manager.sectionHeader(
                //   strings.objects.axes.data,
                //   manager.clearButton({ property: axisProperty }, null, true),
                //   dropzoneOptions
                // ),
                // manager.vertical(
                manager.label(strings.objects.axes.data),
                manager.styledHorizontal(
                  {
                    alignItems: "start",
                  },
                  [1, 0],
                  manager.sectionHeader(
                    null,
                    manager.inputExpression(
                      {
                        property: axisProperty,
                        field: "expression",
                      },
                      {}
                    ),
                    dropzoneOptions
                  ),
                  isDateExpression
                    ? manager.reorderWidget(
                        { property: axisProperty, field: "categories" },
                        { allowReset: true }
                      )
                    : null,
                  manager.clearButton({ property: axisProperty }, null, true, {
                    marginTop: "1px",
                  })
                ),

                !isDateExpression
                  ? getOrderByAnotherColumnWidgets(data, axisProperty, manager)
                  : null,

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
                ...categoricalTickFormatAndTickDataFields,
                ...scrollingWidgets,
                // )
              ]
            )
          );
          widgets.push(buildInteractivityGroup(axisProperty, manager));
          widgets.push(makeAppearance());
        }
        break;
      case "default":
        {
          widgets.push(
            manager.sectionHeader(
              axisName + strings.objects.axes.stackingSuffix,
              manager.clearButton({ property: axisProperty }, null, true),
              {
                ...dropzoneOptions,
                noLineHeight: false,
              }
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
      // manager.sectionHeader(
      //   axisName + ": " + strings.core.none,
      //   null,
      //   dropzoneOptions
      // )
      manager.verticalGroup(
        {
          header: strings.objects.general,
        },
        [
          manager.label(strings.objects.axes.data),
          manager.horizontal(
            [1, 0, 0, 0],
            manager.sectionHeader(
              null,
              manager.inputText(
                {
                  property: null,
                },
                {
                  disabled: true,
                  value: strings.core.none,
                }
              ),
              dropzoneOptions
            )
          ),
        ]
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
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "offset",
        },
      },
      type: Specification.AttributeType.Number,
      default: 0,
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "numberOfTicks",
        },
      },
      type: Specification.AttributeType.Number,
      default: 10,
    },
    {
      objectID: plotSegment._id,
      target: {
        property: {
          property,
          field: "autoNumberOfTicks",
        },
      },
      type: Specification.AttributeType.Boolean,
      default: true,
    },
  ];
}

function getTable(dataflow: DataflowManager, name: string): DataflowTable {
  return dataflow.getTable(name);
}

function applySelectionFilter(
  data: AxisDataBinding,
  tableName: string,
  index: number,
  dataflow: DataflowManager
) {
  const filteredIndices: number[] = [];

  const table = getTable(dataflow, tableName);

  if (
    data.type === AxisDataBindingType.Default ||
    data.type === AxisDataBindingType.Numerical
  ) {
    return table.rows.map((row, id) => id);
  }
  const parsed = (Expression.parse(data?.expression) as Expression.FunctionCall)
    ?.args[0];

  if (data.type === AxisDataBindingType.Categorical) {
    for (let i = 0; i < table.rows.length; i++) {
      const rowContext = table.getRowContext(i);

      if (data.categories[index] == parsed.getStringValue(rowContext)) {
        filteredIndices.push(i);
      }
    }
  }
  return filteredIndices;
}

function getOrderByAnotherColumnWidgets(
  data: Specification.Types.AxisDataBinding,
  axisProperty: string,
  manager: Controls.WidgetManager
): JSX.Element[] {
  const widgets = [];

  const tableColumns = getTableColumns(
    manager as Controls.WidgetManager & CharticulatorPropertyAccessors
  );

  const columnsDisplayNames = tableColumns
    .filter((item) => !item.metadata?.isRaw)
    .map((column) => column.displayName);
  const columnsNames = tableColumns
    .filter((item) => !item.metadata?.isRaw)
    .map((column) => transformOrderByExpression(column.name));

  const derivedColumns = [];
  const derivedColumnsNames = [];
  for (let i = 0; i < tableColumns.length; i++) {
    if (!tableColumns[i].metadata?.isRaw) {
      derivedColumns.push(type2DerivedColumns[tableColumns[i].type]);
      derivedColumnsNames.push(tableColumns[i].name);
    }
  }

  const removeIdx: number[] = [];

  //remove empty
  for (let i = 0; i < derivedColumns.length; i++) {
    if (!Array.isArray(derivedColumns[i])) {
      removeIdx.push(i);
    }
  }

  const filteredDerivedColumns = derivedColumns.filter(
    (item, idx) => !removeIdx.includes(idx)
  );
  const filteredDerivedColumnsNames = derivedColumnsNames.filter(
    (item, idx) => !removeIdx.includes(idx)
  );

  //Date columns
  for (let i = 0; i < filteredDerivedColumns.length; i++) {
    const currentDerivedColumn = filteredDerivedColumns[i];
    for (let j = 0; j < currentDerivedColumn?.length; j++) {
      const currentColumn = currentDerivedColumn[j];
      const currentColumnName = filteredDerivedColumnsNames[i];
      columnsDisplayNames.push(currentColumn.displayName ?? currentColumn.name);
      columnsNames.push(currentColumn.function + `(${currentColumnName})`);
    }
  }

  const table = (manager as Controls.WidgetManager &
    CharticulatorPropertyAccessors).store.getTables()[0].name;
  const store = (manager as Controls.WidgetManager &
    CharticulatorPropertyAccessors).store;

  const df = new Prototypes.Dataflow.DataflowManager(store.dataset);
  const getExpressionVector = (
    expression: string,
    table: string,
    groupBy?: Specification.Types.GroupBy
  ): any[] => {
    const newExpression = transformOrderByExpression(expression);
    groupBy.expression = transformOrderByExpression(groupBy.expression);

    const expr = Expression.parse(newExpression);
    const tableContext = df.getTable(table);
    const indices = groupBy
      ? new CompiledGroupBy(groupBy, df.cache).groupBy(tableContext)
      : makeRange(0, tableContext.rows.length).map((x) => [x]);
    return indices.map((is) =>
      expr.getValue(tableContext.getGroupedContext(is))
    );
  };

  const parsed = Expression.parse(data.expression);
  let groupByExpression: string = null;
  if (parsed instanceof Expression.FunctionCall) {
    groupByExpression = parsed.args[0].toString();
    groupByExpression = groupByExpression?.split("`").join("");
    //need to provide date.year() etc.
    groupByExpression = parseDerivedColumnsExpression(groupByExpression);
  }

  const vectorData = getExpressionVector(data.orderByExpression, table, {
    expression: groupByExpression,
  });
  const items = vectorData.map((item) => [...new Set(item)]);

  const items_idx = items.map((item, idx) => [item, idx]);
  const axisData = getExpressionVector(data.expression, table, {
    expression: groupByExpression,
  }).map((item, idx) => [item, idx]);

  const rawAxisData = items_idx.map((item) =>
    Array.isArray(item[0]) ? item[0].join(", ") : item[0].toString()
  );

  const onConfirm = (items: string[]) => {
    try {
      const newData = [...axisData];
      const new_order = [];

      for (let i = 0; i < items.length; i++) {
        const currentItemIndex = items_idx.findIndex(
          (item) =>
            (Array.isArray(item[0])
              ? item[0].join(", ")
              : item[0].toString()) == items[i]
        );
        const foundItem = newData.find(
          (item) => item[1] === items_idx[currentItemIndex]?.[1]
        );
        new_order.push(foundItem);
        items_idx.splice(currentItemIndex, 1);
      }
      const getItem = (item: any) => {
        if (data.valueType == DataType.Number) {
          return "" + item;
        }
        return item;
      };
      data.order = new_order.map((item) => getItem(item[0]));
      data.orderMode = OrderMode.order;
      data.categories = new_order.map((item) => getItem(item[0]));
    } catch (e) {
      console.log(e);
    }
  };

  const onChange = () => {
    const vectorData = getExpressionVector(data.orderByExpression, table, {
      expression: groupByExpression,
    });
    const items = vectorData.map((item) => [...new Set(item)]);
    const newData = items.map((item) =>
      Array.isArray(item) ? item.join(", ") : item
    );
    data.orderByCategories = newData;
  };

  widgets.push(
    manager.label(strings.objects.axes.orderBy),

    manager.horizontal(
      [1, 0],
      manager.inputSelect(
        { property: axisProperty, field: "orderByExpression" },
        {
          type: "dropdown",
          showLabel: true,
          labels: columnsDisplayNames,
          options: columnsNames,
          onChange: onChange,
        }
      ),
      manager.reorderByAnotherColumnWidget(
        { property: axisProperty, field: "orderByCategories" },
        {
          allowReset: true,
          onConfirmClick: onConfirm,
          onResetCategories: rawAxisData,
        }
      )
    )
  );
  return widgets;
}

function getTickDataAndTickFormatFields(
  data: Specification.Types.AxisDataBinding,
  axisProperty: string,
  manager: Controls.WidgetManager
) {
  const showInputFormat = shouldShowTickFormatForTickExpression(data, manager);

  const widgets = [];
  widgets.push(
    manager.label(strings.objects.axes.tickData),
    manager.styledHorizontal(
      {
        alignItems: "start",
      },
      [1, 0],
      manager.inputExpression(
        {
          property: axisProperty,
          field: "tickDataExpression",
        },
        {
          allowNull: true,
          placeholder: strings.core.default,
          dropzone: {
            type: "tick-data-binding",
            prompt: strings.objects.dropTickData,
          },
          noLineHeight: true,
        }
      )
    )
  );
  if (showInputFormat) {
    widgets.push(
      manager.inputFormat(
        {
          property: axisProperty,
          field: "tickFormat",
        },
        {
          blank: strings.core.auto,
          label: strings.objects.axes.tickFormat,
          isDateField:
            data.numericalMode === NumericalMode.Temporal ||
            data.valueType === DataType.Date,
          allowNull: true,
        }
      )
    );
  }
  if (!data.tickDataExpression) {
    widgets.push(
      manager.inputBoolean(
        {
          property: axisProperty,
          field: "autoNumberOfTicks",
        },
        {
          type: "checkbox",
          label: strings.objects.axes.autoNumberOfTicks,
          styles: {
            marginTop: "0.5rem",
          },
        }
      )
    );
    if (!data.autoNumberOfTicks) {
      widgets.push(
        manager.inputNumber(
          {
            property: axisProperty,
            field: "numberOfTicks",
          },
          {
            label: strings.objects.axes.numberOfTicks,
            showUpdown: true,
            updownTick: 1,
            minimum: 2,
          }
        )
      );
    }
  }
  return widgets;
}

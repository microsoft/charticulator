// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import { Graphics, Color, shallowClone } from "../../core";
import { toSVGNumber } from "../utils";
import { ChartComponent } from "../../container/chart_component";

// adapted from https://stackoverflow.com/a/20820649
function desaturate(color: Color, amount: number) {
  const { r, g, b } = color;
  const l = 0.3 * r + 0.6 * g + 0.1 * b;
  return {
    r: Math.min(r + amount * (l - r), 255),
    g: Math.min(g + amount * (l - g), 255),
    b: Math.min(b + amount * (l - b), 255)
  };
}

export function renderColor(color: Color, saturation?: number): string {
  if (!color) {
    return `rgb(0,0,0)`;
  }
  if (saturation !== undefined && saturation < 1 && saturation >= 0) {
    color = desaturate(color, saturation);
  }

  return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(
    0
  )})`;
}

export function renderStyle(style: Graphics.Style): React.CSSProperties {
  if (style == null) {
    return {};
  }
  return {
    stroke: style.strokeColor
      ? renderColor(style.strokeColor, style.saturation)
      : "none",
    strokeOpacity: style.strokeOpacity != undefined ? style.strokeOpacity : 1,
    strokeWidth: style.strokeWidth != undefined ? style.strokeWidth : 1,
    strokeLinecap:
      style.strokeLinecap != undefined ? style.strokeLinecap : "round",
    strokeLinejoin:
      style.strokeLinejoin != undefined ? style.strokeLinejoin : "round",
    fill: style.fillColor
      ? renderColor(style.fillColor, style.saturation)
      : "none",
    fillOpacity: style.fillOpacity != undefined ? style.fillOpacity : 1,
    textAnchor: style.textAnchor != undefined ? style.textAnchor : "start",
    opacity: style.opacity != undefined ? style.opacity : 1
  };
}

const path_commands: { [name: string]: (args: number[]) => string } = {
  M: (args: number[]) => `M ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
  L: (args: number[]) => `L ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
  C: (args: number[]) =>
    `C ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(
      args[2]
    )},${toSVGNumber(-args[3])},${toSVGNumber(args[4])},${toSVGNumber(
      -args[5]
    )}`,
  Q: (args: number[]) =>
    `Q ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(
      args[2]
    )},${toSVGNumber(-args[3])}`,
  A: (args: number[]) =>
    `A ${toSVGNumber(args[0])},${toSVGNumber(args[1])},${toSVGNumber(
      args[2]
    )},${toSVGNumber(args[3])},${toSVGNumber(args[4])},${toSVGNumber(
      args[5]
    )},${toSVGNumber(-args[6])}`,
  Z: () => `Z`
};

export function renderSVGPath(cmds: Array<{ cmd: string; args: number[] }>) {
  return cmds.map(x => path_commands[x.cmd](x.args)).join(" ");
}

export function renderTransform(transform: Graphics.RigidTransform): string {
  if (!transform) {
    return null;
  }
  if (Math.abs(transform.angle) < 1e-7) {
    return `translate(${toSVGNumber(transform.x)},${toSVGNumber(
      -transform.y
    )})`;
  } else {
    return `translate(${toSVGNumber(transform.x)},${toSVGNumber(
      -transform.y
    )}) rotate(${toSVGNumber(-transform.angle)})`;
  }
}

export interface RenderGraphicalElementSVGOptions {
  noStyle?: boolean;
  styleOverride?: Graphics.Style;
  className?: string;
  key?: string;
  chartComponentSync?: boolean;
  externalResourceResolver?: (url: string) => string;
  onSelected?: (
    element: Graphics.Element["selectable"],
    event: MouseEvent
  ) => any;
}

export function renderGraphicalElementSVG(
  element: Graphics.Element,
  options?: RenderGraphicalElementSVGOptions
): JSX.Element {
  if (!element) {
    return null;
  }

  if (!options) {
    options = {};
  }

  const style = options.noStyle
    ? null
    : renderStyle(options.styleOverride || element.style);

  // OnClick event handler
  let onClick: (e: React.MouseEvent<Element>) => void;
  if (options.onSelected && element.selectable) {
    onClick = (e: React.MouseEvent<Element>) => {
      e.stopPropagation();
      options.onSelected(element.selectable, e.nativeEvent);
    };
    style.cursor = "pointer";
    style.pointerEvents = "all";
  }

  switch (element.type) {
    case "rect": {
      const rect = element as Graphics.Rect;
      return (
        <rect
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          x={Math.min(rect.x1, rect.x2)}
          y={-Math.max(rect.y1, rect.y2)}
          width={Math.abs(rect.x1 - rect.x2)}
          height={Math.abs(rect.y1 - rect.y2)}
        />
      );
    }
    case "circle": {
      const circle = element as Graphics.Circle;
      return (
        <circle
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          cx={circle.cx}
          cy={-circle.cy}
          r={circle.r}
        />
      );
    }
    case "ellipse": {
      const ellipse = element as Graphics.Ellipse;
      return (
        <ellipse
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          cx={(ellipse.x1 + ellipse.x2) / 2}
          cy={-(ellipse.y1 + ellipse.y2) / 2}
          rx={Math.abs(ellipse.x1 - ellipse.x2) / 2}
          ry={Math.abs(ellipse.y1 - ellipse.y2) / 2}
        />
      );
    }
    case "line": {
      const line = element as Graphics.Line;
      return (
        <line
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          x1={line.x1}
          y1={-line.y1}
          x2={line.x2}
          y2={-line.y2}
        />
      );
    }
    case "polygon": {
      const polygon = element as Graphics.Polygon;
      return (
        <polygon
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          points={polygon.points
            .map(p => `${toSVGNumber(p.x)},${toSVGNumber(-p.y)}`)
            .join(" ")}
        />
      );
    }
    case "path": {
      const path = element as Graphics.Path;
      const d = renderSVGPath(path.cmds);
      return (
        <path
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          d={d}
        />
      );
    }
    case "text": {
      const text = element as Graphics.Text;
      style.fontFamily = text.fontFamily;
      style.fontSize = text.fontSize + "px";
      if (style.stroke != "none") {
        const style2 = shallowClone(style);
        style2.fill = style.stroke;
        const e1 = (
          <text
            onClick={onClick}
            className={options.className || null}
            style={style2}
            x={text.cx}
            y={-text.cy}
          >
            {text.text}
          </text>
        );
        style.stroke = "none";
        const e2 = (
          <text
            onClick={onClick}
            className={options.className || null}
            style={style}
            x={text.cx}
            y={-text.cy}
          >
            {text.text}
          </text>
        );
        return (
          <g key={options.key}>
            {e1}
            {e2}
          </g>
        );
      } else {
        return (
          <text
            key={options.key}
            onClick={onClick}
            className={options.className || null}
            style={style}
            x={text.cx}
            y={-text.cy}
          >
            {text.text}
          </text>
        );
      }
    }
    case "image": {
      const image = element as Graphics.Image;
      let preserveAspectRatio = null;
      switch (image.mode) {
        case "letterbox":
          preserveAspectRatio = "xMidYMid meet";
          break;
        case "fill":
          preserveAspectRatio = "xMidYMid slice";
          break;
        case "stretch":
          preserveAspectRatio = "none";
          break;
      }
      return (
        <image
          key={options.key}
          onClick={onClick}
          className={options.className || null}
          style={style}
          preserveAspectRatio={preserveAspectRatio}
          xlinkHref={
            options.externalResourceResolver
              ? options.externalResourceResolver(image.src)
              : image.src
          }
          x={image.x}
          y={-image.y - image.height}
          width={image.width}
          height={image.height}
        />
      );
    }
    case "chart-container": {
      const component = element as Graphics.ChartContainerElement;
      return (
        <ChartComponent
          key={options.key}
          chart={component.chart}
          dataset={component.dataset}
          width={component.width}
          height={component.height}
          rootElement="g"
          sync={options.chartComponentSync}
          rendererOptions={{
            chartComponentSync: options.chartComponentSync,
            externalResourceResolver: options.externalResourceResolver,
            onSelected: options.onSelected
              ? (_, nativeEvent) => {
                  // For now, select the whole component, discard any info inside
                  options.onSelected(element.selectable, nativeEvent);
                }
              : null
          }}
        />
      );
    }
    case "group": {
      const group = element as Graphics.Group;
      return (
        <g
          transform={renderTransform(group.transform)}
          key={group.key || options.key}
          style={{
            opacity:
              group.style && group.style.opacity != null
                ? group.style.opacity
                : 1
          }}
          onClick={onClick}
        >
          {group.elements.map((x, index) => {
            return renderGraphicalElementSVG(x, {
              key: `m${index}`,
              chartComponentSync: options.chartComponentSync,
              externalResourceResolver: options.externalResourceResolver,
              onSelected: options.onSelected
            });
          })}
        </g>
      );
    }
  }
}

export class GraphicalElementDisplay extends React.PureComponent<
  { element: Graphics.Element },
  {}
> {
  public render() {
    return renderGraphicalElementSVG(this.props.element);
  }
}

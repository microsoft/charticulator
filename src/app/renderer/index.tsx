import * as React from "react";
import * as d3 from "d3";

import { Graphics, Rect, Color, Point, shallowClone, prettyNumber } from "../../core";
import { resolve } from "path";
import { toSVGNumber } from "../utils";

export { renderGraphicalElementCanvas } from "./canvas";

export function renderColor(color: Color): string {
    if (!color) return `rgb(0,0,0)`;
    return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(0)})`;
}

export function renderStyle(style: Graphics.Style): React.CSSProperties {
    if (style == null) return {};
    return {
        stroke: style.strokeColor ? renderColor(style.strokeColor) : "none",
        strokeOpacity: style.strokeOpacity != undefined ? style.strokeOpacity : 1,
        strokeWidth: style.strokeWidth != undefined ? style.strokeWidth : 1,
        strokeLinecap: style.strokeLinecap != undefined ? style.strokeLinecap : "round",
        strokeLinejoin: style.strokeLinejoin != undefined ? style.strokeLinejoin : "round",
        fill: style.fillColor ? renderColor(style.fillColor) : "none",
        fillOpacity: style.fillOpacity != undefined ? style.fillOpacity : 1,
        textAnchor: style.textAnchor != undefined ? style.textAnchor : "start",
        opacity: style.opacity != undefined ? style.opacity : 1
    };
}

let path_commands: { [name: string]: (args: number[]) => string } = {
    "M": (args: number[]) => `M ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
    "L": (args: number[]) => `L ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
    "C": (args: number[]) => `C ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(args[2])},${toSVGNumber(-args[3])},${toSVGNumber(args[4])},${toSVGNumber(-args[5])}`,
    "Q": (args: number[]) => `Q ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(args[2])},${toSVGNumber(-args[3])}`,
    "A": (args: number[]) => `A ${toSVGNumber(args[0])},${toSVGNumber(args[1])},${toSVGNumber(args[2])},${toSVGNumber(args[3])},${toSVGNumber(args[4])},${toSVGNumber(args[5])},${toSVGNumber(-args[6])}`,
    "Z": () => `Z`
};

export function renderSVGPath(cmds: { cmd: string, args: number[] }[]) {
    return cmds.map(x => path_commands[x.cmd](x.args)).join(" ")
}

export function renderTransform(transform: Graphics.RigidTransform): string {
    if (!transform) return null;
    if (Math.abs(transform.angle) < 1e-7) {
        return `translate(${toSVGNumber(transform.x)},${toSVGNumber(-transform.y)})`
    } else {
        return `translate(${toSVGNumber(transform.x)},${toSVGNumber(-transform.y)}) rotate(${toSVGNumber(-transform.angle)})`
    }
}

export interface RenderGraphicalElementSVGOptions {
    noStyle?: boolean;
    styleOverride?: Graphics.Style;
    className?: string;
    key?: string;
    externalResourceResolver?: (url: string) => string;
}

export function renderGraphicalElementSVG(element: Graphics.Element, options?: RenderGraphicalElementSVGOptions): JSX.Element {
    if (!element) return null;
    if (!options) options = {};
    let style = options.noStyle ? null : renderStyle(options.styleOverride || element.style);
    switch (element.type) {
        case "rect": {
            let rect = element as Graphics.Rect;
            return (
                <rect
                    key={options.key}
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
            let circle = element as Graphics.Circle;
            return (
                <circle
                    key={options.key}
                    className={options.className || null}
                    style={style}
                    cx={circle.cx}
                    cy={-circle.cy}
                    r={circle.r}
                />
            );
        }
        case "ellipse": {
            let ellipse = element as Graphics.Ellipse;
            return (
                <ellipse
                    key={options.key}
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
            let line = element as Graphics.Line;
            return (
                <line
                    key={options.key}
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
            let polygon = element as Graphics.Polygon;
            return (
                <polygon
                    key={options.key}
                    className={options.className || null}
                    style={style}
                    points={polygon.points.map(p => `${toSVGNumber(p.x)},${toSVGNumber(-p.y)}`).join(" ")}
                />
            );
        }
        case "path": {
            let path = element as Graphics.Path;
            let d = renderSVGPath(path.cmds);
            return (
                <path
                    key={options.key}
                    className={options.className || null}
                    style={style}
                    d={d}
                />
            );
        }
        case "text": {
            let text = element as Graphics.Text;
            style.fontFamily = text.fontFamily;
            style.fontSize = text.fontSize + "px";
            if (style.stroke != "none") {
                let style2 = shallowClone(style);
                style2.fill = style.stroke;
                let e1 = (
                    <text
                        className={options.className || null}
                        style={style2}
                        x={text.cx}
                        y={-text.cy}
                    >{text.text}</text>
                )
                style.stroke = "none";
                let e2 = (
                    <text
                        className={options.className || null}
                        style={style}
                        x={text.cx}
                        y={-text.cy}
                    >{text.text}</text>
                )
                return (
                    <g key={options.key}>{e1}{e2}</g>
                )
            } else {
                return (
                    <text
                        key={options.key}
                        className={options.className || null}
                        style={style}
                        x={text.cx}
                        y={-text.cy}
                    >{text.text}</text>
                );
            }
        }
        case "image": {
            let image = element as Graphics.Image;
            return (
                <image
                    key={options.key}
                    className={options.className || null}
                    style={style}
                    xlinkHref={options.externalResourceResolver ? options.externalResourceResolver(image.src) : image.src}
                    x={image.x}
                    y={-image.y - image.height}
                    width={image.width}
                    height={image.height}
                />
            );
        }
        case "group": {
            let group = element as Graphics.Group;
            return (
                <g transform={renderTransform(group.transform)} key={group.key || options.key}>
                    {group.elements.map((x, index) => {
                        return renderGraphicalElementSVG(x, { key: `m${index}`, externalResourceResolver: options.externalResourceResolver });
                    })}
                </g>
            )
        }
    }
}

export class GraphicalElementDisplay extends React.PureComponent<{ element: Graphics.Element }, {}> {
    public render() {
        return renderGraphicalElementSVG(this.props.element);
    }
}
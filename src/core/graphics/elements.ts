// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color, Point } from "../common";
import * as Specification from "../specification";
import * as Dataset from "../dataset";

// Internal graphics representation
// Bridge the core components with the rendering system
//
// Coordinate System:
//        y
//        ^
//        |
//   -----o-----> x
//        |
//        |
//
// Rigid Transform:
//
//  (theta is counter clockwise in above diagram)
//  x' = x cos(theta) - y sin(theta) + tx
//  y' = x sin(theta) + y cos(theta) + ty
//
//  concatTransform(a, b)(p) = a(b(p))

export interface PointDirection extends Point {
  direction: Point;
}

export interface RigidTransform {
  x: number;
  y: number;
  angle: number;
}

/** Specify a modification to a numeric value: (v' = set) or (v' = (v * multiply + add) ^ pow) */
export interface NumberModifier {
  /** Set to a specific value */
  set?: number;

  /** Multiply a scaler to */
  multiply?: number;
  /** Add the amount to */
  add?: number;
  /** Apply a pow function to */
  pow?: number;
}

export interface ColorFilter {
  saturation?: NumberModifier;
  lightness?: NumberModifier;
}

export interface Style {
  strokeColor?: Color;
  strokeOpacity?: number;
  strokeWidth?: number;
  strokeLinejoin?: "round" | "miter" | "bevel";
  strokeLinecap?: "round" | "butt" | "square";

  colorFilter?: ColorFilter;

  fillColor?: Color;
  fillOpacity?: number;

  /** The opacity of this element */
  opacity?: number;

  /** Text anchor position */
  textAnchor?: "start" | "middle" | "end";
}

export interface Selectable {
  plotSegment: Specification.PlotSegment;
  glyphIndex: number;
  rowIndices: number[];
}

export interface Element {
  type: string;
  style?: Style;
  selectable?: Selectable;
}

export interface ChartContainerElement {
  type: "chart-container";
  chart: Specification.Chart;
  selectable: Selectable;
  dataset: Dataset.Dataset;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Rect extends Element {
  type: "rect";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Line extends Element {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Polygon extends Element {
  type: "polygon";
  points: Point[];
}

export interface Path extends Element {
  type: "path";
  cmds: Array<{ cmd: string; args: number[] }>;
}

export interface Circle extends Element {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export interface Ellipse extends Element {
  type: "ellipse";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Text extends Element {
  type: "text";
  cx: number;
  cy: number;
  text: string;
  fontFamily: string;
  fontSize: number;
}

export interface TextOnPath extends Element {
  type: "text-on-path";
  pathCmds: Path["cmds"];
  align: "start" | "middle" | "end";
  text: string;
  fontFamily: string;
  fontSize: number;
}

export interface Image extends Element {
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Size mode, default to letterbox */
  mode?: "letterbox" | "stretch";
}

export interface Group extends Element {
  type: "group";
  key?: string;
  transform: RigidTransform;
  elements: Element[];
}

export function makeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style?: Style
): Rect {
  return { type: "rect", x1, x2, y1, y2, style };
}

export function makeCircle(
  cx: number,
  cy: number,
  r: number,
  style?: Style
): Circle {
  return { type: "circle", cx, cy, r, style };
}

export function makeEllipse(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style?: Style
): Ellipse {
  return { type: "ellipse", x1, x2, y1, y2, style };
}

export function makeGroup(elements: Element[]): Group {
  return { type: "group", elements, transform: { x: 0, y: 0, angle: 0 } };
}

export function makeLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style?: Style
): Line {
  return { type: "line", x1, x2, y1, y2, style };
}

export function makePolygon(points: Point[], style?: Style): Polygon {
  return { type: "polygon", points, style };
}

export function makeText(
  cx: number,
  cy: number,
  text: string,
  fontFamily: string,
  fontSize: number,
  style?: Style
): Text {
  return { type: "text", cx, cy, text, fontFamily, fontSize, style };
}

export class PathMaker {
  public path: Path = { type: "path", cmds: [] };

  public currentX: number;
  public currentY: number;

  public moveTo(x: number, y: number) {
    this.path.cmds.push({ cmd: "M", args: [x, y] });
  }
  public lineTo(x: number, y: number) {
    this.path.cmds.push({ cmd: "L", args: [x, y] });
  }
  public cubicBezierCurveTo(
    c1x: number,
    c1y: number,
    c2x: number,
    c2y: number,
    x: number,
    y: number
  ) {
    this.path.cmds.push({ cmd: "C", args: [c1x, c1y, c2x, c2y, x, y] });
  }
  public quadraticBezierCurveTo(cx: number, cy: number, x: number, y: number) {
    this.path.cmds.push({ cmd: "Q", args: [cx, cy, x, y] });
  }
  public arcTo(
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: number,
    sweepFlag: number,
    x: number,
    y: number
  ) {
    this.path.cmds.push({
      cmd: "A",
      args: [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y]
    });
  }

  /** Compose a Archimedean spiral with r = a + b theta, theta from thetaMin to thetaMax */
  public archimedeanSpiral(
    cx: number,
    cy: number,
    a: number,
    b: number,
    thetaMin: number,
    thetaMax: number,
    moveTo: boolean = false
  ) {
    const ticks = Math.ceil(Math.abs(thetaMax - thetaMin) / (Math.PI / 6)) + 1;
    for (let i = 0; i < ticks; i++) {
      const theta1 = (i / ticks) * (thetaMax - thetaMin) + thetaMin;
      const r1 = a + b * theta1;
      const x1 = r1 * Math.cos(theta1);
      const y1 = r1 * Math.sin(theta1);
      const theta2 = ((i + 1) / ticks) * (thetaMax - thetaMin) + thetaMin;
      const r2 = a + b * theta2;
      const x2 = r2 * Math.cos(theta2);
      const y2 = r2 * Math.sin(theta2);
      const scaler = (theta2 - theta1) / 3;
      if (moveTo && i == 0) {
        this.moveTo(cx + x1, cy + y1);
      }
      const dx1 = (b * Math.cos(theta1) - y1) * scaler;
      const dy1 = (b * Math.sin(theta1) + x1) * scaler;
      const dx2 = (b * Math.cos(theta2) - y2) * scaler;
      const dy2 = (b * Math.sin(theta2) + x2) * scaler;
      this.cubicBezierCurveTo(
        cx + x1 + dx1,
        cy + y1 + dy1,
        cx + x2 - dx2,
        cy + y2 - dy2,
        cx + x2,
        cy + y2
      );
    }
  }

  // public archimedeanSpiralReference(cx: number, cy: number, a: number, b: number, thetaMin: number, thetaMax: number) {
  //     let ticks = 3000;
  //     for (let i = 0; i < ticks; i++) {
  //         let theta2 = ((i + 1) / ticks) * (thetaMax - thetaMin) + thetaMin;
  //         let r2 = a + b * theta2;
  //         let x2 = r2 * Math.cos(theta2);
  //         let y2 = r2 * Math.sin(theta2);
  //         if (i == 0) {
  //             let theta1 = (i / ticks) * (thetaMax - thetaMin) + thetaMin;
  //             let r1 = a + b * theta1;
  //             let x1 = r1 * Math.cos(theta1);
  //             let y1 = r1 * Math.sin(theta1);
  //             this.moveTo(cx + x1, cy + y1);
  //         }
  //         this.lineTo(cx + x2, cy + y2);
  //     }
  // }

  public polarLineTo(
    cx: number,
    cy: number,
    angle1: number,
    r1: number,
    angle2: number,
    r2: number,
    moveTo: boolean = false
  ) {
    const deg2rad = Math.PI / 180;
    if (moveTo) {
      const p1x = cx + Math.cos(angle1 * deg2rad) * r1;
      const p1y = cy + Math.sin(angle1 * deg2rad) * r1;
      this.moveTo(p1x, p1y);
    }
    if (Math.abs(angle2 - angle1) < 1e-6) {
      const p2x = cx + Math.cos(angle2 * deg2rad) * r2;
      const p2y = cy + Math.sin(angle2 * deg2rad) * r2;
      this.lineTo(p2x, p2y);
    } else {
      if (Math.abs(r1 - r2) < 1e-6) {
        if (angle2 > angle1) {
          let a1 = angle1;
          while (angle2 > a1) {
            let a2 = angle2;
            if (a2 > a1 + 180) {
              a2 = a1 + 180;
            }
            const p2x = cx + Math.cos(a2 * deg2rad) * r1;
            const p2y = cy + Math.sin(a2 * deg2rad) * r1;
            this.arcTo(r1, r1, 0, 0, 0, p2x, p2y);
            a1 = a2;
          }
        } else if (angle2 < angle1) {
          let a1 = angle1;
          while (angle2 < a1) {
            let a2 = angle2;
            if (a2 < a1 - 180) {
              a2 = a1 - 180;
            }
            const p2x = cx + Math.cos(a2 * deg2rad) * r1;
            const p2y = cy + Math.sin(a2 * deg2rad) * r1;
            this.arcTo(r1, r1, 0, 0, 1, p2x, p2y);
            a1 = a2;
          }
        }
      } else {
        const b = (r2 - r1) / (angle2 - angle1);
        const a = r1 - b * angle1;
        this.archimedeanSpiral(
          cx,
          cy,
          a,
          b / deg2rad,
          angle1 * deg2rad,
          angle2 * deg2rad
        );
      }
    }
  }

  public closePath() {
    this.path.cmds.push({ cmd: "Z", args: [] });
  }
}

export function makePath(style?: Style) {
  const maker = new PathMaker();
  maker.path.style = style;
  return maker;
}

export function translation(x: number = 0, y: number = 0): RigidTransform {
  return { x, y, angle: 0 };
}

export function rotation(angle: number): RigidTransform {
  return { x: 0, y: 0, angle };
}

/** Concat two transforms, f(p) := a(b(p))  */
export function concatTransform(a: RigidTransform, b: RigidTransform) {
  const theta = (a.angle / 180) * Math.PI;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: a.x + b.x * cos - b.y * sin,
    y: a.y + b.x * sin + b.y * cos,
    angle: a.angle + b.angle
  };
}

export function transform(transform: RigidTransform, a: Point): Point {
  const theta = (transform.angle / 180) * Math.PI;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: a.x * cos - a.y * sin + transform.x,
    y: a.x * sin + a.y * cos + transform.y
  };
}

export function transformDirection(transform: RigidTransform, a: Point): Point {
  const theta = (transform.angle / 180) * Math.PI;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: a.x * cos - a.y * sin,
    y: a.x * sin + a.y * cos
  };
}

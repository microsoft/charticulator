// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Point } from "../common";

/**
 * Compute numerical integral y' = f(t, y), y(t0) = y0,
 *  start from t0, step size h, with specified number of steps,
 *  with Runge-Kutta Method order 4
 */
export function RK4(
  f: (t: number, y: number) => number,
  y0: number,
  t0: number,
  h: number,
  steps: number,
  result: number[] = new Array<number>(steps)
): number[] {
  if (steps == 0) {
    return result;
  }

  result[0] = y0;
  let yp = y0;
  let tp = t0;

  for (let i = 1; i < steps; i++) {
    const k1 = f(tp, yp);
    const k2 = f(tp + h / 2, yp + (h * k1) / 2);
    const k3 = f(tp + h / 2, yp + (h * k2) / 2);
    const k4 = f(tp + h, yp + h * k3);
    const yi = yp + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    const ti = tp + h;
    result[i] = yi;
    yp = yi;
    tp = ti;
  }

  return result;
}

export function linearApproximation(
  points: ArrayLike<number>,
  t: number
): number {
  let i1: number, i2: number, k: number;
  const w = t * (points.length - 1);
  i1 = Math.floor(w);
  i2 = i1 + 1;
  k = w - i1;
  if (i1 < 0) {
    i1 = 0;
    i2 = 0;
  }
  if (i1 >= points.length - 1) {
    i1 = points.length - 1;
    i2 = points.length - 1;
  }
  return points[i1] * (1 - k) + points[i2] * k;
}

export function findSegment(bounds: number[], k: number): [number, number] {
  // Linear search
  for (let i = 0; i < bounds.length - 1; i++) {
    const b1 = bounds[i];
    const b2 = bounds[i + 1];
    if (k >= b1 && k <= b2) {
      return [i, k - b1];
    }
  }
  if (k < bounds[0]) {
    return [0, 0];
  } else {
    return [
      bounds.length - 2,
      bounds[bounds.length - 1] - bounds[bounds.length - 2],
    ];
  }
}

export function linearInvert(
  points: ArrayLike<number>,
  result: number[] = new Array<number>(points.length)
): number[] {
  const s0 = points[0];
  const s1 = points[points.length - 1];
  let ptr = 0;
  for (let i = 0; i < points.length; i++) {
    const si = s0 + ((s1 - s0) * i) / (points.length - 1);
    while (ptr + 2 < points.length && si >= points[ptr + 1]) {
      ptr += 1;
    }
    const sA = points[ptr];
    const tA = ptr / (points.length - 1);
    const sB = points[ptr + 1];
    const tB = (ptr + 1) / (points.length - 1);
    const ti = ((si - sA) / (sB - sA)) * (tB - tA) + tA;
    result[i] = ti;
  }
  return result;
}

export abstract class CurveParameterization {
  public abstract getPointAtT(t: number): Point;
  public abstract getTangentAtT(t: number): Point;
  public abstract getSFromT(t: number): number;
  public abstract getTFromS(s: number): number;
  public abstract getLength(): number;

  public getNormalAtT(t: number) {
    const tangent = this.getTangentAtT(t);
    return {
      x: -tangent.y,
      y: tangent.x,
    };
  }
}

/** Parametrize a given bezier curve */
export class BezierCurveParameterization extends CurveParameterization {
  private k3x: number;
  private k2x: number;
  private k1x: number;
  private k0x: number;
  private k3y: number;
  private k2y: number;
  private k1y: number;
  private k0y: number;

  private tToS: number[];
  private sToT: number[];
  private len: number;

  /** Construct the cubic bezier curve with four control points */
  constructor(p1: Point, p2: Point, p3: Point, p4: Point) {
    super();
    this.k3x = 3 * (p2.x - p3.x) + p4.x - p1.x;
    this.k2x = 3 * (p1.x + p3.x - 2 * p2.x);
    this.k1x = 3 * (p2.x - p1.x);
    this.k0x = p1.x;
    this.k3y = 3 * (p2.y - p3.y) + p4.y - p1.y;
    this.k2y = 3 * (p1.y + p3.y - 2 * p2.y);
    this.k1y = 3 * (p2.y - p1.y);
    this.k0y = p1.y;

    // Len = 8.080527392389182  10000
    //       8.080527036296594  100
    //       8.084824756247663  10
    const steps = 100;
    this.tToS = RK4((t, y) => this.getDsDtAtT(t), 0, 0, 1 / (steps - 1), steps);
    this.len = this.tToS[steps - 1];
    this.sToT = linearInvert(this.tToS);
  }

  public getPointAtT(t: number) {
    return {
      x: this.k0x + t * (this.k1x + t * (this.k2x + t * this.k3x)),
      y: this.k0y + t * (this.k1y + t * (this.k2y + t * this.k3y)),
    };
  }

  /** Get the tangent direction at t */
  public getTangentAtT(t: number) {
    const t2 = t * t;
    const dxdt = 3 * t2 * this.k3x + 2 * t * this.k2x + this.k1x;
    const dydt = 3 * t2 * this.k3y + 2 * t * this.k2y + this.k1y;
    const length = Math.sqrt(dxdt * dxdt + dydt * dydt);
    return {
      x: dxdt / length,
      y: dydt / length,
    };
  }

  /** Get ds/dt at t */
  public getDsDtAtT(t: number) {
    const t2 = t * t;
    const dxdt = 3 * t2 * this.k3x + 2 * t * this.k2x + this.k1x;
    const dydt = 3 * t2 * this.k3y + 2 * t * this.k2y + this.k1y;
    return Math.sqrt(dxdt * dxdt + dydt * dydt);
  }

  public getSFromT(t: number) {
    return linearApproximation(this.tToS, t);
  }

  public getTFromS(s: number) {
    return linearApproximation(this.sToT, s / this.len);
  }

  public getLength() {
    return this.len;
  }
}

export class LineSegmentParametrization extends CurveParameterization {
  public p1: Point;
  public p2: Point;
  public length: number;
  public tangent: Point;

  constructor(p1: Point, p2: Point) {
    super();
    this.p1 = p1;
    this.p2 = p2;
    this.length = Math.sqrt(
      (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
    );
    this.tangent = {
      x: (p2.x - p1.x) / this.length,
      y: (p2.y - p1.y) / this.length,
    };
  }

  public getTangentAtT(t: number) {
    return this.tangent;
  }

  public getPointAtT(t: number) {
    return {
      x: this.p1.x + (this.p2.x - this.p1.x) * t,
      y: this.p1.y + (this.p2.y - this.p1.y) * t,
    };
  }

  public getSFromT(t: number) {
    return t * this.length;
  }

  public getTFromS(s: number) {
    return s / this.length;
  }

  public getLength() {
    return this.length;
  }
}

export class MultiCurveParametrization {
  private segments: CurveParameterization[];
  private len: number;
  private sBounds: number[];

  constructor(segments: CurveParameterization[]) {
    this.segments = segments;
    this.len = 0;
    this.sBounds = new Array<number>(this.segments.length + 1);
    this.sBounds[0] = 0;
    for (let i = 0; i < this.segments.length; i++) {
      this.len += this.segments[i].getLength();
      this.sBounds[i + 1] = this.len;
    }
  }

  private getSegmentAtS(s: number): [CurveParameterization, number] {
    const [pi, ps] = findSegment(this.sBounds, s);
    const p = this.segments[pi];
    const pt = p.getTFromS(ps);
    return [p, pt];
  }

  public getPointAtS(s: number): Point {
    const [p, t] = this.getSegmentAtS(s);
    return p.getPointAtT(t);
  }

  public getTangentAtS(s: number): Point {
    const [p, t] = this.getSegmentAtS(s);
    return p.getTangentAtT(t);
  }

  public getNormalAtS(s: number): Point {
    const [p, k] = this.getSegmentAtS(s);
    return p.getNormalAtT(k);
  }

  public getFrameAtS(s: number): { p: Point; t: Point; n: Point } {
    const [p, t] = this.getSegmentAtS(s);
    return {
      p: p.getPointAtT(t),
      t: p.getTangentAtT(t),
      n: p.getNormalAtT(t),
    };
  }

  public getLength(): number {
    return this.len;
  }

  public getSegments(): CurveParameterization[] {
    return this.segments;
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/** 2D point */
/* eslint-disable @typescript-eslint/no-namespace */

export interface Point {
  x: number;
  y: number;
}

/** 2D vector */
export type Vector = Point;

/** 2D line with two points */
export interface Line {
  p1: Point;
  p2: Point;
}

/** Rectangle */
export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Zooming information */
export interface ZoomInfo {
  /** The pixel location of the origin of the canvas, unit: px */
  centerX: number;
  centerY: number;
  /** The scale factor between pixel and canvas unit, unit: px / canvas unit */
  scale: number;
}

/** General geometry functions */
export namespace Geometry {
  /** Return the length of a vector */
  export function vectorLength(p: Vector): number {
    return Math.sqrt(p.x * p.x + p.y * p.y);
  }

  /** Return the distance between two points */
  export function pointDistance(p1: Point, p2: Point): number {
    return Math.sqrt(
      (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)
    );
  }

  /** Return the normalized version of a vector */
  export function vectorNormalize(p: Vector): Vector {
    const len = Math.sqrt(p.x * p.x + p.y * p.y);
    return { x: p.x / len, y: p.y / len };
  }

  /** Rotate a vector 90 degrees (counter-clock-wise, but clock-wise in screen coordinates) */
  export function vectorRotate90(p: Vector): Vector {
    return { y: p.x, x: -p.y };
  }

  /** Rotate a vector by a angle in radians (counter-clock-wise, but clock-wise in screen coordinates) */
  export function vectorRotate(p: Vector, radians: number): Vector {
    return {
      x: p.x * Math.cos(radians) + p.y * Math.sin(radians),
      y: -p.x * Math.sin(radians) + p.y * Math.cos(radians),
    };
  }

  /** Add two vectors */
  export function vectorAdd(p1: Vector, p2: Vector): Vector {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
  }

  /** Subtract two vectors */
  export function vectorSub(p1: Vector, p2: Vector): Vector {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
  }

  /** Multiply two vectors element-wise */
  export function vectorMul(p1: Vector, p2: Vector): Vector {
    return { x: p1.x * p2.x, y: p1.y * p2.y };
  }

  /** Divide two vectors element-wise */
  export function vectorDiv(p1: Vector, p2: Vector): Vector {
    return { x: p1.x / p2.x, y: p1.y / p2.y };
  }

  /** Scale a vector by a constant factor */
  export function vectorScale(p: Point, s: number) {
    return { x: p.x * s, y: p.y * s };
  }

  /** Compute the inner product between two vectors */
  export function vectorDot(p1: Vector, p2: Vector): number {
    return p1.x * p2.x + p1.y * p2.y;
  }

  /** Compute the cross product between two vectors */
  export function vectorCross(p1: Vector, p2: Vector): number {
    return p1.x * p2.y - p2.x * p1.y;
  }

  /** Determine if two intervals overlap */
  export function intervalOverlap(
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number
  ) {
    return !(xMax < yMin || yMax < xMin);
  }

  /** Determine if two rects overlap */
  export function rectOverlap(a1: Rect, a2: Rect) {
    return (
      intervalOverlap(
        Math.min(a1.x1, a1.x2),
        Math.max(a1.x1, a1.x2),
        Math.min(a2.x1, a2.x2),
        Math.max(a2.x1, a2.x2)
      ) &&
      intervalOverlap(
        Math.min(a1.y1, a1.y2),
        Math.max(a1.y1, a1.y2),
        Math.min(a2.y1, a2.y2),
        Math.max(a2.y1, a2.y2)
      )
    );
  }

  /** Apply zoom to a point (point to pixel) */
  export function applyZoom(zoom: ZoomInfo, pt: Point): Point {
    return {
      x: pt.x * zoom.scale + zoom.centerX,
      y: pt.y * zoom.scale + zoom.centerY,
    };
  }

  /** Unapply zoom to a point (pixel to point) */
  export function unapplyZoom(zoom: ZoomInfo, pt: Point): Point {
    return {
      x: (pt.x - zoom.centerX) / zoom.scale,
      y: (pt.y - zoom.centerY) / zoom.scale,
    };
  }

  export function degreesToRadians(degrees: number) {
    return (degrees / 180) * Math.PI;
  }
}

export function prettyNumber(x: number, digits: number = 8) {
  return x
    ?.toFixed(digits)
    .replace(/^([+-]?[0-9]*(\.[0-9]*[1-9]+)?)\.?0+$/, "$1");
}

export function getRandomNumber() {
  // crypto.getRandomValues(new Uint32Array(1))[0];
  // eslint-disable-next-line
  return +("" + Math.random()).slice(2);
}

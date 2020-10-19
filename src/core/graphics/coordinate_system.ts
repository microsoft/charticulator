// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * @packageDocumentation
 * @preferred
 */

import {
  Element,
  makeLine,
  makePath,
  makeRect,
  MultiCurveParametrization,
  PathMaker
} from ".";
import { Geometry, Point } from "../common";
import { RigidTransform, Style, makeEllipse } from "./elements";

export abstract class CoordinateSystem {
  /** Get the transform of the whole coordinate system (in the final Cartesian system) */
  public abstract getBaseTransform(): RigidTransform;

  /** Transform the point (x, y) to Cartesian system */
  public abstract transformPoint(x: number, y: number): Point;
  public abstract transformDirectionAtPoint(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): Point;

  /** Get the local affine transform at point (x, y) */
  public abstract getLocalTransform(x: number, y: number): RigidTransform;

  public abstract transformPointWithBase(x: number, y: number): Point;
  public abstract transformDirectionAtPointWithBase(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): Point;
}

/** Normal cartesian coordinate system */
export class CartesianCoordinates extends CoordinateSystem {
  constructor(public origin: Point = { x: 0, y: 0 }) {
    super();
  }
  public getBaseTransform(): RigidTransform {
    return {
      x: this.origin.x,
      y: this.origin.y,
      angle: 0
    };
  }
  public transformPoint(x: number, y: number): Point {
    return { x, y };
  }

  public transformDirectionAtPoint(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): Point {
    return { x: dx, y: dy };
  }

  public transformPointWithBase(x: number, y: number): Point {
    return { x: x + this.origin.x, y: y + this.origin.y };
  }

  public transformDirectionAtPointWithBase(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): Point {
    return { x: dx, y: dy };
  }

  public getLocalTransform(x: number, y: number): RigidTransform {
    return {
      x,
      y,
      angle: 0
    };
  }
}

const sqrt60 = Math.sqrt(60);

/** Polar coordinates. Angle is in degrees, clockwise, top is 0  */
export class PolarCoordinates extends CoordinateSystem {
  constructor(
    public origin: Point = { x: 0, y: 0 },
    public radial1: number = 0,
    public radial2: number = 1,
    public distortY: boolean = false
  ) {
    super();
  }

  public getBaseTransform(): RigidTransform {
    return {
      x: this.origin.x,
      y: this.origin.y,
      angle: 0
    };
  }

  public transformRadial(radial: number) {
    if (this.distortY) {
      return Math.sqrt(
        Math.max(
          0,
          (this.radial1 + this.radial2) * radial - this.radial1 * this.radial2
        )
      );
    } else {
      return radial;
    }
  }

  public inverseTransformRadial(distance: number) {
    const y = distance / sqrt60;
    return y * y;
  }

  public transformPoint(angle: number, radial: number): Point {
    return {
      x: this.transformRadial(radial) * Math.sin(angle * (Math.PI / 180)),
      y: this.transformRadial(radial) * Math.cos(angle * (Math.PI / 180))
    };
  }

  public transformDirectionAtPoint(
    angle: number,
    radial: number,
    dx: number,
    dy: number
  ): Point {
    const t = -angle * (Math.PI / 180);
    return {
      x: dx * Math.cos(t) - dy * Math.sin(t),
      y: dx * Math.sin(t) + dy * Math.cos(t)
    };
  }

  public getLocalTransform(angle: number, radial: number): RigidTransform {
    const t = angle * (Math.PI / 180);
    return {
      x: this.transformRadial(radial) * Math.sin(t),
      y: this.transformRadial(radial) * Math.cos(t),
      angle: -angle
    };
  }

  public transformPointWithBase(angle: number, radial: number): Point {
    const t = angle * (Math.PI / 180);
    return {
      x: this.transformRadial(radial) * Math.sin(t) + this.origin.x,
      y: this.transformRadial(radial) * Math.cos(t) + this.origin.y
    };
  }

  public transformDirectionAtPointWithBase(
    angle: number,
    radial: number,
    dx: number,
    dy: number
  ): Point {
    const t = -angle * (Math.PI / 180);
    return {
      x: dx * Math.cos(t) - dy * Math.sin(t),
      y: dx * Math.sin(t) + dy * Math.cos(t)
    };
  }
}

/** Bezier curve coordinate system. */
export class BezierCurveCoordinates extends CoordinateSystem {
  private curve: MultiCurveParametrization;

  constructor(
    public origin: Point = { x: 0, y: 0 },
    curve: MultiCurveParametrization
  ) {
    super();
    this.curve = curve;
  }

  public getBaseTransform(): RigidTransform {
    return {
      x: this.origin.x,
      y: this.origin.y,
      angle: 0
    };
  }

  public transformPoint(x: number, y: number): Point {
    const frame = this.curve.getFrameAtS(x);
    return {
      x: frame.p.x + y * frame.n.x,
      y: frame.p.y + y * frame.n.y
    };
  }

  public transformDirectionAtPoint(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): Point {
    const frame = this.curve.getFrameAtS(x);
    return {
      x: dx * frame.t.x + dy * frame.n.x,
      y: dx * frame.t.y + dy * frame.n.y
    };
  }

  public getLocalTransform(x: number, y: number): RigidTransform {
    const frame = this.curve.getFrameAtS(x);
    const angle = (Math.atan2(frame.t.y, frame.t.x) / Math.PI) * 180;
    return {
      x: frame.p.x + y * frame.n.x,
      y: frame.p.y + y * frame.n.y,
      angle
    };
  }

  public transformPointWithBase(x: number, y: number): Point {
    const p = this.transformPoint(x, y);
    return {
      x: p.x + this.origin.x,
      y: p.y + this.origin.y
    };
  }

  public transformDirectionAtPointWithBase(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): Point {
    return this.transformDirectionAtPoint(x, y, dx, dy);
  }

  public getLength() {
    return this.curve.getLength();
  }

  public getCurve() {
    return this.curve;
  }
}

export class CoordinateSystemHelper {
  constructor(public coordinateSystem: CoordinateSystem) {}

  public rect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style: Style = {}
  ): Element {
    const cs = this.coordinateSystem;
    if (cs instanceof CartesianCoordinates) {
      return makeRect(x1, y1, x2, y2, style);
    } else {
      const path = makePath(style);
      this.lineTo(path, x1, y1, x1, y2, true);
      this.lineTo(path, x1, y2, x2, y2, false);
      this.lineTo(path, x2, y2, x2, y1, false);
      this.lineTo(path, x2, y1, x1, y1, false);
      path.closePath();
      return path.path;
    }
  }

  public ellipse(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style: Style = {}
  ): Element {
    const cs = this.coordinateSystem;
    if (cs instanceof CartesianCoordinates) {
      return makeEllipse(x1, y1, x2, y2, style);
    } else {
      const path = makePath(style);
      const cx = (x1 + x2) / 2,
        cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2,
        ry = Math.abs(y2 - y1) / 2;
      const N = 32;
      for (let i = 0; i < N; i++) {
        const theta1 = (i / N) * (Math.PI * 2);
        const theta2 = ((i + 1) / N) * (Math.PI * 2);
        this.lineTo(
          path,
          cx + rx * Math.cos(theta1),
          cy + ry * Math.sin(theta1),
          cx + rx * Math.cos(theta2),
          cy + ry * Math.sin(theta2),
          i == 0
        );
      }
      path.closePath();
      return path.path;
    }
  }

  public line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style: Style = {}
  ): Element {
    const cs = this.coordinateSystem;
    if (cs instanceof CartesianCoordinates) {
      return makeLine(x1, y1, x2, y2, style);
    } else {
      const path = makePath(style);
      this.lineTo(path, x1, y1, x2, y2, true);
      return path.path;
    }
  }

  public lineTo(
    path: PathMaker,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    newPath: boolean
  ) {
    const cs = this.coordinateSystem;
    if (newPath) {
      const p = cs.transformPoint(x1, y1);
      path.moveTo(p.x, p.y);
    }
    if (cs instanceof CartesianCoordinates) {
      path.lineTo(x2, y2);
    }
    if (cs instanceof PolarCoordinates) {
      path.polarLineTo(
        0,
        0,
        90 - x1,
        cs.transformRadial(y1),
        90 - x2,
        cs.transformRadial(y2),
        false
      );
    }
    if (cs instanceof BezierCurveCoordinates) {
      if (Math.abs(x1 - x2) < 1e-6) {
        const p = cs.transformPoint(x2, y2);
        path.lineTo(p.x, p.y);
      } else {
        let framePrevious = cs.getLocalTransform(x1, y1);
        const direction = Math.atan2(y2 - y1, x2 - x1);
        const segments = Math.max(
          2,
          Math.ceil(
            (3 * cs.getCurve().getSegments().length * Math.abs(x2 - x1)) /
              cs.getCurve().getLength()
          )
        );
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const frame = cs.getLocalTransform(
            (x2 - x1) * t + x1,
            (y2 - y1) * t + y1
          );

          const len = Geometry.pointDistance(frame, framePrevious) / 3;
          const angle1 = (framePrevious.angle / 180) * Math.PI + direction;
          const angle2 = (frame.angle / 180) * Math.PI + direction;

          path.cubicBezierCurveTo(
            framePrevious.x + Math.cos(angle1) * len,
            framePrevious.y + Math.sin(angle1) * len,
            frame.x - Math.cos(angle2) * len,
            frame.y - Math.sin(angle2) * len,
            frame.x,
            frame.y
          );
          // path.lineTo(frame.x, frame.y);

          framePrevious = frame;
        }
      }
    }
  }
}

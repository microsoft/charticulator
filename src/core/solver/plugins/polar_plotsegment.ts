// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ConstraintPlugin } from "../abstract";
import {
  PolarAttributes,
  PolarProperties,
} from "../../prototypes/plot_segments/region_2d/polar";
import { Geometry } from "../../common";
import { Constraint } from "../../specification";
import { ChartStateManager } from "../../prototypes";
import { snapToAttribute } from "../../prototypes/update_attribute";

export class PolarPlotSegmentPlugin extends ConstraintPlugin {
  constructor(
    private attrs: PolarAttributes,
    private chartConstraints: Constraint[],
    private objectID: string,
    private manager: ChartStateManager,
    private properties: PolarProperties
  ) {
    super();
  }

  // eslint-disable-next-line max-lines-per-function
  public static getCenterByAngle(
    isAutoMargin: boolean,
    attrs: PolarAttributes
  ) {
    const { angle1, angle2, x1, y1, x2, y2 } = attrs;
    let cx;
    let cy;
    let radialRatio = 1;
    if (isAutoMargin) {
      //pos case

      const angleDelta = Math.abs(angle1 - angle2);
      const startAngle = angle1 % 360;

      if (startAngle >= 0 && startAngle < 90) {
        //startAngle - 1 quadrant
        if (angleDelta <= 90 - startAngle) {
          //endAngle - 1 quadrant => move left bottom corner
          cx = x1;
          cy = y1;
          radialRatio = 2;
        } else if (angleDelta <= 180 - startAngle) {
          //endAngle - 4 quadrant => move left
          cx = x1;
          cy = (y2 + y1) / 2;
        } else if (angleDelta + startAngle > 180) {
          //endAngle - 3 and 4 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      } else if (startAngle >= 90 && startAngle < 180) {
        //startAngle - 4 quadrant
        if (angleDelta <= 180 - startAngle) {
          //endAngle - 4 quadrant => move left top corner
          cx = x1;
          cy = y2;
          radialRatio = 2;
        } else if (angleDelta <= 270 - startAngle) {
          //endAngle - 3 quadrant => move top
          cx = (x2 + x1) / 2;
          cy = y2;
        } else if (angleDelta + startAngle > 270) {
          //endAngle - 2 and 1 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      } else if (startAngle >= 180 && startAngle < 270) {
        //startAngle - 3 quadrant
        if (angleDelta <= 270 - startAngle) {
          //endAngle - 3 quadrant => move right top corner
          cx = x2;
          cy = y2;
          radialRatio = 2;
        } else if (angleDelta <= 360 - startAngle) {
          //endAngle - 1 quadrant => move right
          cx = x2;
          cy = (y2 + y1) / 2;
        } else if (angleDelta + startAngle > 360) {
          //endAngle - 2 and 1 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      } else if (startAngle >= 270 && startAngle < 360) {
        //startAngle - 2 quadrant
        if (angleDelta <= 360 - startAngle) {
          //endAngle - 2 quadrant => move right bottom corner
          cx = x2;
          cy = y1;
          radialRatio = 2;
        } else if (angleDelta <= 450 - startAngle) {
          //endAngle - 1 quadrant => move bottom
          cx = (x2 + x1) / 2;
          cy = y1;
        } else if (angleDelta + startAngle > 450) {
          //endAngle - 2 and 1 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      }

      //neg case
      if (startAngle < 0 && startAngle >= -90) {
        //startAngle - 3 quadrant
        if (angleDelta <= 90 - (90 + startAngle)) {
          //endAngle - 3 quadrant => move right bottom corner
          cx = x2;
          cy = y1;
          radialRatio = 2;
        } else if (angleDelta <= 180 - (90 + startAngle)) {
          //endAngle - 1 quadrant => move bottom
          cx = (x1 + x2) / 2;
          cy = y1;
        } else if (angleDelta - startAngle >= 180) {
          //endAngle - 2 and 3 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      } else if (startAngle <= -90 && startAngle >= -180) {
        //startAngle - 3 quadrant
        if (angleDelta <= 90 - (180 + startAngle)) {
          //endAngle - 3 quadrant => move right
          cx = x2;
          cy = y2;
          radialRatio = 2;
        } else if (angleDelta <= 180 - (180 + startAngle)) {
          //endAngle - 2 quadrant => move top
          cx = x2;
          cy = (y2 + y1) / 2;
        } else if (angleDelta - startAngle >= -270) {
          //endAngle - 1 and 4 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      } else if (startAngle <= -180 && startAngle >= -270) {
        //startAngle - 4 quadrant
        if (angleDelta <= 90 - (270 + startAngle)) {
          //endAngle - 4 quadrant => move left top corner
          cx = x1;
          cy = y2;
          radialRatio = 2;
        } else if (angleDelta <= 180 - (270 + startAngle)) {
          //endAngle - 3 quadrant => move top
          cx = (x2 + x1) / 2;
          cy = y2;
        } else if (angleDelta - startAngle >= -360) {
          //endAngle - 2 and 1 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      } else if (startAngle <= -270 && startAngle > -360) {
        //startAngle - 1 quadrant
        if (angleDelta <= 90 - (360 + startAngle)) {
          //endAngle - 1 quadrant => move left bottom corner
          cx = x1;
          cy = y1;
          radialRatio = 2;
        } else if (angleDelta <= 180 - (360 + startAngle)) {
          //endAngle - 4 quadrant => move right
          cx = x1;
          cy = (y2 + y1) / 2;
        } else if (angleDelta - startAngle >= -450) {
          //endAngle - 2 and 3 quadrants
          cx = (x2 + x1) / 2;
          cy = (y2 + y1) / 2;
        }
      }
    } else {
      cx = (x2 + x1) / 2;
      cy = (y2 + y1) / 2;
    }
    return { cx, cy, ratio: radialRatio };
  }

  public apply(): boolean {
    const { attrs } = this;
    const { angle1, angle2, radial1, radial2, x1, x2, y1, y2 } = attrs;

    attrs.cx = (x2 + x1) / 2;
    attrs.cy = (y2 + y1) / 2;

    const { cx, cy } = attrs;

    const toPoint = (radius: number, angle: number) => {
      const radians = Geometry.degreesToRadians(angle);
      return {
        x: cx + Math.sin(radians) * radius,
        y: cy + Math.cos(radians) * radius,
      };
    };

    const a1r1 = toPoint(radial1, angle1);
    attrs.a1r1x = a1r1.x;
    attrs.a1r1y = a1r1.y;

    const a1r2 = toPoint(radial2, angle1);
    attrs.a1r2x = a1r2.x;
    attrs.a1r2y = a1r2.y;

    const a2r1 = toPoint(radial1, angle2);
    attrs.a2r1x = a2r1.x;
    attrs.a2r1y = a2r1.y;

    const a2r2 = toPoint(radial2, angle2);
    attrs.a2r2x = a2r2.x;
    attrs.a2r2y = a2r2.y;

    // take snapped attributes and apply new value
    [
      "a1r1x",
      "a1r1y",
      "a1r2x",
      "a1r2y",
      "a2r1x",
      "a2r1y",
      "a2r2x",
      "a2r2y",
    ].forEach((attrName) => {
      snapToAttribute(
        this.manager,
        this.chartConstraints,
        this.objectID,
        attrName,
        attrs[attrName]
      );
    });

    return true;
  }
}

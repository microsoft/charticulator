// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { PolarAttributes, PolarProperties } from "./polar";

export enum SIDE {
  HORIZONTAL,
  VERTICAL,
  NONE,
}

interface CenterType {
  cx: number;
  cy: number;
  side: SIDE;
  isHalf: boolean;
  ratio: number;
  isRightHalf: boolean;
}

// eslint-disable-next-line max-lines-per-function
export function getCenterByAngle(
  properties: PolarProperties,
  attrs: PolarAttributes
): CenterType {
  const isAutoMargin = properties.autoAlignment ?? false;
  const { angle1, angle2, x1, y1, x2, y2 } = attrs;
  let cx;
  let cy;
  let radialRatio = 1;
  let isHalf = false;
  let side = SIDE.NONE;
  let isRightHalf = false;
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
        isHalf = true;
        side = SIDE.VERTICAL;
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
        isHalf = true;
        side = SIDE.VERTICAL;
        isRightHalf = true;
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
        isHalf = true;
        side = SIDE.VERTICAL;
        isRightHalf = true;
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
        isHalf = true;
        side = SIDE.HORIZONTAL;
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
        isHalf = true;
        side = SIDE.HORIZONTAL;
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
        //endAngle - 2 quadrant => move right
        cx = x2;
        cy = (y2 + y1) / 2;
        isHalf = true;
        side = SIDE.VERTICAL;
        isRightHalf = true;
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
        isHalf = true;
        side = SIDE.HORIZONTAL;
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
        //endAngle - 4 quadrant => move left
        cx = x1;
        cy = (y2 + y1) / 2;
        isHalf = true;
        side = SIDE.VERTICAL;
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
  return { cx, cy, ratio: radialRatio, isHalf, side, isRightHalf };
}

export function getHandlesRadius(
  props: PolarProperties,
  attrs: PolarAttributes,
  center: CenterType
): number {
  const { x1, x2, y1, y2 } = attrs;
  let radius;
  const width = Math.abs(attrs.x2 - attrs.x1);
  const height = Math.abs(attrs.y2 - attrs.y1);
  if (props.autoAlignment) {
    if (center.isHalf) {
      if (center.side === SIDE.VERTICAL) {
        radius = Math.min(height / 2, width);
      } else {
        radius = Math.min(height, width / 2);
      }
    } else {
      radius = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
    }
  } else {
    radius = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
  }
  return radius;
}

export function setRadiiByCenter(
  props: PolarProperties,
  attrs: PolarAttributes,
  center: CenterType
) {
  if (attrs.x2 - attrs.x1 < attrs.y2 - attrs.y1) {
    updateAttrsRadius(props, attrs, center, attrs.x1, attrs.x2);
  } else {
    updateAttrsRadius(props, attrs, center, attrs.y1, attrs.y2);
  }
}

function updateAttrsRadius(
  props: PolarProperties,
  attrs: PolarAttributes,
  center: CenterType,
  startPoint: number,
  endPoint: number
) {
  const width = Math.abs(attrs.x2 - attrs.x1);
  const height = Math.abs(attrs.y2 - attrs.y1);
  if (props.autoAlignment && center.isHalf) {
    let minOfWandH;
    if (center.side === SIDE.VERTICAL) {
      minOfWandH = Math.min(height / 2, width);
    } else {
      minOfWandH = Math.min(height, width / 2);
    }
    attrs.radial1 = props.innerRatio * minOfWandH;
    attrs.radial2 = props.outerRatio * minOfWandH;
  } else {
    attrs.radial1 = (props.innerRatio * (endPoint - startPoint)) / 2;
    attrs.radial2 = (props.outerRatio * (endPoint - startPoint)) / 2;
  }
}

export function getRadialAxisDropZoneLineCenter(
  center: CenterType,
  radial1: number,
  radial2: number
) {
  if (center.isHalf && center.isRightHalf) {
    return {
      p1: { x: center.cx - radial1, y: center.cy },
      p2: { x: center.cx - radial2, y: center.cy },
    };
  }
  return {
    p1: { x: center.cx + radial1, y: center.cy },
    p2: { x: center.cx + radial2, y: center.cy },
  };
}

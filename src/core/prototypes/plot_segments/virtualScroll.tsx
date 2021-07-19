/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { renderGraphicalElementSVG } from "../../../app/renderer";
import { Graphics } from "../../../container";

export interface VirtualScrollBarPropertes {
  initialPosition: number;
  onScroll: (position: number) => void;
  x: number;
  y: number;
  width: number;
  height: number;
  handlerBarWidth: number;
  vertical: boolean;
}

export const VirtualScrollBar: React.FC<VirtualScrollBarPropertes> = ({
  handlerBarWidth, // AxisRenderer.SCROLL_BAR_SIZE
  vertical,
  height,
  initialPosition,
  onScroll,
  width,
  x,
  y,
}) => {
  let trackSize = width;

  if (vertical) {
    trackSize = height;
  }

  const mapPositionToCoordinates = (
    handlePosition: number
  ): [number, number] => {
    let handlePositionX = 0;
    let handlePositionY = 0;
    if (handlePosition > 100) {
      handlePosition = 100;
    }

    if (handlePosition < 0) {
      handlePosition = 0;
    }

    handlePosition = (trackSize / 100) * handlePosition; // map % to axis position

    if (vertical) {
      handlePositionY = handlePosition;
    } else {
      handlePositionX = handlePosition;
    }

    return [handlePositionX, handlePositionY];
  };

  const [handlePositionX, handlePositionY] = mapPositionToCoordinates(
    initialPosition
  );

  // const scrolling = {
  //     mouseStartCoordinateX: 0,
  //     mouseStartCoordinateY: 0,
  //     isActive: false
  // };

  const handleSize = vertical ? height / 10 : width / 10;

  let handlerWidth = 0;
  let handlerHeight = 0;

  if (vertical) {
    handlerHeight += handleSize;
    handlerWidth = handlerBarWidth;
  } else {
    handlerWidth += handleSize;
    handlerHeight = handlerBarWidth;
  }

  const ref = React.useRef<SVGRectElement>();

  React.useEffect(() => {
    console.log(ref);
  });

  return (
    <>
      <g className={"controls"}>
        {/* track */}
        <rect
          x={Math.min(x, x + width)}
          y={-Math.max(y, y + height)}
          width={Math.abs(width)}
          height={Math.abs(height)}
          style={{
            fill: "black",
            opacity: 0.3,
          }}
        />
        {/*handle  */}
        <rect
          x={Math.min(x + handlePositionX, x + handlePositionX + handlerWidth)}
          y={
            -Math.max(y + handlePositionY, y + handlePositionY + handlerHeight)
          }
          width={Math.abs(handlerWidth)}
          height={Math.abs(handlerHeight)}
          style={{
            fill: "black",
            opacity: 0.7,
          }}
        />
      </g>
    </>
  );
};

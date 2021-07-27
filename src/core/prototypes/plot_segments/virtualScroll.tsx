/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

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

  const handleSize = vertical ? height / 10 : width / 10;

  const mapPositionToCoordinates = React.useCallback(
    (handlePosition: number): [number, number] => {
      let handlePositionX = 0;
      let handlePositionY = 0;
      if (handlePosition > 100) {
        handlePosition = 100;
      }

      if (handlePosition < 0) {
        handlePosition = 0;
      }

      handlePosition = ((trackSize - handleSize) / 100) * handlePosition; // map % to axis position

      if (vertical) {
        handlePositionY = handlePosition;
      } else {
        handlePositionX = handlePosition;
      }

      return [handlePositionX, handlePositionY];
    },
    [handleSize, trackSize, vertical]
  );

  const [position, setPosition] = React.useState(initialPosition);
  const [isActive, setActive] = React.useState(false);

  const [handlePositionX, handlePositionY] = React.useMemo(
    () => mapPositionToCoordinates(position),
    [position, mapPositionToCoordinates]
  );

  let handlerWidth = 0;
  let handlerHeight = 0;

  if (vertical) {
    handlerHeight += handleSize;
    handlerWidth = handlerBarWidth;
  } else {
    handlerWidth += handleSize;
    handlerHeight = handlerBarWidth;
  }

  const track = React.useRef<SVGRectElement>(null);
  const handler = React.useRef<SVGRectElement>(null);

  const onMouseMove = React.useCallback(
    (e: any) => {
      if (!isActive) {
        return;
      }

      const trackElement = track.current.getBoundingClientRect();
      const deltaX = e.clientX - trackElement.left;
      const deltaY = e.clientY - trackElement.top;

      let newPosition = position;
      if (vertical) {
        newPosition = 100 - (deltaY / height) * 100;
      } else {
        newPosition = (deltaX / width) * 100;
      }

      if (newPosition > 100) {
        newPosition = 100;
      }
      if (newPosition < 0) {
        newPosition = 0;
      }

      setPosition(newPosition);
      onScroll(newPosition);
    },
    [height, isActive, onScroll, position, vertical, width]
  );

  return (
    <>
      <g className={"controls"}>
        {/* track */}
        <rect
          ref={track}
          x={Math.min(x, x + width)}
          y={-Math.max(y, y + height)}
          width={Math.abs(width)}
          height={Math.abs(height)}
          style={{
            fill: "black",
            opacity: 0.3,
          }}
          onMouseUp={() => {
            setActive(false);
          }}
          onMouseMove={onMouseMove}
        />
        {/*handler  */}
        <rect
          ref={handler}
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
          onMouseDown={() => {
            setActive(true);
          }}
          onMouseUp={() => {
            setActive(false);
          }}
        />
        {/* pseudo interaction for mouse move */}
        {vertical ? (
          <rect
            className={"interaction-handler"}
            x={Math.min(x, x + width) - height}
            y={-Math.max(y, y + height) - height}
            width={Math.abs(width) + width * 2}
            height={Math.abs(height) + width * 2}
            onMouseMove={onMouseMove}
            onMouseOut={() => {
              setActive(false);
            }}
          />
        ) : (
          <rect
            className={"interaction-handler"}
            x={Math.min(x, x + width) - width}
            y={-Math.max(y, y + height) - width}
            width={Math.abs(width) + height * 2}
            height={Math.abs(height) + height * 2}
            onMouseMove={onMouseMove}
            onMouseOut={() => {
              setActive(false);
            }}
          />
        )}
      </g>
    </>
  );
};
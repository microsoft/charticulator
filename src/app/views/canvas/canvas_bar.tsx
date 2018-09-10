// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

export interface CanvasBarProps {
  canvasWidth: number;
  canvasHeight: number;

  onReset?: () => void;
}

export class CanvasBar extends React.Component<CanvasBarProps, {}> {
  public render() {
    const width = this.props.canvasWidth;
    const height = 20;
    return (
      <g
        className="charticulator__canvas-canvas-bar"
        transform={`translate(0,${(this.props.canvasHeight - height).toFixed(
          6
        )})`}
      >
        <rect
          className="el-background"
          x={0}
          y={0}
          width={width}
          height={height}
        />
      </g>
    );
  }
}

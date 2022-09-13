// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Label } from "@fluentui/react";

export enum ViewerType {
  Chart = "chart",
  Rect = "rect",
  Cicle = "circle",
}

export interface PatternViewerProps {
  patternName: string;
  pattern: string;
  width?: number;
  height?: number;
  type: ViewerType;
  onClick?: (patternName: string, pattern: string) => void;
}

// eslint-disable-next-line
export const PatternViewer: React.FC<PatternViewerProps> = ({
  patternName,
  pattern,
  width,
  height,
  type,
}) => {
  const previewStyle = {
    stroke: "#000000",
    fill: `url(#${patternName})`,
  };

  switch (type) {
    case ViewerType.Chart:
      return (
        <>
          <Label>{patternName}</Label>
          <svg width={width || 400} height={height || 200}>
            <defs
              dangerouslySetInnerHTML={{
                __html: pattern,
              }}
            ></defs>
            <rect style={previewStyle} x={0} width={20} height={30} />
            <rect style={previewStyle} x={25} width={20} height={70} />
            <rect style={previewStyle} x={50} width={20} height={170} />
            <rect style={previewStyle} x={75} width={20} height={70} />
            <rect style={previewStyle} x={100} width={20} height={10} />
            <rect style={previewStyle} x={125} width={20} height={90} />
            <rect style={previewStyle} x={150} width={20} height={50} />
            <rect style={previewStyle} x={175} width={20} height={140} />
            <rect style={previewStyle} x={200} width={20} height={120} />
            <rect style={previewStyle} x={225} width={20} height={5} />
            <rect style={previewStyle} x={250} width={20} height={70} />
            <rect style={previewStyle} x={275} width={20} height={15} />
            <rect style={previewStyle} x={300} width={20} height={75} />
            <rect style={previewStyle} x={325} width={20} height={50} />
            <rect style={previewStyle} x={350} width={20} height={150} />
            <rect style={previewStyle} x={375} width={20} height={100} />
          </svg>
        </>
      );
    case ViewerType.Rect:
      return (
        <>
          <Label>{patternName}</Label>
          <svg width={width || 40} height={height || 40}>
            <defs
              dangerouslySetInnerHTML={{
                __html: pattern,
              }}
            ></defs>
            <rect
              style={previewStyle}
              width={width || 40}
              height={height || 40}
            />
          </svg>
        </>
      );
    case ViewerType.Cicle:
      return (
        <>
          <Label>{patternName}</Label>
          <svg
            width={Math.min(width, height) || 40}
            height={Math.min(width, height) || 40}
          >
            <defs
              dangerouslySetInnerHTML={{
                __html: pattern,
              }}
            ></defs>
            <circle
              style={previewStyle}
              x={Math.min(width, height) / 2 || 20}
              y={Math.min(width, height) / 2 || 20}
              r={Math.min(width, height) || 40}
            />
          </svg>
        </>
      );
  }
};

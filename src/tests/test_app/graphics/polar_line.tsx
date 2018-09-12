// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Graphics } from "../../../core";
import { renderGraphicalElementSVG } from "../../../app/renderer";

export class PolarLineTestView extends React.Component<
  {},
  { slider1: number; slider2: number }
> {
  constructor(props: {}) {
    super(props);
    this.state = {
      slider1: 0,
      slider2: 0
    };
  }
  public render() {
    const paths: any[] = [];

    let gridIndex = 0;

    const dAngle = this.state.slider2;

    const testAngles = (angle1: number, angle2: number) => {
      angle1 += dAngle;
      angle2 += dAngle;
      const r = 40;
      const cx = 50 + (gridIndex % 6) * 100 - 300;
      const cy = 50 + Math.floor(gridIndex / 6) * 100 - 300;
      gridIndex += 1;
      const path2 = Graphics.makePath({
        strokeColor: { r: 0, g: 0, b: 0 },
        fillColor: { r: 0, g: 255, b: 0 },
        fillOpacity: 0.1
      });
      path2.polarLineTo(cx, cy, angle1, r, angle2, r, true);
      path2.polarLineTo(cx, cy, angle2, r, angle2, r - 10, false);
      path2.polarLineTo(cx, cy, angle2, r - 10, angle1, r - 10, false);
      path2.polarLineTo(cx, cy, angle1, r - 10, angle1, r, false);
      path2.closePath();
      paths.push(path2.path);
    };

    testAngles(0, this.state.slider1 - 500);
    testAngles(0, 180);
    testAngles(0, 270);
    testAngles(0, 360);
    testAngles(0, 200);
    testAngles(0, 400);

    testAngles(0, -90);
    testAngles(0, -180);
    testAngles(0, -270);
    testAngles(0, -360);
    testAngles(0, -200);
    testAngles(0, -400);

    return (
      <div>
        <div>
          <input
            type="range"
            min={0}
            max={1000}
            value={this.state.slider1}
            onChange={e => {
              this.setState({ slider1: +e.target.value });
            }}
          />
          <input
            type="range"
            min={0}
            max={1000}
            value={this.state.slider2}
            onChange={e => {
              this.setState({ slider2: +e.target.value });
            }}
          />
        </div>
        <svg width={600} height={300}>
          <g transform="translate(300, 0)">
            {renderGraphicalElementSVG(Graphics.makeGroup([...paths]))}
          </g>
        </svg>
      </div>
    );
  }
}

/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as ReactDOM from "react-dom";

import { MainView } from "./main_view";
import { MainStore } from "./stores";

import {
  CharticulatorCoreConfig,
  initialize,
  Dispatcher,
  Graphics,
  Point
} from "../core";
import { ExtensionContext, Extension } from "./extension";
import { Action } from "./actions/actions";
import { renderGraphicalElementSVG } from "./renderer/index";
import { AxisRenderer } from "../core/prototypes/plot_segments/axis";
import { ReorderListView } from "./views/panels/object_list_editor";
import { TextMeasurer } from "../core/graphics/renderer/textMeasurer";

// export function TestBezierCurve(props: {}) {
//     let curve: [Point, Point, Point, Point][] = [
//         [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }],
//         [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 0, y: 300 }, { x: -200, y: 200 }]
//     ];
//     let path = Graphics.makePath({
//         strokeColor: { r: 0, g: 0, b: 0 }
//     });
//     let extras: Graphics.Element[] = [];
//     for (let p of curve) {
//         path.moveTo(p[0].x, p[0].y);
//         path.cubicBezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
//     }
//     let cs = new Graphics.BezierCurveCoordinates({ x: 0, y: 0 }, curve);
//     let sTotal = cs.getLength();
//     for (let i = 0; i < 40; i++) {
//         let si = i / 39 * sTotal;
//         let p1 = cs.transformPoint(si, -10);
//         let p2 = cs.transformPoint(si, 10);
//         let scale = 10;
//         extras.push(Graphics.makeLine(p1.x, p1.y, p2.x, p2.y, { strokeColor: { r: 0, g: 0, b: 0 } }));
//         let rect = Graphics.makeRect(-5, -1, 5, 1, { fillColor: { r: 0, g: 255, b: 0 } });
//         let g = Graphics.makeGroup([rect]);
//         g.transform = cs.getLocalTransform(si, 10);
//         extras.push(g);
//     }
//     return (
//         <g>
//             {renderGraphicalElementSVG(Graphics.makeGroup([
//                 path.path,
//                 ...extras
//             ]))}
//         </g>
//     );
// }

export class TestApplicationView extends React.Component<
  {},
  { slider1: number; slider2: number }
> {
  constructor(props: {}) {
    super(props);
    this.state = {
      slider1: 0,
      slider2: 0
    };
    // let tStart = new Date().getTime();
    // setInterval(() => {
    //     let tNow = new Date().getTime() - tStart;
    //     this.setState({
    //         time: tNow / 1000
    //     });
    // }, 30);
  }
  public render() {
    // let visibleStyle: Graphics.Style = { fillColor: { r: 220, g: 220, b: 220 }, strokeColor: { r: 0, g: 0, b: 0 } };
    // let textStyle: Graphics.Style = { fillColor: { r: 0, g: 0, b: 0 } };
    // let gRect = Graphics.makeGroup([
    //     Graphics.makeRect(-30, -15, 30, 15, visibleStyle),
    //     Graphics.makeText(0, 0, "Rect", "Arial", 12, textStyle)
    // ]);
    // gRect.transform = { x: 50, y: 50, angle: 30 };

    // let gWedge = Graphics.makeGroup([
    //     Graphics.makeWedge(-30, 30, 45, 100, visibleStyle)
    // ]);
    // gWedge.transform = { x: -50, y: 50, angle: 0 };

    // let element = Graphics.makeGroup([
    //     Graphics.makeLine(-200, 0, 200, 0, visibleStyle),
    //     Graphics.makeLine(0, -200, 0, 200, visibleStyle),
    //     gRect,
    //     gWedge,
    //     Graphics.makeText(0, 0, "Origin", "Arial", 16, textStyle)
    // ]);

    // let axis = new AxisRenderer();
    // axis.setAxisDataBinding({
    //     type: "numerical",
    //     domainMin: 1000000,
    //     domainMax: 1330000,
    //     visible: true,
    //     side: "opposite"
    // }, 20, 200, false);

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
      // let path1 = Graphics.makePath({ strokeColor: { r: 0, g: 255, b: 0 } });
      // // path1.archimedeanSpiralReference(0, 0, a, b, 0, Math.PI * 100);
      // path1.polarLineTo(cx, cy, angle1, r - 2, angle2, r - 2, true, false);
      const path2 = Graphics.makePath({
        strokeColor: { r: 0, g: 0, b: 0 },
        fillColor: { r: 0, g: 255, b: 0 },
        fillOpacity: 0.1
      });
      // path2.archimedeanSpiral(0, 0, a, b, 0, -Math.PI * 100);
      path2.polarLineTo(cx, cy, angle1, r, angle2, r, true);
      path2.polarLineTo(cx, cy, angle2, r, angle2, r - 10, false);
      path2.polarLineTo(cx, cy, angle2, r - 10, angle1, r - 10, false);
      path2.polarLineTo(cx, cy, angle1, r - 10, angle1, r, false);
      path2.closePath();
      // paths.push(path1.path);
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

    // let tm = new TextMeasurer();
    // tm.setFontFamily("Arial");
    // tm.setFontSize(16);
    // let m = tm.measure("Hello World");
    // let p = TextMeasurer.ComputeTextPosition(14, 17, m, "left", "bottom", 0, 0);
    return (
      <div>
        <h1>Charticulator Scratch Page</h1>
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
        <svg width={600} height={600}>
          <g transform="translate(300, 300)">
            {/* <TestBezierCurve /> */}
            {renderGraphicalElementSVG(
              Graphics.makeGroup([
                // axis.renderLine(10, 10, this.state.time * 10 + 0, 1),
                // axis.renderLine(10, 10, this.state.time * 10 + 180, 1),
                // axis.renderLine(10, 10, this.state.time * 10 + 90, 1),
                // axis.renderLine(10, 10, this.state.time * 10 + -90, 1)
                ...paths
              ])
            )}
          </g>
        </svg>
      </div>
    );
  }
}

import { CharticulatorWorker } from "../worker";

export class TestApplication {
  public initialize(config: CharticulatorCoreConfig, containerID: string) {
    const rpc = new CharticulatorWorker("./dist/scripts/worker.bundle.js");
    async function workerTest() {
      await rpc.initialize(config);
    }
    workerTest();
    return initialize(config).then(() => {
      ReactDOM.render(
        <TestApplicationView />,
        document.getElementById(containerID)
      );
    });
  }
}

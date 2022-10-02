// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Graphics, Prototypes, Point, Geometry } from "../../../../core";
import * as globals from "../../../globals";
import * as R from "../../../resources";
import { toSVGNumber } from "../../../utils";
import { PopupView } from "../../../controllers";
import { ButtonRaised } from "../../../components";
import { InputNumber } from "../../panels/widgets/controls";
import { HandlesDragContext, HandleViewProps } from "./common";
import { strings } from "../../../../strings";

export interface InputCurveHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.InputCurve;
}
export interface InputCurveHandleViewState {
  enabled: boolean;
  drawing: boolean;
  points: Point[];
}

export class InputCurveHandleView extends React.Component<
  InputCurveHandleViewProps,
  InputCurveHandleViewState
> {
  public refs: {
    interaction: SVGRectElement;
  };

  public state: InputCurveHandleViewState = {
    enabled: false,
    drawing: false,
    points: [],
  };

  public hammer: HammerManager;

  public getPoint(x: number, y: number): Point {
    const bbox = this.refs.interaction.getBoundingClientRect();
    x -= bbox.left;
    y -= bbox.top + bbox.height;
    x /= this.props.zoom.scale;
    y /= -this.props.zoom.scale;
    // Scale x, y
    const w = Math.abs(this.props.handle.x2 - this.props.handle.x1);
    const h = Math.abs(this.props.handle.y2 - this.props.handle.y1);
    return {
      x: (x - w / 2) / (w / 2),
      y: (y - h / 2) / (w / 2),
    };
  }

  public getBezierCurvesFromMousePoints(points: Point[]) {
    if (points.length < 2) {
      return [];
    }
    const segs: Graphics.LineSegmentParametrization[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      segs.push(
        new Graphics.LineSegmentParametrization(points[i], points[i + 1])
      );
    }
    const lp = new Graphics.MultiCurveParametrization(segs);
    const lpLength = lp.getLength();
    const segments = Math.ceil(lpLength / 0.2);
    const sampleAtS = (s: number) => {
      const p = lp.getPointAtS(s);
      let tx = 0,
        ty = 0;
      for (let k = -5; k <= 5; k++) {
        let ks = s + ((k / 40) * lpLength) / segments;
        ks = Math.max(0, Math.min(lpLength, ks));
        const t = lp.getTangentAtS(ks);
        tx += t.x;
        ty += t.y;
      }
      const t = Geometry.vectorNormalize({ x: tx, y: ty });
      return [p, t];
    };
    let [p0, t0] = sampleAtS(0);
    let s0 = 0;
    const curves: Point[][] = [];
    for (let i = 1; i <= segments; i++) {
      const s = (i / segments) * lpLength;
      const [pi, ti] = sampleAtS(s);
      const ds = (s - s0) / 3;
      curves.push([
        p0,
        Geometry.vectorAdd(p0, Geometry.vectorScale(t0, ds)),
        Geometry.vectorAdd(pi, Geometry.vectorScale(ti, -ds)),
        pi,
      ]);

      s0 = s;
      p0 = pi;
      t0 = ti;
    }

    return curves;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.interaction);

    this.hammer.on("panstart", (e) => {
      const x = e.center.x - e.deltaX;
      const y = e.center.y - e.deltaY;
      this.setState({
        drawing: true,
        points: [this.getPoint(x, y)],
      });
    });
    this.hammer.on("pan", (e) => {
      this.state.points.push(this.getPoint(e.center.x, e.center.y));
      this.setState({
        points: this.state.points,
      });
    });
    this.hammer.on("panend", () => {
      const curve = this.getBezierCurvesFromMousePoints(this.state.points);
      const context = new HandlesDragContext();
      this.props.onDragStart(this.props.handle, context);
      context.emit("end", { value: curve });
      this.setState({
        drawing: false,
        enabled: false,
      });
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public renderDrawing() {
    const handle = this.props.handle;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const transformPoint = (p: Point) => {
      const scaler = Math.abs(handle.x2 - handle.x1) / 2;
      const x = p.x * scaler + (handle.x1 + handle.x2) / 2;
      const y = p.y * scaler + (handle.y1 + handle.y2) / 2;
      return {
        x: fX(x),
        y: fY(y),
      };
    };
    return (
      <path
        d={
          "M" +
          this.state.points
            .map((p) => {
              const pt = transformPoint(p);
              return `${toSVGNumber(pt.x)},${toSVGNumber(pt.y)}`;
            })
            .join("L")
        }
        className="handle-hint element-line"
      />
    );
  }

  public renderButton(x: number, y: number) {
    const margin = 2;
    const cx = x - 16 - margin;
    const cy = y + 16 + margin;
    return (
      <g
        className="handle-button"
        onClick={() => {
          this.setState({ enabled: true });
        }}
      >
        <rect x={cx - 16} y={cy - 16} width={32} height={32} />
        <image
          xlinkHref={R.getSVGIcon("Edit")}
          x={cx - 12}
          y={cy - 12}
          width={24}
          height={24}
        />
      </g>
    );
  }

  // eslint-disable-next-line
  public renderSpiralButton(x: number, y: number) {
    const margin = 2;
    const cx = x - 16 - margin;
    const cy = y + 16 + margin;
    let anchorElement: SVGRectElement;
    return (
      <g
        className="handle-button"
        // eslint-disable-next-line
        onClick={() => {
          globals.popupController.popupAt(
            // eslint-disable-next-line
            (context) => {
              let windings = 4;
              let startAngle = 180;
              return (
                <PopupView context={context}>
                  <div style={{ padding: "10px" }}>
                    <div className="charticulator__widget-row">
                      <span className="charticulator__widget-row-label">
                        {strings.handles.windings}:
                      </span>
                      <InputNumber
                        defaultValue={windings}
                        onEnter={(value) => {
                          windings = value;
                          return true;
                        }}
                      />
                    </div>
                    <div className="charticulator__widget-row">
                      <span className="charticulator__widget-row-label">
                        {strings.handles.startAngle}:
                      </span>
                      <InputNumber
                        defaultValue={startAngle}
                        onEnter={(value) => {
                          startAngle = value;
                          return true;
                        }}
                      />
                    </div>
                    <div style={{ textAlign: "right", marginTop: "10px" }}>
                      <ButtonRaised
                        text={strings.handles.drawSpiral}
                        onClick={() => {
                          context.close();
                          // Make spiral and emit.
                          const dragContext = new HandlesDragContext();
                          const curve: Point[][] = [];
                          this.props.onDragStart(
                            this.props.handle,
                            dragContext
                          );
                          const thetaStart = Geometry.degreesToRadians(
                            startAngle
                          );
                          const thetaEnd = thetaStart + windings * Math.PI * 2;
                          const N = 64;
                          const a = 1 / thetaEnd; // r = a theta
                          const swapXY = (p: Point) => {
                            return { x: p.y, y: p.x };
                          };
                          for (let i = 0; i < N; i++) {
                            const theta1 =
                              thetaStart + (i / N) * (thetaEnd - thetaStart);
                            const theta2 =
                              thetaStart +
                              ((i + 1) / N) * (thetaEnd - thetaStart);
                            const scaler = 3 / (theta2 - theta1);
                            const r1 = a * theta1;
                            const r2 = a * theta2;
                            const p1 = {
                              x: r1 * Math.cos(theta1),
                              y: r1 * Math.sin(theta1),
                            };
                            const p2 = {
                              x: r2 * Math.cos(theta2),
                              y: r2 * Math.sin(theta2),
                            };
                            const cp1 = {
                              x:
                                p1.x +
                                (a *
                                  (Math.cos(theta1) -
                                    theta1 * Math.sin(theta1))) /
                                  scaler,
                              y:
                                p1.y +
                                (a *
                                  (Math.sin(theta1) +
                                    theta1 * Math.cos(theta1))) /
                                  scaler,
                            };
                            const cp2 = {
                              x:
                                p2.x -
                                (a *
                                  (Math.cos(theta2) -
                                    theta2 * Math.sin(theta2))) /
                                  scaler,
                              y:
                                p2.y -
                                (a *
                                  (Math.sin(theta2) +
                                    theta2 * Math.cos(theta2))) /
                                  scaler,
                            };
                            curve.push([p1, cp1, cp2, p2].map(swapXY));
                          }
                          dragContext.emit("end", { value: curve });
                        }}
                      />
                    </div>
                  </div>
                </PopupView>
              );
            },
            { anchor: anchorElement }
          );
        }}
      >
        <rect
          x={cx - 16}
          y={cy - 16}
          width={32}
          height={32}
          ref={(e) => (anchorElement = e)}
        />
        <image
          xlinkHref={R.getSVGIcon("scaffold/spiral")}
          x={cx - 12}
          y={cy - 12}
          width={24}
          height={24}
        />
      </g>
    );
  }

  public render() {
    const handle = this.props.handle;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    return (
      <g className="handle">
        <rect
          ref="interaction"
          style={{
            pointerEvents: this.state.enabled ? "fill" : "none",
            cursor: "crosshair",
          }}
          className="handle-ghost element-region"
          x={Math.min(fX(handle.x1), fX(handle.x2))}
          y={Math.min(fY(handle.y1), fY(handle.y2))}
          width={Math.abs(fX(handle.x1) - fX(handle.x2))}
          height={Math.abs(fY(handle.y1) - fY(handle.y2))}
        />
        {this.state.drawing ? this.renderDrawing() : null}
        {!this.state.enabled ? (
          <g>
            {this.renderSpiralButton(
              Math.max(fX(handle.x1), fX(handle.x2)) - 38,
              Math.min(fY(handle.y1), fY(handle.y2))
            )}
            {this.renderButton(
              Math.max(fX(handle.x1), fX(handle.x2)),
              Math.min(fY(handle.y1), fY(handle.y2))
            )}
          </g>
        ) : null}
      </g>
    );
  }
}

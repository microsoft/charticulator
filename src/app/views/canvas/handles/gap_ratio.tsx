// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Graphics, Prototypes, Geometry } from "../../../../core";
import { classNames, toSVGNumber } from "../../../utils";
import { renderSVGPath } from "../../../renderer";
import { HandlesDragContext, HandleViewProps } from "./common";

export interface RelativeLineRatioHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.GapRatio;
}

export interface RelativeLineRatioHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class GapRatioHandleView extends React.Component<
  RelativeLineRatioHandleViewProps,
  RelativeLineRatioHandleViewState
> {
  public refs: {
    cOrigin: SVGCircleElement;
    line: SVGLineElement;
  };
  public hammer: HammerManager;

  constructor(props: RelativeLineRatioHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value,
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.line);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let xStart: number = 0;
    let yStart: number = 0;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    let scale = 1 / this.props.handle.scale;

    const getNewValue = () => {
      const cs = this.props.handle.coordinateSystem;
      if (cs == null || cs instanceof Graphics.CartesianCoordinates) {
        if (this.props.handle.axis == "x") {
          return oldValue + scale * dXIntegrate;
        }
        if (this.props.handle.axis == "y") {
          return oldValue + scale * dYIntegrate;
        }
      }
      if (cs instanceof Graphics.PolarCoordinates) {
        if (this.props.handle.axis == "x") {
          const getAngle = (x: number, y: number) => {
            return 90 - (Math.atan2(y, x) / Math.PI) * 180;
          };
          const angle0 = getAngle(xStart, yStart);
          let angle1 = getAngle(xStart + dXIntegrate, yStart + dYIntegrate);
          if (angle1 > angle0 + 180) {
            angle1 -= 360;
          }
          if (angle1 < angle0 - 180) {
            angle1 += 360;
          }
          return oldValue + scale * (angle1 - angle0);
        }
        if (this.props.handle.axis == "y") {
          const nX = xStart + dXIntegrate;
          const nY = yStart + dYIntegrate;
          const radius0 = Math.sqrt(xStart * xStart + yStart * yStart);
          const radius1 = Math.sqrt(nX * nX + nY * nY);
          return oldValue + scale * (radius1 - radius0);
        }
      }
      return oldValue;
    };

    this.hammer.on("panstart", (e) => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      if (this.refs.cOrigin) {
        const bbox = this.refs.cOrigin.getBoundingClientRect();
        xStart = (e.center.x - e.deltaX - bbox.left) / this.props.zoom.scale;
        yStart = -(e.center.y - e.deltaY - bbox.top) / this.props.zoom.scale;
      } else {
        xStart = (e.center.x - e.deltaX) / this.props.zoom.scale;
        yStart = -(e.center.y - e.deltaY) / this.props.zoom.scale;
      }
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      dXIntegrate = e.deltaX / this.props.zoom.scale;
      dYIntegrate = -e.deltaY / this.props.zoom.scale;
      scale = 1 / this.props.handle.scale;

      this.setState({
        dragging: true,
        newValue: oldValue,
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });

    this.hammer.on("pan", (e) => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue = getNewValue();
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        } else {
          newValue = Math.min(1, Math.max(newValue, 0));
        }
        this.setState({
          newValue,
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", (e) => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue = getNewValue();
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        } else {
          newValue = Math.min(1, Math.max(newValue, 0));
        }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false,
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const handle = this.props.handle;
    if (
      handle.coordinateSystem == null ||
      handle.coordinateSystem instanceof Graphics.CartesianCoordinates
    ) {
      return this.renderCartesian();
    }
    if (handle.coordinateSystem instanceof Graphics.PolarCoordinates) {
      return this.renderPolar();
    }
    return null;
  }

  public renderPolar() {
    const { handle } = this.props;
    const polar = handle.coordinateSystem as Graphics.PolarCoordinates;
    const center = Geometry.applyZoom(this.props.zoom, {
      x: polar.origin.x,
      y: -polar.origin.y,
    });
    switch (handle.axis) {
      case "x": {
        // angular axis
        const pathValue = Graphics.makePath();
        const pathRegion = Graphics.makePath();
        const angle = handle.reference + handle.scale * handle.value;
        const angleRef = handle.reference;
        const r1 = handle.span[0] * this.props.zoom.scale,
          r2 = handle.span[1] * this.props.zoom.scale;
        pathValue.polarLineTo(
          center.x,
          -center.y,
          -angle + 90,
          r1,
          -angle + 90,
          r2,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle + 90,
          r1,
          -angle + 90,
          r2,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle + 90,
          r2,
          -angleRef + 90,
          r2,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angleRef + 90,
          r2,
          -angleRef + 90,
          r1,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angleRef + 90,
          r1,
          -angle + 90,
          r1,
          false
        );
        pathRegion.closePath();
        const pathNew = Graphics.makePath();
        if (this.state.dragging) {
          const angleNew =
            handle.reference + handle.scale * this.state.newValue;
          pathNew.polarLineTo(
            center.x,
            -center.y,
            -angleNew + 90,
            r1,
            -angleNew + 90,
            r2,
            true
          );
        }
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-angular",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <circle ref="cOrigin" cx={center.x} cy={center.y} r={0} />
            <g ref="line">
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-ghost"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-ghost"
              />
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-highlight"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-highlight"
              />
            </g>
            {this.state.dragging ? (
              <path
                d={renderSVGPath(pathNew.path.cmds)}
                className="element-line handle-hint"
              />
            ) : null}
          </g>
        );
      }
      case "y": {
        const pathValue = Graphics.makePath();
        const pathRegion = Graphics.makePath();
        const radius =
          (handle.reference + handle.scale * handle.value) *
          this.props.zoom.scale;
        const radiusRef = handle.reference * this.props.zoom.scale;
        const angle1 = handle.span[0],
          angle2 = handle.span[1];
        pathValue.polarLineTo(
          center.x,
          -center.y,
          -angle1 + 90,
          radius,
          -angle2 + 90,
          radius,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle1 + 90,
          radius,
          -angle2 + 90,
          radius,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle2 + 90,
          radius,
          -angle2 + 90,
          radiusRef,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle2 + 90,
          radiusRef,
          -angle1 + 90,
          radiusRef,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle1 + 90,
          radiusRef,
          -angle1 + 90,
          radius,
          false
        );
        pathRegion.closePath();
        const pathNew = Graphics.makePath();
        if (this.state.dragging) {
          const radiusNew =
            (handle.reference + handle.scale * this.state.newValue) *
            this.props.zoom.scale;
          pathNew.polarLineTo(
            center.x,
            -center.y,
            -angle1 + 90,
            radiusNew,
            -angle2 + 90,
            radiusNew,
            true
          );
        }
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-radial",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <circle ref="cOrigin" cx={center.x} cy={center.y} r={0} />
            <g ref="line">
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-ghost"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-ghost"
              />
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-highlight"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-highlight"
              />
            </g>
            {this.state.dragging ? (
              <path
                d={renderSVGPath(pathNew.path.cmds)}
                className="element-line handle-hint"
              />
            ) : null}
          </g>
        );
      }
    }
  }

  public renderCartesian() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;

    switch (handle.axis) {
      case "x": {
        const fxRef = fX(handle.reference);
        const fxVal = fX(handle.reference + handle.scale * handle.value);
        const fy1 = fY(handle.span[0]);
        const fy2 = fY(handle.span[1]);
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-x",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                x1={toSVGNumber(fxVal)}
                x2={toSVGNumber(fxVal)}
                y1={toSVGNumber(fy1)}
                y2={toSVGNumber(fy2)}
              />
              <rect
                className="element-region handle-ghost"
                x={toSVGNumber(Math.min(fxRef, fxVal))}
                width={toSVGNumber(Math.abs(fxRef - fxVal))}
                y={toSVGNumber(Math.min(fy1, fy2))}
                height={toSVGNumber(Math.abs(fy2 - fy1))}
              />
              <line
                className="element-line handle-highlight"
                x1={toSVGNumber(fxVal)}
                x2={toSVGNumber(fxVal)}
                y1={toSVGNumber(fy1)}
                y2={toSVGNumber(fy2)}
              />
              <rect
                className="element-region handle-highlight"
                x={toSVGNumber(Math.min(fxRef, fxVal))}
                width={toSVGNumber(Math.abs(fxRef - fxVal))}
                y={toSVGNumber(Math.min(fy1, fy2))}
                height={toSVGNumber(Math.abs(fy2 - fy1))}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={toSVGNumber(
                    fX(handle.reference + handle.scale * this.state.newValue)
                  )}
                  x2={toSVGNumber(
                    fX(handle.reference + handle.scale * this.state.newValue)
                  )}
                  y1={toSVGNumber(fY(handle.span[0]))}
                  y2={toSVGNumber(fY(handle.span[1]))}
                />
              </g>
            ) : null}
          </g>
        );
      }
      case "y": {
        const fyRef = fY(handle.reference);
        const fyVal = fY(handle.reference + handle.scale * handle.value);
        const fx1 = fX(handle.span[0]);
        const fx2 = fX(handle.span[1]);
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-y",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                y1={toSVGNumber(fyVal)}
                y2={toSVGNumber(fyVal)}
                x1={toSVGNumber(fx1)}
                x2={toSVGNumber(fx2)}
              />
              <rect
                className="element-region handle-ghost"
                y={toSVGNumber(Math.min(fyRef, fyVal))}
                height={toSVGNumber(Math.abs(fyRef - fyVal))}
                x={toSVGNumber(Math.min(fx1, fx2))}
                width={toSVGNumber(Math.abs(fx2 - fx1))}
              />
              <line
                className="element-line handle-highlight"
                y1={toSVGNumber(fyVal)}
                y2={toSVGNumber(fyVal)}
                x1={toSVGNumber(fx1)}
                x2={toSVGNumber(fx2)}
              />
              <rect
                className="element-region handle-highlight"
                y={toSVGNumber(Math.min(fyRef, fyVal))}
                height={toSVGNumber(Math.abs(fyRef - fyVal))}
                x={toSVGNumber(Math.min(fx1, fx2))}
                width={toSVGNumber(Math.abs(fx2 - fx1))}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={toSVGNumber(
                    fY(handle.reference + handle.scale * this.state.newValue)
                  )}
                  y2={toSVGNumber(
                    fY(handle.reference + handle.scale * this.state.newValue)
                  )}
                  x1={toSVGNumber(fx1)}
                  x2={toSVGNumber(fx2)}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

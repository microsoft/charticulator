// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Graphics, Prototypes, Geometry, ZoomInfo } from "../../../core";
import { classNames } from "../../utils";
import { renderSVGPath } from "../../renderer";
import { HandlesDragContext, HandleViewProps } from "./handles/common";
import { InputCurveHandleView } from "./handles/input_curve";
import { TextAlignmentHandleView } from "./handles/text_alignment";
import { PointHandleView } from "./handles/point";

export interface HandlesViewProps {
  zoom: ZoomInfo;
  active?: boolean;
  visible?: boolean;
  handles: Prototypes.Handles.Description[];
  isAttributeSnapped?: (attribute: string) => boolean;
  onDragStart?: (
    handle: Prototypes.Handles.Description,
    ctx: HandlesDragContext
  ) => void;
}

export interface HandlesViewState {}

export class HandlesView extends React.Component<
  HandlesViewProps,
  HandlesViewState
> {
  public renderHandle(handle: Prototypes.Handles.Description) {
    let isHandleSnapped = false;
    if (this.props.isAttributeSnapped) {
      for (const action of handle.actions) {
        if (action.type == "attribute") {
          isHandleSnapped =
            isHandleSnapped || this.props.isAttributeSnapped(action.attribute);
        }
      }
    }

    switch (handle.type) {
      case "point": {
        return (
          <PointHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            snapped={isHandleSnapped}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Point}
          />
        );
      }
      case "line": {
        return (
          <LineHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            snapped={isHandleSnapped}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Line}
          />
        );
      }
      case "relative-line": {
        return (
          <RelativeLineHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.RelativeLine}
          />
        );
      }
      case "gap-ratio": {
        return (
          <GapRatioHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={false}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.GapRatio}
          />
        );
      }
      case "margin": {
        return (
          <MarginHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Margin}
          />
        );
      }
      case "angle": {
        return (
          <AngleHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Angle}
          />
        );
      }
      case "distance-ratio": {
        return (
          <DistanceRatioHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.DistanceRatio}
          />
        );
      }
      case "text-alignment": {
        return (
          <TextAlignmentHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.TextAlignment}
          />
        );
      }
      case "input-curve": {
        return (
          <InputCurveHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.InputCurve}
          />
        );
      }
    }
  }

  public render() {
    return (
      <g>
        {this.props.handles.map((b, idx) => (
          <g key={`m${idx}`}>{this.renderHandle(b)}</g>
        ))}
      </g>
    );
  }
}

export interface LineHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Line;
}

export interface LineHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class LineHandleView extends React.Component<
  LineHandleViewProps,
  LineHandleViewState
> {
  public refs: {
    line: SVGLineElement;
  };
  public hammer: HammerManager;

  constructor(props: LineHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.line);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) +
          oldValue;
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) +
          oldValue;
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    switch (handle.axis) {
      case "x": {
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
                x1={fX(handle.value)}
                x2={fX(handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                x1={fX(handle.value)}
                x2={fX(handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={fX(this.state.newValue)}
                  x2={fX(this.state.newValue)}
                  y1={fY(handle.span[0])}
                  y2={fY(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
      case "y": {
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
                y1={fY(handle.value)}
                y2={fY(handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                y1={fY(handle.value)}
                y2={fY(handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={fY(this.state.newValue)}
                  y2={fY(this.state.newValue)}
                  x1={fX(handle.span[0])}
                  x2={fX(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

export interface RelativeLineHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.RelativeLine;
}

export interface RelativeLineHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class RelativeLineHandleView extends React.Component<
  RelativeLineHandleViewProps,
  RelativeLineHandleViewState
> {
  public refs: {
    line: SVGLineElement;
  };
  public hammer: HammerManager;

  constructor(props: RelativeLineHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.line);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    const sign = this.props.handle.sign;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign +
          oldValue;
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign +
          oldValue;
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;

    switch (handle.axis) {
      case "x": {
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
                x1={fX(handle.reference + handle.sign * handle.value)}
                x2={fX(handle.reference + handle.sign * handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                x1={fX(handle.reference + handle.sign * handle.value)}
                x2={fX(handle.reference + handle.sign * handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={fX(handle.reference + handle.sign * this.state.newValue)}
                  x2={fX(handle.reference + handle.sign * this.state.newValue)}
                  y1={fY(handle.span[0])}
                  y2={fY(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
      case "y": {
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
                y1={fY(handle.reference + handle.sign * handle.value)}
                y2={fY(handle.reference + handle.sign * handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                y1={fY(handle.reference + handle.sign * handle.value)}
                y2={fY(handle.reference + handle.sign * handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={fY(handle.reference + handle.sign * this.state.newValue)}
                  y2={fY(handle.reference + handle.sign * this.state.newValue)}
                  x1={fX(handle.span[0])}
                  x2={fX(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

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
      newValue: this.props.handle.value
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

    this.hammer.on("panstart", e => {
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
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });

    this.hammer.on("pan", e => {
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
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
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
          dragging: false
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
      y: -polar.origin.y
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
                x1={fxVal}
                x2={fxVal}
                y1={fy1}
                y2={fy2}
              />
              <rect
                className="element-region handle-ghost"
                x={Math.min(fxRef, fxVal)}
                width={Math.abs(fxRef - fxVal)}
                y={Math.min(fy1, fy2)}
                height={Math.abs(fy2 - fy1)}
              />
              <line
                className="element-line handle-highlight"
                x1={fxVal}
                x2={fxVal}
                y1={fy1}
                y2={fy2}
              />
              <rect
                className="element-region handle-highlight"
                x={Math.min(fxRef, fxVal)}
                width={Math.abs(fxRef - fxVal)}
                y={Math.min(fy1, fy2)}
                height={Math.abs(fy2 - fy1)}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={fX(handle.reference + handle.scale * this.state.newValue)}
                  x2={fX(handle.reference + handle.scale * this.state.newValue)}
                  y1={fY(handle.span[0])}
                  y2={fY(handle.span[1])}
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
                y1={fyVal}
                y2={fyVal}
                x1={fx1}
                x2={fx2}
              />
              <rect
                className="element-region handle-ghost"
                y={Math.min(fyRef, fyVal)}
                height={Math.abs(fyRef - fyVal)}
                x={Math.min(fx1, fx2)}
                width={Math.abs(fx2 - fx1)}
              />
              <line
                className="element-line handle-highlight"
                y1={fyVal}
                y2={fyVal}
                x1={fx1}
                x2={fx2}
              />
              <rect
                className="element-region handle-highlight"
                y={Math.min(fyRef, fyVal)}
                height={Math.abs(fyRef - fyVal)}
                x={Math.min(fx1, fx2)}
                width={Math.abs(fx2 - fx1)}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={fY(handle.reference + handle.scale * this.state.newValue)}
                  y2={fY(handle.reference + handle.scale * this.state.newValue)}
                  x1={fx1}
                  x2={fx2}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

export interface MarginHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Margin;
}

export interface MarginHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class MarginHandleView extends React.Component<
  MarginHandleViewProps,
  MarginHandleViewState
> {
  public refs: {
    margin: SVGGElement;
  };
  public hammer: HammerManager;

  constructor(props: MarginHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.margin);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let sign: number;
    let total: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      sign = this.props.handle.sign;
      if (this.props.handle.total != null) {
        total = this.props.handle.total;
      } else {
        total = 1;
      }
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue =
          ((this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign) /
            total +
          oldValue;
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        }
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue =
          ((this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign) /
            total +
          oldValue;
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    let x: number, y: number;
    let nx: number, ny: number;
    let shape: string;
    const scale = this.props.handle.total || 1;
    switch (handle.axis) {
      case "x":
        {
          x = fX(handle.x + handle.value * handle.sign * scale);
          y = fY(handle.y);
          nx = fX(handle.x + this.state.newValue * handle.sign * scale);
          ny = fY(handle.y);
          shape = "M0,0l5,12.72l-10,0Z";
        }
        break;
      case "y":
        {
          x = fX(handle.x);
          y = fY(handle.y + handle.value * handle.sign * scale);
          nx = fX(handle.x);
          ny = fY(handle.y + this.state.newValue * handle.sign * scale);
          shape = "M0,0l-12.72,5l0,-10Z";
        }
        break;
    }
    return (
      <g
        ref="margin"
        className={classNames(
          "handle",
          "handle-gap-" + handle.axis,
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <path
          className="element-shape handle-ghost"
          transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
          d={shape}
        />
        <path
          className="element-shape handle-highlight"
          transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
          d={shape}
        />
        {this.state.dragging ? (
          <path
            className="element-shape handle-hint"
            transform={`translate(${nx.toFixed(6)},${ny.toFixed(6)})`}
            d={shape}
          />
        ) : null}
      </g>
    );
  }
}

export interface AngleHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Angle;
}

export interface AngleHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class AngleHandleView extends React.Component<
  AngleHandleViewProps,
  AngleHandleViewState
> {
  public refs: {
    margin: SVGGElement;
    centerCircle: SVGCircleElement;
  };
  public hammer: HammerManager;

  constructor(props: AngleHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public clipAngle(v: number) {
    v = Math.round(v / 15) * 15;
    const min = this.props.handle.clipAngles[0];
    const max = this.props.handle.clipAngles[1];
    if (min != null) {
      while (v >= min) {
        v -= 360;
      }
      while (v <= min) {
        v += 360;
      }
    }
    if (max != null) {
      while (v <= max) {
        v += 360;
      }
      while (v >= max) {
        v -= 360;
      }
    }
    return v;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.margin);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        const newValue = this.clipAngle(
          (Math.atan2(-px, py) / Math.PI) * 180 + 180
        );
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        const newValue = this.clipAngle(
          (Math.atan2(-px, py) / Math.PI) * 180 + 180
        );
        // if (this.props.handle.range) {
        //     newValue = Math.min(this.props.handle.range[1], Math.max(newValue, this.props.handle.range[0]));
        // }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public static shapeCircle = (r: number) =>
    `M -${r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;
  public static shapeRight = (r: number) =>
    `M 0 ${-r} L ${-1.5 * r} 0 L 0 ${r} Z`;
  public static shapeLeft = (r: number) =>
    `M 0 ${-r} L ${1.5 * r} 0 L 0 ${r} Z`;

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const cx = fX(handle.cx);
    const cy = fY(handle.cy);
    const radius = handle.radius * this.props.zoom.scale + 10;
    let shapeF = AngleHandleView.shapeCircle;
    if (handle.icon == "<") {
      shapeF = AngleHandleView.shapeLeft;
    }
    if (handle.icon == ">") {
      shapeF = AngleHandleView.shapeRight;
    }
    return (
      <g
        ref="margin"
        className={classNames(
          "handle",
          "handle-angle",
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <g transform={`translate(${cx},${cy}) rotate(${180 + handle.value})`}>
          <circle ref="centerCircle" cx={0} cy={0} r={0} />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={radius}
            className="element-line handle-ghost"
          />
          <path
            d={shapeF(9)}
            transform={`translate(0,${radius})`}
            className="element-shape handle-ghost"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={radius}
            className="element-line handle-highlight"
          />
          <path
            d={shapeF(5)}
            transform={`translate(0,${radius})`}
            className="element-shape handle-highlight"
          />
        </g>
        {this.state.dragging ? (
          <g
            transform={`translate(${cx},${cy}) rotate(${180 +
              this.state.newValue})`}
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={radius}
              className="element-line handle-hint"
            />
            <path
              d={shapeF(5)}
              transform={`translate(0,${radius})`}
              className="element-shape handle-hint"
            />
          </g>
        ) : null}
      </g>
    );

    // let x: number, y: number;
    // let nx: number, ny: number;
    // let shape: string;
    // let scale = this.props.handle.total || 1;
    // switch (handle.axis) {
    //     case "x": {
    //         x = fX(handle.x + handle.value * handle.sign * scale);
    //         y = fY(handle.y);
    //         nx = fX(handle.x + this.state.newValue * handle.sign * scale);
    //         ny = fY(handle.y);
    //         shape = "M0,0l5,12.72l-10,0Z";
    //     } break;
    //     case "y": {
    //         x = fX(handle.x);
    //         y = fY(handle.y + handle.value * handle.sign * scale);
    //         nx = fX(handle.x);
    //         ny = fY(handle.y + this.state.newValue * handle.sign * scale);
    //         shape = "M0,0l-12.72,5l0,-10Z";
    //     } break;
    // }
    // return (
    //     <g ref="margin" className={classNames("handle", "handle-gap-" + handle.axis, ["active", this.state.dragging], ["visible", handle.visible || this.props.visible])}>
    //         <path className="element-shape handle-ghost"
    //             transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
    //             d={shape}
    //         />
    //         <path className="element-shape handle-highlight"
    //             transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
    //             d={shape}
    //         />
    //         {this.state.dragging ? (
    //             <path className="element-shape handle-hint"
    //                 transform={`translate(${nx.toFixed(6)},${ny.toFixed(6)})`}
    //                 d={shape}
    //             />
    //         ) : null}
    //     </g>
    // );
  }
}

export interface DistanceRatioHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.DistanceRatio;
}

export interface DistanceRatioHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class DistanceRatioHandleView extends React.Component<
  DistanceRatioHandleViewProps,
  DistanceRatioHandleViewState
> {
  public refs: {
    margin: SVGGElement;
    centerCircle: SVGCircleElement;
  };
  public hammer: HammerManager;

  constructor(props: DistanceRatioHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public clip(v: number) {
    const min = this.props.handle.clipRange[0];
    const max = this.props.handle.clipRange[1];
    if (v < min) {
      v = min;
    }
    if (v > max) {
      v = max;
    }
    if (v < 0.05) {
      v = 0;
    }
    return v;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.margin);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        let d = Math.sqrt(px * px + py * py) / this.props.zoom.scale;
        d =
          (d - this.props.handle.startDistance) /
          (this.props.handle.endDistance - this.props.handle.startDistance);
        d = this.clip(d);
        const newValue = d;
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        let d = Math.sqrt(px * px + py * py) / this.props.zoom.scale;
        d =
          (d - this.props.handle.startDistance) /
          (this.props.handle.endDistance - this.props.handle.startDistance);
        d = this.clip(d);
        const newValue = d;
        // if (this.props.handle.range) {
        //     newValue = Math.min(this.props.handle.range[1], Math.max(newValue, this.props.handle.range[0]));
        // }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const cx = fX(handle.cx);
    const cy = fY(handle.cy);
    const d1 = handle.startDistance * this.props.zoom.scale;
    const d2 = handle.endDistance * this.props.zoom.scale;
    const fRadius = (x: number) => x * (d2 - d1) + d1;
    const makePath = (value: number) => {
      const path = Graphics.makePath();
      path.polarLineTo(
        0,
        0,
        90 - handle.startAngle,
        fRadius(value),
        90 - handle.endAngle,
        fRadius(value),
        true
      );
      return renderSVGPath(path.path.cmds);
    };
    const px = (value: number) => {
      const alpha = ((90 - handle.startAngle) / 180) * Math.PI;
      return Math.cos(alpha) * fRadius(value);
    };
    const py = (value: number) => {
      const alpha = ((90 - handle.startAngle) / 180) * Math.PI;
      return -Math.sin(alpha) * fRadius(value);
    };
    return (
      <g
        ref="margin"
        className={classNames(
          "handle",
          "handle-distance",
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <g transform={`translate(${cx},${cy})`}>
          <circle ref="centerCircle" cx={0} cy={0} r={0} />
          <path
            d={makePath(handle.value)}
            className="element-line handle-ghost"
          />
          <path
            d={makePath(handle.value)}
            className="element-line handle-highlight"
          />
          {handle.value == 0 ? (
            <circle
              cx={px(handle.value)}
              cy={py(handle.value)}
              r={3}
              className="element-shape handle-highlight"
            />
          ) : null}
        </g>
        {this.state.dragging ? (
          <g transform={`translate(${cx},${cy})`}>
            <path
              d={makePath(this.state.newValue)}
              className="element-line handle-hint"
            />
            {this.state.newValue == 0 ? (
              <circle
                cx={px(this.state.newValue)}
                cy={py(this.state.newValue)}
                r={3}
                className="element-shape handle-hint"
              />
            ) : null}
          </g>
        ) : null}
      </g>
    );
  }
}

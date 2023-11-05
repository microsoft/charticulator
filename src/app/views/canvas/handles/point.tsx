// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { default as Hammer } from "hammerjs";
import { Prototypes, Geometry } from "../../../../core";
import { classNames } from "../../../utils";
import { HandlesDragContext, HandleViewProps } from "./common";

const POINT_SIZE = 3;
const POINT_GHOST_SIZE = 6;

export interface PointHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Point;
}

export interface PointHandleViewState {
  dragging: boolean;
  newXValue: number;
  newYValue: number;
}

export class PointHandleView extends React.Component<
  React.PropsWithChildren<PointHandleViewProps>,
  PointHandleViewState
> {
  public refs: {
    circle: SVGCircleElement;
  };
  public hammer: HammerManager;

  constructor(props: PointHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newXValue: this.props.handle.x,
      newYValue: this.props.handle.y,
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.circle);
    this.hammer.add(new Hammer.Pan());

    let context: HandlesDragContext = null;
    let oldXValue: number;
    let oldYValue: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    this.hammer.on("panstart", () => {
      context = new HandlesDragContext();
      oldXValue = this.props.handle.x;
      oldYValue = this.props.handle.y;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newXValue: oldXValue,
        newYValue: oldYValue,
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
        const newXValue = dXIntegrate + oldXValue;
        const newYValue = dYIntegrate + oldYValue;
        this.setState({
          newXValue,
          newYValue,
        });
        context.emit("drag", { x: newXValue, y: newYValue });
      }
    });
    this.hammer.on("panend", (e) => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newXValue = dXIntegrate + oldXValue;
        const newYValue = dYIntegrate + oldYValue;
        context.emit("end", { x: newXValue, y: newYValue });
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
    const { handle } = this.props;
    const { x, y } = Geometry.applyZoom(this.props.zoom, {
      x: handle.x,
      y: -handle.y,
    });
    const { x: hx, y: hy } = Geometry.applyZoom(this.props.zoom, {
      x: this.state.newXValue,
      y: -this.state.newYValue,
    });
    return (
      <g
        ref="circle"
        className={classNames(
          "handle",
          "handle-point",
          ["active", this.state.dragging],
          ["snapped", this.props.snapped],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <circle
          className="element-shape handle-ghost"
          cx={x}
          cy={y}
          r={POINT_GHOST_SIZE}
        />
        <circle
          className="element-shape handle-highlight"
          cx={x}
          cy={y}
          r={POINT_SIZE}
        />
        {this.state.dragging ? (
          <g>
            <line
              className={`element-line handle-hint`}
              x1={hx}
              y1={hy}
              x2={x}
              y2={y}
            />
            <circle
              className={`element-shape handle-hint`}
              cx={hx}
              cy={hy}
              r={POINT_SIZE}
            />
          </g>
        ) : null}
      </g>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Prototypes, ZoomInfo } from "../../../core";
import { classNames } from "../../utils";
import { HandlesDragContext, HandleViewProps } from "./handles/common";
import { InputCurveHandleView } from "./handles/input_curve";
import { TextAlignmentHandleView } from "./handles/text_alignment";
import { PointHandleView } from "./handles/point";
import { DistanceRatioHandleView } from "./handles/distance_ratio";
import { AngleHandleView } from "./handles/angle";
import { MarginHandleView } from "./handles/margin";
import { GapRatioHandleView } from "./handles/gap_ratio";
import { RelativeLineHandleView } from "./handles/relative_line";

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

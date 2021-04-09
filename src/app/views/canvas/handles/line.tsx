// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Prototypes } from "../../../../core";
import { classNames, toSVGNumber } from "../../../utils";
import { HandlesDragContext, HandleViewProps } from "./common";

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
      newValue: this.props.handle.value,
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

    this.hammer.on("panstart", (e) => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
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
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) +
          oldValue;
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
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) +
          oldValue;
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
                x1={toSVGNumber(fX(handle.value))}
                x2={toSVGNumber(fX(handle.value))}
                y1={toSVGNumber(fY(handle.span[0]))}
                y2={toSVGNumber(fY(handle.span[1]))}
              />
              <line
                className="element-line handle-highlight"
                x1={toSVGNumber(fX(handle.value))}
                x2={toSVGNumber(fX(handle.value))}
                y1={toSVGNumber(fY(handle.span[0]))}
                y2={toSVGNumber(fY(handle.span[1]))}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={toSVGNumber(fX(this.state.newValue))}
                  x2={toSVGNumber(fX(this.state.newValue))}
                  y1={toSVGNumber(fY(handle.span[0]))}
                  y2={toSVGNumber(fY(handle.span[1]))}
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
                y1={toSVGNumber(fY(handle.value))}
                y2={toSVGNumber(fY(handle.value))}
                x1={toSVGNumber(fX(handle.span[0]))}
                x2={toSVGNumber(fX(handle.span[1]))}
              />
              <line
                className="element-line handle-highlight"
                y1={toSVGNumber(fY(handle.value))}
                y2={toSVGNumber(fY(handle.value))}
                x1={toSVGNumber(fX(handle.span[0]))}
                x2={toSVGNumber(fX(handle.span[1]))}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={toSVGNumber(fY(this.state.newValue))}
                  y2={toSVGNumber(fY(this.state.newValue))}
                  x1={toSVGNumber(fX(handle.span[0]))}
                  x2={toSVGNumber(fX(handle.span[1]))}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

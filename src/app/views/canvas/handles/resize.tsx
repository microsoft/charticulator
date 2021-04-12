// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { ZoomInfo } from "../../../../core";
import { classNames, toSVGNumber } from "../../../utils";

export interface ResizeHandleViewProps {
  width: number;
  height: number;
  cx: number;
  cy: number;
  zoom: ZoomInfo;

  onResize: (width: number, height: number) => void;
}

export interface ResizeHandleViewState {
  dragging: boolean;
  newX1: number;
  newY1: number;
  newX2: number;
  newY2: number;
}

export class ResizeHandleView extends React.Component<
  ResizeHandleViewProps,
  ResizeHandleViewState
> {
  public refs: {
    container: SVGGElement;
    lineX1: SVGLineElement;
    lineX2: SVGLineElement;
    lineY1: SVGLineElement;
    lineY2: SVGLineElement;
    cornerX1Y1: SVGCircleElement;
    cornerX1Y2: SVGCircleElement;
    cornerX2Y1: SVGCircleElement;
    cornerX2Y2: SVGCircleElement;
  };
  public state: ResizeHandleViewState = {
    dragging: false,
    newX1: this.props.cx - this.props.width / 2,
    newY1: this.props.cy - this.props.height / 2,
    newX2: this.props.cx + this.props.width / 2,
    newY2: this.props.cy + this.props.height / 2,
  };

  public hammer: HammerManager;

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.container);
    this.hammer.add(new Hammer.Pan());

    let oldWidth: number, oldHeight: number;
    let dXIntegrate: number, dYIntegrate: number;
    let dXLast: number, dYLast: number;

    let opX: number, opY: number;

    const compute = () => {
      let newWidth = oldWidth + dXIntegrate * opX * 2;
      let newHeight = oldHeight + dYIntegrate * opY * 2;
      if (newWidth < 50) {
        newWidth = 50;
      }
      if (newHeight < 50) {
        newHeight = 50;
      }
      return [newWidth, newHeight];
    };

    this.hammer.on("panstart", (e) => {
      let element = document.elementFromPoint(
        e.center.x - e.deltaX,
        e.center.y - e.deltaY
      );
      oldWidth = this.props.width;
      oldHeight = this.props.height;
      dXIntegrate = e.deltaX / this.props.zoom.scale;
      dXLast = e.deltaX;
      dYIntegrate = -e.deltaY / this.props.zoom.scale;
      dYLast = e.deltaY;
      opX = 0;
      opY = 0;
      while (element) {
        if (element == this.refs.lineX1) {
          opX = -1;
        }
        if (element == this.refs.lineX2) {
          opX = 1;
        }
        if (element == this.refs.lineY1) {
          opY = -1;
        }
        if (element == this.refs.lineY2) {
          opY = 1;
        }
        if (element == this.refs.cornerX1Y1) {
          opX = -1;
          opY = -1;
        }
        if (element == this.refs.cornerX1Y2) {
          opX = -1;
          opY = 1;
        }
        if (element == this.refs.cornerX2Y1) {
          opX = 1;
          opY = -1;
        }
        if (element == this.refs.cornerX2Y2) {
          opX = 1;
          opY = 1;
        }
        element = element.parentElement;
      }
      const [nW, nH] = compute();
      this.setState({
        dragging: true,
        newX1: this.props.cx - nW / 2,
        newY1: this.props.cy - nH / 2,
        newX2: this.props.cx + nW / 2,
        newY2: this.props.cy + nH / 2,
      });
    });

    this.hammer.on("pan", (e) => {
      dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
      dXLast = e.deltaX;
      dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
      dYLast = e.deltaY;
      const [nW, nH] = compute();
      this.setState({
        newX1: this.props.cx - nW / 2,
        newY1: this.props.cy - nH / 2,
        newX2: this.props.cx + nW / 2,
        newY2: this.props.cy + nH / 2,
      });
    });

    this.hammer.on("panend", (e) => {
      dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
      dXLast = e.deltaX;
      dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
      dYLast = e.deltaY;
      const [nW, nH] = compute();
      this.setState({
        dragging: false,
      });
      this.props.onResize(nW, nH);
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const x1 = this.props.cx - this.props.width / 2;
    const y1 = this.props.cy - this.props.height / 2;
    const x2 = this.props.cx + this.props.width / 2;
    const y2 = this.props.cy + this.props.height / 2;
    return (
      <g
        className={classNames("handle", "handle-resize", [
          "active",
          this.state.dragging,
        ])}
        ref="container"
      >
        <g ref="lineY1" style={{ cursor: "ns-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={toSVGNumber(fX(x1))}
            y1={toSVGNumber(fY(y1))}
            x2={toSVGNumber(fX(x2))}
            y2={toSVGNumber(fY(y1))}
          />

          <line
            className="element-line handle-highlight"
            x1={toSVGNumber(fX(x1))}
            y1={toSVGNumber(fY(y1))}
            x2={toSVGNumber(fX(x2))}
            y2={toSVGNumber(fY(y1))}
          />
        </g>
        <g ref="lineY2" style={{ cursor: "ns-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={toSVGNumber(fX(x1))}
            y1={toSVGNumber(fY(y2))}
            x2={toSVGNumber(fX(x2))}
            y2={toSVGNumber(fY(y2))}
          />
          <line
            className="element-line handle-highlight"
            x1={toSVGNumber(fX(x1))}
            y1={toSVGNumber(fY(y2))}
            x2={toSVGNumber(fX(x2))}
            y2={toSVGNumber(fY(y2))}
          />
        </g>
        <g ref="lineX1" style={{ cursor: "ew-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={toSVGNumber(fX(x1))}
            y1={toSVGNumber(fY(y1))}
            x2={toSVGNumber(fX(x1))}
            y2={toSVGNumber(fY(y2))}
          />
          <line
            className="element-line handle-highlight"
            x1={toSVGNumber(fX(x1))}
            y1={toSVGNumber(fY(y1))}
            x2={toSVGNumber(fX(x1))}
            y2={toSVGNumber(fY(y2))}
          />
        </g>
        <g ref="lineX2" style={{ cursor: "ew-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={toSVGNumber(fX(x2))}
            y1={toSVGNumber(fY(y1))}
            x2={toSVGNumber(fX(x2))}
            y2={toSVGNumber(fY(y2))}
          />
          <line
            className="element-line handle-highlight"
            x1={toSVGNumber(fX(x2))}
            y1={toSVGNumber(fY(y1))}
            x2={toSVGNumber(fX(x2))}
            y2={toSVGNumber(fY(y2))}
          />
        </g>
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nesw-resize" }}
          ref="cornerX1Y1"
          cx={toSVGNumber(fX(x1))}
          cy={toSVGNumber(fY(y1))}
          r={5}
        />
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nwse-resize" }}
          ref="cornerX2Y1"
          cx={toSVGNumber(fX(x2))}
          cy={toSVGNumber(fY(y1))}
          r={5}
        />
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nwse-resize" }}
          ref="cornerX1Y2"
          cx={toSVGNumber(fX(x1))}
          cy={toSVGNumber(fY(y2))}
          r={5}
        />
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nesw-resize" }}
          ref="cornerX2Y2"
          cx={toSVGNumber(fX(x2))}
          cy={toSVGNumber(fY(y2))}
          r={5}
        />
        {this.state.dragging ? (
          <g>
            <line
              className="element-line handle-hint"
              x1={toSVGNumber(fX(this.state.newX1))}
              y1={toSVGNumber(fY(this.state.newY1))}
              x2={toSVGNumber(fX(this.state.newX2))}
              y2={toSVGNumber(fY(this.state.newY1))}
            />
            <line
              className="element-line handle-hint"
              x1={toSVGNumber(fX(this.state.newX1))}
              y1={toSVGNumber(fY(this.state.newY2))}
              x2={toSVGNumber(fX(this.state.newX2))}
              y2={toSVGNumber(fY(this.state.newY2))}
            />
            <line
              className="element-line handle-hint"
              x1={toSVGNumber(fX(this.state.newX1))}
              y1={toSVGNumber(fY(this.state.newY1))}
              x2={toSVGNumber(fX(this.state.newX1))}
              y2={toSVGNumber(fY(this.state.newY2))}
            />
            <line
              className="element-line handle-hint"
              x1={toSVGNumber(fX(this.state.newX2))}
              y1={toSVGNumber(fY(this.state.newY1))}
              x2={toSVGNumber(fX(this.state.newX2))}
              y2={toSVGNumber(fY(this.state.newY2))}
            />
          </g>
        ) : null}
      </g>
    );
  }
}

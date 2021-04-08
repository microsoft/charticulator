// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Geometry, Graphics, Prototypes } from "../../../../core";
import { classNames, toSVGNumber } from "../../../utils";
import { renderSVGPath } from "../../../renderer";
import { HandlesDragContext, HandleViewProps } from "./common";

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
      newValue: this.props.handle.value,
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

    this.hammer.on("panstart", (e) => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
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
          newValue,
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", (e) => {
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
      const alpha = Geometry.degreesToRadians(90 - handle.startAngle);
      return Math.cos(alpha) * fRadius(value);
    };
    const py = (value: number) => {
      const alpha = Geometry.degreesToRadians(90 - handle.startAngle);
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
        <g transform={`translate(${toSVGNumber(cx)},${toSVGNumber(cy)})`}>
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
              cx={toSVGNumber(px(handle.value))}
              cy={toSVGNumber(py(handle.value))}
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
                cx={toSVGNumber(px(this.state.newValue))}
                cy={toSVGNumber(py(this.state.newValue))}
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

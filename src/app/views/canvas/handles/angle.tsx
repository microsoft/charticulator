// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import { Prototypes } from "../../../../core";
import { classNames, toSVGNumber } from "../../../utils";
import { HandlesDragContext, HandleViewProps } from "./common";

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
      newValue: this.props.handle.value,
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
        const newValue = this.clipAngle(
          (Math.atan2(-px, py) / Math.PI) * 180 + 180
        );
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
        const newValue = this.clipAngle(
          (Math.atan2(-px, py) / Math.PI) * 180 + 180
        );
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
            y2={toSVGNumber(radius)}
            className="element-line handle-ghost"
          />
          <path
            d={shapeF(9)}
            transform={`translate(0,${toSVGNumber(radius)})`}
            className="element-shape handle-ghost"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={toSVGNumber(radius)}
            className="element-line handle-highlight"
          />
          <path
            d={shapeF(5)}
            transform={`translate(0,${toSVGNumber(radius)})`}
            className="element-shape handle-highlight"
          />
        </g>
        {this.state.dragging ? (
          <g
            transform={`translate(${toSVGNumber(cx)},${toSVGNumber(
              cy
            )}) rotate(${180 + this.state.newValue})`}
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={toSVGNumber(radius)}
              className="element-line handle-hint"
            />
            <path
              d={shapeF(5)}
              transform={`translate(0,${toSVGNumber(radius)})`}
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

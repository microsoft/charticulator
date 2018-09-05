/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as Hammer from "hammerjs";

export interface MarqueeSelection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SelectionViewProps {
  x: number;
  y: number;
  width: number;
  height: number;

  onTap?: () => void;
  onMarqueeSelect?: (selection: MarqueeSelection) => void;
}

export interface SelectionViewState {
  marquee?: MarqueeSelection;
}

export class SelectionView extends React.Component<
  SelectionViewProps,
  SelectionViewState
> {
  public refs: {
    handler: SVGRectElement;
  };

  constructor(props: SelectionViewProps) {
    super(props);
    this.state = this.getDefaultState();
  }

  public hammer: HammerManager;

  public getDefaultState(): SelectionViewState {
    return {
      marquee: null
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.handler);
    this.hammer.add(new Hammer.Pan());
    this.hammer.add(new Hammer.Tap());

    this.hammer.on("tap", () => {
      this.setState({
        marquee: null
      });
      if (this.props.onTap) {
        this.props.onTap();
      }
    });

    let currentMarquee: MarqueeSelection = null;
    this.hammer.on("panstart", e => {
      const rect = this.refs.handler.getBoundingClientRect();
      const [x, y] = [e.center.x - rect.left, e.center.y - rect.top];
      currentMarquee = {
        x1: x,
        y1: y,
        x2: x,
        y2: y
      };
    });
    this.hammer.on("pan", e => {
      const rect = this.refs.handler.getBoundingClientRect();
      const [x, y] = [e.center.x - rect.left, e.center.y - rect.top];
      currentMarquee.x2 = x;
      currentMarquee.y2 = y;
      this.setState({
        marquee: currentMarquee
      });
    });
    this.hammer.on("panend", e => {
      const rect = this.refs.handler.getBoundingClientRect();
      const [x, y] = [e.center.x - rect.left, e.center.y - rect.top];
      currentMarquee.x2 = x;
      currentMarquee.y2 = y;
      if (this.props.onMarqueeSelect) {
        this.props.onMarqueeSelect(currentMarquee);
      }
      this.setState({
        marquee: null
      });
    });
  }

  public render() {
    return (
      <g>
        <rect
          ref="handler"
          className="interaction-handler"
          style={{ cursor: "crosshair" }}
          x={this.props.x}
          y={this.props.y}
          width={this.props.width}
          height={this.props.height}
        />
        {this.state.marquee ? (
          <rect
            className="marquee-selection"
            x={Math.min(this.state.marquee.x1, this.state.marquee.x2)}
            y={Math.min(this.state.marquee.y1, this.state.marquee.y2)}
            width={Math.abs(this.state.marquee.x2 - this.state.marquee.x1)}
            height={Math.abs(this.state.marquee.y2 - this.state.marquee.y1)}
          />
        ) : null}
      </g>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Hammer from "hammerjs";
import * as React from "react";
import { classNames } from "../../../../utils";

export interface SliderProps {
  width: number;
  defaultValue?: number;

  min: number;
  max: number;

  mapping?: "linear" | "sqrt";

  onChange?: (value: number, final: boolean) => void;
}

export interface SliderState {
  currentValue: number;
  dragging: boolean;
}

export class Slider extends React.Component<SliderProps, SliderState> {
  public refs: {
    svg: SVGElement;
  };
  constructor(props: SliderProps) {
    super(props);
    this.state = {
      currentValue: props.defaultValue,
      dragging: false
    };
  }

  public hammer: HammerManager;

  public componentWillReceiveProps(props: SliderProps) {
    this.setState({
      currentValue: props.defaultValue
    });
  }

  public niceValue(v: number) {
    const digits = Math.ceil(
      Math.log(this.props.max - this.props.min) / Math.log(10) + 2
    );
    v = parseFloat(v.toPrecision(digits));
    v = Math.min(this.props.max, Math.max(this.props.min, v));
    return v;
  }

  public valueToRatio(v: number) {
    if (this.props.mapping == "sqrt") {
      return (
        (Math.sqrt(v) - Math.sqrt(this.props.min)) /
        (Math.sqrt(this.props.max) - Math.sqrt(this.props.min))
      );
    } else {
      return (v - this.props.min) / (this.props.max - this.props.min);
    }
  }
  public ratioToValue(r: number) {
    if (this.props.mapping == "sqrt") {
      const f =
        r * (Math.sqrt(this.props.max) - Math.sqrt(this.props.min)) +
        Math.sqrt(this.props.min);
      return f * f;
    } else {
      return r * (this.props.max - this.props.min) + this.props.min;
    }
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.svg);
    this.hammer.add(new Hammer.Pan({ threshold: 0 }));
    this.hammer.add(new Hammer.Tap());

    const margin = 13;

    this.hammer.on("panstart pan panend tap", e => {
      const left = this.refs.svg.getBoundingClientRect().left;
      const x = e.center.x - left;
      let pos = (x - margin) / (this.props.width - margin - margin);
      pos = Math.max(0, Math.min(1, pos));
      const value = this.niceValue(this.ratioToValue(pos));
      this.setState({
        currentValue: value
      });
      if (this.props.onChange) {
        if (e.type == "panend" || e.type == "tap") {
          this.props.onChange(value, true);
        } else {
          this.props.onChange(value, false);
        }
      }
      if (e.type == "panstart") {
        this.setState({
          dragging: true
        });
      }
      if (e.type == "panend") {
        this.setState({
          dragging: false
        });
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const height = 24;
    const { min, max, width } = this.props;
    const margin = height / 2 + 1;
    const scale = (v: number) =>
      this.valueToRatio(v) * (width - margin - margin) + margin;
    const y = height / 2;
    const px = scale(
      this.state.currentValue != null
        ? this.state.currentValue
        : (min + max) / 2
    );
    return (
      <span className="charticulator__widget-control-slider">
        <svg
          width={width}
          height={height}
          ref="svg"
          className={classNames(
            ["invalid", this.state.currentValue == null],
            ["active", this.state.dragging]
          )}
        >
          <line
            className="track"
            x1={margin}
            x2={width - margin}
            y1={y}
            y2={y}
          />
          <line className="track-highlight" x1={margin} x2={px} y1={y} y2={y} />
          <circle className="indicator" cx={px} cy={y} r={(height / 2) * 0.5} />
        </svg>
      </span>
    );
  }
}

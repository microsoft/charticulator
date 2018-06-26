import * as React from "react";
import * as R from "../../../resources";
import * as Hammer from "hammerjs";

import { classNames } from "../../../utils";
import { prettyNumber } from "../../../../core";
import { SVGImageIcon, DropdownButton } from "../../../components";

export interface InputTextProps {
  defaultValue?: string;
  placeholder?: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}

export class InputText extends React.Component<InputTextProps, {}> {
  public inputElement: HTMLInputElement;

  public componentWillUpdate(newProps: InputTextProps) {
    this.inputElement.value = newProps.defaultValue;
  }

  public doEnter() {
    if (this.props.defaultValue == this.inputElement.value) {
      return;
    }
    if (this.props.onEnter) {
      const ret = this.props.onEnter(this.inputElement.value);
      if (!ret) {
        this.inputElement.value = this.props.defaultValue;
      }
    } else {
      this.inputElement.value = this.props.defaultValue;
    }
  }

  public doCancel() {
    this.inputElement.value = this.props.defaultValue;
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  public get value() {
    return this.inputElement.value;
  }

  public set value(v: string) {
    this.inputElement.value = v;
  }

  public render() {
    return (
      <input
        type="text"
        ref={e => (this.inputElement = e)}
        defaultValue={this.props.defaultValue}
        placeholder={this.props.placeholder}
        onKeyDown={e => {
          if (e.key == "Enter") {
            this.doEnter();
          }
          if (e.key == "Escape") {
            this.doCancel();
          }
        }}
        onFocus={e => {
          e.currentTarget.select();
        }}
        onBlur={() => {
          this.doEnter();
        }}
      />
    );
  }
}

export interface SliderProps {
  width: number;
  defaultValue?: number;

  min: number;
  max: number;

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
      Math.log(this.props.max - this.props.min) / Math.log(10) + 1
    );
    v = parseFloat(v.toPrecision(digits));
    v = Math.min(this.props.max, Math.max(this.props.min, v));
    return v;
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
      const value = this.niceValue(
        pos * (this.props.max - this.props.min) + this.props.min
      );
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
      (v - min) / (max - min) * (width - margin - margin) + margin;
    const y = height / 2;
    const px = scale(
      this.state.currentValue != null
        ? this.state.currentValue
        : (min + max) / 2
    );
    return (
      <span className="slider-control">
        <svg width={width} height={height} ref="svg">
          <line
            className="track"
            x1={margin}
            x2={width - margin}
            y1={y}
            y2={y}
          />
          <g
            className={classNames(
              "knob",
              ["invalid", this.state.currentValue == null],
              ["active", this.state.dragging]
            )}
          >
            <line
              className="track-highlight"
              x1={margin}
              x2={px}
              y1={y}
              y2={y}
            />
            <circle className="indicator" cx={px} cy={y} r={height / 2 * 0.5} />
          </g>
        </svg>
      </span>
    );
  }
}

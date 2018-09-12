// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as Hammer from "hammerjs";
import * as React from "react";
import {
  Color,
  colorFromHTMLColor,
  colorToHTMLColor,
  colorToHTMLColorHEX,
  prettyNumber
} from "../../core";
import { DropdownButton } from "./dropdown";

export interface ColorSpaceDescription {
  name: string;
  description: string;
  dimension1: { name: string; range: [number, number] };
  dimension2: { name: string; range: [number, number] };
  dimension3: { name: string; range: [number, number] };
  toRGB: (
    x1: number,
    x2: number,
    x3: number
  ) => [number, number, number, boolean];
  fromRGB: (r: number, g: number, b: number) => [number, number, number];
}

export interface ColorSpacePickerProps {
  defaultValue: Color;
  onChange?: (newValue: Color) => void;
  colorSpaces: ColorSpaceDescription[];
}

export interface ColorSpacePickerState {
  desc: ColorSpaceDescription;
  x1: number;
  x2: number;
  x3: number;
}

function clipToRange(num: number, range: [number, number]) {
  if (range[0] < range[1]) {
    return Math.max(range[0], Math.min(range[1], num));
  } else {
    return Math.max(range[1], Math.min(range[0], num));
  }
}

// A general three component color picker
export class ColorSpacePicker extends React.Component<
  ColorSpacePickerProps,
  ColorSpacePickerState
> {
  public pickerSize = 200;

  constructor(props: ColorSpacePickerProps) {
    super(props);

    const defaultValue = props.defaultValue || { r: 0, g: 0, b: 0 };
    const [x1, x2, x3] = props.colorSpaces[0].fromRGB(
      defaultValue.r,
      defaultValue.g,
      defaultValue.b
    );
    this.state = {
      desc: props.colorSpaces[0],
      x1,
      x2,
      x3
    };
  }

  public componentWillUpdate() {}

  public reset() {
    const props = this.props;
    const defaultValue = props.defaultValue || { r: 0, g: 0, b: 0 };
    const [x1, x2, x3] = this.state.desc.fromRGB(
      defaultValue.r,
      defaultValue.g,
      defaultValue.b
    );
    this.setState({ x1, x2, x3 }, () => this.raiseChange());
  }

  public raiseChange() {
    const currentColor = this.state.desc.toRGB(
      this.state.x1,
      this.state.x2,
      this.state.x3
    );
    const rgb = { r: currentColor[0], g: currentColor[1], b: currentColor[2] };
    if (this.props.onChange) {
      this.props.onChange(rgb);
    }
  }

  public renderZ() {
    const width = 30;
    const height = this.pickerSize;
    const cWidth = 5;
    const cHeight = this.pickerSize * 2;
    const [x1Min, x1Max] = this.state.desc.dimension1.range;
    return (
      <ZCanvas
        width={width}
        height={height}
        canvasWidth={cWidth}
        canvasHeight={cHeight}
        x1Offset={x1Min}
        x1StrideZ={x1Max - x1Min}
        x2Offset={this.state.x2}
        x2StrideZ={0}
        x3Offset={this.state.x3}
        x3StrideZ={0}
        pz={(this.state.x1 - x1Min) / (x1Max - x1Min)}
        toRGB={this.state.desc.toRGB}
        onMove={(value, isEnd) => {
          this.setState({ x1: value * (x1Max - x1Min) + x1Min }, () => {
            if (isEnd) {
              this.raiseChange();
            }
          });
        }}
      />
    );
  }

  public renderXY() {
    const width = this.pickerSize;
    const height = this.pickerSize;
    const cWidth = this.pickerSize;
    const cHeight = this.pickerSize;
    const [x2Min, x2Max] = this.state.desc.dimension2.range;
    const [x3Min, x3Max] = this.state.desc.dimension3.range;
    return (
      <XYCanvas
        width={width}
        height={height}
        canvasWidth={cWidth}
        canvasHeight={cHeight}
        x1Offset={this.state.x1}
        x1StrideX={0}
        x1StrideY={0}
        x2Offset={x2Min}
        x2StrideX={x2Max - x2Min}
        x2StrideY={0}
        x3Offset={x3Min}
        x3StrideX={0}
        x3StrideY={x3Max - x3Min}
        px={(this.state.x2 - x2Min) / (x2Max - x2Min)}
        py={(this.state.x3 - x3Min) / (x3Max - x3Min)}
        toRGB={this.state.desc.toRGB}
        onMove={(v2, v3, isEnd) => {
          this.setState(
            {
              x2: v2 * (x2Max - x2Min) + x2Min,
              x3: v3 * (x3Max - x3Min) + x3Min
            },
            () => {
              if (isEnd) {
                this.raiseChange();
              }
            }
          );
        }}
      />
    );
  }
  public render() {
    const currentColor = this.state.desc.toRGB(
      this.state.x1,
      this.state.x2,
      this.state.x3
    );
    const rgb = { r: currentColor[0], g: currentColor[1], b: currentColor[2] };
    return (
      <div className="hcl-color-picker">
        <div className="part-picker">
          <section className="palette-xy">{this.renderXY()}</section>
          <section className="palette-z">{this.renderZ()}</section>
          <section className="values">
            <div className="row">
              <DropdownButton
                text={this.state.desc.name}
                list={this.props.colorSpaces.map(x => ({
                  name: x.name,
                  text: x.description
                }))}
                onSelect={(v: string) => {
                  for (const sp of this.props.colorSpaces) {
                    if (sp.name == v) {
                      const [r, g, b] = this.state.desc.toRGB(
                        this.state.x1,
                        this.state.x2,
                        this.state.x3
                      );
                      const [x1, x2, x3] = sp.fromRGB(r, g, b);
                      this.setState({ desc: sp, x1, x2, x3 });
                    }
                  }
                }}
              />
            </div>
            <div className="row">
              <div className="columns">
                <div className="column">
                  <span className="current-color">
                    <span style={{ backgroundColor: colorToHTMLColor(rgb) }} />
                  </span>
                </div>
                <div className="column">
                  <label>HEX</label>
                  <InputField
                    defaultValue={colorToHTMLColorHEX(rgb)}
                    onEnter={v => {
                      const color = colorFromHTMLColor(v);
                      if (color) {
                        const [x1, x2, x3] = this.state.desc.fromRGB(
                          color.r,
                          color.g,
                          color.b
                        );
                        this.setState({ x1, x2, x3 }, () => this.raiseChange());

                        return true;
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="columns">
              <div className="column">
                <div className="row">
                  <label>{this.state.desc.dimension1.name}</label>
                  <InputField
                    defaultValue={prettyNumber(this.state.x1, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = clipToRange(
                          num,
                          this.state.desc.dimension1.range
                        );
                        this.setState({ x1: num }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>{this.state.desc.dimension2.name}</label>
                  <InputField
                    defaultValue={prettyNumber(this.state.x2, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = clipToRange(
                          num,
                          this.state.desc.dimension2.range
                        );
                        this.setState({ x2: num }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>{this.state.desc.dimension3.name}</label>
                  <InputField
                    defaultValue={prettyNumber(this.state.x3, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = clipToRange(
                          num,
                          this.state.desc.dimension3.range
                        );
                        this.setState({ x3: num }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
              </div>
              <div className="column">
                <div className="row">
                  <label>R</label>
                  <InputField
                    defaultValue={prettyNumber(rgb.r, 0)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(255, num));
                        const [x1, x2, x3] = this.state.desc.fromRGB(
                          num,
                          rgb.g,
                          rgb.b
                        );
                        this.setState({ x1, x2, x3 }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>G</label>
                  <InputField
                    defaultValue={prettyNumber(rgb.g, 0)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(255, num));
                        const [x1, x2, x3] = this.state.desc.fromRGB(
                          rgb.r,
                          num,
                          rgb.b
                        );
                        this.setState({ x1, x2, x3 }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>B</label>
                  <InputField
                    defaultValue={prettyNumber(rgb.b, 0)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(255, num));
                        const [x1, x2, x3] = this.state.desc.fromRGB(
                          rgb.r,
                          rgb.g,
                          num
                        );
                        this.setState({ x1, x2, x3 }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }
}

export interface InputFieldProps {
  defaultValue?: string;
  onEnter?: (value: string) => boolean;
}

export class InputField extends React.Component<InputFieldProps, {}> {
  public inputElement: HTMLInputElement;

  public componentWillUpdate(newProps: InputFieldProps) {
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
        autoFocus={true}
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

interface XYCanvasProps {
  width: number;
  height: number;

  canvasWidth: number;
  canvasHeight: number;

  px: number;
  py: number;

  x1Offset: number;
  x1StrideX: number;
  x1StrideY: number;
  x2Offset: number;
  x2StrideX: number;
  x2StrideY: number;
  x3Offset: number;
  x3StrideX: number;
  x3StrideY: number;

  toRGB: (
    x1: number,
    x2: number,
    x3: number
  ) => [number, number, number, boolean];

  onMove: (nx: number, ny: number, isEnd: boolean) => void;
}

class XYCanvas extends React.PureComponent<XYCanvasProps, {}> {
  public refs: {
    canvasElement: HTMLCanvasElement;
  };

  private hammer: HammerManager;

  public componentDidMount() {
    this.renderCanvas();

    this.hammer = new Hammer(this.refs.canvasElement);
    this.hammer.add(new Hammer.Pan({ threshold: 0 }));
    this.hammer.add(new Hammer.Tap());

    this.hammer.on("panstart tap pan panend", e => {
      const bounds = this.refs.canvasElement.getBoundingClientRect();
      let x = e.center.x - bounds.left;
      let y = e.center.y - bounds.top;
      x /= this.props.width;
      y /= this.props.height;
      const isEnd = e.type == "tap" || e.type == "panend";
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));
      this.props.onMove(x, y, isEnd);
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
    this.hammer = null;
  }

  public componentDidUpdate() {
    this.renderCanvas();
  }

  public renderCanvas() {
    const canvas = this.refs.canvasElement;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, width, height);
    const { x1Offset, x2Offset, x3Offset } = this.props;
    let { x1StrideX, x1StrideY } = this.props;
    let { x2StrideX, x2StrideY } = this.props;
    let { x3StrideX, x3StrideY } = this.props;
    x1StrideX /= data.width - 1;
    x2StrideX /= data.width - 1;
    x3StrideX /= data.width - 1;
    x1StrideY /= data.height - 1;
    x2StrideY /= data.height - 1;
    x3StrideY /= data.height - 1;
    let ptr = 0;
    for (let j = 0; j < data.height; j++) {
      const th = x1Offset + j * x1StrideY;
      const tc = x2Offset + j * x2StrideY;
      const tl = x3Offset + j * x3StrideY;
      for (let i = 0; i < data.width; i++) {
        const color = this.props.toRGB(
          th + i * x1StrideX,
          tc + i * x2StrideX,
          tl + i * x3StrideX
        );
        data.data[ptr++] = color[0];
        data.data[ptr++] = color[1];
        data.data[ptr++] = color[2];
        data.data[ptr++] = color[3] ? 128 : 255;
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  public render() {
    const { width, height, canvasWidth, canvasHeight, px, py } = this.props;
    const x = px * (width - 1) + 0.5;
    const y = py * (height - 1) + 0.5;
    return (
      <div className="canvas-xy">
        <div className="canvas-container" style={{ padding: "2px 2px" }}>
          <canvas
            ref="canvasElement"
            width={canvasWidth}
            height={canvasHeight}
            style={{ width: width + "px", height: height + "px" }}
          />
        </div>
        <svg width={width + 4} height={height + 4}>
          <g transform="translate(2, 2)">
            <circle className="bg" cx={x} cy={y} r={5} />
            <circle className="fg" cx={x} cy={y} r={5} />
          </g>
        </svg>
      </div>
    );
  }
}

interface ZCanvasProps {
  width: number;
  height: number;

  canvasWidth: number;
  canvasHeight: number;

  pz: number;

  x1Offset: number;
  x1StrideZ: number;
  x2Offset: number;
  x2StrideZ: number;
  x3Offset: number;
  x3StrideZ: number;

  toRGB: (
    x1: number,
    x2: number,
    x3: number
  ) => [number, number, number, boolean];

  onMove: (nz: number, isEnd: boolean) => void;
}

class ZCanvas extends React.PureComponent<ZCanvasProps, {}> {
  public refs: {
    canvasElement: HTMLCanvasElement;
  };

  constructor(props: ZCanvasProps) {
    super(props);
  }

  private hammer: HammerManager;

  public componentDidMount() {
    this.renderCanvas();

    this.hammer = new Hammer(this.refs.canvasElement);
    this.hammer.add(new Hammer.Pan({ threshold: 0 }));
    this.hammer.add(new Hammer.Tap());

    this.hammer.on("panstart tap pan panend", e => {
      const bounds = this.refs.canvasElement.getBoundingClientRect();
      let y = e.center.y - bounds.top;
      y /= this.props.height;
      const isEnd = e.type == "tap" || e.type == "panend";
      y = Math.max(0, Math.min(1, y));
      this.props.onMove(y, isEnd);
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
    this.hammer = null;
  }

  public componentDidUpdate() {
    this.renderCanvas();
  }

  public renderCanvas() {
    const canvas = this.refs.canvasElement;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, width, height);
    const { x1Offset, x2Offset, x3Offset } = this.props;
    let { x1StrideZ, x2StrideZ, x3StrideZ } = this.props;
    x1StrideZ /= data.height - 1;
    x2StrideZ /= data.height - 1;
    x3StrideZ /= data.height - 1;
    let ptr = 0;
    for (let j = 0; j < data.height; j++) {
      const th = x1Offset + j * x1StrideZ;
      const tc = x2Offset + j * x2StrideZ;
      const tl = x3Offset + j * x3StrideZ;
      const color = this.props.toRGB(th, tc, tl);
      for (let i = 0; i < data.width; i++) {
        data.data[ptr++] = color[0];
        data.data[ptr++] = color[1];
        data.data[ptr++] = color[2];
        data.data[ptr++] = color[3] ? 128 : 255;
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  public render() {
    const { width, height, canvasWidth, canvasHeight, pz } = this.props;
    const z = pz * (height - 1) + 0.5;
    return (
      <div className="canvas-z">
        <div className="canvas-container" style={{ padding: "2px 2px" }}>
          <canvas
            ref="canvasElement"
            width={canvasWidth}
            height={canvasHeight}
            style={{ width: width + "px", height: height + "px" }}
          />
        </div>
        <svg width={width + 4} height={height + 4}>
          <g transform="translate(2, 2)">
            <rect className="bg" x={0} y={z - 2} width={30} height={4} />
            <rect className="fg" x={0} y={z - 2} width={30} height={4} />
          </g>
        </svg>
      </div>
    );
  }
}

import * as React from "react";
import {
  Color,
  colorFromHTMLColor,
  getColorConverter,
  colorToHTMLColor,
  prettyNumber,
  colorToHTMLColorHEX,
  ColorConverter
} from "../../core";
import { DropdownButton } from "./dropdown";
import { ButtonFlatPanel } from "./buttons";
import * as Hammer from "hammerjs";

export interface HCLColorPickerProps {
  defaultValue: Color;
  onChange?: (newValue: Color) => void;
}

export interface HCLColorPickerState {
  zAxis: "h" | "c" | "l";
  colorspace: string;
  h: number;
  c: number;
  l: number;
}

const C_MAX = 140;
const L_MAX = 100;
const H_MAX = 360;

export class HCLColorPicker extends React.Component<
  HCLColorPickerProps,
  HCLColorPickerState
> {
  public pickerSize = 200;

  public rgb2hcl: ColorConverter;
  public hcl2rgb: ColorConverter;

  constructor(props: HCLColorPickerProps) {
    super(props);

    this.rgb2hcl = getColorConverter("sRGB", "hcl");
    this.hcl2rgb = getColorConverter("hcl", "sRGB");
    const [h, c, l] = this.rgb2hcl(
      props.defaultValue.r,
      props.defaultValue.g,
      props.defaultValue.b
    );
    this.state = {
      colorspace: "sRGB",
      zAxis: "l",
      h,
      c,
      l
    };
  }

  public componentWillUpdate() {
    this.rgb2hcl = getColorConverter(this.state.colorspace, "hcl");
    this.hcl2rgb = getColorConverter("hcl", this.state.colorspace);
  }

  public reset() {
    const props = this.props;
    const [h, c, l] = this.rgb2hcl(
      props.defaultValue.r,
      props.defaultValue.g,
      props.defaultValue.b
    );
    this.setState(
      {
        h,
        c,
        l
      },
      () => this.raiseChange()
    );
  }

  public raiseChange() {
    const currentColor = this.hcl2rgb(this.state.h, this.state.c, this.state.l);
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
    switch (this.state.zAxis) {
      case "h": {
        return (
          <ZCanvas
            width={width}
            height={height}
            canvasWidth={cWidth}
            canvasHeight={cHeight}
            hOffset={0}
            hStrideZ={H_MAX}
            cOffset={this.state.c}
            cStrideZ={0}
            lOffset={this.state.l}
            lStrideZ={0}
            pz={this.state.h / H_MAX}
            colorspace={this.state.colorspace}
            onMove={(h, isEnd) => {
              this.setState({ h: h * H_MAX }, () => {
                if (isEnd) {
                  this.raiseChange();
                }
              });
            }}
          />
        );
      }
      case "c": {
        return (
          <ZCanvas
            width={width}
            height={height}
            canvasWidth={cWidth}
            canvasHeight={cHeight}
            hOffset={this.state.h}
            hStrideZ={0}
            cOffset={C_MAX}
            cStrideZ={-C_MAX}
            lOffset={this.state.l}
            lStrideZ={0}
            pz={1 - this.state.c / C_MAX}
            colorspace={this.state.colorspace}
            onMove={(c, isEnd) => {
              this.setState({ c: (1 - c) * C_MAX }, () => {
                if (isEnd) {
                  this.raiseChange();
                }
              });
            }}
          />
        );
      }
      case "l": {
        return (
          <ZCanvas
            width={width}
            height={height}
            canvasWidth={cWidth}
            canvasHeight={cHeight}
            hOffset={this.state.h}
            hStrideZ={0}
            cOffset={this.state.c}
            cStrideZ={0}
            lOffset={L_MAX}
            lStrideZ={-L_MAX}
            pz={1 - this.state.l / L_MAX}
            colorspace={this.state.colorspace}
            onMove={(l, isEnd) => {
              this.setState({ l: (1 - l) * L_MAX }, () => {
                if (isEnd) {
                  this.raiseChange();
                }
              });
            }}
          />
        );
      }
    }
  }

  public renderXY() {
    const width = this.pickerSize;
    const height = this.pickerSize;
    const cWidth = this.pickerSize;
    const cHeight = this.pickerSize;
    switch (this.state.zAxis) {
      case "h": {
        return (
          <XYCanvas
            width={width}
            height={height}
            canvasWidth={cWidth}
            canvasHeight={cHeight}
            hOffset={this.state.h}
            hStrideX={0}
            hStrideY={0}
            cOffset={0}
            cStrideX={C_MAX}
            cStrideY={0}
            lOffset={L_MAX}
            lStrideX={0}
            lStrideY={-L_MAX}
            px={this.state.c / C_MAX}
            py={1 - this.state.l / L_MAX}
            colorspace={this.state.colorspace}
            onMove={(c, l, isEnd) => {
              this.setState({ c: c * C_MAX, l: (1 - l) * L_MAX }, () => {
                if (isEnd) {
                  this.raiseChange();
                }
              });
            }}
          />
        );
      }
      case "c": {
        return (
          <XYCanvas
            width={width}
            height={height}
            canvasWidth={cWidth}
            canvasHeight={cHeight}
            hOffset={0}
            hStrideX={H_MAX}
            hStrideY={0}
            cOffset={this.state.c}
            cStrideX={0}
            cStrideY={0}
            lOffset={L_MAX}
            lStrideX={0}
            lStrideY={-L_MAX}
            px={this.state.h / H_MAX}
            py={1 - this.state.l / L_MAX}
            colorspace={this.state.colorspace}
            onMove={(h, l, isEnd) => {
              this.setState({ h: h * H_MAX, l: (1 - l) * L_MAX }, () => {
                if (isEnd) {
                  this.raiseChange();
                }
              });
            }}
          />
        );
      }
      case "l": {
        return (
          <XYCanvas
            width={width}
            height={height}
            canvasWidth={cWidth}
            canvasHeight={cHeight}
            hOffset={0}
            hStrideX={H_MAX}
            hStrideY={0}
            cOffset={C_MAX}
            cStrideX={0}
            cStrideY={-C_MAX}
            lOffset={this.state.l}
            lStrideX={0}
            lStrideY={0}
            px={this.state.h / H_MAX}
            py={1 - this.state.c / C_MAX}
            colorspace={this.state.colorspace}
            onMove={(h, c, isEnd) => {
              this.setState({ h: h * H_MAX, c: (1 - c) * C_MAX }, () => {
                if (isEnd) {
                  this.raiseChange();
                }
              });
            }}
          />
        );
      }
    }
  }
  public render() {
    const currentColor = this.hcl2rgb(this.state.h, this.state.c, this.state.l);
    const rgb = { r: currentColor[0], g: currentColor[1], b: currentColor[2] };
    return (
      <div className="hcl-color-picker">
        <div className="part-picker">
          <section className="palette-xy">{this.renderXY()}</section>
          <section className="palette-z">{this.renderZ()}</section>
          <section className="values">
            <div className="row">
              <DropdownButton
                text={
                  { h: "Hue", c: "Chroma", l: "Lightness" }[this.state.zAxis]
                }
                list={[
                  { name: "h", text: "Chroma, Lightness | Hue" },
                  { name: "c", text: "Hue, Lightness | Chroma" },
                  { name: "l", text: "Hue, Chroma | Lightness" }
                ]}
                onSelect={(v: "h" | "c" | "l") => {
                  this.setState({ zAxis: v });
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
                        const hcl = this.rgb2hcl(color.r, color.g, color.b);
                        this.setState(
                          {
                            h: hcl[0],
                            c: hcl[1],
                            l: hcl[2]
                          },
                          () => this.raiseChange()
                        );

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
                  <label>Hue</label>
                  <InputField
                    defaultValue={prettyNumber(this.state.h, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(H_MAX, num));
                        this.setState({ h: num }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>Chroma</label>
                  <InputField
                    defaultValue={prettyNumber(this.state.c, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(C_MAX, num));
                        this.setState({ c: num }, () => this.raiseChange());
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>Lightness</label>
                  <InputField
                    defaultValue={prettyNumber(this.state.l, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(L_MAX, num));
                        this.setState({ l: num }, () => this.raiseChange());
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
                    defaultValue={prettyNumber(rgb.r, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(255, num));
                        const hcl = this.rgb2hcl(num, rgb.g, rgb.b);
                        this.setState(
                          {
                            h: hcl[0],
                            c: hcl[1],
                            l: hcl[2]
                          },
                          () => this.raiseChange()
                        );
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>G</label>
                  <InputField
                    defaultValue={prettyNumber(rgb.g, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(255, num));
                        const hcl = this.rgb2hcl(rgb.r, num, rgb.b);
                        this.setState(
                          {
                            h: hcl[0],
                            c: hcl[1],
                            l: hcl[2]
                          },
                          () => this.raiseChange()
                        );
                        return true;
                      }
                    }}
                  />
                </div>
                <div className="row">
                  <label>B</label>
                  <InputField
                    defaultValue={prettyNumber(rgb.b, 1)}
                    onEnter={v => {
                      let num = parseFloat(v);
                      if (num == num && num != null) {
                        num = Math.max(0, Math.min(255, num));
                        const hcl = this.rgb2hcl(rgb.r, rgb.g, num);
                        this.setState(
                          {
                            h: hcl[0],
                            c: hcl[1],
                            l: hcl[2]
                          },
                          () => this.raiseChange()
                        );
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

  hOffset: number;
  hStrideX: number;
  hStrideY: number;
  cOffset: number;
  cStrideX: number;
  cStrideY: number;
  lOffset: number;
  lStrideX: number;
  lStrideY: number;

  colorspace: string;

  onMove: (nx: number, ny: number, isEnd: boolean) => void;
}

class XYCanvas extends React.PureComponent<XYCanvasProps, {}> {
  public refs: {
    canvasElement: HTMLCanvasElement;
  };

  public hcl2rgb: ColorConverter;

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
    this.hcl2rgb = getColorConverter("hcl", this.props.colorspace);
    const canvas = this.refs.canvasElement;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, width, height);
    const { hOffset, cOffset, lOffset } = this.props;
    let { hStrideX, hStrideY } = this.props;
    let { cStrideX, cStrideY } = this.props;
    let { lStrideX, lStrideY } = this.props;
    hStrideX /= data.width - 1;
    cStrideX /= data.width - 1;
    lStrideX /= data.width - 1;
    hStrideY /= data.height - 1;
    cStrideY /= data.height - 1;
    lStrideY /= data.height - 1;
    let ptr = 0;
    for (let j = 0; j < data.height; j++) {
      const th = hOffset + j * hStrideY;
      const tc = cOffset + j * cStrideY;
      const tl = lOffset + j * lStrideY;
      for (let i = 0; i < data.width; i++) {
        const color = this.hcl2rgb(
          th + i * hStrideX,
          tc + i * cStrideX,
          tl + i * lStrideX
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

  hOffset: number;
  hStrideZ: number;
  cOffset: number;
  cStrideZ: number;
  lOffset: number;
  lStrideZ: number;

  colorspace: string;

  onMove: (nz: number, isEnd: boolean) => void;
}

class ZCanvas extends React.PureComponent<ZCanvasProps, {}> {
  public refs: {
    canvasElement: HTMLCanvasElement;
  };

  public hcl2rgb: ColorConverter;

  constructor(props: ZCanvasProps) {
    super(props);

    this.hcl2rgb = getColorConverter("hcl", props.colorspace);
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
    const { hOffset, cOffset, lOffset } = this.props;
    let { hStrideZ, cStrideZ, lStrideZ } = this.props;
    hStrideZ /= data.height - 1;
    cStrideZ /= data.height - 1;
    lStrideZ /= data.height - 1;
    let ptr = 0;
    for (let j = 0; j < data.height; j++) {
      const th = hOffset + j * hStrideZ;
      const tc = cOffset + j * cStrideZ;
      const tl = lOffset + j * lStrideZ;
      const color = this.hcl2rgb(th, tc, tl);
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

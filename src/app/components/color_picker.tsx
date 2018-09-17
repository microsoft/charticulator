// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import {
  Color,
  ColorGradient,
  colorFromHTMLColor,
  getColorConverter,
  colorToHTMLColor,
  colorToHTMLColorHEX,
  prettyNumber,
  deepClone,
  Prototypes,
  interpolateColors
} from "../../core";
import { ColorPalette, predefinedPalettes, getSVGIcon } from "../resources";
import { DropdownButton } from "./dropdown";
import { ButtonFlatPanel } from "./buttons";
import { classNames } from "../utils";
import * as globals from "../globals";
import { PopupView } from "../controllers";
import { HCLColorPicker, InputField } from "./hcl_color_picker";

export interface ColorPickerProps {
  defaultValue?: Color;
  onPick?: (color: Color) => void;
}

export interface ColorPickerState {
  currentPalette?: ColorPalette;
  currentPicker?: string;
  currentColor?: Color;
}

function colorToCSS(color: Color) {
  return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(
    0
  )})`;
}

export interface ColorGridProps {
  defaultValue?: Color;
  colors: Color[][];
  onClick?: (color: Color) => void;
}
export class ColorGrid extends React.PureComponent<ColorGridProps, {}> {
  public render() {
    return (
      <div className="color-grid">
        {this.props.colors.map((colors, index) => (
          <div className="color-row" key={`m${index}`}>
            {colors.map((color, i) => (
              <span
                key={`m${i}`}
                className={classNames("color-item", [
                  "active",
                  this.props.defaultValue != null &&
                    colorToCSS(this.props.defaultValue) == colorToCSS(color)
                ])}
                onClick={() => {
                  if (this.props.onClick) {
                    this.props.onClick(color);
                  }
                }}
              >
                <span style={{ backgroundColor: colorToCSS(color) }} />
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export interface PaletteListProps {
  selected: ColorPalette;
  palettes: ColorPalette[];
  onClick?: (palette: ColorPalette) => void;
}

export class PaletteList extends React.PureComponent<PaletteListProps, {}> {
  public render() {
    const palettes = this.props.palettes;

    const groups: Array<[string, ColorPalette[]]> = [];
    const group2Index = new Map<string, number>();
    for (const p of palettes) {
      const groupName = p.name.split("/")[0];
      let group: ColorPalette[];
      if (group2Index.has(groupName)) {
        group = groups[group2Index.get(groupName)][1];
      } else {
        group = [];
        group2Index.set(groupName, groups.length);
        groups.push([groupName, group]);
      }
      group.push(p);
    }
    return (
      <ul>
        {groups.map((group, index) => {
          return (
            <li key={`m${index}`}>
              <div className="label">{group[0]}</div>
              <ul>
                {group[1].map(x => (
                  <li
                    key={x.name}
                    className={classNames("item", [
                      "active",
                      this.props.selected == x
                    ])}
                    onClick={() => this.props.onClick(x)}
                  >
                    {x.name.split("/")[1]}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    );
  }
}

export class ColorPicker extends React.Component<
  ColorPickerProps,
  ColorPickerState
> {
  constructor(props: ColorPickerProps) {
    super(props);
    if (this.props.defaultValue) {
      const colorCSS = colorToCSS(this.props.defaultValue);
      let matchedPalette: ColorPalette = null;
      for (const p of predefinedPalettes.filter(x => x.type == "palette")) {
        for (const g of p.colors) {
          for (const c of g) {
            if (colorToCSS(c) == colorCSS) {
              matchedPalette = p;
              break;
            }
          }
          if (matchedPalette) {
            break;
          }
        }
        if (matchedPalette) {
          break;
        }
      }
      if (matchedPalette) {
        this.state = {
          currentPalette: matchedPalette,
          currentPicker: null,
          currentColor: this.props.defaultValue
        };
      } else {
        this.state = {
          currentPalette: null,
          currentPicker: "hcl",
          currentColor: this.props.defaultValue
        };
      }
    } else {
      this.state = {
        currentPalette: predefinedPalettes.filter(
          x => x.name == "Palette/ColorBrewer"
        )[0],
        currentPicker: null
      };
    }
  }

  public render() {
    return (
      <div className="color-picker">
        <section className="palettes">
          <ul>
            <li>
              <div className="label">ColorPicker</div>
              <ul>
                <li
                  className={classNames("item", [
                    "active",
                    this.state.currentPicker == "hcl"
                  ])}
                  onClick={() => {
                    this.setState({
                      currentPalette: null,
                      currentPicker: "hcl"
                    });
                  }}
                >
                  HCL Picker
                </li>
              </ul>
            </li>
          </ul>
          <PaletteList
            palettes={predefinedPalettes.filter(x => x.type == "palette")}
            selected={this.state.currentPalette}
            onClick={p => {
              this.setState({ currentPalette: p, currentPicker: null });
            }}
          />
        </section>
        <section className="colors">
          {this.state.currentPalette != null ? (
            <ColorGrid
              colors={this.state.currentPalette.colors}
              defaultValue={this.state.currentColor}
              onClick={c => {
                this.props.onPick(c);
                this.setState({ currentColor: c });
              }}
            />
          ) : null}
          {this.state.currentPicker != null ? (
            <HCLColorPicker
              defaultValue={this.state.currentColor}
              onChange={c => {
                this.props.onPick(c);
                this.setState({ currentColor: c });
              }}
            />
          ) : null}
        </section>
      </div>
    );
  }
}

export interface GradientPickerProps {
  defaultValue?: ColorGradient;
  onPick?: (gradient: ColorGradient) => void;
}

export interface GradientPickerState {
  currentGradient: ColorGradient;
}

export class GradientPicker extends React.Component<
  GradientPickerProps,
  GradientPickerState
> {
  constructor(props: GradientPickerProps) {
    super(props);
    this.state = {
      currentGradient: this.props.defaultValue
    };
  }

  public selectGradient(gradient: ColorGradient, emit: boolean = false) {
    this.setState(
      {
        currentGradient: gradient
      },
      () => {
        if (emit) {
          if (this.props.onPick) {
            this.props.onPick(gradient);
          }
        }
      }
    );
  }

  public renderGradientPalettes() {
    const items = predefinedPalettes.filter(
      x => x.type == "sequential" || x.type == "diverging"
    );
    const groups: Array<[string, ColorPalette[]]> = [];
    const group2Index = new Map<string, number>();
    for (const p of items) {
      const groupName = p.name.split("/")[0];
      let group: ColorPalette[];
      if (group2Index.has(groupName)) {
        group = groups[group2Index.get(groupName)][1];
      } else {
        group = [];
        group2Index.set(groupName, groups.length);
        groups.push([groupName, group]);
      }
      group.push(p);
    }
    return (
      <ul>
        {groups.map((group, index) => {
          return (
            <li key={`m${index}`}>
              <div className="label">{group[0]}</div>
              <ul>
                {group[1].map(x => {
                  const gradient: ColorGradient = {
                    colors: x.colors[0],
                    colorspace: "lab"
                  };
                  return (
                    <li
                      key={x.name}
                      className="item"
                      onClick={() => this.selectGradient(gradient, true)}
                    >
                      <GradientView gradient={gradient} />
                      <label>{x.name.split("/")[1]}</label>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    );
  }

  public render() {
    return (
      <div className="gradient-picker">
        <section className="palettes">{this.renderGradientPalettes()}</section>
        <section className="gradient-editor">
          <div className="row">
            <GradientView gradient={this.state.currentGradient} />
          </div>
          <div className="colors-scroll">
            {this.state.currentGradient.colors.map((color, i) => {
              return (
                <div className="color-row" key={`m${i}`}>
                  <span
                    className="color-item"
                    style={{ background: colorToCSS(color) }}
                    onClick={e => {
                      globals.popupController.popupAt(
                        context => (
                          <PopupView context={context}>
                            <ColorPicker
                              defaultValue={color}
                              onPick={color => {
                                const newGradient = deepClone(
                                  this.state.currentGradient
                                );
                                newGradient.colors[i] = color;
                                this.selectGradient(newGradient, true);
                              }}
                            />
                          </PopupView>
                        ),
                        { anchor: e.currentTarget }
                      );
                      return;
                    }}
                  />
                  <InputField
                    defaultValue={colorToHTMLColorHEX(color)}
                    onEnter={value => {
                      const newColor = colorFromHTMLColor(value);
                      const newGradient = deepClone(this.state.currentGradient);
                      newGradient.colors[i] = newColor;
                      this.selectGradient(newGradient, true);
                      return true;
                    }}
                  />
                  <ButtonFlatPanel
                    url={getSVGIcon("general/cross")}
                    onClick={() => {
                      if (this.state.currentGradient.colors.length > 1) {
                        const newGradient = deepClone(
                          this.state.currentGradient
                        );
                        newGradient.colors.splice(i, 1);
                        this.selectGradient(newGradient, true);
                      }
                    }}
                  />
                </div>
              );
            })}
            <div className="color-row">
              <ButtonFlatPanel
                url={getSVGIcon("general/plus")}
                text="Add"
                onClick={() => {
                  const newGradient = deepClone(this.state.currentGradient);
                  newGradient.colors.push({ r: 150, g: 150, b: 150 });
                  this.selectGradient(newGradient, true);
                }}
              />
              <ButtonFlatPanel
                text="Reverse"
                onClick={() => {
                  const newGradient = deepClone(this.state.currentGradient);
                  newGradient.colors.reverse();
                  this.selectGradient(newGradient, true);
                }}
              />
            </div>
          </div>
          <div className="row">
            <DropdownButton
              text={
                this.state.currentGradient.colorspace == "lab" ? "Lab" : "HCL"
              }
              list={[
                { name: "hcl", text: "HCL" },
                { name: "lab", text: "Lab" }
              ]}
              onSelect={(v: "hcl" | "lab") => {
                const newGradient = deepClone(this.state.currentGradient);
                newGradient.colorspace = v;
                this.selectGradient(newGradient, true);
              }}
            />
          </div>
        </section>
      </div>
    );
  }
}

export class GradientView extends React.PureComponent<
  {
    gradient: ColorGradient;
  },
  {}
> {
  public refs: {
    canvas: HTMLCanvasElement;
  };

  public componentDidMount() {
    this.componentDidUpdate();
  }

  public componentDidUpdate() {
    const ctx = this.refs.canvas.getContext("2d");
    const width = this.refs.canvas.width;
    const height = this.refs.canvas.height;
    const scale = interpolateColors(
      this.props.gradient.colors,
      this.props.gradient.colorspace
    );
    setImmediate(() => {
      const data = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < data.width; i++) {
        const t = i / (data.width - 1);
        const c = scale(t);
        for (let y = 0; y < data.height; y++) {
          let ptr = (i + y * data.width) * 4;
          data.data[ptr++] = c.r;
          data.data[ptr++] = c.g;
          data.data[ptr++] = c.b;
          data.data[ptr++] = 255;
        }
      }
      ctx.putImageData(data, 0, 0);
    });
  }

  public render() {
    return (
      <span className="gradient-view">
        <canvas ref="canvas" width={50} height={2} />
      </span>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import { Color, getColorConverter } from "../../core";
import {
  ColorPalette,
  addPowerBIThemeColors,
  predefinedPalettes,
} from "../resources";
import { classNames } from "../utils";
import { Button } from "../views/panels/widgets/controls";
import { ColorSpaceDescription, ColorSpacePicker } from "./color_space_picker";
import { AppStore } from "../stores";

const sRGB_to_HCL = getColorConverter("sRGB", "hcl");
const HCL_to_sRGB = getColorConverter("hcl", "sRGB");

export function colorToCSS(color: Color) {
  return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(
    0
  )})`;
}

function HSVtoRGB(
  h: number,
  s: number,
  v: number
): [number, number, number, boolean] {
  h /= 360;
  s /= 100;
  v /= 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }
  return [
    Math.max(0, Math.min(255, r * 255)),
    Math.max(0, Math.min(255, g * 255)),
    Math.max(0, Math.min(255, b * 255)),
    false,
  ];
}

function RGBtoHSV(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    s = max === 0 ? 0 : d / max,
    v = max / 255;
  let h;

  switch (max) {
    case min:
      h = 0;
      break;
    case r:
      h = g - b + d * (g < b ? 6 : 0);
      h /= 6 * d;
      break;
    case g:
      h = b - r + d * 2;
      h /= 6 * d;
      break;
    case b:
      h = r - g + d * 4;
      h /= 6 * d;
      break;
  }

  return [h * 360, s * 100, v * 100];
}

export class HSVColorPicker extends React.Component<
  {
    defaultValue: Color;
    onChange?: (newValue: Color) => void;
  },
  {}
> {
  public static colorSpaces: ColorSpaceDescription[] = [
    {
      name: "Hue",
      description: "Saturation, Value | Hue",
      dimension1: { name: "Hue", range: [360, 0] },
      dimension2: { name: "Saturation", range: [0, 100] },
      dimension3: { name: "Value", range: [100, 0] },
      toRGB: HSVtoRGB,
      fromRGB: RGBtoHSV,
    },
    {
      name: "Saturation",
      description: "Hue, Value | Saturation",
      dimension1: { name: "Saturation", range: [100, 0] },
      dimension2: { name: "Hue", range: [360, 0] },
      dimension3: { name: "Value", range: [100, 0] },
      toRGB: (x1, x2, x3) => HSVtoRGB(x2, x1, x3),
      fromRGB: (r, g, b) => {
        const [h, s, v] = RGBtoHSV(r, g, b);
        return [s, h, v];
      },
    },
    {
      name: "Value",
      description: "Hue, Saturation | Value",
      dimension1: { name: "Value", range: [100, 0] },
      dimension2: { name: "Hue", range: [360, 0] },
      dimension3: { name: "Saturation", range: [100, 0] },
      toRGB: (x1, x2, x3) => HSVtoRGB(x2, x3, x1),
      fromRGB: (r, g, b) => {
        const [h, s, v] = RGBtoHSV(r, g, b);
        return [v, h, s];
      },
    },
  ];

  public render() {
    return (
      <ColorSpacePicker
        {...this.props}
        colorSpaces={HSVColorPicker.colorSpaces}
      />
    );
  }
}

export class HCLColorPicker extends React.Component<
  {
    defaultValue: Color;
    onChange?: (newValue: Color) => void;
  },
  {}
> {
  public static colorSpaces: ColorSpaceDescription[] = [
    {
      name: "Lightness",
      description: "Hue, Chroma | Lightness",
      dimension1: { name: "Lightness", range: [100, 0] },
      dimension2: { name: "Hue", range: [0, 360] },
      dimension3: { name: "Chroma", range: [100, 0] },
      toRGB: (x1: number, x2: number, x3: number) =>
        HCL_to_sRGB(x2, x3, x1) as [number, number, number, boolean],
      fromRGB: (r: number, g: number, b: number) => {
        const [h, c, l] = sRGB_to_HCL(r, g, b);
        return [l, h, c];
      },
    },
    {
      name: "Hue",
      description: "Chroma, Lightness | Hue",
      dimension1: { name: "Hue", range: [0, 360] },
      dimension2: { name: "Chroma", range: [0, 100] },
      dimension3: { name: "Lightness", range: [100, 0] },
      toRGB: (x1: number, x2: number, x3: number) =>
        HCL_to_sRGB(x1, x2, x3) as [number, number, number, boolean],
      fromRGB: (r: number, g: number, b: number) =>
        sRGB_to_HCL(r, g, b) as [number, number, number],
    },
    {
      name: "Chroma",
      description: "Hue, Lightness | Chroma",
      dimension1: { name: "Chroma", range: [100, 0] },
      dimension2: { name: "Hue", range: [0, 360] },
      dimension3: { name: "Lightness", range: [100, 0] },
      toRGB: (x1: number, x2: number, x3: number) =>
        HCL_to_sRGB(x2, x1, x3) as [number, number, number, boolean],
      fromRGB: (r: number, g: number, b: number) => {
        const [h, c, l] = sRGB_to_HCL(r, g, b);
        return [c, h, l];
      },
    },
  ];

  public render() {
    return (
      <ColorSpacePicker
        {...this.props}
        colorSpaces={HCLColorPicker.colorSpaces}
      />
    );
  }
}

export interface ColorPickerProps {
  defaultValue?: Color;
  allowNull?: boolean;
  onPick?: (color: Color) => void;
  store?: AppStore;
}

export interface ColorPickerState {
  currentPalette?: ColorPalette;
  currentPicker?: string;
  currentColor?: Color;
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
                    colorToCSS(this.props.defaultValue) == colorToCSS(color),
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

    const groups: [string, ColorPalette[]][] = [];
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
                {group[1].map((x) => (
                  <li
                    key={x.name}
                    className={classNames("item", [
                      "active",
                      this.props.selected == x,
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
    addPowerBIThemeColors();
    if (this.props.defaultValue) {
      const colorCSS = colorToCSS(this.props.defaultValue);
      let matchedPalette: ColorPalette = null;
      for (const p of predefinedPalettes.filter((x) => x.type == "palette")) {
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
          currentColor: this.props.defaultValue,
        };
      } else {
        this.state = {
          currentPalette: null,
          currentPicker: "hcl",
          currentColor: this.props.defaultValue,
        };
      }
    } else {
      this.state = {
        currentPalette: predefinedPalettes.filter(
          (x) => x.name == "Palette/ColorBrewer"
        )[0],
        currentPicker: null,
      };
    }
  }

  public render() {
    return (
      <div className="color-picker">
        <section className="color-picker-left">
          <div className="color-picker-palettes-list">
            <ul>
              <li>
                <div className="label">ColorPicker</div>
                <ul>
                  <li
                    className={classNames("item", [
                      "active",
                      this.state.currentPicker == "hcl",
                    ])}
                    onClick={() => {
                      this.setState({
                        currentPalette: null,
                        currentPicker: "hcl",
                      });
                    }}
                  >
                    HCL Picker
                  </li>
                  <li
                    className={classNames("item", [
                      "active",
                      this.state.currentPicker == "hsv",
                    ])}
                    onClick={() => {
                      this.setState({
                        currentPalette: null,
                        currentPicker: "hsv",
                      });
                    }}
                  >
                    HSV Picker
                  </li>
                </ul>
              </li>
            </ul>
            <PaletteList
              palettes={predefinedPalettes.filter((x) => x.type == "palette")}
              selected={this.state.currentPalette}
              onClick={(p) => {
                this.setState({ currentPalette: p, currentPicker: null });
              }}
            />
          </div>
          {this.props.allowNull ? (
            <div className="color-picker-null">
              <Button
                text={"none"}
                icon="ChromeClose"
                onClick={() => {
                  this.setState({
                    currentColor: null,
                  });
                  this.props.onPick(null);
                }}
              />
            </div>
          ) : null}
        </section>
        <section className="colors">
          {this.state.currentPalette != null ? (
            <ColorGrid
              colors={this.state.currentPalette.colors}
              defaultValue={this.state.currentColor}
              onClick={(c) => {
                this.props.onPick(c);
                this.setState({ currentColor: c });
              }}
            />
          ) : null}
          {this.state.currentPicker == "hcl" ? (
            <HCLColorPicker
              defaultValue={this.state.currentColor || { r: 0, g: 0, b: 0 }}
              onChange={(c) => {
                this.props.onPick(c);
                this.setState({ currentColor: c });
              }}
            />
          ) : null}
          {this.state.currentPicker == "hsv" ? (
            <HSVColorPicker
              defaultValue={this.state.currentColor || { r: 0, g: 0, b: 0 }}
              onChange={(c) => {
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

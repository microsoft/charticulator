// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Color, getColorConverter } from "../../../core";
import { ColorSpaceDescription, ColorSpacePicker } from "../color_space_picker";

const sRGB_to_HCL = getColorConverter("sRGB", "hcl");
const HCL_to_sRGB = getColorConverter("hcl", "sRGB");

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

export class HCLColorPicker extends React.Component<
  {
    defaultValue: Color;
    onChange?: (newValue: Color) => void;
  },
  Record<string, unknown>
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

export class HSVColorPicker extends React.Component<
  {
    defaultValue: Color;
    onChange?: (newValue: Color) => void;
  },
  Record<string, unknown>
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

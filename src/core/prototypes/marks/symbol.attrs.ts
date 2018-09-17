// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { Color } from "../../common";
import { AttributeMap } from "../../specification/index";
import { AttrBuilder } from "../attrs";

export const symbolTypes: string[] = [
  "circle",
  "cross",
  "diamond",
  "square",
  "star",
  "triangle",
  "wye"
];

export const symbolAttributes: AttributeDescriptions = {
  ...AttrBuilder.point(),
  ...AttrBuilder.number("size", false, {
    defaultRange: [0, 200 * Math.PI],
    defaultValue: 60
  }),
  ...AttrBuilder.enum("symbol", { defaultRange: symbolTypes }),
  ...AttrBuilder.style({ fill: true })
};

export interface SymbolElementAttributes extends AttributeMap {
  x: number;
  y: number;
  size: number;
  fill: Color;
  stroke: Color;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  symbol: string;
}

export interface SymbolElementProperties extends AttributeMap {}

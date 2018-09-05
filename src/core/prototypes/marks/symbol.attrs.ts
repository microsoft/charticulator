/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { VariableStrength } from "../../solver";
import { AttributeDescription } from "../object";
import { styleAttrs } from "./attrs";
import { AttributeMap } from "../../specification";
import { Color } from "../../common";

export const attributes: { [name: string]: AttributeDescription } = {
  x: {
    name: "x",
    type: "number",
    mode: "positional",
    strength: VariableStrength.NONE
  },
  y: {
    name: "y",
    type: "number",
    mode: "positional",
    strength: VariableStrength.NONE
  },
  size: {
    name: "size",
    type: "number",
    mode: "intrinsic",
    solverExclude: true,
    category: "dimensions",
    displayName: "Size",
    defaultRange: [0, 200 * Math.PI],
    defaultValue: 60,
    strength: VariableStrength.NONE
  },
  ...styleAttrs({ fill: true }),
  symbol: {
    name: "symbol",
    type: "string",
    solverExclude: true,
    defaultValue: "circle"
  }
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

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { VariableStrength } from "../../solver";
import { AttributeDescription } from "../object";
import { lineAttrs, styleAttrs, centerAttrs } from "./attrs";
import { AttributeMap } from "../../specification";
import { Color } from "../../common";

export const attributes = {
  ...lineAttrs(),
  ...centerAttrs(),
  dx: {
    name: "dx",
    type: "number",
    category: "dimensions",
    displayName: "dX",
    strength: VariableStrength.NONE,
    defaultRange: [30, 100]
  },
  dy: {
    name: "dy",
    type: "number",
    category: "dimensions",
    displayName: "dY",
    strength: VariableStrength.NONE,
    defaultRange: [30, 100]
  },
  ...styleAttrs()
} as { [name: string]: AttributeDescription };

export interface LineElementAttributes extends AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  stroke: Color;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
}

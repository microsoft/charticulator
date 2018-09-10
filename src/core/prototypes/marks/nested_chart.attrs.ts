// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AttributeDescription } from "../object";
import { lineAttrs, styleAttrs, sizeAttrs, centerAttrs } from "./attrs";
import { Color } from "../../common";
import { AttributeMap } from "../../specification/index";

export const attributes = {
  ...lineAttrs(),
  ...centerAttrs(),
  ...sizeAttrs(),
  opacity: {
    name: "opacity",
    type: "number",
    category: "style",
    displayName: "Opacity",
    solverExclude: true,
    defaultValue: 1,
    defaultRange: [0, 1]
  },
  visible: {
    name: "visible",
    type: "boolean",
    category: "style",
    displayName: "Visible",
    solverExclude: true,
    defaultValue: true
  }
} as { [name: string]: AttributeDescription };

export interface NestedChartElementAttributes extends AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
}

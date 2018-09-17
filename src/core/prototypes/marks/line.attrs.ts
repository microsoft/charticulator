// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap } from "../../specification";
import { Color } from "../../common";
import { AttrBuilder } from "../attrs";

export const lineAttributes: AttributeDescriptions = {
  ...AttrBuilder.line(),
  ...AttrBuilder.center(),
  ...AttrBuilder.dXdY(),
  ...AttrBuilder.style()
};

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

export interface LineElementProperties extends AttributeMap {}

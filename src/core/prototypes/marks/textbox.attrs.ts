// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import {
  AttributeMap,
  ObjectProperties,
  AttributeType
} from "../../specification";
import { Color } from "../../common";
import { AttrBuilder } from "../attrs";

export const textboxAttributes: AttributeDescriptions = {
  ...AttrBuilder.line(),
  ...AttrBuilder.center(),
  ...AttrBuilder.size(),
  text: {
    name: "text",
    type: AttributeType.Text,
    solverExclude: true,
    defaultValue: ""
  },
  fontFamily: {
    name: "fontFamily",
    type: AttributeType.FontFamily,
    solverExclude: true,
    defaultValue: "Arial"
  },
  fontSize: {
    name: "fontSize",
    type: AttributeType.Number,
    solverExclude: true,
    defaultRange: [0, 24],
    defaultValue: 14
  },
  color: {
    name: "color",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null
  },
  outline: {
    name: "outline",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null
  },
  ...AttrBuilder.opacity(),
  ...AttrBuilder.visible()
};

export interface TextboxElementAttributes extends AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  color: Color;
  outline: Color;
  opacity: number;
  visible: boolean;
  text: string;
  fontFamily: string;
  fontSize: number;
}

export interface TextboxElementProperties extends ObjectProperties {
  paddingX: number;
  paddingY: number;
  alignX: "start" | "middle" | "end";
  alignY: "start" | "middle" | "end";
}

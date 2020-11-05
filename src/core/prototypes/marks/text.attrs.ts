// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color } from "../../common";
import { AttributeMap, AttributeType, Types } from "../../specification";
import { AttrBuilder } from "../attrs";
import { AttributeDescriptions } from "../object";

export const textAttributes: AttributeDescriptions = {
  ...AttrBuilder.point(),
  text: {
    name: "text",
    type: AttributeType.Text,
    solverExclude: true,
    defaultValue: "",
  },
  fontFamily: {
    name: "fontFamily",
    type: AttributeType.FontFamily,
    solverExclude: true,
    defaultValue: "Arial",
  },
  fontSize: {
    name: "fontSize",
    type: AttributeType.Number,
    solverExclude: true,
    defaultRange: [0, 24],
    defaultValue: 14,
  },
  color: {
    name: "color",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null,
  },
  outline: {
    name: "outline",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null,
  },
  ...AttrBuilder.opacity(),
  ...AttrBuilder.visible(),
};

export interface TextElementAttributes extends AttributeMap {
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: Color;
  outline: Color;
  opacity: number;
  visible: boolean;
}

export interface TextElementProperties extends AttributeMap {
  alignment: Types.TextAlignment;
  rotation: number;
}

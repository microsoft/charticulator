// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AttributeDescription } from "../object";

export const attributes = {
  x: { name: "x", type: "number", mode: "positional" },
  y: { name: "y", type: "number", mode: "positional" },
  text: {
    name: "text",
    type: "string",
    category: "text",
    displayName: "Text",
    solverExclude: true,
    defaultValue: ""
  },
  fontFamily: {
    name: "fontFamily",
    type: "string",
    category: "text",
    displayName: "Font",
    solverExclude: true,
    defaultValue: "Arial"
  },
  fontSize: {
    name: "fontSize",
    type: "number",
    category: "text",
    displayName: "Size",
    solverExclude: true,
    defaultRange: [0, 24],
    defaultValue: 14
  },
  color: {
    name: "color",
    type: "color",
    category: "style",
    displayName: "Color",
    solverExclude: true,
    defaultValue: null
  },
  outline: {
    name: "outline",
    type: "color",
    category: "style",
    displayName: "Outline",
    solverExclude: true,
    defaultValue: null
  },
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

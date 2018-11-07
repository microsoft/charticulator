// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { Color } from "../../common";
import { AttributeMap, Types } from "../../specification/index";
import { AttrBuilder } from "../attrs";

export const iconAttributes: AttributeDescriptions = {
  ...AttrBuilder.point(),
  ...AttrBuilder.number("size", false, {
    defaultRange: [0, 200 * Math.PI],
    defaultValue: 60
  }),
  ...AttrBuilder.opacity(),
  ...AttrBuilder.visible(),
  ...AttrBuilder.image()
};

export interface IconElementAttributes extends AttributeMap {
  x: number;
  y: number;
  size: number;
  opacity: number;
  visible: boolean;
  image: Types.Image;
}

export interface IconElementProperties extends AttributeMap {
  alignment: Types.TextAlignment;
  rotation: number;
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap, Types } from "../../specification";
import { Color } from "../../common";
import { AttrBuilder } from "../attrs";

export interface DataAxisAttributes extends AttributeMap {
  // anchor0, anchor1, ... that corresponds to the data
  [name: string]: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DataAxisProperties extends AttributeMap {
  axis: Types.AxisDataBinding;
  dataExpressions: string[];
}

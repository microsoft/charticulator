// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap } from "../../specification/index";
import { AttrBuilder } from "../attrs";
import { Specification } from "../..";

export const nestedChartAttributes: AttributeDescriptions = {
  ...AttrBuilder.line(),
  ...AttrBuilder.center(),
  ...AttrBuilder.size(),
  ...AttrBuilder.opacity(),
  ...AttrBuilder.visible(),
};

export interface NestedChartElementAttributes extends AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface NestedChartElementProperties extends AttributeMap {
  /** The chart specification */
  specification: Specification.Chart;
  /** Map column names to nested chart column names */
  columnNameMap: { [name: string]: string };
}

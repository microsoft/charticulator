// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeMap, Types } from "../../specification";

export interface DataAxisAttributes extends AttributeMap {
  // anchorNAME1, anchorNAME2, ... that corresponds to the data
  [name: string]: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DataAxisExpression extends AttributeMap {
  name: string;
  expression: string;
}

export interface DataAxisProperties extends AttributeMap {
  axis: Types.AxisDataBinding;
  dataExpressions: DataAxisExpression[];
}

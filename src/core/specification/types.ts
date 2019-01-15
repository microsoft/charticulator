// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color } from "../common";
import { AttributeMap, Expression, DataType } from "./index";

/** Common parameter and mapping types */
export interface AxisDataBinding extends AttributeMap {
  type: "default" | "numerical" | "categorical";
  visible: boolean;
  side: "default" | "opposite";

  /** Data mapping expression */
  expression?: Expression;
  valueType?: DataType;

  /** Domain for linear/logarithm types */
  numericalMode?: "linear" | "logarithmic" | "temporal";
  domainMin?: number;
  domainMax?: number;

  /** Categories for categorical type */
  categories?: string[];
  gapRatio?: number;
  /** Pre/post gap, will override the default with OR operation */
  enablePrePostGap?: boolean;

  tickDataExpression?: Expression;
  tickFormat?: string;

  style?: AxisRenderingStyle;
}

export interface AxisRenderingStyle extends AttributeMap {
  lineColor: Color;
  tickColor: Color;
  fontFamily: string;
  fontSize: number;
  tickSize: number;
}

export interface TextAlignment extends AttributeMap {
  x: "left" | "middle" | "right";
  y: "top" | "middle" | "bottom";
  xMargin: number;
  yMargin: number;
}

export interface ColorGradient extends AttributeMap {
  colorspace: "hcl" | "lab";
  colors: Color[];
}

export interface Image extends AttributeMap {
  src: string;
  width: number;
  height: number;
}

/** LinkAnchor: specifies an anchor in a link */
export interface LinkAnchorPoint extends AttributeMap {
  /** X attribute reference */
  x: { element: string; attribute: string };
  /** Y attribute reference */
  y: { element: string; attribute: string };
  /** Link direction for curves */
  direction: { x: number; y: number };
}

/** Filter specification, specify one of categories or expression */
export interface Filter extends AttributeMap {
  /** Filter by a categorical variable */
  categories?: {
    /** The expression to draw values from */
    expression: string;
    /** The accepted values */
    values: { [value: string]: boolean };
  };
  /** Filter by an arbitrary expression */
  expression?: Expression;
}

/** GroupBy specification */
export interface GroupBy extends AttributeMap {
  /** Group by a string expression */
  expression?: Expression;
}

/** Order expression */
export interface SortBy extends AttributeMap {
  expression?: Expression;
}

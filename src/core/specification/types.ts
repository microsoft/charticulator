// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color } from "../common";
import { ColumnMetadata, DataKind } from "../dataset";
import { StrokeStyle } from "../prototypes";
import { AttributeMap, Expression, DataType } from "./index";

export enum OrderMode {
  alphabetically = "alphabetically",
  occurrence = "occurrence",
  order = "order",
}

export type AxisSide = "default" | "opposite";

export enum AxisDataBindingType {
  Default = "default",
  Numerical = "numerical",
  Categorical = "categorical",
}

export enum NumericalMode {
  Linear = "linear",
  Logarithmic = "logarithmic",
  Temporal = "temporal",
}

/** Common parameter and mapping types */
export interface AxisDataBinding extends AttributeMap {
  type: AxisDataBindingType;
  visible: boolean;
  side: AxisSide;

  /** Data mapping expression */
  expression?: Expression;
  rawExpression?: Expression;
  valueType?: DataType;

  /** Domain for linear/logarithm types */
  numericalMode?: NumericalMode;
  domainMin?: number;
  domainMax?: number;

  /** Export properties of axis for auto scale ranges */
  autoDomainMin?: boolean;
  autoDomainMax?: boolean;

  /** Categories for categorical type */
  categories?: string[];
  gapRatio?: number;
  /** Pre/post gap, will override the default with OR operation */
  enablePrePostGap?: boolean;

  tickDataExpression?: Expression;
  tickFormat?: string;

  style?: AxisRenderingStyle;
  dataKind?: DataKind;
  order?: string[];
  orderMode?: OrderMode;
}

export interface AxisRenderingStyle extends AttributeMap {
  lineColor: Color;
  tickColor: Color;
  fontFamily: string;
  fontSize: number;
  tickSize: number;
  wordWrap: boolean;
  gridlineStyle: StrokeStyle;
  gridlineColor: Color;
  gridlineWidth: number;
}

export enum TextAlignmentHorizontal {
  Left = "left",
  Middle = "middle",
  Right = "right",
}

export enum TextAlignmentVertical {
  Top = "top",
  Middle = "middle",
  Bottom = "bottom",
}

export interface TextAlignment extends AttributeMap {
  x: TextAlignmentHorizontal;
  y: TextAlignmentVertical;
  xMargin: number;
  yMargin: number;
}

export enum Colorspace {
  Hcl = "hcl",
  Lab = "lab",
}

export interface ColorGradient extends AttributeMap {
  colorspace: Colorspace;
  colors: Color[];
}

export interface Image extends AttributeMap {
  src: string;
  width: number;
  height: number;
  name?: string;
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

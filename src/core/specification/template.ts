// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { FieldType } from "../common";
import * as Dataset from "../dataset";
import { DefaultAttributes } from "../prototypes";
import { Chart, DataType, AttributeType } from "./index";
import * as Types from "./types";

export type PropertyField = string | { property: string; field: FieldType };

export interface ChartTemplate {
  /** The original chart specification */
  specification: Chart;

  /** A set of default attributes to apply to the objects in the chart */
  defaultAttributes: DefaultAttributes;

  /** Data tables */
  tables: Table[];

  /** Infer attribute or property from data */
  inference: Inference[];

  /** Expose property editor */
  properties: Property[];
}

export interface Column {
  displayName: string;
  name: string;
  type: DataType;
  metadata: Dataset.ColumnMetadata;
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Property {
  objectID: string;
  displayName?: string;

  target: {
    property?: PropertyField;
    attribute?: string;
  };

  type: AttributeType;
  default?: string | number | boolean;
}

/** Infer values from data */
export interface Inference {
  objectID: string;
  dataSource?: {
    table: string;
    groupBy?: Types.GroupBy;
  };

  axis?: AxisInference;
  scale?: ScaleInference;
  expression?: ExpressionInference;
  nestedChart?: NestedChartInference;
}

/** Infer axis parameter, set to axis property */
export interface AxisInference {
  /** Data expression for the axis */
  expression: string;
  additionalExpressions?: string[];

  /** Type */
  type: "default" | "categorical" | "numerical";

  /** Infer axis data and assign to this property */
  property: PropertyField;
}

/** Infer scale parameter, set to scale's domain property */
export interface ScaleInference {
  classID: string;

  expressions: string[];

  properties: {
    min?: PropertyField;
    max?: PropertyField;
    mapping?: PropertyField;
  };
}

/** Fix expression */
export interface ExpressionInference {
  expression: string;

  property: PropertyField;
}

/** Nested chart */
export interface NestedChartInference {
  columnNameMap: { [name: string]: string };
}

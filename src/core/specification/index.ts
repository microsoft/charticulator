// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color, Point } from "../common";
import * as Template from "./template";
import * as Types from "./types";

export { Types, Template };

// ===========================================================================
// Fundamentals
// ===========================================================================

/** Objects with an unique ID */
export interface Identifiable {
  /** Unique ID */
  _id: string;
}

// ===========================================================================
// Data and data manipulation
// ===========================================================================

/** Supported data value types */
export type DataValue = number | string | boolean;

/** Data type in memory */
export enum DataType {
  /** String data type, stored as string */
  String = "string",
  /** Number data type, stored as number */
  Number = "number",
  /** Boolean data type, stored as boolean */
  Boolean = "boolean",
  /** Date data type, stored as unix timestamps (ms) */
  Date = "date"
}

/** Abstract data kind */
export enum DataKind {
  /** Ordinal data kind */
  Ordinal = "ordinal",
  /** Categorical data kind */
  Categorical = "categorical",
  /** Numerical data kind */
  Numerical = "numerical",
  /** Temporal data kind */
  Temporal = "temporal"
}

/** Data row */
export interface DataRow {
  _id: string;
  [name: string]: DataValue;
}

export type Expression = string;

// ===========================================================================
// Attributes
// ===========================================================================

export enum AttributeType {
  Number = "number",
  Enum = "enum",
  Text = "text",
  Boolean = "boolean",
  FontFamily = "font-family",
  Color = "color",
  Image = "image",
  Point = "point",
  Object = "object"
}

/** Attribute value types */
export type AttributeValue =
  | number
  | string
  | boolean
  | Color
  | Point
  | AttributeList
  | AttributeMap;

/** Attribute value list */
export interface AttributeList extends ArrayLike<AttributeValue> {}

/** Attribute value map */
export interface AttributeMap {
  [name: string]: AttributeValue;
}

// ===========================================================================
// Attribute mappings
// ===========================================================================

/** Attribute mappings */
export interface Mappings {
  [name: string]: Mapping;
}

/** Attribute mapping */
export interface Mapping {
  /** Mapping type */
  type: string;
}

/** Scale mapping: use a scale */
export interface ScaleMapping extends Mapping {
  type: "scale";
  /** The table to draw data from */
  table: string;
  /** The data column */
  expression: Expression;
  /** Attribute of the mark */
  attribute?: string;
  /** Value type returned by the expression */
  valueType: DataType;
  /** The id of the scale to use. If null, use the expression directly */
  scale?: string;
}

/** Text mapping: map data to text */
export interface TextMapping extends Mapping {
  type: "text";
  /** The table to draw data from */
  table: string;
  /** The text expression */
  textExpression: string;
}

/** Value mapping: a constant value */
export interface ValueMapping extends Mapping {
  type: "value";
  /** The constant value */
  value: AttributeValue;
}

/** Parent mapping: use an attribute of the item's parent item */
export interface ParentMapping extends Mapping {
  type: "parent";
  /** The attribute of the parent item */
  parentAttribute: string;
}

// ===========================================================================
// Constraints
// ===========================================================================

/** Constraint */
export interface Constraint {
  /** Constraint type */
  type: string;
  attributes: AttributeMap;
}

// ===========================================================================
// Object
// ===========================================================================

/** Object attributes */
export interface ObjectProperties extends AttributeMap {
  /** The name of the object, used in UI */
  name?: string;
  visible?: boolean;
  emphasisMethod?: EmphasisMethod;
}

/** General object */
export interface Object<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Identifiable {
  /** The class ID for the Object */
  classID: string;
  /** Attributes  */
  properties: PropertiesType;
  /** Scale attribute mappings */
  mappings: Mappings;
}

export interface ExposableObject extends Object {
  exposed: boolean;
}

/** Element: a single graphical mark, such as rect, circle, wedge; an element is driven by a group of data rows */
export interface Element<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {}

/** Glyph: a compound of elements, with constraints between them; a glyph is driven by a group of data rows */
export interface Glyph<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {
  /** The data table this mark correspond to */
  table: string;
  /** Elements within the mark */
  marks: Element[];
  /** Layout constraints for this mark */
  constraints: Constraint[];
}

/** Scale */
export interface Scale<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {
  inputType: DataType;
  outputType: AttributeType;
}

/** MarkLayout: the "PlotSegment" */
export interface PlotSegment<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {
  /** The mark to use */
  glyph: string;
  /** The data table to get data rows from */
  table: string;
  /** Filter applied to the data table */
  filter?: Types.Filter;
  /** Group the data by a specified categorical column (filter is applied before grouping) */
  groupBy?: Types.GroupBy;
  /** Order the data (filter & groupBy is applied before order */
  order?: Types.SortBy;
}

/** Guide */
export interface Guide<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {}

/** Guide Coordinator */
export interface GuideCoordinator<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {}

/** Links */
export interface Links<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {}

/** ChartElement is a PlotSegment or a Guide */
export type ChartElement<
  PropertiesType extends ObjectProperties = ObjectProperties
> =
  | PlotSegment<PropertiesType>
  | Guide<PropertiesType>
  | GuideCoordinator<PropertiesType>;

/** Resource item */
export interface Resource {
  /** Resource item ID */
  id: string;
  /** Resource type: image */
  type: string;
  /** Resource data */
  data: any;
}

/** A chart is a set of chart elements and constraints between them, with guides and scales */
export interface Chart<
  PropertiesType extends ObjectProperties = ObjectProperties
> extends Object<PropertiesType> {
  /** Marks */
  glyphs: Glyph[];
  /** Scales */
  scales: Scale[];
  /**
   * Temporary structure to save created scales for reusing instead creating new.
   * Unused scales will be removed on save
   */
  scaleMappings: ScaleMapping[];
  /** Chart elements */
  elements: ChartElement[];
  /** Chart-level constraints */
  constraints: Constraint[];
  /** Resources */
  resources: Resource[];
}

// ===========================================================================
// States
// ===========================================================================

/** General object state */
export interface ObjectState<
  AttributesType extends AttributeMap = AttributeMap
> {
  attributes: AttributesType;
}

/** Element state */
export interface MarkState<AttributesType extends AttributeMap = AttributeMap>
  extends ObjectState<AttributesType> {}

/** Scale state */
export interface ScaleState<AttributesType extends AttributeMap = AttributeMap>
  extends ObjectState<AttributesType> {}

/** Glyph state */
export interface GlyphState<AttributesType extends AttributeMap = AttributeMap>
  extends ObjectState<AttributesType> {
  // Element states
  marks: MarkState[];

  /** Should this specific glyph instance be emphasized */
  emphasized?: boolean;
}

/** PlotSegment state */
export interface PlotSegmentState<
  AttributesType extends AttributeMap = AttributeMap
> extends ObjectState<AttributesType> {
  // Mark states
  glyphs: GlyphState[];
  // Data row indices for the mark states
  dataRowIndices: number[][];
}

/** Guide state */
export interface GuideState<AttributesType extends AttributeMap = AttributeMap>
  extends ObjectState<AttributesType> {}

/** Chart element state, one of PlotSegmentState or GuideState */
export type ChartElementState<
  AttributesType extends AttributeMap = AttributeMap
> =
  | PlotSegmentState<AttributesType>
  | GuideState<AttributesType>
  | MarkState<AttributesType>;

/** Chart state */
export interface ChartState<AttributesType extends AttributeMap = AttributeMap>
  extends ObjectState<AttributesType> {
  /** Mark binding states corresponding to Chart.marks */
  elements: ChartElementState[];
  /** Scale states corresponding to Chart.scales */
  scales: ScaleState[];
  scaleMappings: ScaleMapping[];
}

/**
 * Represents the type of method to use when emphasizing an element
 */
export enum EmphasisMethod {
  Saturation = "saturation",
  Outline = "outline"
}

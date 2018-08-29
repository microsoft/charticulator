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
export type DataValue = number | string | boolean | Date;

/** Data row */
export interface DataRow {
  _id: string;
  [name: string]: DataValue;
}

export type Expression = string;

// ===========================================================================
// Attributes
// ===========================================================================

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
  /** The data column */
  expression?: Expression;
  /** Value type */
  valueType?: string;
  /** The id of the scale to use */
  scale?: string;
}

/** Text mapping: map data to text */
export interface TextMapping extends Mapping {
  type: "text";
  textExpression: string;
}

// /** Variable mapping: use a shared variable */
// export interface VariableMapping extends Mapping {
//     type: "variable";
//     /** The name of the variable */
//     variable: string;
// }

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
export interface Object extends Identifiable {
  /** The class ID for the Object */
  classID: string;
  /** Attributes  */
  properties: ObjectProperties;
  /** Scale attribute mappings */
  mappings: Mappings;
}

/** Element: a single graphical mark, such as rect, circle, wedge; an element is driven by a single data row */
export interface Element extends Object {}

/** Glyph: a compound of elements, with constraints between them; a glyph is driven by a single data row */
export interface Glyph extends Object {
  /** The data table this mark correspond to */
  table: string;
  /** Elements within the mark */
  marks: Element[];
  /** Layout constraints for this mark */
  constraints: Constraint[];
}

/** Scale */
export interface Scale extends Object {
  inputType: string;
  outputType: string;
}

/** MarkLayout: the "PlotSegment" */
export interface PlotSegment extends Object {
  /** The mark to use */
  glyph: string;
  /** The data table to get data rows from */
  table: string;
  /** Filter applied to the data table */
  filter?: Types.Filter;
  order?: Types.Order;
}

/** Guide */
export interface Guide extends Object {}

/** Guide Coordinator */
export interface GuideCoordinator extends Object {}

/** Links */
export interface Links extends Object {}

/** ChartElement is a PlotSegment or a Guide */
export type ChartElement = PlotSegment | Guide | GuideCoordinator;

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
export interface Chart extends Object {
  /** Marks */
  glyphs: Glyph[];
  /** Scales */
  scales: Scale[];
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
export interface ObjectState {
  attributes: AttributeMap;
}

/** Element state */
export interface MarkState extends ObjectState {}

/** Scale state */
export interface ScaleState extends ObjectState {}

/** Glyph state */
export interface GlyphState extends ObjectState {
  // Element states
  marks: MarkState[];

  /**
   * Should this specific glyph instance be emphasized
   */
  emphasized?: boolean;
}

/** PlotSegment state */
export interface PlotSegmentState extends ObjectState {
  // Mark states
  glyphs: GlyphState[];
  // Data row indices for the mark states
  dataRowIndices: number[];
}

/** Guide state */
export interface GuideState extends ObjectState {}

/** Chart element state, one of PlotSegmentState or GuideState */
export type ChartElementState = PlotSegmentState | GuideState;

/** Chart state */
export interface ChartState extends ObjectState {
  /** Mark binding states corresponding to Chart.marks */
  elements: ChartElementState[];
  /** Scale states corresponding to Chart.scales */
  scales: ScaleState[];
}

/**
 * Represents the type of method to use when emphasizing an element
 */
export enum EmphasisMethod {
  Saturation = "saturatation",
  Outline = "outline"
}

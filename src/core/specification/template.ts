import { Chart } from "./index";

export interface ChartTemplate {
  specification: Chart;

  /** Data tables */
  tables: Table[];

  /** Slots to map data to */
  dataSlots: DataSlot[];

  /** Infer attribute or property from data */
  inference: { [id: string]: Inference[] };

  /** Assign slots to data mappings */
  mappings: { [id: string]: Mapping[] };

  /** Expose property editor */
  properties: { [id: string]: Property[] };
}

export interface Table {
  name: string;
}

export interface DataSlot {
  table: string;
  name: string;
  kind: string;
  displayName?: string;
}

export interface Inference {
  type: string;
}

export interface Mapping {
  attribute: string;
  slotName: string;
  scale?: string;
}

export interface Property {
  mode: "property" | "attribute";
  name?: string;
  displayName?: string;
  property?: string;
  fields?: string | string[];
  attribute?: string;

  type: string;
  default?: string | number | boolean;
}

/** Infer axis parameter, set to axis property */
export interface Axis extends Inference {
  type: "axis";
  slotName?: string;
  slotKind?: string;

  // Infer axis data and assign to this property
  property: string;
  fields?: string | string[];
}

export interface SlotList extends Inference {
  type: "slot-list";
  property: string;
  fields?: string | string[];
  slots: Array<{ slotName: string; slotKind: string }>;
}

/** Infer scale parameter, set to scale's domain property */
export interface Scale extends Inference {
  type: "scale";
  slotName?: string;
  slotKind?: string;

  rangeType: "number" | "color";

  properties: {
    min?: string;
    max?: string;
    mapping?: string;
  };
}

/** Infer order parameter, set to orderBy */
export interface Order extends Inference {
  type: "order";
  slotName?: string;
  slotKind?: string;

  property: string;
  field?: string | string[];
}

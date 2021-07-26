// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DataMappingHints } from ".";
import { Point } from "../common";
import * as Specification from "../specification";
import * as Dataset from "../dataset";

export type Widget = any;

export interface Property {
  property: string;
  field?: string | number | (string | number)[];
  noUpdateState?: boolean;
  noComputeLayout?: boolean;
}

export interface InputComboboxOptions {
  defaultRange: string[];
  valuesOnly?: boolean;
  label?: string;
}

export const enum LabelPosition {
  Right,
  Bottom,
  Left,
  Top,
}

export interface InputSelectOptions {
  type: "radio" | "dropdown";
  showLabel?: boolean;
  labelPosition?: LabelPosition;
  options: string[];
  icons?: string[];
  labels?: string[];
  tooltip?: string;
  label?: string;
}

export interface InputFontComboboxOptions {
  label?: string;
}

export interface InputTextOptions {
  label?: string;
  placeholder?: string;
  tooltip?: string;
}

export interface InputBooleanOptions {
  type: "checkbox" | "highlight" | "checkbox-fill-width";
  icon?: string;
  headerLabel?: string;
  label?: string;
}

export interface RowOptions {
  dropzone?: {
    type: "axis-data-binding";
    prompt?: string;
    property?: string;
  };
}

export interface DropTargetOptions {
  type: "order";
  property: Property;
  label: string;
}

export interface OrderWidgetOptions {
  table: string;
  displayLabel?: boolean;
  labelPosition?: LabelPosition;
  tooltip?: string;
}

export interface MappingEditorOptions {
  /** Hints for creating data mapping */
  hints?: DataMappingHints;

  /** When no mapping is specified, show the default value */
  defaultValue?: Specification.AttributeValue;
  /** When no mapping is specified, and no default value, show auto (true) or none (false). */
  defaultAuto?: boolean;

  /** Only allow mapping from one table */
  table?: string;
  acceptKinds?: Specification.DataKind[];

  numberOptions?: InputNumberOptions;
  /** Open mapping editor after rendering */
  openMapping?: boolean;
  /** Enables value selector from mapping */
  allowSelectValue?: boolean;
  /** Text lael of input */
  label?: string;
}

export interface InputNumberOptions {
  digits?: number;
  minimum?: number;
  maximum?: number;
  step?: number;
  percentage?: boolean;

  showSlider?: boolean;
  sliderRange?: [number, number];
  sliderFunction?: "linear" | "sqrt";

  showUpdown?: boolean;
  updownTick?: number;
  updownRange?: [number, number];
  updownStyle?: "normal" | "font";
  label?: string;
}

export interface InputDateOptions {
  defaultValue?: number | Date;
  placeholder?: string;
  label?: string;
  onEnter?: (value: number) => boolean;
}

export interface InputColorOptions {
  allowNull?: boolean;
  label?: string;
}

// eslint-disable-next-line
export interface TableOptions {}

export interface FilterEditorOptions {
  table: string;
  target: {
    plotSegment?: Specification.PlotSegment;
    property?: Property;
  };
  value: Specification.Types.Filter;
  mode: "button" | "panel";
}

export interface GroupByEditorOptions {
  table: string;
  target: {
    plotSegment?: Specification.PlotSegment;
    property?: Property;
  };
  value: Specification.Types.GroupBy;
  mode: "button" | "panel";
}

export interface NestedChartEditorOptions {
  specification: Specification.Chart;
  dataset: Dataset.Dataset;
  filterCondition?: {
    column: string;
    value: any;
  };
  width: number;
  height: number;
}

export interface ArrayWidgetOptions {
  allowReorder?: boolean;
  allowDelete?: boolean;
}

export interface ScrollListOptions {
  height?: number;
  maxHeight?: number;
}

export interface InputExpressionOptions {
  table?: string;
  label?: string;
}

export interface InputFormatOptions {
  blank?: string;
}

export interface InputFormatOptions {
  blank?: string;
}

export interface InputFormatOptions {
  blank?: string;
  isDateField?: boolean;
}

export interface ReOrderWidgetOptions {
  allowReset?: boolean;
  onConfirm?: (items: string[]) => void;
  onReset?: () => string[];
  items?: string[];
}

export interface WidgetManager {
  // A row for value/data mapping.
  mappingEditor(
    name: string,
    attribute: string,
    options: MappingEditorOptions
  ): Widget;

  // Basic property widgets
  inputNumber(property: Property, options?: InputNumberOptions): Widget;
  inputDate(property: Property, options?: InputDateOptions): Widget;
  inputText(property: Property, options: InputTextOptions): Widget;
  inputComboBox(property: Property, options: InputComboboxOptions): Widget;
  inputFontFamily(
    property: Property,
    options: InputFontComboboxOptions
  ): Widget;
  inputSelect(property: Property, options: InputSelectOptions): Widget;
  inputBoolean(property: Property, options: InputBooleanOptions): Widget;
  inputExpression(property: Property, options?: InputExpressionOptions): Widget;
  inputFormat(property: Property, options?: InputFormatOptions): Widget;
  inputImage(property: Property): Widget;
  inputImageProperty(property: Property): Widget;
  inputColor(property: Property, options?: InputColorOptions): Widget;
  inputColorGradient(property: Property, inline?: boolean): Widget;

  // A button, once clicked, set the property to null.
  clearButton(property: Property, icon?: string, isHeader?: boolean): Widget;
  setButton(
    property: Property,
    value: Specification.AttributeValue,
    icon?: string,
    text?: string
  ): Widget;

  scaleEditor(attribute: string, text: string): Widget;

  // Order by data button. Map data to "sortBy" expression
  orderByWidget(property: Property, options: OrderWidgetOptions): Widget;

  // Reorder widget: allow user to reorder the items in a property
  reorderWidget(property: Property, options: ReOrderWidgetOptions): Widget;

  arrayWidget(
    property: Property,
    item: (item: Property, index?: number) => Widget,
    options?: ArrayWidgetOptions
  ): Widget;

  dropTarget(options: DropTargetOptions, widget: Widget): Widget;

  // Label and text
  icon(icon: string): Widget;
  label(title: string, options?: { addMargins: boolean }): Widget;
  text(text: string, align?: "left" | "center" | "right"): Widget;
  // Inline separator
  sep(): Widget;

  // Layout elements
  sectionHeader(title: string, widget?: Widget, options?: RowOptions): Widget;
  row(title?: string, widget?: Widget, options?: RowOptions): Widget;
  detailsButton(label: string, ...widgets: Widget[]): Widget;

  // Basic layout elements
  horizontal(cols: number[], ...widgets: Widget[]): Widget;
  vertical(...widgets: Widget[]): Widget;
  table(rows: Widget[][], options?: TableOptions): Widget;
  scrollList(widgets: Widget[], options?: ScrollListOptions): Widget;

  // Tooltip
  tooltip(widget: Widget, tooltipContent: Widget): Widget;

  filterEditor(options: FilterEditorOptions): Widget;
  groupByEditor(options: GroupByEditorOptions): Widget;

  nestedChartEditor(
    property: Property,
    options: NestedChartEditorOptions
  ): Widget;
}

export interface PopupEditor {
  anchor: Point;
  widgets: Widget[];
}

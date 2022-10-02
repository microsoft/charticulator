// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DataMappingHints } from ".";
import { Point } from "../common";
import * as Specification from "../specification";
import * as Dataset from "../dataset";
import { CSSProperties } from "react";
import { ICheckboxStyles, IDropdownOption } from "@fluentui/react";
import { DataType } from "../specification";

export type Widget = any;

export interface Property {
  property: string;
  field?: string | number | (string | number)[];
  noUpdateState?: boolean;
  noComputeLayout?: boolean;
}

export interface InputComboboxOptions extends SearchSection {
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

export interface InputSelectOptions extends SearchSection {
  type: "radio" | "dropdown";
  showLabel?: boolean;
  labelPosition?: LabelPosition;
  options: string[];
  icons?: string[];
  isLocalIcons?: boolean;
  labels?: string[];
  tooltip?: string;
  label?: string;
  hideBorder?: boolean;
  shiftCallout?: number;
  observerConfig?: ObserverConfig;
  onChange?: (value: IDropdownOption) => void;
}

export interface InputFontComboboxOptions extends SearchSection {
  label?: string;
}

export interface InputTextOptions extends SearchSection {
  label?: string;
  placeholder?: string;
  tooltip?: string;
  updateProperty?: boolean;
  value?: string;
  underline?: boolean;
  borderless?: boolean;
  styles?: CSSProperties;
  emitMappingAction?: boolean;
  disabled?: boolean;
}

export interface InputBooleanOptions extends SearchSection {
  type: "checkbox" | "highlight" | "checkbox-fill-width";
  icon?: string;
  headerLabel?: string;
  label?: string;
  observerConfig?: ObserverConfig;
  checkBoxStyles?: ICheckboxStyles;
  onChange?: (value: boolean) => void;
  styles?: CSSProperties;
}

export interface RowOptions extends SearchSection {
  dropzone?: {
    type: "axis-data-binding";
    prompt?: string;
    property?: string;
    defineCategories?: boolean;
  };
  noLineHeight?: boolean;
  acceptLinksTable?: boolean;
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
  shiftCallout?: number;
}

export interface MappingEditorOptions extends SearchSection {
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
  /** Text label of input */
  label?: string;
  stopPropagation?: boolean;

  acceptLinksTable?: boolean;
}

export interface ObserverConfig {
  isObserver: boolean;
  properties: Property | Property[];
  value: Specification.AttributeValue;
}

export interface InputNumberOptions extends SearchSection {
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
  stopPropagation?: boolean;

  observerConfig?: ObserverConfig;
  styles?: CSSProperties;
  placeholder?: string;
}

export interface InputDateOptions extends SearchSection {
  defaultValue?: number | Date;
  placeholder?: string;
  label?: string;
  onEnter?: (value: number) => boolean;
}

export interface InputColorOptions extends SearchSection {
  allowNull?: boolean;
  label?: string;
  noDefaultMargin?: boolean;
  stopPropagation?: boolean;
  labelKey: string;
  width?: number;
  underline?: boolean;
  pickerBeforeTextField?: boolean;
  styles?: {
    marginTop?: string;
  };
}

// eslint-disable-next-line
export interface TableOptions {}

export interface VerticalGroupOptions extends SearchSection {
  isCollapsed?: boolean;
  header: string;
  alignVertically?: boolean;
}

export const enum PanelMode {
  Button = "button",
  Panel = "panel",
}

export interface FilterEditorOptions extends SearchSection {
  table: string;
  target: {
    plotSegment?: Specification.PlotSegment;
    property?: Property;
  };
  value: Specification.Types.Filter;
  mode: PanelMode;
  key?: string;
}

export interface GroupByEditorOptions extends SearchSection {
  table: string;
  target: {
    plotSegment?: Specification.PlotSegment;
    property?: Property;
  };
  value: Specification.Types.GroupBy;
  mode: PanelMode;
  key: string;
}

export interface NestedChartEditorOptions extends SearchSection {
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
  styles?: CSSProperties;
}

export interface InputExpressionOptions extends SearchSection {
  table?: string;
  label?: string;
  allowNull?: boolean;
  placeholder?: string;
  noLineHeight?: boolean;
  dropzone?: {
    type: "axis-data-binding" | "tick-data-binding";
    prompt?: string;
    property?: string;
    defineCategories?: boolean;
  };
}

export interface InputFormatOptions extends SearchSection {
  blank?: string;
  allowNull?: boolean;
}

export interface InputFormatOptions {
  blank?: string;
  label?: string;
  allowNull?: boolean;
}

export interface InputFormatOptions {
  blank?: string;
  isDateField?: boolean;
  label?: string;
  allowNull?: boolean;
}

export interface ReOrderWidgetOptions {
  allowReset?: boolean;
  onConfirm?: (items: string[]) => void;
  onReset?: () => string[];
  items?: string[];
  onConfirmClick?: (items: string[]) => void;
  onResetCategories?: string[];
  sortedCategories?: string[];
  itemsDataType?: DataType.Number | DataType.String;
  allowDragItems?: boolean;
  onReorderHandler?: () => void;
  onButtonHandler?: () => void;
}

export interface InputFormatOptions {
  blank?: string;
  isDateField?: boolean;
}

export interface InputFormatOptions {
  blank?: string;
  isDateField?: boolean;
}

export interface InputFormatOptions {
  blank?: string;
  isDateField?: boolean;
}

export interface CustomCollapsiblePanelOptions {
  header?: string;
  styles?: CSSProperties;
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
  inputBoolean(
    property: Property | Property[],
    options: InputBooleanOptions
  ): Widget;
  inputExpression(property: Property, options?: InputExpressionOptions): Widget;
  inputFormat(property: Property, options?: InputFormatOptions): Widget;
  inputImage(property: Property): Widget;
  inputImageProperty(property: Property): Widget;
  inputColor(property: Property, options?: InputColorOptions): Widget;
  inputColorGradient(property: Property, inline?: boolean): Widget;

  // A button, once clicked, set the property to null.
  clearButton(
    property: Property,
    icon?: string,
    isHeader?: boolean,
    styles?: CSSProperties
  ): Widget;
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

  // Reorder widget: allow user to reorder the items in a property
  reorderByAnotherColumnWidget(
    property: Property,
    options: ReOrderWidgetOptions
  ): Widget;

  arrayWidget(
    property: Property,
    item: (item: Property, index?: number) => Widget,
    options?: ArrayWidgetOptions
  ): Widget;

  dropTarget(options: DropTargetOptions, widget: Widget): Widget;

  // Label and text
  icon(icon: string): Widget;

  label(title: string, options?: LabelOptions): Widget;

  text(text: string, align?: "left" | "center" | "right"): Widget;

  // Inline separator
  sep(): Widget;

  // Layout elements
  sectionHeader(title: string, widget?: Widget, options?: RowOptions): Widget;

  row(title?: string, widget?: Widget, options?: RowOptions): Widget;

  // Basic layout elements
  horizontal(cols: number[], ...widgets: Widget[]): Widget;

  styledHorizontal(
    styles: CSSProperties,
    cols: number[],
    ...widgets: Widget[]
  ): Widget;
  verticalGroup(options: VerticalGroupOptions, ...widgets: Widget[]): Widget;
  vertical(...widgets: Widget[]): Widget;
  styledVertical(styles: CSSProperties, ...widgets: Widget[]): Widget;
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

  customCollapsiblePanel(
    widgets: Widget[],
    options: CustomCollapsiblePanelOptions
  ): Widget;

  searchInput(options: InputTextOptions): Widget;

  searchWrapper(options: SearchWrapperOptions, ...widgets: Widget[]): Widget;
}

export interface PopupEditor {
  anchor: Point;
  widgets: Widget[];
}

export interface LabelOptions extends SearchSection {
  addMargins?: boolean;
  key?: string;
}

export interface SearchWrapperOptions {
  searchPattern: string[];
}

export interface SearchSection {
  searchSection?: string | string[];
  ignoreSearch?: boolean;
}

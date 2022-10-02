// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { FormatLocaleDefinition } from "d3-format";
import * as React from "react";
import * as ReactDOM from "react-dom";

import {
  Dataset,
  EventEmitter,
  Specification,
  EventSubscription,
  Prototypes,
  setFormatOptions,
  defaultCurrency,
  defaultDigitsGroup,
  defaultNumberFormat,
} from "../core";
import { RenderEvents } from "../core/graphics";
import {
  ChartComponent,
  DataSelection,
  GlyphEventHandler,
} from "./chart_component";
import { TemplateInstance } from "./chart_template";

export interface ChartContainerComponentProps {
  chart: Specification.Chart;
  dataset: Dataset.Dataset;
  defaultAttributes?: Prototypes.DefaultAttributes;
  defaultWidth: number;
  defaultHeight: number;
  onSelectionChange?: (data: { table: string; rowIndices: number[] }) => void;
  onMouseEnterGlyph?: (data: { table: string; rowIndices: number[] }) => void;
  onMouseLeaveGlyph?: (data: { table: string; rowIndices: number[] }) => void;
  onMouseContextMenuClickGlyph?: (
    data: { table: string; rowIndices: number[] },
    modifiers: any
  ) => void;
  renderEvents?: RenderEvents;
}

export interface LocalizationConfig {
  currency: string;
  thousandsDelimiter: string;
  decimalDelimiter: string;
}

export interface ChartContainerComponentState {
  width: number;
  height: number;
  selection: { table: string; indices: Set<number> } & DataSelection;
  localization: LocalizationConfig;
}

export class ChartContainerComponent extends React.Component<
  ChartContainerComponentProps,
  ChartContainerComponentState
> {
  public state: ChartContainerComponentState = {
    width: this.props.defaultWidth != null ? this.props.defaultWidth : 900,
    height: this.props.defaultHeight != null ? this.props.defaultHeight : 900,
    selection: null,
    localization: null,
  };

  constructor(props: ChartContainerComponentProps) {
    super(props);
  }

  public component: ChartComponent;

  public setSelection(
    table: string,
    rowIndices: number[],
    union: boolean = false,
    emit: boolean = false
  ) {
    const indicesSet = new Set(rowIndices);
    if (union && this.state.selection && this.state.selection.table == table) {
      for (const item of this.state.selection.indices) {
        indicesSet.add(item);
      }
    }
    this.setState({
      selection: {
        table,
        indices: indicesSet,
        isSelected: (qTable: string, qIndices: number[]) => {
          return (
            table == qTable && qIndices.find((v) => indicesSet.has(v)) >= 0
          );
        },
      },
    });
    if (emit && this.props.onSelectionChange) {
      this.props.onSelectionChange({
        table,
        rowIndices: Array.from(indicesSet),
      });
    }
  }

  public clearSelection(emit: boolean = false) {
    this.setState({ selection: null });
    if (emit && this.props.onSelectionChange) {
      this.props.onSelectionChange(null);
    }
  }

  public resize(width: number, height: number) {
    this.setState({ width, height });
  }

  public getProperty(
    objectID: string,
    property: Specification.Template.PropertyField
  ): any {
    return this.component.getProperty(objectID, property);
  }

  public setProperty(
    objectID: string,
    property: Specification.Template.PropertyField,
    value: any
  ) {
    return this.component.setProperty(objectID, property, value);
  }

  public getAttributeMapping(
    objectID: string,
    attribute: string
  ): Specification.Mapping {
    return this.component.getAttributeMapping(objectID, attribute);
  }

  public setAttributeMapping(
    objectID: string,
    attribute: string,
    mapping: Specification.Mapping
  ) {
    return this.component.setAttributeMapping(objectID, attribute, mapping);
  }

  protected handleGlyphClick: GlyphEventHandler = (data, modifiers) => {
    if (data == null) {
      this.clearSelection(true);
    } else {
      this.setSelection(
        data.table,
        data.rowIndices,
        modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey,
        true
      );
    }
  };

  protected handleGlyphContextMenuClick: GlyphEventHandler = (
    data,
    modifiers
  ) => {
    if (this.props.onMouseContextMenuClickGlyph) {
      this.props.onMouseContextMenuClickGlyph(data, modifiers);
    }
  };

  protected handleGlyphMouseEnter: GlyphEventHandler = (data) => {
    if (this.props.onMouseEnterGlyph) {
      this.props.onMouseEnterGlyph(data);
    }
  };

  protected handleGlyphMouseLeave: GlyphEventHandler = (data) => {
    if (this.props.onMouseLeaveGlyph) {
      this.props.onMouseLeaveGlyph(data);
    }
  };

  public render() {
    return (
      <ChartComponent
        ref={(e) => (this.component = e)}
        chart={this.props.chart}
        dataset={this.props.dataset}
        defaultAttributes={this.props.defaultAttributes}
        width={this.state.width}
        height={this.state.height}
        rootElement="svg"
        selection={this.state.selection}
        onGlyphClick={this.handleGlyphClick}
        onGlyphMouseEnter={this.handleGlyphMouseEnter}
        onGlyphMouseLeave={this.handleGlyphMouseLeave}
        onGlyphContextMenuClick={this.handleGlyphContextMenuClick}
        renderEvents={this.props.renderEvents}
      />
    );
  }
}

export enum ChartContainerEvent {
  Selection = "selection",
  MouseEnter = "mouseenter",
  MouseLeave = "mouseleave",
  ContextMenu = "contextmenu",
}

export class ChartContainer extends EventEmitter {
  private chart: Specification.Chart;
  private defaultAttributes: Prototypes.DefaultAttributes;

  private width: number = 1200;
  private height: number = 800;

  constructor(
    public readonly instance: TemplateInstance,
    public readonly dataset: Dataset.Dataset,
    public renderEvents?: RenderEvents,
    public localization?: LocalizationConfig
  ) {
    super();
    this.chart = instance.chart;
    this.defaultAttributes = instance.defaultAttributes;

    setFormatOptions({
      currency: [localization?.currency, ""] ?? defaultCurrency,
      grouping: defaultDigitsGroup,
      decimal: localization?.decimalDelimiter ?? defaultNumberFormat.decimal,
      thousands:
        localization?.thousandsDelimiter ?? defaultNumberFormat.decimal,
    });
  }

  private container: Element;
  private component: ChartContainerComponent;

  /** Resize the chart */
  public resize(width: number, height: number) {
    if (this.component) {
      this.component.resize(width, height);
    }
  }

  /** Listen to selection change */
  public addSelectionListener(
    listener: (table: string, rowIndices: number[]) => void
  ): EventSubscription {
    return this.addListener(ChartContainerEvent.Selection, listener);
  }

  public addContextMenuListener(
    listener: (table: string, rowIndices: number[], modifiers: any) => void
  ): EventSubscription {
    return this.addListener(ChartContainerEvent.ContextMenu, listener);
  }

  public addMouseEnterListener(
    listener: (table: string, rowIndices: number[]) => void
  ): EventSubscription {
    return this.addListener(ChartContainerEvent.MouseEnter, listener);
  }

  public addMouseLeaveListener(
    listener: (table: string, rowIndices: number[], modifiers: any) => void
  ): EventSubscription {
    return this.addListener(ChartContainerEvent.MouseLeave, listener);
  }

  /** Set data selection and update the chart */
  public setSelection(table: string, rowIndices: number[]) {
    this.component.setSelection(table, rowIndices);
  }

  /** Clear data selection and update the chart */
  public clearSelection() {
    this.component.clearSelection();
  }

  /** Get a property from the chart */
  public getProperty(
    objectID: string,
    property: Specification.Template.PropertyField
  ): any {
    return this.component.getProperty(objectID, property);
  }

  /** Set a property to the chart */
  public setProperty(
    objectID: string,
    property: Specification.Template.PropertyField,
    value: any
  ) {
    return this.component.setProperty(objectID, property, value);
  }

  /**
   * Get a attribute mapping
   */
  public getAttributeMapping(
    objectID: string,
    attribute: string
  ): Specification.Mapping {
    return this.component.getAttributeMapping(objectID, attribute);
  }

  /** Set a attribute mapping */
  public setAttributeMapping(
    objectID: string,
    attribute: string,
    mapping: Specification.Mapping
  ) {
    return this.component.setAttributeMapping(objectID, attribute, mapping);
  }

  public setChart(chart: Specification.Chart) {
    this.chart = chart;
    ReactDOM.render(this.reactMount(this.width, this.height), this.container);
  }

  public static setFormatOptions(options: FormatLocaleDefinition) {
    setFormatOptions(options);
  }

  public reactMount(width: number = 1200, height: number = 800) {
    this.width = width;
    this.height = height;
    return (
      <ChartContainerComponent
        ref={(e) => (this.component = e)}
        chart={this.chart}
        dataset={this.dataset}
        defaultWidth={width}
        defaultHeight={height}
        defaultAttributes={this.defaultAttributes}
        onSelectionChange={(data) => {
          if (data == null) {
            this.emit(ChartContainerEvent.Selection);
          } else {
            this.emit(
              ChartContainerEvent.Selection,
              data.table,
              data.rowIndices
            );
          }
        }}
        onMouseEnterGlyph={(data) => {
          this.emit(
            ChartContainerEvent.MouseEnter,
            data.table,
            data.rowIndices
          );
        }}
        onMouseLeaveGlyph={(data) => {
          this.emit(
            ChartContainerEvent.MouseLeave,
            data.table,
            data.rowIndices
          );
        }}
        onMouseContextMenuClickGlyph={(data, modifiers) => {
          this.emit(
            ChartContainerEvent.ContextMenu,
            data.table,
            data.rowIndices,
            modifiers
          );
        }}
        renderEvents={this.renderEvents}
      />
    );
  }

  /** Mount the chart to a container element */
  public mount(
    container: string | Element,
    width: number = 1200,
    height: number = 800
  ) {
    // We only mount in one place
    if (this.container) {
      this.unmount();
    }
    if (typeof container == "string") {
      container = document.getElementById(container);
    }
    this.container = container;
    ReactDOM.render(this.reactMount(width, height), container);
  }

  /** Unmount the chart */
  public unmount() {
    if (this.container) {
      ReactDOM.unmountComponentAtNode(this.container);
      this.container = null;
    }
  }
}

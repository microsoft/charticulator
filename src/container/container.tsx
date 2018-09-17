// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOM from "react-dom";

import {
  Dataset,
  EventEmitter,
  Specification,
  EventSubscription,
  Prototypes
} from "../core";
import {
  ChartComponent,
  DataSelection,
  OnSelectGlyph
} from "./chart_component";
import { TemplateInstance } from "./chart_template";

export interface ChartContainerComponentProps {
  chart: Specification.Chart;
  dataset: Dataset.Dataset;
  defaultAttributes?: Prototypes.DefaultAttributes;
  defaultWidth: number;
  defaultHeight: number;
  onSelectionChange?: (data: { table: string; rowIndices: number[] }) => void;
}

export interface ChartContainerComponentState {
  width: number;
  height: number;
  selection: { table: string; indices: Set<number> } & DataSelection;
}

export class ChartContainerComponent extends React.Component<
  ChartContainerComponentProps,
  ChartContainerComponentState
> {
  public state: ChartContainerComponentState = {
    width: this.props.defaultWidth != null ? this.props.defaultWidth : 900,
    height: this.props.defaultHeight != null ? this.props.defaultHeight : 900,
    selection: null
  };

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
          return table == qTable && qIndices.find(v => indicesSet.has(v)) >= 0;
        }
      }
    });
    if (emit && this.props.onSelectionChange) {
      this.props.onSelectionChange({
        table,
        rowIndices: Array.from(indicesSet)
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

  protected handleSelectGlyph: OnSelectGlyph = (data, modifiers) => {
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

  public render() {
    return (
      <ChartComponent
        ref={e => (this.component = e)}
        chart={this.props.chart}
        dataset={this.props.dataset}
        defaultAttributes={this.props.defaultAttributes}
        width={this.state.width}
        height={this.state.height}
        rootElement="svg"
        selection={this.state.selection}
        onSelectGlyph={this.handleSelectGlyph}
      />
    );
  }
}

export class ChartContainer extends EventEmitter {
  private chart: Specification.Chart;
  private defaultAttributes: Prototypes.DefaultAttributes;

  constructor(
    public readonly instance: TemplateInstance,
    public readonly dataset: Dataset.Dataset
  ) {
    super();
    this.chart = instance.chart;
    this.defaultAttributes = instance.defaultAttributes;
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
    return this.addListener("selection", listener);
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

  /** Get a attribute mapping */
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

  /** Mount the chart to a container element */
  public mount(
    container: string | Element,
    width: number = 900,
    height: number = 600
  ) {
    // We only mount in one place
    if (this.container) {
      this.unmount();
    }
    if (typeof container == "string") {
      container = document.getElementById(container);
    }
    this.container = container;
    ReactDOM.render(
      <ChartContainerComponent
        ref={e => (this.component = e)}
        chart={this.chart}
        dataset={this.dataset}
        defaultWidth={width}
        defaultHeight={height}
        defaultAttributes={this.defaultAttributes}
        onSelectionChange={data => {
          if (data == null) {
            this.emit("selection");
          } else {
            this.emit("selection", data.table, data.rowIndices);
          }
        }}
      />,
      container
    );
  }

  /** Unmount the chart */
  public unmount() {
    if (this.container) {
      ReactDOM.unmountComponentAtNode(this.container);
      this.container = null;
    }
  }
}

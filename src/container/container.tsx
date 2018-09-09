/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as ReactDOM from "react-dom";

import {
  Dataset,
  EventEmitter,
  Specification,
  EventSubscription
} from "../core";
import {
  ChartComponent,
  DataSelection,
  OnSelectGlyph
} from "./chart_component";

export interface ChartContainerComponentProps {
  chart: Specification.Chart;
  dataset: Dataset.Dataset;
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

  public setSelection(table: string, rowIndices: number[], union: boolean) {
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
    if (this.props.onSelectionChange) {
      this.props.onSelectionChange({
        table,
        rowIndices: Array.from(indicesSet)
      });
    }
  }

  public clearSelection() {
    this.setState({ selection: null });
    if (this.props.onSelectionChange) {
      this.props.onSelectionChange(null);
    }
  }

  public resize(width: number, height: number) {
    this.setState({ width, height });
  }

  protected handleSelectGlyph: OnSelectGlyph = (data, modifiers) => {
    if (data == null) {
      this.clearSelection();
    } else {
      this.setSelection(
        data.table,
        data.rowIndices,
        modifiers.shiftKey || modifiers.ctrlKey
      );
    }
  };

  public render() {
    return (
      <ChartComponent
        chart={this.props.chart}
        dataset={this.props.dataset}
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
  constructor(
    public readonly chart: Specification.Chart,
    public readonly dataset: Dataset.Dataset
  ) {
    super();
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
    this.component.setSelection(table, rowIndices, false);
  }

  /** Clear data selection and update the chart */
  public clearSelection() {
    this.component.clearSelection();
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

  /** Unmounr the chart */
  public unmount() {
    if (this.container) {
      ReactDOM.unmountComponentAtNode(this.container);
      this.container = null;
    }
  }
}

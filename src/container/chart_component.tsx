// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import {
  Specification,
  Dataset,
  Prototypes,
  Graphics,
  Solver,
  zip,
  deepClone
} from "../core";
import {
  renderGraphicalElementSVG,
  RenderGraphicalElementSVGOptions
} from "../app/renderer";

export interface DataSelection {
  isSelected(table: string, rowIndices: number[]): boolean;
}

export type OnSelectGlyph = (
  data: { table: string; rowIndices: number[] },
  modifiers: { ctrlKey: boolean; shiftKey: boolean }
) => void;

export interface ChartComponentProps {
  chart: Specification.Chart;
  dataset: Dataset.Dataset;
  width: number;
  height: number;
  rootElement: "svg" | "g";
  className?: string;

  /** Additional options for the SVG renderer */
  rendererOptions?: RenderGraphicalElementSVGOptions;
  /** Render the chart synchronously */
  sync?: boolean;

  selection?: DataSelection;
  onSelectGlyph?: OnSelectGlyph;
}

export interface ChartComponentState {
  working: boolean;
  graphics: Graphics.Element;
}

/** A React component that manages a sub-chart */
export class ChartComponent extends React.Component<
  ChartComponentProps,
  ChartComponentState
> {
  protected manager: Prototypes.ChartStateManager;
  protected renderer: Graphics.ChartRenderer;

  constructor(props: ChartComponentProps) {
    super(props);
    this.recreateManager(props);
    this.updateWithNewProps(props);
    if (props.sync) {
      for (let i = 0; i < 2; i++) {
        const solver = new Solver.ChartConstraintSolver();
        solver.setup(this.manager);
        solver.solve();
        solver.destroy();
      }
      this.state = {
        working: false,
        graphics: this.renderer.render()
      };
    } else {
      this.state = {
        working: true,
        graphics: null
      };
      this.scheduleUpdate();
    }
  }

  public applySelection(selection: DataSelection) {
    this.manager.enumeratePlotSegments(cls => {
      for (const [rowIndices, glyphState] of zip(
        cls.state.dataRowIndices,
        cls.state.glyphs
      )) {
        if (selection == null) {
          glyphState.emphasized = true;
        } else {
          glyphState.emphasized = selection.isSelected(
            cls.object.table,
            rowIndices
          );
        }
      }
    });
  }

  public componentWillReceiveProps(newProps: ChartComponentProps) {
    if (this.updateWithNewProps(newProps)) {
      this.setState({ working: true });
      this.scheduleUpdate();
    } else if (newProps.selection != this.props.selection) {
      this.applySelection(newProps.selection);
      this.setState({
        graphics: this.renderer.render()
      });
    }
  }

  public isEqual<T>(a: T, b: T) {
    if (a == b) {
      return true;
    }
    return JSON.stringify(a) == JSON.stringify(b);
  }

  public updateWithNewProps(newProps: ChartComponentProps) {
    let changed = false;
    if (!this.isEqual(newProps.chart, this.props.chart)) {
      this.recreateManager(newProps);
      changed = true;
    } else if (!this.isEqual(newProps.dataset, this.props.dataset)) {
      this.manager.setDataset(newProps.dataset);
      changed = true;
    }
    if (
      !this.manager.chart.mappings.width ||
      newProps.width !=
        (this.manager.chart.mappings.width as Specification.ValueMapping).value
    ) {
      this.manager.chart.mappings.width = {
        type: "value",
        value: newProps.width
      } as Specification.ValueMapping;
      changed = true;
    }
    if (
      !this.manager.chart.mappings.height ||
      newProps.height !=
        (this.manager.chart.mappings.height as Specification.ValueMapping).value
    ) {
      this.manager.chart.mappings.height = {
        type: "value",
        value: newProps.height
      } as Specification.ValueMapping;
      changed = true;
    }
    return changed;
  }

  protected recreateManager(props: ChartComponentProps) {
    this.manager = new Prototypes.ChartStateManager(
      deepClone(props.chart),
      props.dataset
    );
    this.renderer = new Graphics.ChartRenderer(this.manager);
  }

  protected timer: any;
  protected scheduleUpdate() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      for (let i = 0; i < 2; i++) {
        const solver = new Solver.ChartConstraintSolver();
        solver.setup(this.manager);
        solver.solve();
        solver.destroy();
      }
      this.applySelection(this.props.selection);
      this.setState({
        working: false,
        graphics: this.renderer.render()
      });
    }, 10);
  }

  public getProperty(
    objectID: string,
    property: Specification.Template.PropertyField
  ): Specification.AttributeValue {
    const obj = Prototypes.findObjectById(this.manager.chart, objectID);
    if (!obj) {
      return null;
    }
    return Prototypes.getProperty(obj, property);
  }

  public setProperty(
    objectID: string,
    property: Specification.Template.PropertyField,
    value: Specification.AttributeValue
  ) {
    const obj = Prototypes.findObjectById(this.manager.chart, objectID);
    if (!obj) {
      return;
    }
    if (!this.isEqual(Prototypes.getProperty(obj, property), value)) {
      Prototypes.setProperty(obj, property, deepClone(value));
      this.setState({ working: true });
      this.scheduleUpdate();
      console.log("setProperty", property, value);
    }
  }

  public getAttributeMapping(
    objectID: string,
    attribute: string
  ): Specification.Mapping {
    const obj = Prototypes.findObjectById(this.manager.chart, objectID);
    if (!obj) {
      return null;
    }
    return obj.mappings[attribute];
  }

  public setAttributeMapping(
    objectID: string,
    attribute: string,
    mapping: Specification.Mapping
  ) {
    const obj = Prototypes.findObjectById(this.manager.chart, objectID);
    if (!obj) {
      return;
    }
    if (!this.isEqual(obj.mappings[attribute], mapping)) {
      obj.mappings[attribute] = deepClone(mapping);
      this.setState({ working: true });
      this.scheduleUpdate();
      console.log("setAttributeMapping", attribute, mapping);
    }
  }

  public render() {
    const renderOptions = { ...this.props.rendererOptions };
    if (this.props.onSelectGlyph) {
      renderOptions.onSelected = (element, event) => {
        // Find the data row indices
        const cls = this.manager.getClassById(
          element.plotSegment._id
        ) as Prototypes.PlotSegments.PlotSegmentClass;
        const rowIndices = cls.state.dataRowIndices[element.glyphIndex];
        const modifiers = {
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey
        };
        this.props.onSelectGlyph(
          { table: element.plotSegment.table, rowIndices },
          modifiers
        );
      };
    }
    const gfx = renderGraphicalElementSVG(this.state.graphics, renderOptions);
    const inner = (
      <g
        transform={`translate(${this.props.width / 2}, ${this.props.height /
          2})`}
      >
        {this.props.onSelectGlyph ? (
          <rect
            x={-this.props.width / 2}
            y={-this.props.height / 2}
            width={this.props.width}
            height={this.props.height}
            style={{
              fill: "none",
              pointerEvents: "all",
              stroke: "none"
            }}
            onClick={() => {
              this.props.onSelectGlyph(null, null);
            }}
          />
        ) : null}
        {gfx}
        {this.state.working ? (
          <rect
            x={-this.props.width / 2}
            y={-this.props.height / 2}
            width={this.props.width}
            height={this.props.height}
            style={{
              fill: "rgba(0, 0, 0, 0.1)",
              stroke: "none"
            }}
          />
        ) : null}
      </g>
    );
    switch (this.props.rootElement) {
      case "svg": {
        return (
          <svg
            x={0}
            y={0}
            width={this.props.width}
            height={this.props.height}
            className={this.props.className}
            style={{
              userSelect: "none"
            }}
          >
            {inner}
          </svg>
        );
      }
      case "g": {
        return <g className={this.props.className}>{inner}</g>;
      }
    }
  }
}

/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";

import { Specification, Dataset, Prototypes, Graphics, Solver } from "../core";
import {
  renderGraphicalElementSVG,
  RenderGraphicalElementSVGOptions
} from "../app/renderer";

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

  public componentWillReceiveProps(newProps: ChartComponentProps) {
    if (this.updateWithNewProps(newProps)) {
      this.setState({ working: true });
      this.scheduleUpdate();
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
    this.manager = new Prototypes.ChartStateManager(props.chart, props.dataset);
    this.renderer = new Graphics.ChartRenderer(this.manager);
  }

  protected scheduleUpdate() {
    setTimeout(() => {
      for (let i = 0; i < 2; i++) {
        const solver = new Solver.ChartConstraintSolver();
        solver.setup(this.manager);
        solver.solve();
        solver.destroy();
      }
      this.setState({
        working: false,
        graphics: this.renderer.render()
      });
    }, 10);
  }

  public render() {
    const gfx = renderGraphicalElementSVG(
      this.state.graphics,
      this.props.rendererOptions
    );
    const inner = (
      <g
        transform={`translate(${this.props.width / 2}, ${this.props.height /
          2})`}
      >
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

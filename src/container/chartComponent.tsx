import * as React from "react";

import { Specification, Dataset, Prototypes, Graphics, Solver } from "../core";
import { renderGraphicalElementSVG } from "../app/renderer";

export interface ChartComponentProps {
  chart: Specification.Chart;
  dataset: Dataset.Dataset;
  width: number;
  height: number;
  rootElement: "svg" | "g";
  className?: string;
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

  public state: ChartComponentState = {
    working: true,
    graphics: null
  };

  constructor(props: ChartComponentProps) {
    super(props);
    this.recreateManager(props);
    this.componentWillReceiveProps(props);
  }

  public componentWillReceiveProps(newProps: ChartComponentProps) {
    if (newProps.chart != this.props.chart) {
      this.recreateManager(newProps);
    } else if (newProps.dataset != this.props.dataset) {
      this.manager.setDataset(newProps.dataset);
    }
    this.manager.chart.mappings.width = {
      type: "value",
      value: newProps.width
    } as Specification.ValueMapping;
    this.manager.chart.mappings.height = {
      type: "value",
      value: newProps.height
    } as Specification.ValueMapping;
    this.scheduleUpdate();
  }

  protected recreateManager(props: ChartComponentProps) {
    this.manager = new Prototypes.ChartStateManager(props.chart, props.dataset);
    this.renderer = new Graphics.ChartRenderer(this.manager);
  }

  protected scheduleUpdate() {
    this.setState({ working: true });
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
    const gfx = renderGraphicalElementSVG(this.state.graphics);
    const inner = (
      <g
        transform={`translate(${this.props.width / 2}, ${this.props.height /
          2})`}
      >
        {gfx}
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

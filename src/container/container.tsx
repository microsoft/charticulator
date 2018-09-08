/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderGraphicalElementSVG } from "../app/renderer";
import {
  Dataset,
  EventSubscription,
  Graphics,
  Prototypes,
  Solver,
  Specification
} from "../core";
import { ChartSelection, ChartStore } from "./chart_store";

export * from "../core";

export class ChartContainer {
  // Needed for extensions
  public chart: Specification.Chart;

  private renderer: Graphics.ChartRenderer;
  private containerElement: HTMLElement;
  private store: ChartStore;

  // This cache should work for now
  private plotSegments: Array<{
    segment: Specification.PlotSegment;
    state: Specification.PlotSegmentState;
  }>;

  constructor(specification: Specification.Chart, dataset: Dataset.Dataset) {
    this.store = new ChartStore(specification, dataset);
    this.chart = specification;
    this.renderer = new Graphics.ChartRenderer(this.store.manager);
    this.plotSegments = this.chart.elements
      .map((e, layoutIndex) => {
        if (Prototypes.isType(e.classID, "plot-segment")) {
          return {
            segment: e as Specification.PlotSegment,
            state: this.store.state.elements[
              layoutIndex
            ] as Specification.PlotSegmentState
          };
        }
      })
      .filter(n => !!n);
    this.store.addListener(ChartStore.EVENT_SELECTION, this.onSelectionChanged);
  }

  /**
   * Listens for when the selection changed within the store
   */
  private onSelectionChanged = () => {
    // When the selection has changed, rerender
    this.render(this.containerElement);
  };

  /**
   * Listener for when an element is selected on the renderer
   */
  private onElementSelected = (element?: Graphics.MarkElement) => {
    // let action: Action;
    // // The user selected nothing, so clear the selection
    // if (!element || !element.mark) {
    //   action = new ClearSelection();
    //   // Otherwise, the user selected some useful mark
    // } else {
    //   const { mark, glyph, glyphIndex } = element;
    //   const pss = this.plotSegments.filter(
    //     n => n.segment.glyph === glyph._id
    //   )[0].state;
    //   const dataRowIndex = pss.dataRowIndices[glyphIndex];
    //   action = new SelectMark(glyph, mark, dataRowIndex);
    // }
    // if (action) {
    //   this.store.dispatcher.dispatch(action);
    // }
  };

  /**
   * Applies the current selection state to the glyphs
   */
  private applySelectionToGlyphs() {
    const selection = this.store.currentSelection;
    if (selection) {
      this.plotSegments.forEach(({ state, segment }) =>
        state.glyphs.forEach((gs, index) => {
          // Mark all glyphs that have the same dataRowIndex as the one that was selected
          gs.emphasized =
            state.dataRowIndices[index].indexOf(selection.dataIndex) >= 0 &&
            segment.table === selection.table;
        })
      );
    } else {
      // Reset the emphasized state on the glyphs, as nothing is emphasized anymore
      this.plotSegments.forEach(({ state }) =>
        state.glyphs.forEach(g => delete g.emphasized)
      );
    }
  }

  /**
   * Gets the current selection
   */
  public get currentSelection(): ChartSelection | undefined {
    return this.store.currentSelection;
  }

  /**
   * Sets the current selection
   * @param value The new selection
   */
  public set currentSelection(value: ChartSelection | undefined) {
    this.store.setSelection(value);
  }

  /**
   * Adds a listener to the chart container
   * @param event The event to listen to
   * @param listener The listener to add
   */
  public addListener(event: string, listener: Function) {
    return this.store.addListener(event, listener);
  }

  /**
   * Removes a subscribed listener
   * @param sub The subscription
   */
  public removeSubscription(sub: EventSubscription) {
    return this.store.removeSubscription(sub);
  }

  public update() {
    for (let i = 0; i < 2; i++) {
      const solver = new Solver.ChartConstraintSolver();
      solver.setup(this.store.manager);
      solver.solve();
      solver.destroy();
    }
  }

  public resize(width: number, height: number) {
    this.store.chart.mappings.width = {
      type: "value",
      value: width
    } as Specification.ValueMapping;
    this.store.chart.mappings.height = {
      type: "value",
      value: height
    } as Specification.ValueMapping;
  }

  public render(containerElement: HTMLElement) {
    if (!containerElement) {
      throw new Error("Container element required");
    }

    this.applySelectionToGlyphs();

    this.containerElement = containerElement;

    const { width, height } = this.store.chart.mappings as any;

    const graphics = this.renderer.render();
    const rendered = (
      <svg
        className="canvas-view"
        x={0}
        y={0}
        width={width.value}
        height={height.value}
        onClick={() => this.onElementSelected()}
      >
        <g transform={`translate(${width.value / 2}, ${height.value / 2})`}>
          {renderGraphicalElementSVG(graphics, {
            onSelected: this.onElementSelected
          })}
        </g>
      </svg>
    );

    ReactDOM.render(rendered, containerElement);
  }
}

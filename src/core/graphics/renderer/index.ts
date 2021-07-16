// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * See {@link ChartRenderer} for details
 *
 * @packageDocumentation
 * @preferred
 */

import { renderGraphicalElementSVG } from "../../../app/renderer";
import {
  getById,
  MultistringHashMap,
  Point,
  transpose,
  zipArray,
} from "../../common";
import * as Dataset from "../../dataset";
import * as Prototypes from "../../prototypes";
import * as Specification from "../../specification";
import { CartesianCoordinates, CoordinateSystem } from "../coordinate_system";
import { Element, Group, makeGroup, makeRect } from "../elements";

export function facetRows(
  rows: Dataset.Row[],
  indices: number[],
  columns?: string[]
): number[][] {
  if (columns == null) {
    return [indices];
  } else {
    const facets = new MultistringHashMap<number[]>();
    for (const index of indices) {
      const row = rows[index];
      const facetValues = columns.map((c) => <string>row[c]);
      if (facets.has(facetValues)) {
        facets.get(facetValues).push(index);
      } else {
        facets.set(facetValues, [index]);
      }
    }
    return Array.from(facets.values());
  }
}

export interface RenderEvents {
  afterRendered: () => void;
}

/**
 * The class is responsible for rendering the visual part of the chart (coordinates, elements such as glyph marks e.t.c).
 * The module calls methods {@link MarkClass.getGraphics} implemented in each marks (rect, image, text, symbol e.t.c)
 *
 */
export class ChartRenderer {
  constructor(
    private manager: Prototypes.ChartStateManager,
    private renderEvents?: RenderEvents
  ) {
    this.manager = manager;
  }

  /**
   * Render marks in a glyph
   * @returns an array of groups with the same size as glyph.marks
   */
  private renderGlyphMarks(
    plotSegment: Specification.PlotSegment,
    plotSegmentState: Specification.PlotSegmentState,
    coordinateSystem: CoordinateSystem,
    offset: Point,
    glyph: Specification.Glyph,
    state: Specification.GlyphState,
    index: number
  ): Group[] {
    return zipArray(glyph.marks, state.marks).map(([mark, markState]) => {
      if (!mark.properties.visible) {
        return null;
      }
      const cls = this.manager.getMarkClass(markState);
      const g = cls.getGraphics(
        coordinateSystem,
        offset,
        index,
        this.manager,
        state.emphasized
      );
      if (g != null) {
        g.selectable = {
          plotSegment,
          glyphIndex: index,
          rowIndices: plotSegmentState.dataRowIndices[index],
          enableTooltips: <boolean>cls.object.properties.enableTooltips,
          enableContextMenu: <boolean>cls.object.properties.enableContextMenu,
          enableSelection: <boolean>cls.object.properties.enableSelection,
        };
        return makeGroup([g]);
      } else {
        return null;
      }
    });
  }

  /**
   * Method calls getGraphics method of {@link Mark} objects to get graphical representation of element
   * @param dataset Dataset of charticulator
   * @param chart Chart object
   * @param chartState State of chart and chart elements
   */
  // eslint-disable-next-line
  private renderChart(
    // eslint-disable-next-line
    dataset: Dataset.Dataset,
    chart: Specification.Chart,
    chartState: Specification.ChartState
  ): Group {
    const graphics: Element[] = [];

    // Chart background
    const bg = this.manager.getChartClass(chartState).getBackgroundGraphics();
    if (bg) {
      graphics.push(bg);
    }

    const linkGroup = makeGroup([]);

    graphics.push(linkGroup);

    const elementsAndStates = zipArray(chart.elements, chartState.elements);

    // Render layout graphics
    for (const [element, elementState] of elementsAndStates) {
      if (!element.properties.visible) {
        continue;
      }
      // Render marks if this is a plot segment
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = <Specification.PlotSegment>element;
        const plotSegmentState = <Specification.PlotSegmentState>elementState;
        const mark = getById(chart.glyphs, plotSegment.glyph);
        const plotSegmentClass = this.manager.getPlotSegmentClass(
          plotSegmentState
        );
        const coordinateSystem = plotSegmentClass.getCoordinateSystem();
        // Render glyphs
        const glyphArrays: Group[][] = [];
        for (const [
          glyphIndex,
          glyphState,
        ] of plotSegmentState.glyphs.entries()) {
          const anchorX = <number>glyphState.marks[0].attributes.x;
          const anchorY = <number>glyphState.marks[0].attributes.y;
          const offsetX = <number>glyphState.attributes.x - anchorX;
          const offsetY = <number>glyphState.attributes.y - anchorY;
          const g = this.renderGlyphMarks(
            plotSegment,
            plotSegmentState,
            coordinateSystem,
            { x: offsetX, y: offsetY },
            mark,
            glyphState,
            glyphIndex
          );
          glyphArrays.push(g);
        }
        // Transpose glyphArrays so each mark is in a layer
        const glyphElements = transpose(glyphArrays).map((x) => makeGroup(x));
        const gGlyphs = makeGroup(glyphElements);
        gGlyphs.transform = coordinateSystem.getBaseTransform();
        const g = plotSegmentClass.getPlotSegmentGraphics(
          gGlyphs,
          this.manager
        );
        // render plotsegment background elements
        const gBackgroundElements = makeGroup([]);
        const plotSegmentBackgroundElements = plotSegmentClass.getPlotSegmentBackgroundGraphics(
          this.manager
        );
        gBackgroundElements.elements.push(plotSegmentBackgroundElements);
        const gElement = makeGroup([]);
        gElement.elements.push(gBackgroundElements);
        gElement.elements.push(g);
        gElement.key = element._id;
        graphics.push(gElement);
      } else if (Prototypes.isType(element.classID, "mark")) {
        const cs = new CartesianCoordinates({ x: 0, y: 0 });
        const gElement = makeGroup([]);
        const elementClass = this.manager.getMarkClass(elementState);
        const g = elementClass.getGraphics(
          cs,
          { x: 0, y: 0 },
          null,
          this.manager
        );
        gElement.elements.push(g);
        gElement.key = element._id;
        graphics.push(gElement);
      } else {
        const gElement = makeGroup([]);
        const elementClass = this.manager.getChartElementClass(elementState);
        const g = elementClass.getGraphics(this.manager);
        gElement.elements.push(g);
        gElement.key = element._id;
        graphics.push(gElement);
      }
    }

    const chartEventHandlerRect = makeRect(
      <number>chartState.attributes.x1,
      <number>chartState.attributes.y1,
      <number>chartState.attributes.x2,
      <number>chartState.attributes.y2,
      {
        fillColor: null,
        opacity: 1,
      }
    );

    // don't need to handle other events by chart.
    if (chart.properties.enableContextMenu) {
      chartEventHandlerRect.selectable = {
        plotSegment: null,
        glyphIndex: null,
        rowIndices: null,
        enableTooltips: false,
        enableContextMenu:
          chart.properties.enableContextMenu !== undefined
            ? <boolean>chart.properties.enableContextMenu
            : true,
        enableSelection: false,
      };
    }

    return makeGroup([chartEventHandlerRect, ...graphics]);
  }

  public renderControls(
    chart: Specification.Chart,
    chartState: Specification.ChartState
  ) {
    const elementsAndStates = zipArray(chart.elements, chartState.elements);

    const controls: Group = makeGroup([]);

    // Render control graphics
    for (const [element, elementState] of elementsAndStates) {
      if (!element.properties.visible) {
        continue;
      }
      // Render plotsegment controls
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegmentState = <Specification.PlotSegmentState>elementState;
        const plotSegmentClass = this.manager.getPlotSegmentClass(
          plotSegmentState
        );
        const plotSegmentBackgroundControlElements: Element = plotSegmentClass.renderControls(
          this.manager
        );

        controls.elements.push(plotSegmentBackgroundControlElements);
      }
    }

    return renderGraphicalElementSVG(controls);
  }

  public render(): Group {
    const group = this.renderChart(
      this.manager.dataset,
      this.manager.chart,
      this.manager.chartState
    );
    if (this.renderEvents?.afterRendered) {
      this.renderEvents.afterRendered();
    }
    return group;
  }
}

export * from "./text_measurer";

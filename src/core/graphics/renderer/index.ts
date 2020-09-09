// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * See {@link ChartRenderer} for details
 *
 * @packageDocumentation
 * @preferred
 */

import {
  getById,
  MultistringHashMap,
  Point,
  transpose,
  zipArray
} from "../../common";
import * as Dataset from "../../dataset";
import * as Prototypes from "../../prototypes";
import * as Specification from "../../specification";
import { CartesianCoordinates, CoordinateSystem } from "../coordinate_system";
import { Element, Group, makeGroup } from "../elements";

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
      const facetValues = columns.map(c => row[c] as string);
      if (facets.has(facetValues)) {
        facets.get(facetValues).push(index);
      } else {
        facets.set(facetValues, [index]);
      }
    }
    return Array.from(facets.values());
  }
}

/**
 * The class is responsible for rendering the visual part of the chart (coordinates, elements such as glyph marks e.t.c).
 * The module calls methods {@link MarkClass.getGraphics} implemented in each marks (rect, image, text, symbol e.t.c)
 *
 */
export class ChartRenderer {
  private manager: Prototypes.ChartStateManager;

  constructor(manager: Prototypes.ChartStateManager) {
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
      const g = this.manager
        .getMarkClass(markState)
        .getGraphics(
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
          rowIndices: plotSegmentState.dataRowIndices[index]
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
  private renderChart(
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
        const plotSegment = element as Specification.PlotSegment;
        const plotSegmentState = elementState as Specification.PlotSegmentState;
        const mark = getById(chart.glyphs, plotSegment.glyph);
        const plotSegmentClass = this.manager.getPlotSegmentClass(
          plotSegmentState
        );
        const coordinateSystem = plotSegmentClass.getCoordinateSystem();
        // Render glyphs
        const glyphArrays: Group[][] = [];
        for (const [
          glyphIndex,
          glyphState
        ] of plotSegmentState.glyphs.entries()) {
          const anchorX = glyphState.marks[0].attributes.x as number;
          const anchorY = glyphState.marks[0].attributes.y as number;
          const offsetX = (glyphState.attributes.x as number) - anchorX;
          const offsetY = (glyphState.attributes.y as number) - anchorY;
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
        const glyphElements = transpose(glyphArrays).map(x => makeGroup(x));
        const gGlyphs = makeGroup(glyphElements);
        gGlyphs.transform = coordinateSystem.getBaseTransform();
        const gElement = makeGroup([]);
        const g = plotSegmentClass.getPlotSegmentGraphics(
          gGlyphs,
          this.manager
        );
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

    return makeGroup(graphics);
  }

  public render(): Group {
    return this.renderChart(
      this.manager.dataset,
      this.manager.chart,
      this.manager.chartState
    );
  }
}

export * from "./text_measurer";

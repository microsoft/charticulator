import {
  Color,
  getById,
  getByName,
  indexOf,
  MultistringHashMap,
  Point,
  zip,
  zipArray
} from "../../common";
import * as Dataset from "../../dataset";
import * as Prototypes from "../../prototypes";
import * as Specification from "../../specification";
import { CartesianCoordinates, CoordinateSystem } from "../coordinate_system";
import {
  Element,
  Group,
  makeGroup,
  makeLine,
  makePolygon,
  makeRect,
  Style
} from "../elements";

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

interface ResolvedLinkAnchorPoint {
  anchorIndex: number;
  x: { element: number; attribute: string };
  y: { element: number; attribute: string };
  direction: Point;
  colorType: string;
  colorValue?: Color;
  colorScale?: {
    class: Prototypes.Scales.ScaleClass;
    column: string;
  };
}

interface AnchorPoint {
  x: number;
  y: number;
  direction: Point;
  color: Color;
}

export class ChartRenderer {
  private manager: Prototypes.ChartStateManager;

  constructor(manager: Prototypes.ChartStateManager) {
    this.manager = manager;
  }

  private renderGlyph(
    coordinateSystem: CoordinateSystem,
    offset: Point,
    glyph: Specification.Glyph,
    state: Specification.GlyphState,
    index: number
  ): Group {
    const gs: Element[] = [];
    for (const [mark, markState] of zip(glyph.marks, state.marks)) {
      if (!mark.properties.visible) {
        continue;
      }
      const g = this.manager
        .getMarkClass(markState)
        .getGraphics(coordinateSystem, offset, index);
      if (g != null) {
        gs.push(g);
      }
    }
    return makeGroup(gs);
  }

  public renderChart(
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

    const chartLinks = chart.elements.filter(x =>
      Prototypes.isType(x.classID, "links")
    ) as Specification.Links[];
    const plotSegments = chart.elements.filter(x =>
      Prototypes.isType(x.classID, "plot-segment")
    ) as Specification.PlotSegment[];

    graphics.push(linkGroup);

    const elementsAndStates = zipArray(chart.elements, chartState.elements);
    // Enforce an order: links gets rendered first.
    elementsAndStates.sort((a, b) => {
      let pa = 0,
        pb = 0;
      if (Prototypes.isType(a[0].classID, "links")) {
        pa = -1;
      }
      if (Prototypes.isType(b[0].classID, "links")) {
        pb = -1;
      }
      return pa - pb;
    });

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
        const glyphElements: Element[] = [];
        for (const [
          glyphIndex,
          glyphState
        ] of plotSegmentState.glyphs.entries()) {
          const anchorX = glyphState.marks[0].attributes.x as number;
          const anchorY = glyphState.marks[0].attributes.y as number;
          const offsetX = (glyphState.attributes.x as number) - anchorX;
          const offsetY = (glyphState.attributes.y as number) - anchorY;
          const g = this.renderGlyph(
            coordinateSystem,
            { x: offsetX, y: offsetY },
            mark,
            glyphState,
            glyphIndex
          );
          glyphElements.push(g);
        }
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
        const g = elementClass.getGraphics(cs, { x: 0, y: 0 });
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

export * from "./textMeasurer";

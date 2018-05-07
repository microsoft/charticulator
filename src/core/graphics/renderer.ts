import { Element, Style, Group, makeGroup, makeLine, makePolygon, makeRect } from "./elements";
import { getById, getByName, zip, zipArray, indexOf, MultistringHashMap, Point, Color } from "../common";
import * as Dataset from "../dataset";
import * as Specification from "../specification";
import * as Prototypes from "../prototypes";
import { CoordinateSystem, CartesianCoordinates } from "./coordinate_system";

export function facetRows(rows: Dataset.Row[], indices: number[], columns?: string[]): number[][] {
    if (columns == null) {
        return [indices];
    } else {
        let facets = new MultistringHashMap<number[]>();
        for (let index of indices) {
            let row = rows[index];
            let facetValues = columns.map(c => row[c] as string);
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
    x: { element: number, attribute: string };
    y: { element: number, attribute: string };
    direction: Point;
    colorType: string;
    colorValue?: Color;
    colorScale?: {
        class: Prototypes.Scales.ScaleClass;
        column: string;
    };
}

interface AnchorPoint {
    x: number; y: number;
    direction: Point;
    color: Color;
}

export class ChartRenderer {
    private manager: Prototypes.ChartStateManager;

    constructor(manager: Prototypes.ChartStateManager) {
        this.manager = manager;
    }

    private renderGlyph(coordinateSystem: CoordinateSystem, offset: Point, glyph: Specification.Glyph, state: Specification.GlyphState, index: number): Group {
        let gs: Element[] = [];
        for (let [mark, markState] of zip(glyph.marks, state.marks)) {
            if (!mark.properties.visible) continue;
            let g = this.manager.getMarkClass(markState).getGraphics(coordinateSystem, offset, index);
            if (g != null) {
                gs.push(g);
            }
        }
        return makeGroup(gs);
    }

    public renderChart(dataset: Dataset.Dataset, chart: Specification.Chart, chartState: Specification.ChartState): Group {
        let graphics: Element[] = [];

        // Chart background
        let bg = this.manager.getChartClass(chartState).getBackgroundGraphics();
        if (bg) {
            graphics.push(bg);
        }

        let linkGroup = makeGroup([]);

        let chartLinks = chart.elements.filter(x => Prototypes.isType(x.classID, "links")) as Specification.Links[];
        let plotSegments = chart.elements.filter(x => Prototypes.isType(x.classID, "plot-segment")) as Specification.PlotSegment[];

        graphics.push(linkGroup);

        let elementsAndStates = zipArray(chart.elements, chartState.elements);
        // Enforce an order: links gets rendered first.
        elementsAndStates.sort((a, b) => {
            let pa = 0, pb = 0;
            if (Prototypes.isType(a[0].classID, "links")) {
                pa = -1;
            }
            if (Prototypes.isType(b[0].classID, "links")) {
                pb = -1;
            }
            return pa - pb;
        });

        // Render layout graphics
        for (let [element, elementState] of elementsAndStates) {
            if (!element.properties.visible) continue;
            // Render marks if this is a plot segment
            if (Prototypes.isType(element.classID, "plot-segment")) {
                let plotSegment = element as Specification.PlotSegment;
                let plotSegmentState = elementState as Specification.PlotSegmentState;
                let mark = getById(chart.glyphs, plotSegment.glyph);
                let plotSegmentClass = this.manager.getPlotSegmentClass(plotSegmentState);
                let coordinateSystem = plotSegmentClass.getCoordinateSystem();
                let glyphElements: Element[] = [];
                for (let [glyphIndex, glyphState] of plotSegmentState.glyphs.entries()) {
                    let anchorX = (glyphState.marks[0].attributes["x"] as number);
                    let anchorY = (glyphState.marks[0].attributes["y"] as number);
                    let offsetX = (glyphState.attributes["x"] as number) - anchorX;
                    let offsetY = (glyphState.attributes["y"] as number) - anchorY;
                    let g = this.renderGlyph(coordinateSystem, { x: offsetX, y: offsetY }, mark, glyphState, glyphIndex);
                    glyphElements.push(g);
                }
                let gGlyphs = makeGroup(glyphElements);
                gGlyphs.transform = coordinateSystem.getBaseTransform();
                let gElement = makeGroup([]);
                let g = plotSegmentClass.getPlotSegmentGraphics(gGlyphs, this.manager);
                gElement.elements.push(g);
                gElement.key = element._id;
                graphics.push(gElement);
            } else if (Prototypes.isType(element.classID, "mark")) {
                let cs = new CartesianCoordinates({ x: 0, y: 0 });
                let gElement = makeGroup([]);
                let elementClass = this.manager.getMarkClass(elementState);
                let g = elementClass.getGraphics(cs, { x: 0, y: 0 });
                gElement.elements.push(g);
                gElement.key = element._id;
                graphics.push(gElement);
            } else {
                let gElement = makeGroup([]);
                let elementClass = this.manager.getChartElementClass(elementState);
                let g = elementClass.getGraphics(this.manager);
                gElement.elements.push(g);
                gElement.key = element._id;
                graphics.push(gElement);
            }
        }

        return makeGroup(graphics);
    }

    public render(): Group {
        return this.renderChart(this.manager.dataset, this.manager.chart, this.manager.chartState);
    }
}

export interface TextMeasurement {
    width: number;
    fontSize: number;
    ideographicBaseline: number;
    hangingBaseline: number;
    alphabeticBaseline: number;
    middle: number;
}

export class TextMeasurer {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    fontFamily: string;
    fontSize: number;

    static parameters = {
        "hangingBaseline": [
            0.7245381636743151,
            -0.005125313493913097
        ],
        "ideographicBaseline": [
            -0.2120442632498544,
            0.008153756552125913
        ],
        "alphabeticBaseline": [
            0,
            0
        ],
        "middle": [
            0.34642399534071056,
            -0.22714036109493208
        ]
    }

    constructor() {
        if (typeof (document) != "undefined") {
            this.canvas = document.createElement("canvas");
            this.context = this.canvas.getContext("2d");
            this.fontFamily = "Arial";
            this.fontSize = 13;
        }
    }

    public setFontFamily(family: string) {
        this.fontFamily = family;
    }

    public setFontSize(size: number) {
        this.fontSize = size;
    }

    public measure(text: string): TextMeasurement {
        this.context.font = `${this.fontSize}px "${this.fontFamily}"`;
        return {
            width: this.context.measureText(text).width,
            fontSize: this.fontSize,
            ideographicBaseline: this.fontSize * TextMeasurer.parameters.ideographicBaseline[0] + TextMeasurer.parameters.ideographicBaseline[1],
            hangingBaseline: this.fontSize * TextMeasurer.parameters.hangingBaseline[0] + TextMeasurer.parameters.hangingBaseline[1],
            alphabeticBaseline: this.fontSize * TextMeasurer.parameters.alphabeticBaseline[0] + TextMeasurer.parameters.alphabeticBaseline[1],
            middle: this.fontSize * TextMeasurer.parameters.middle[0] + TextMeasurer.parameters.middle[1]
        };
    }

    public static ComputeTextPosition(x: number, y: number, metrics: TextMeasurement, alignX: "left" | "middle" | "right" = "left", alignY: "top" | "middle" | "bottom" = "middle", xMargin: number = 0, yMargin: number = 0): [number, number] {
        let cwidth = metrics.width;
        let cheight = (metrics.middle - metrics.ideographicBaseline) * 2;

        let cx: number = cwidth / 2, cy: number = cheight / 2;
        if (alignX == "left") {
            cx = -xMargin;
        }
        if (alignX == "right") {
            cx = cwidth + xMargin;
        }
        if (alignY == "top") {
            cy = -yMargin;
        }
        if (alignY == "bottom") {
            cy = cheight + yMargin;
        }
        return [x - cx, y - cheight + cy - metrics.ideographicBaseline];
    }
}
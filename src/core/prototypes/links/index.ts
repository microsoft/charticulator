import * as Specification from "../../specification";
import * as Graphics from "../../graphics";
import * as Expression from "../../expression";
import * as Scales from "../scales";
import { Color, Point, uniqueID, indexOf, getById, getByName, MultistringHashMap, Geometry } from "../../common";
import { ChartElementClass } from "../chart_element";
import { ObjectClasses, AttributeDescription } from "../object";
import { ObjectClassMetadata, Controls } from "../common";
import { color } from "d3";
import { colorFromHTMLColor } from "../../index";
import { PlotSegmentClass } from "../plot_segments/index";
import { ChartStateManager } from "../index";
import { DataflowTable } from "../dataflow";

export type LinkType = "line" | "band";
export type InterpolationType = "line" | "bezier" | "circle";

export interface LinksProperties extends Specification.AttributeMap {
    linkType: LinkType;
    interpolationType: InterpolationType;

    /** Start anchor */
    anchor1: Specification.Types.LinkAnchorPoint[];
    /** End anchor */
    anchor2: Specification.Types.LinkAnchorPoint[];

    /** Filter the data before linking */
    filter?: Specification.Expression;
    /** Order the data before linking */
    order?: Specification.Expression;

    /** Link through a data series on a single plot segment */
    linkThrough?: {
        /** The MarkLayout to draw marks from */
        plotSegment: string;
        /** Facet the data by a set of expressions */
        facetExpressions?: string[];

    };

    /** Link between (2) plot segments */
    linkBetween?: {
        /** The MarkLayouts to draw marks from */
        plotSegments: string[];
    };

    /** Link using a link table, from one plot segment to another */
    linkTable?: {
        table: string;
        plotSegments: string[];
    };

    curveness: number;
}

export interface LinksObject extends Specification.Links {
    properties: LinksProperties;
}

export function facetRows(table: DataflowTable, indices: number[], columns?: Expression.Expression[]): number[][] {
    if (columns == null) {
        return [indices];
    } else {
        let facets = new MultistringHashMap<number[]>();
        for (let index of indices) {
            let row = table.getRowContext(index);
            let facetValues = columns.map(c => c.getStringValue(row));
            if (facets.has(facetValues)) {
                facets.get(facetValues).push(index);
            } else {
                facets.set(facetValues, [index]);
            }
        }
        return Array.from(facets.values());
    }
}

export interface ResolvedLinkAnchorPoint {
    anchorIndex: number;
    x: { element: number, attribute: string };
    y: { element: number, attribute: string };
    direction: Point;
}

export interface AnchorCoordinates {
    points: Graphics.PointDirection[];
    curveness: number;
    coordinateSystem: Graphics.CoordinateSystem;
}

export interface AnchorAttributes extends AnchorCoordinates {
    color: Color;
    opacity: number;
    strokeWidth: number;
}

export interface RenderState {
    colorFunction: (row: Expression.Context) => Specification.AttributeValue;
    opacityFunction: (row: Expression.Context) => Specification.AttributeValue;
    strokeWidthFunction: (row: Expression.Context) => Specification.AttributeValue;
}

export abstract class LinksClass extends ChartElementClass {
    public readonly object: LinksObject;
    public readonly state: Specification.ObjectState;

    public static metadata: ObjectClassMetadata = {
        iconPath: "link/tool"
    };

    public attributeNames: string[] = [
        "color", "opacity"
    ];
    public attributes: { [name: string]: AttributeDescription } = {
        color: { name: "color", type: "color", category: "style", displayName: "Color", solverExclude: true, defaultValue: null, stateExclude: true },
        strokeWidth: { name: "strokeWidth", type: "number", category: "style", displayName: "Width", solverExclude: true, defaultValue: null, stateExclude: true },
        opacity: { name: "opacity", type: "number", category: "style", displayName: "Opacity", solverExclude: true, defaultValue: 1, defaultRange: [0, 1], stateExclude: true },
    };

    protected resolveLinkAnchorPoints(anchorPoints: Specification.Types.LinkAnchorPoint[], glyph: Specification.Glyph): ResolvedLinkAnchorPoint[] {
        return anchorPoints.map(anchorPoint => {
            let pt: ResolvedLinkAnchorPoint = {
                anchorIndex: indexOf(glyph.marks, (x) => x.classID == "mark.anchor"),
                x: { element: indexOf(glyph.marks, e => e._id == anchorPoint.x.element), attribute: anchorPoint.x.attribute },
                y: { element: indexOf(glyph.marks, e => e._id == anchorPoint.y.element), attribute: anchorPoint.y.attribute },
                direction: anchorPoint.direction
            };
            return pt;
        });
    }

    protected getAnchorPoints(renderState: RenderState, anchorPoints: ResolvedLinkAnchorPoint[], plotSegmentClass: PlotSegmentClass, glyphState: Specification.GlyphState, row: Expression.Context): AnchorAttributes {
        let dx = glyphState.attributes.x as number;
        let dy = glyphState.attributes.y as number;
        let anchorIndex = anchorPoints[0].anchorIndex;
        dx -= (glyphState.marks[anchorIndex].attributes["x"] as number);
        dy -= (glyphState.marks[anchorIndex].attributes["y"] as number);

        let cs = plotSegmentClass.getCoordinateSystem();

        return {
            points: anchorPoints.map(pt => {
                let x = (pt.x.element < 0 ? glyphState.attributes[pt.x.attribute] : glyphState.marks[pt.x.element].attributes[pt.x.attribute]) as number;
                let y = (pt.y.element < 0 ? glyphState.attributes[pt.y.attribute] : glyphState.marks[pt.y.element].attributes[pt.y.attribute]) as number;
                let px = dx + x;
                let py = dy + y;
                return {
                    x: px,
                    y: py,
                    direction: pt.direction
                };
            }),
            curveness: this.object.properties.curveness != null ? this.object.properties.curveness : 30,
            coordinateSystem: cs,
            color: renderState.colorFunction(row) as Color,
            opacity: renderState.opacityFunction(row) as number,
            strokeWidth: renderState.strokeWidthFunction(row) as number
        };
    }

    public static BandPath(path: Graphics.PathMaker, anchor: AnchorCoordinates, reversed: boolean = false, newPath: boolean = false) {
        let p0: Graphics.PointDirection, p1: Graphics.PointDirection;
        if (reversed) {
            p1 = anchor.points[0];
            p0 = anchor.points[1];
        } else {
            p0 = anchor.points[0];
            p1 = anchor.points[1];
        }
        if (newPath) {
            let p = Graphics.transform(anchor.coordinateSystem.getBaseTransform(), anchor.coordinateSystem.transformPoint(p0.x, p0.y));
            path.moveTo(p.x, p.y);
        }
        if (anchor.coordinateSystem instanceof Graphics.PolarCoordinates) {
            // let p = Graphics.transform(anchor.coordinateSystem.getBaseTransform(), anchor.coordinateSystem.transformPoint(p1.x, p1.y));
            path.polarLineTo(anchor.coordinateSystem.origin.x, anchor.coordinateSystem.origin.y,
                90 - p0.x, p0.y, 90 - p1.x, p1.y
            );
        } else {
            let p = Graphics.transform(anchor.coordinateSystem.getBaseTransform(), anchor.coordinateSystem.transformPoint(p1.x, p1.y));
            path.lineTo(p.x, p.y);
        }
    }

    public static ConnectionPath(path: Graphics.PathMaker, interpType: InterpolationType, p1: Point, d1: Point, curveness1: number, p2: Point, d2: Point, curveness2: number, newPath: boolean = false) {
        if (newPath) {
            path.moveTo(p1.x, p1.y);
        }
        switch (interpType) {
            case "line": {
                path.lineTo(p2.x, p2.y);
            } break;
            case "bezier": {
                let dScaler1 = curveness1;
                let dScaler2 = curveness2;
                path.cubicBezierCurveTo(
                    p1.x + d1.x * dScaler1, p1.y + d1.y * dScaler1,
                    p2.x + d2.x * dScaler2, p2.y + d2.y * dScaler2,
                    p2.x, p2.y
                );
            } break;
            case "circle": {
                let cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
                let dx = p1.y - p2.y, dy = p2.x - p1.x; // it doesn't matter if we normalize d or not
                if (Math.abs(d1.x * dx + d1.y * dy) < 1e-6) {
                    // Degenerate case, just a line from p1 to p2
                    path.lineTo(p2.x, p2.y);
                } else {
                    // Origin = c + d t
                    // Solve for t: d1 dot (c + t d - p) = 0
                    let t = (d1.x * (cx - p1.x) + d1.y * (cy - p1.y)) / (d1.x * dx + d1.y * dy);
                    let o = { x: cx - dx * t, y: cy - dy * t }; // the center of the circle
                    let r = Geometry.pointDistance(o, p1);
                    let scaler = 180 / Math.PI;
                    let angle1 = Math.atan2(p1.y - o.y, p1.x - o.x) * scaler;
                    let angle2 = Math.atan2(p2.y - o.y, p2.x - o.x) * scaler;
                    let sign = (p1.y - o.y) * d1.x - (p1.x - o.x) * d1.y;
                    if (sign > 0) {
                        while (angle2 > angle1) {
                            angle2 -= 360;
                        }
                    }
                    if (sign < 0) {
                        while (angle2 < angle1) {
                            angle2 += 360;
                        }
                    }
                    path.polarLineTo(o.x, o.y, angle1, r, angle2, r, false);
                }
            }
        }
    }

    public static LinkPath(path: Graphics.PathMaker, linkType: LinkType, interpType: InterpolationType, anchor1: AnchorCoordinates, anchor2: AnchorCoordinates) {
        switch (linkType) {
            case "line": {
                let a1p0 = anchor1.coordinateSystem.transformPointWithBase(anchor1.points[0].x, anchor1.points[0].y);
                let a2p0 = anchor2.coordinateSystem.transformPointWithBase(anchor2.points[0].x, anchor2.points[0].y);
                let a1d0 = anchor1.coordinateSystem.transformDirectionAtPointWithBase(anchor1.points[0].x, anchor1.points[0].y, anchor1.points[0].direction.x, anchor1.points[0].direction.y);
                let a2d0 = anchor2.coordinateSystem.transformDirectionAtPointWithBase(anchor2.points[0].x, anchor2.points[0].y, anchor2.points[0].direction.x, anchor2.points[0].direction.y);
                LinksClass.ConnectionPath(path, interpType, a1p0, a1d0, anchor1.curveness, a2p0, a2d0, anchor2.curveness, true);
            } break;
            case "band": {
                // Determine if we should reverse the band
                let a1p0 = anchor1.coordinateSystem.transformPointWithBase(anchor1.points[0].x, anchor1.points[0].y);
                let a1p1 = anchor1.coordinateSystem.transformPointWithBase(anchor1.points[1].x, anchor1.points[1].y);
                let a2p0 = anchor2.coordinateSystem.transformPointWithBase(anchor2.points[0].x, anchor2.points[0].y);
                let a2p1 = anchor2.coordinateSystem.transformPointWithBase(anchor2.points[1].x, anchor2.points[1].y);
                let a1d0 = anchor1.coordinateSystem.transformDirectionAtPointWithBase(anchor1.points[0].x, anchor1.points[0].y, anchor1.points[0].direction.x, anchor1.points[0].direction.y);
                let a1d1 = anchor1.coordinateSystem.transformDirectionAtPointWithBase(anchor1.points[1].x, anchor1.points[1].y, anchor1.points[1].direction.x, anchor1.points[1].direction.y);
                let a2d0 = anchor2.coordinateSystem.transformDirectionAtPointWithBase(anchor2.points[0].x, anchor2.points[0].y, anchor2.points[0].direction.x, anchor2.points[0].direction.y);
                let a2d1 = anchor2.coordinateSystem.transformDirectionAtPointWithBase(anchor2.points[1].x, anchor2.points[1].y, anchor2.points[1].direction.x, anchor2.points[1].direction.y);
                let cross1 = Geometry.vectorCross(a1d0, { x: a1p1.x - a1p0.x, y: a1p1.y - a1p0.y });
                let cross2 = Geometry.vectorCross(a2d0, { x: a2p1.x - a2p0.x, y: a2p1.y - a2p0.y });
                let reverseBand = cross1 * cross2 > 0;
                if (reverseBand) {
                    // anchor1[0] -> anchor1[1]
                    LinksClass.BandPath(path, anchor1, false, true);
                    // anchor1[1] -> anchor2[0]
                    LinksClass.ConnectionPath(path, interpType, a1p1, a1d1, anchor1.curveness, a2p0, a2d0, anchor2.curveness, false);
                    // anchor2[0] -> anchor2[1]
                    LinksClass.BandPath(path, anchor2, false, false);
                    // anchor2[1] -> anchor1[0]
                    LinksClass.ConnectionPath(path, interpType, a2p1, a2d1, anchor2.curveness, a1p0, a1d0, anchor1.curveness, false);
                    path.closePath();
                } else {
                    // anchor1[0] -> anchor1[1]
                    LinksClass.BandPath(path, anchor1, false, true);
                    // anchor1[1] -> anchor2[1]
                    LinksClass.ConnectionPath(path, interpType, a1p1, a1d1, anchor1.curveness, a2p1, a2d1, anchor2.curveness, false);
                    // anchor2[1] -> anchor2[0]
                    LinksClass.BandPath(path, anchor2, true, false);
                    // anchor2[0] -> anchor1[0]
                    LinksClass.ConnectionPath(path, interpType, a2p0, a2d0, anchor2.curveness, a1p0, a1d0, anchor1.curveness, false);
                    path.closePath();
                }
            } break;
        }
    }

    protected renderLinks(linkGraphics: LinkType, lineType: InterpolationType, anchorGroups: AnchorAttributes[][][]): Graphics.Group {
        switch (linkGraphics) {
            case "line": {
                return Graphics.makeGroup(anchorGroups.map(anchors => {
                    let lines: Graphics.Element[] = [];
                    for (let i = 0; i < anchors.length - 1; i++) {
                        let path = Graphics.makePath({
                            strokeColor: anchors[i][0].color,
                            strokeOpacity: anchors[i][0].opacity,
                            strokeWidth: anchors[i][0].strokeWidth
                        });
                        LinksClass.LinkPath(path, linkGraphics, lineType, anchors[i][0], anchors[i + 1][1]);
                        lines.push(path.path);
                    }
                    return Graphics.makeGroup(lines);
                }));
            }
            case "band": {
                let splitAnchors = true;
                if (splitAnchors) {
                    let map = new Map<string, [AnchorAttributes, AnchorAttributes][]>();
                    let hashAnchor = (points: Point[]) => {
                        return [points[0].x, points[0].y, points[1].x, points[1].y].join(",");
                    };
                    for (let anchors of anchorGroups) {
                        for (let i = 0; i < anchors.length - 1; i++) {
                            let a1 = anchors[i][0];
                            let a2 = anchors[i + 1][1];
                            let hash1 = hashAnchor(a1.points);
                            let hash2 = hashAnchor(a2.points);
                            if (map.has(hash1)) {
                                map.get(hash1).push([a1, a2]);
                            } else {
                                map.set(hash1, [[a1, a2]]);
                            }
                            if (map.has(hash2)) {
                                map.get(hash2).push([a2, a1]);
                            } else {
                                map.set(hash2, [[a2, a1]]);
                            }
                        }
                    }
                    map.forEach((anchors, points) => {
                        let x1 = anchors[0][0].points[0].x;
                        let y1 = anchors[0][0].points[0].y;
                        let x2 = anchors[0][0].points[1].x;
                        let y2 = anchors[0][0].points[1].y;
                        let p1 = anchors[0][0].coordinateSystem.transformPoint(x1, y1);
                        let p2 = anchors[0][0].coordinateSystem.transformPoint(x2, y2);
                        let pd = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
                        let cx = (p1.x + p2.x) / 2;
                        let cy = (p1.y + p2.y) / 2;
                        let order = anchors.map(anchor => {
                            let p = anchor[1].coordinateSystem.transformPoint(anchor[1].points[0].x, anchor[1].points[0].y);
                            let proj = (p.x - cx) * (p2.x - p1.x) + (p.y - cy) * (p2.y - p1.y);
                            let distance = Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
                            let cosTheta = proj / distance / pd;
                            if (cosTheta > 0.999999) {
                                return 1 + distance;
                            } else if (cosTheta < -0.999999) {
                                return -1 - distance;
                            }
                            return cosTheta;
                            // return proj;
                        });
                        let indices = [];
                        let totalWidth = 0;
                        for (let i = 0; i < anchors.length; i++) {
                            indices.push(i);
                            totalWidth += anchors[i][0].strokeWidth;
                        }
                        indices.sort((a, b) => order[a] - order[b]);
                        let cWidth = 0;
                        for (let i = 0; i < anchors.length; i++) {
                            let m = indices[i];
                            let k1 = cWidth / totalWidth;
                            cWidth += anchors[m][0].strokeWidth;
                            let k2 = cWidth / totalWidth;
                            anchors[m][0].points[0].x = x1 + (x2 - x1) * k1;
                            anchors[m][0].points[0].y = y1 + (y2 - y1) * k1;
                            anchors[m][0].points[1].x = x1 + (x2 - x1) * k2;
                            anchors[m][0].points[1].y = y1 + (y2 - y1) * k2;
                        }
                    });
                }
                return Graphics.makeGroup(anchorGroups.map(anchors => {
                    let bands: Graphics.Element[] = [];
                    for (let i = 0; i < anchors.length - 1; i++) {
                        let path = Graphics.makePath({
                            fillColor: anchors[i][0].color,
                            fillOpacity: anchors[i][0].opacity
                        });
                        LinksClass.LinkPath(path, linkGraphics, lineType, anchors[i][0], anchors[i + 1][1]);
                        bands.push(path.path);
                    }
                    return Graphics.makeGroup(bands);
                }));
            }
        }
    }

    /** Get the graphics that represent this layout */
    public getGraphics(manager: ChartStateManager): Graphics.Element {
        return null;
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let props = this.object.properties;
        let widgets = [
            manager.sectionHeader("Line Type"),
            manager.row("Type", manager.inputSelect({ property: "interpolationType" }, {
                type: "dropdown",
                showLabel: true,
                options: ["line", "bezier", "circle"],
                labels: ["Line", "Bezier", "Arc"],
            }))
        ];
        if (props.interpolationType == "bezier") {
            widgets.push(manager.row("Curveness", manager.inputNumber({ property: "curveness" }, {
                showSlider: true,
                minimum: 0,
                sliderRange: [0, 500]
            })));
        }
        widgets.push(manager.sectionHeader("Style"));
        widgets.push(manager.mappingEditor("Color", "color", "color", {}));
        // if (props.linkType == "line") {
        widgets.push(manager.mappingEditor("Width", "strokeWidth", "number", { hints: { rangeNumber: [0, 5] }, defaultValue: 1, numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 } }));
        // }
        widgets.push(manager.mappingEditor("Opacity", "opacity", "number", { hints: { rangeNumber: [0, 1] }, defaultValue: 1, numberOptions: { showSlider: true, minimum: 0, maximum: 1 } }));
        return widgets;
    }
}

export class SeriesLinksClass extends LinksClass {
    public static classID: string = "links.through";
    public static type: string = "links";

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    /** Get the graphics that represent this layout */
    public getGraphics(manager: ChartStateManager): Graphics.Element {
        let props = this.object.properties;

        let linkGroup = Graphics.makeGroup([]);

        let renderState: RenderState = {
            colorFunction: this.parent.resolveMapping(this.object.mappings.color, { r: 0, g: 0, b: 0 } as Color),
            opacityFunction: this.parent.resolveMapping(this.object.mappings.opacity, 1),
            strokeWidthFunction: this.parent.resolveMapping(this.object.mappings.strokeWidth, 1),
        };

        let links = this.object;
        let chart = this.parent.object;
        let chartState = this.parent.state;
        // Resolve the anchors
        let layoutIndex = indexOf(chart.elements, (l) => l._id == props.linkThrough.plotSegment);
        let layout = chart.elements[layoutIndex] as Specification.PlotSegment;
        let mark = getById(chart.glyphs, layout.glyph);
        let layoutState = chartState.elements[layoutIndex] as Specification.PlotSegmentState;
        let layoutClass = manager.getPlotSegmentClass(layoutState);
        let table = this.parent.dataflow.getTable(layout.table);
        let facets: number[][] = facetRows(table, layoutState.dataRowIndices, props.linkThrough.facetExpressions.map(x => this.parent.dataflow.cache.parse(x)));
        let rowToMarkState = new Map<number, Specification.GlyphState>();
        for (let i = 0; i < layoutState.dataRowIndices.length; i++) {
            rowToMarkState.set(layoutState.dataRowIndices[i], layoutState.glyphs[i]);
        }
        let anchor1 = this.resolveLinkAnchorPoints(props.anchor1, mark);
        let anchor2 = this.resolveLinkAnchorPoints(props.anchor2, mark);
        let anchors = facets.map(facet => facet.map(index => {
            let markState = rowToMarkState.get(index);
            let row = table.getRowContext(index);
            if (markState) {
                return [
                    this.getAnchorPoints(renderState, anchor1, layoutClass, markState, row),
                    this.getAnchorPoints(renderState, anchor2, layoutClass, markState, row)
                ];
            } else {
                return null;
            }
        }));

        linkGroup.elements.push(this.renderLinks(props.linkType, props.interpolationType, anchors));

        return linkGroup;
    }
}

export class LayoutsLinksClass extends LinksClass {
    public static classID: string = "links.between";
    public static type: string = "links";

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    /** Get the graphics that represent this layout */
    public getGraphics(manager: ChartStateManager): Graphics.Element {
        let props = this.object.properties;

        let linkGroup = Graphics.makeGroup([]);

        let renderState: RenderState = {
            colorFunction: this.parent.resolveMapping(this.object.mappings.color, { r: 0, g: 0, b: 0 } as Color),
            opacityFunction: this.parent.resolveMapping(this.object.mappings.opacity, 1),
            strokeWidthFunction: this.parent.resolveMapping(this.object.mappings.strokeWidth, 1)
        };

        let links = this.object;
        let chart = this.parent.object;
        let chartState = this.parent.state;
        let dataset = this.parent.dataflow;

        let layoutIndices = props.linkBetween.plotSegments.map(lid => indexOf(chart.elements, (l) => l._id == lid));
        let layouts = layoutIndices.map(i => chart.elements[i]) as Specification.PlotSegment[];
        let layoutStates = layoutIndices.map(i => chartState.elements[i]) as Specification.PlotSegmentState[];
        let layoutClasses = layoutStates.map(layoutState => manager.getPlotSegmentClass(layoutState));
        let glyphs = layouts.map(layout => getById(chart.glyphs, layout.glyph));
        let anchor1 = this.resolveLinkAnchorPoints(props.anchor1, glyphs[0]);
        let anchor2 = this.resolveLinkAnchorPoints(props.anchor2, glyphs[1]);
        let rowIndicesMap = new Map();
        for (let i = 0; i < layoutStates[0].dataRowIndices.length; i++) {
            rowIndicesMap.set(layoutStates[0].dataRowIndices[i], i);
        }
        let table = this.parent.dataflow.getTable(layouts[0].table);
        let anchors: AnchorAttributes[][][] = [];
        for (let i1 = 0; i1 < layoutStates[1].dataRowIndices.length; i1++) {
            let rowIndex = layoutStates[1].dataRowIndices[i1];
            if (rowIndicesMap.has(rowIndex)) {
                let i0 = rowIndicesMap.get(rowIndex);
                let row = table.getRowContext(rowIndex);
                anchors.push([
                    [this.getAnchorPoints(renderState, anchor1, layoutClasses[0], layoutStates[0].glyphs[i0], row), null],
                    [null, this.getAnchorPoints(renderState, anchor2, layoutClasses[1], layoutStates[1].glyphs[i1], row)]
                ]);
            }
        }
        linkGroup.elements.push(this.renderLinks(props.linkType, props.interpolationType, anchors));

        return linkGroup;
    }
}

export class TableLinksClass extends LinksClass {
    public static classID: string = "links.table";
    public static type: string = "links";

    public static defaultProperties: Specification.AttributeMap = {
        visible: true
    };

    /** Get the graphics that represent this layout */
    public getGraphics(manager: ChartStateManager): Graphics.Element {
        let props = this.object.properties;

        let linkGroup = Graphics.makeGroup([]);

        let renderState: RenderState = {
            colorFunction: this.parent.resolveMapping(this.object.mappings.color, { r: 0, g: 0, b: 0 } as Color),
            opacityFunction: this.parent.resolveMapping(this.object.mappings.opacity, 1),
            strokeWidthFunction: this.parent.resolveMapping(this.object.mappings.strokeWidth, 1)
        };

        let links = this.object;
        let chart = this.parent.object;
        let chartState = this.parent.state;
        let dataset = this.parent.dataflow;

        let layoutIndices = props.linkTable.plotSegments.map(lid => indexOf(chart.elements, (l) => l._id == lid));
        let layouts = layoutIndices.map(i => chart.elements[i]) as Specification.PlotSegment[];
        let layoutStates = layoutIndices.map(i => chartState.elements[i]) as Specification.PlotSegmentState[];
        let layoutClasses = layoutStates.map(layoutState => manager.getPlotSegmentClass(layoutState));
        let glyphs = layouts.map(layout => getById(chart.glyphs, layout.glyph));
        let anchor1 = this.resolveLinkAnchorPoints(props.anchor1, glyphs[0]);
        let anchor2 = this.resolveLinkAnchorPoints(props.anchor2, glyphs[1]);

        let rowIndicesMap = new Map();

        let linkTable = this.parent.dataflow.getTable(props.linkTable.table);
        let tables = layouts.map((layout, layoutIndex) => {
            let table = this.parent.dataflow.getTable(layout.table);
            let id2RowGlyphIndex = new Map<string, [number, number]>();
            for (let i = 0; i < layoutStates[layoutIndex].dataRowIndices.length; i++) {
                let rowIndex = layoutStates[layoutIndex].dataRowIndices[i];
                let row = table.getRow(rowIndex);
                id2RowGlyphIndex.set(row["id"].toString(), [rowIndex, i]);
            }
            return {
                table: table,
                id2RowGlyphIndex: id2RowGlyphIndex,
            };
        });


        // Prepare data rows
        let rowIndices: number[] = [];
        for (let i = 0; i < linkTable.rows.length; i++) {
            rowIndices.push(i);
        }

        let anchors: AnchorAttributes[][][] = [];
        for (let i = 0; i < rowIndices.length; i++) {
            let rowIndex = rowIndices[i];
            let row = linkTable.getRowContext(rowIndex);
            let rowItem = linkTable.getRow(rowIndex);

            let [iRow0, i0] = tables[0].id2RowGlyphIndex.get(rowItem["source_id"].toString());
            let [iRow1, i1] = tables[1].id2RowGlyphIndex.get(rowItem["target_id"].toString());

            anchors.push([
                [this.getAnchorPoints(renderState, anchor1, layoutClasses[0], layoutStates[0].glyphs[i0], row), null],
                [null, this.getAnchorPoints(renderState, anchor2, layoutClasses[1], layoutStates[1].glyphs[i1], row)]
            ]);
        }

        linkGroup.elements.push(this.renderLinks(props.linkType, props.interpolationType, anchors));

        return linkGroup;
    }
}

ObjectClasses.Register(SeriesLinksClass);
ObjectClasses.Register(LayoutsLinksClass);
ObjectClasses.Register(TableLinksClass);
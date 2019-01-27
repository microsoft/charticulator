// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  Color,
  Geometry,
  getById,
  indexOf,
  MultistringHashMap,
  Point
} from "../../common";
import * as Expression from "../../expression";
import * as Graphics from "../../graphics";
import * as Specification from "../../specification";
import { ChartElementClass } from "../chart_element";
import { Controls, ObjectClassMetadata } from "../common";
import { DataflowTable } from "../dataflow";
import { ChartStateManager } from "../state";
import { AttributeDescription, ObjectClasses } from "../object";
import { PlotSegmentClass } from "../plot_segments";

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

export function facetRows(
  table: DataflowTable,
  indices: number[][],
  columns?: Expression.Expression[]
): number[][][] {
  if (columns == null) {
    return [indices];
  } else {
    const facets = new MultistringHashMap<number[][]>();
    for (const g of indices) {
      const row = table.getGroupedContext(g);
      const facetValues = columns.map(c => c.getStringValue(row));
      if (facets.has(facetValues)) {
        facets.get(facetValues).push(g);
      } else {
        facets.set(facetValues, [g]);
      }
    }
    return Array.from(facets.values());
  }
}

export interface ResolvedLinkAnchorPoint {
  anchorIndex: number;
  x: { element: number; attribute: string };
  y: { element: number; attribute: string };
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
  strokeWidthFunction: (
    row: Expression.Context
  ) => Specification.AttributeValue;
}

export abstract class LinksClass extends ChartElementClass {
  public readonly object: LinksObject;
  public readonly state: Specification.ObjectState;

  public static metadata: ObjectClassMetadata = {
    iconPath: "link/tool"
  };

  public attributeNames: string[] = ["color", "opacity"];
  public attributes: { [name: string]: AttributeDescription } = {
    color: {
      name: "color",
      type: Specification.AttributeType.Color,
      solverExclude: true,
      defaultValue: null,
      stateExclude: true
    },
    strokeWidth: {
      name: "strokeWidth",
      type: Specification.AttributeType.Number,
      solverExclude: true,
      defaultValue: null,
      stateExclude: true
    },
    opacity: {
      name: "opacity",
      type: Specification.AttributeType.Number,
      solverExclude: true,
      defaultValue: 1,
      defaultRange: [0, 1],
      stateExclude: true
    }
  };

  protected resolveLinkAnchorPoints(
    anchorPoints: Specification.Types.LinkAnchorPoint[],
    glyph: Specification.Glyph
  ): ResolvedLinkAnchorPoint[] {
    return anchorPoints.map(anchorPoint => {
      const pt: ResolvedLinkAnchorPoint = {
        anchorIndex: indexOf(glyph.marks, x => x.classID == "mark.anchor"),
        x: {
          element: indexOf(glyph.marks, e => e._id == anchorPoint.x.element),
          attribute: anchorPoint.x.attribute
        },
        y: {
          element: indexOf(glyph.marks, e => e._id == anchorPoint.y.element),
          attribute: anchorPoint.y.attribute
        },
        direction: anchorPoint.direction
      };
      return pt;
    });
  }

  protected getAnchorPoints(
    renderState: RenderState,
    anchorPoints: ResolvedLinkAnchorPoint[],
    plotSegmentClass: PlotSegmentClass,
    glyphState: Specification.GlyphState,
    row: Expression.Context
  ): AnchorAttributes {
    let dx = glyphState.attributes.x as number;
    let dy = glyphState.attributes.y as number;
    const anchorIndex = anchorPoints[0].anchorIndex;
    dx -= glyphState.marks[anchorIndex].attributes.x as number;
    dy -= glyphState.marks[anchorIndex].attributes.y as number;

    const cs = plotSegmentClass.getCoordinateSystem();

    return {
      points: anchorPoints.map(pt => {
        const x = (pt.x.element < 0
          ? glyphState.attributes[pt.x.attribute]
          : glyphState.marks[pt.x.element].attributes[
              pt.x.attribute
            ]) as number;
        const y = (pt.y.element < 0
          ? glyphState.attributes[pt.y.attribute]
          : glyphState.marks[pt.y.element].attributes[
              pt.y.attribute
            ]) as number;
        const px = dx + x;
        const py = dy + y;
        return {
          x: px,
          y: py,
          direction: pt.direction
        };
      }),
      curveness:
        this.object.properties.curveness != null
          ? this.object.properties.curveness
          : 30,
      coordinateSystem: cs,
      color: renderState.colorFunction(row) as Color,
      opacity: renderState.opacityFunction(row) as number,
      strokeWidth: renderState.strokeWidthFunction(row) as number
    };
  }

  public static BandPath(
    path: Graphics.PathMaker,
    anchor: AnchorCoordinates,
    reversed: boolean = false,
    newPath: boolean = false
  ) {
    let p0: Graphics.PointDirection, p1: Graphics.PointDirection;
    if (reversed) {
      p1 = anchor.points[0];
      p0 = anchor.points[1];
    } else {
      p0 = anchor.points[0];
      p1 = anchor.points[1];
    }
    if (newPath) {
      const p = Graphics.transform(
        anchor.coordinateSystem.getBaseTransform(),
        anchor.coordinateSystem.transformPoint(p0.x, p0.y)
      );
      path.moveTo(p.x, p.y);
    }
    if (anchor.coordinateSystem instanceof Graphics.PolarCoordinates) {
      // let p = Graphics.transform(anchor.coordinateSystem.getBaseTransform(), anchor.coordinateSystem.transformPoint(p1.x, p1.y));
      path.polarLineTo(
        anchor.coordinateSystem.origin.x,
        anchor.coordinateSystem.origin.y,
        90 - p0.x,
        p0.y,
        90 - p1.x,
        p1.y
      );
    } else {
      const p = Graphics.transform(
        anchor.coordinateSystem.getBaseTransform(),
        anchor.coordinateSystem.transformPoint(p1.x, p1.y)
      );
      path.lineTo(p.x, p.y);
    }
  }

  public static ConnectionPath(
    path: Graphics.PathMaker,
    interpType: InterpolationType,
    p1: Point,
    d1: Point,
    curveness1: number,
    p2: Point,
    d2: Point,
    curveness2: number,
    newPath: boolean = false
  ) {
    if (newPath) {
      path.moveTo(p1.x, p1.y);
    }
    switch (interpType) {
      case "line":
        {
          path.lineTo(p2.x, p2.y);
        }
        break;
      case "bezier":
        {
          const dScaler1 = curveness1;
          const dScaler2 = curveness2;
          path.cubicBezierCurveTo(
            p1.x + d1.x * dScaler1,
            p1.y + d1.y * dScaler1,
            p2.x + d2.x * dScaler2,
            p2.y + d2.y * dScaler2,
            p2.x,
            p2.y
          );
        }
        break;
      case "circle": {
        const cx = (p1.x + p2.x) / 2,
          cy = (p1.y + p2.y) / 2;
        const dx = p1.y - p2.y,
          dy = p2.x - p1.x; // it doesn't matter if we normalize d or not
        if (Math.abs(d1.x * dx + d1.y * dy) < 1e-6) {
          // Degenerate case, just a line from p1 to p2
          path.lineTo(p2.x, p2.y);
        } else {
          // Origin = c + d t
          // Solve for t: d1 dot (c + t d - p) = 0
          const t =
            (d1.x * (cx - p1.x) + d1.y * (cy - p1.y)) / (d1.x * dx + d1.y * dy);
          const o = { x: cx - dx * t, y: cy - dy * t }; // the center of the circle
          const r = Geometry.pointDistance(o, p1);
          const scaler = 180 / Math.PI;
          const angle1 = Math.atan2(p1.y - o.y, p1.x - o.x) * scaler;
          let angle2 = Math.atan2(p2.y - o.y, p2.x - o.x) * scaler;
          const sign = (p1.y - o.y) * d1.x - (p1.x - o.x) * d1.y;
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

  public static LinkPath(
    path: Graphics.PathMaker,
    linkType: LinkType,
    interpType: InterpolationType,
    anchor1: AnchorCoordinates,
    anchor2: AnchorCoordinates
  ) {
    switch (linkType) {
      case "line":
        {
          const a1p0 = anchor1.coordinateSystem.transformPointWithBase(
            anchor1.points[0].x,
            anchor1.points[0].y
          );
          const a2p0 = anchor2.coordinateSystem.transformPointWithBase(
            anchor2.points[0].x,
            anchor2.points[0].y
          );
          const a1d0 = anchor1.coordinateSystem.transformDirectionAtPointWithBase(
            anchor1.points[0].x,
            anchor1.points[0].y,
            anchor1.points[0].direction.x,
            anchor1.points[0].direction.y
          );
          const a2d0 = anchor2.coordinateSystem.transformDirectionAtPointWithBase(
            anchor2.points[0].x,
            anchor2.points[0].y,
            anchor2.points[0].direction.x,
            anchor2.points[0].direction.y
          );
          LinksClass.ConnectionPath(
            path,
            interpType,
            a1p0,
            a1d0,
            anchor1.curveness,
            a2p0,
            a2d0,
            anchor2.curveness,
            true
          );
        }
        break;
      case "band":
        {
          // Determine if we should reverse the band
          const a1p0 = anchor1.coordinateSystem.transformPointWithBase(
            anchor1.points[0].x,
            anchor1.points[0].y
          );
          const a1p1 = anchor1.coordinateSystem.transformPointWithBase(
            anchor1.points[1].x,
            anchor1.points[1].y
          );
          const a2p0 = anchor2.coordinateSystem.transformPointWithBase(
            anchor2.points[0].x,
            anchor2.points[0].y
          );
          const a2p1 = anchor2.coordinateSystem.transformPointWithBase(
            anchor2.points[1].x,
            anchor2.points[1].y
          );
          const a1d0 = anchor1.coordinateSystem.transformDirectionAtPointWithBase(
            anchor1.points[0].x,
            anchor1.points[0].y,
            anchor1.points[0].direction.x,
            anchor1.points[0].direction.y
          );
          const a1d1 = anchor1.coordinateSystem.transformDirectionAtPointWithBase(
            anchor1.points[1].x,
            anchor1.points[1].y,
            anchor1.points[1].direction.x,
            anchor1.points[1].direction.y
          );
          const a2d0 = anchor2.coordinateSystem.transformDirectionAtPointWithBase(
            anchor2.points[0].x,
            anchor2.points[0].y,
            anchor2.points[0].direction.x,
            anchor2.points[0].direction.y
          );
          const a2d1 = anchor2.coordinateSystem.transformDirectionAtPointWithBase(
            anchor2.points[1].x,
            anchor2.points[1].y,
            anchor2.points[1].direction.x,
            anchor2.points[1].direction.y
          );
          const cross1 = Geometry.vectorCross(a1d0, {
            x: a1p1.x - a1p0.x,
            y: a1p1.y - a1p0.y
          });
          const cross2 = Geometry.vectorCross(a2d0, {
            x: a2p1.x - a2p0.x,
            y: a2p1.y - a2p0.y
          });
          const reverseBand = cross1 * cross2 > 0;
          if (reverseBand) {
            // anchor1[0] -> anchor1[1]
            LinksClass.BandPath(path, anchor1, false, true);
            // anchor1[1] -> anchor2[0]
            LinksClass.ConnectionPath(
              path,
              interpType,
              a1p1,
              a1d1,
              anchor1.curveness,
              a2p0,
              a2d0,
              anchor2.curveness,
              false
            );
            // anchor2[0] -> anchor2[1]
            LinksClass.BandPath(path, anchor2, false, false);
            // anchor2[1] -> anchor1[0]
            LinksClass.ConnectionPath(
              path,
              interpType,
              a2p1,
              a2d1,
              anchor2.curveness,
              a1p0,
              a1d0,
              anchor1.curveness,
              false
            );
            path.closePath();
          } else {
            // anchor1[0] -> anchor1[1]
            LinksClass.BandPath(path, anchor1, false, true);
            // anchor1[1] -> anchor2[1]
            LinksClass.ConnectionPath(
              path,
              interpType,
              a1p1,
              a1d1,
              anchor1.curveness,
              a2p1,
              a2d1,
              anchor2.curveness,
              false
            );
            // anchor2[1] -> anchor2[0]
            LinksClass.BandPath(path, anchor2, true, false);
            // anchor2[0] -> anchor1[0]
            LinksClass.ConnectionPath(
              path,
              interpType,
              a2p0,
              a2d0,
              anchor2.curveness,
              a1p0,
              a1d0,
              anchor1.curveness,
              false
            );
            path.closePath();
          }
        }
        break;
    }
  }

  protected renderLinks(
    linkGraphics: LinkType,
    lineType: InterpolationType,
    anchorGroups: AnchorAttributes[][][]
  ): Graphics.Group {
    switch (linkGraphics) {
      case "line": {
        return Graphics.makeGroup(
          anchorGroups.map(anchors => {
            const lines: Graphics.Element[] = [];
            for (let i = 0; i < anchors.length - 1; i++) {
              const path = Graphics.makePath({
                strokeColor: anchors[i][0].color,
                strokeOpacity: anchors[i][0].opacity,
                strokeWidth: anchors[i][0].strokeWidth
              });
              LinksClass.LinkPath(
                path,
                linkGraphics,
                lineType,
                anchors[i][0],
                anchors[i + 1][1]
              );
              lines.push(path.path);
            }
            return Graphics.makeGroup(lines);
          })
        );
      }
      case "band": {
        const splitAnchors = true;
        if (splitAnchors) {
          const map = new Map<
            string,
            Array<[AnchorAttributes, AnchorAttributes]>
          >();
          const hashAnchor = (points: Point[]) => {
            return [points[0].x, points[0].y, points[1].x, points[1].y].join(
              ","
            );
          };
          for (const anchors of anchorGroups) {
            for (let i = 0; i < anchors.length - 1; i++) {
              const a1 = anchors[i][0];
              const a2 = anchors[i + 1][1];
              const hash1 = hashAnchor(a1.points);
              const hash2 = hashAnchor(a2.points);
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
            const x1 = anchors[0][0].points[0].x;
            const y1 = anchors[0][0].points[0].y;
            const x2 = anchors[0][0].points[1].x;
            const y2 = anchors[0][0].points[1].y;
            const p1 = anchors[0][0].coordinateSystem.transformPoint(x1, y1);
            const p2 = anchors[0][0].coordinateSystem.transformPoint(x2, y2);
            const pd = Math.sqrt(
              (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
            );
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const order = anchors.map(anchor => {
              const p = anchor[1].coordinateSystem.transformPoint(
                anchor[1].points[0].x,
                anchor[1].points[0].y
              );
              const proj =
                (p.x - cx) * (p2.x - p1.x) + (p.y - cy) * (p2.y - p1.y);
              const distance = Math.sqrt(
                (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy)
              );
              const cosTheta = proj / distance / pd;
              if (cosTheta > 0.999999) {
                return 1 + distance;
              } else if (cosTheta < -0.999999) {
                return -1 - distance;
              }
              return cosTheta;
              // return proj;
            });
            const indices = [];
            let totalWidth = 0;
            for (let i = 0; i < anchors.length; i++) {
              indices.push(i);
              totalWidth += anchors[i][0].strokeWidth;
            }
            indices.sort((a, b) => order[a] - order[b]);
            let cWidth = 0;
            for (let i = 0; i < anchors.length; i++) {
              const m = indices[i];
              const k1 = cWidth / totalWidth;
              cWidth += anchors[m][0].strokeWidth;
              const k2 = cWidth / totalWidth;
              anchors[m][0].points[0].x = x1 + (x2 - x1) * k1;
              anchors[m][0].points[0].y = y1 + (y2 - y1) * k1;
              anchors[m][0].points[1].x = x1 + (x2 - x1) * k2;
              anchors[m][0].points[1].y = y1 + (y2 - y1) * k2;
            }
          });
        }
        return Graphics.makeGroup(
          anchorGroups.map(anchors => {
            const bands: Graphics.Element[] = [];
            for (let i = 0; i < anchors.length - 1; i++) {
              const path = Graphics.makePath({
                fillColor: anchors[i][0].color,
                fillOpacity: anchors[i][0].opacity
              });
              LinksClass.LinkPath(
                path,
                linkGraphics,
                lineType,
                anchors[i][0],
                anchors[i + 1][1]
              );
              bands.push(path.path);
            }
            return Graphics.makeGroup(bands);
          })
        );
      }
    }
  }

  /** Get the graphics that represent this layout */
  public getGraphics(manager: ChartStateManager): Graphics.Element {
    return null;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const widgets = [
      manager.sectionHeader("Line Type"),
      manager.row(
        "Type",
        manager.inputSelect(
          { property: "interpolationType" },
          {
            type: "dropdown",
            showLabel: true,
            options: ["line", "bezier", "circle"],
            labels: ["Line", "Bezier", "Arc"]
          }
        )
      )
    ];
    if (props.interpolationType == "bezier") {
      widgets.push(
        manager.row(
          "Curveness",
          manager.inputNumber(
            { property: "curveness" },
            {
              showSlider: true,
              minimum: 0,
              sliderRange: [0, 500]
            }
          )
        )
      );
    }
    widgets.push(manager.sectionHeader("Style"));
    widgets.push(manager.mappingEditor("Color", "color", {}));
    // if (props.linkType == "line") {
    widgets.push(
      manager.mappingEditor("Width", "strokeWidth", {
        hints: { rangeNumber: [0, 5] },
        defaultValue: 1,
        numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 }
      })
    );
    // }
    widgets.push(
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      })
    );
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
    const props = this.object.properties;

    const linkGroup = Graphics.makeGroup([]);

    const renderState: RenderState = {
      colorFunction: this.parent.resolveMapping(this.object.mappings.color, {
        r: 0,
        g: 0,
        b: 0
      } as Color),
      opacityFunction: this.parent.resolveMapping(
        this.object.mappings.opacity,
        1
      ),
      strokeWidthFunction: this.parent.resolveMapping(
        this.object.mappings.strokeWidth,
        1
      )
    };

    const links = this.object;
    const chart = this.parent.object;
    const chartState = this.parent.state;
    // Resolve the anchors
    const layoutIndex = indexOf(
      chart.elements,
      l => l._id == props.linkThrough.plotSegment
    );
    const layout = chart.elements[layoutIndex] as Specification.PlotSegment;
    const mark = getById(chart.glyphs, layout.glyph);
    const layoutState = chartState.elements[
      layoutIndex
    ] as Specification.PlotSegmentState;
    const layoutClass = manager.getPlotSegmentClass(layoutState);
    const table = this.parent.dataflow.getTable(layout.table);
    const facets = facetRows(
      table,
      layoutState.dataRowIndices,
      props.linkThrough.facetExpressions.map(x =>
        this.parent.dataflow.cache.parse(x)
      )
    );
    const rowToMarkState = new Map<string, Specification.GlyphState>();
    for (let i = 0; i < layoutState.dataRowIndices.length; i++) {
      rowToMarkState.set(
        layoutState.dataRowIndices[i].join(","),
        layoutState.glyphs[i]
      );
    }
    const anchor1 = this.resolveLinkAnchorPoints(props.anchor1, mark);
    const anchor2 = this.resolveLinkAnchorPoints(props.anchor2, mark);
    const anchors = facets.map(facet =>
      facet.map(index => {
        const markState = rowToMarkState.get(index.join(","));
        const row = table.getGroupedContext(index);
        if (markState) {
          return [
            this.getAnchorPoints(
              renderState,
              anchor1,
              layoutClass,
              markState,
              row
            ),
            this.getAnchorPoints(
              renderState,
              anchor2,
              layoutClass,
              markState,
              row
            )
          ];
        } else {
          return null;
        }
      })
    );

    linkGroup.elements.push(
      this.renderLinks(props.linkType, props.interpolationType, anchors)
    );

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
    const props = this.object.properties;

    const linkGroup = Graphics.makeGroup([]);

    const renderState: RenderState = {
      colorFunction: this.parent.resolveMapping(this.object.mappings.color, {
        r: 0,
        g: 0,
        b: 0
      } as Color),
      opacityFunction: this.parent.resolveMapping(
        this.object.mappings.opacity,
        1
      ),
      strokeWidthFunction: this.parent.resolveMapping(
        this.object.mappings.strokeWidth,
        1
      )
    };

    const links = this.object;
    const chart = this.parent.object;
    const chartState = this.parent.state;
    const dataset = this.parent.dataflow;

    const layoutIndices = props.linkBetween.plotSegments.map(lid =>
      indexOf(chart.elements, l => l._id == lid)
    );
    const layouts = layoutIndices.map(
      i => chart.elements[i]
    ) as Specification.PlotSegment[];
    const layoutStates = layoutIndices.map(
      i => chartState.elements[i]
    ) as Specification.PlotSegmentState[];
    const layoutClasses = layoutStates.map(layoutState =>
      manager.getPlotSegmentClass(layoutState)
    );
    const glyphs = layouts.map(layout => getById(chart.glyphs, layout.glyph));
    const anchor1 = this.resolveLinkAnchorPoints(props.anchor1, glyphs[0]);
    const anchor2 = this.resolveLinkAnchorPoints(props.anchor2, glyphs[1]);

    for (let shift = 0; shift < layoutStates.length - 1; shift++) {
      const rowIndicesMap = new Map<string, number>();
      for (let i = 0; i < layoutStates[shift].dataRowIndices.length; i++) {
        rowIndicesMap.set(layoutStates[shift].dataRowIndices[i].join(","), i);
      }
      const table = this.parent.dataflow.getTable(layouts[0].table);
      const anchors: AnchorAttributes[][][] = [];
      for (
        let i1 = 0;
        i1 < layoutStates[shift + 1].dataRowIndices.length;
        i1++
      ) {
        const rowIndex = layoutStates[shift + 1].dataRowIndices[i1];
        const rowIndexJoined = rowIndex.join(",");
        if (rowIndicesMap.has(rowIndexJoined)) {
          const i0 = rowIndicesMap.get(rowIndexJoined);
          const row = table.getGroupedContext(rowIndex);
          anchors.push([
            [
              this.getAnchorPoints(
                renderState,
                anchor1,
                layoutClasses[shift],
                layoutStates[shift].glyphs[i0],
                row
              ),
              null
            ],
            [
              null,
              this.getAnchorPoints(
                renderState,
                anchor2,
                layoutClasses[shift + 1],
                layoutStates[shift + 1].glyphs[i1],
                row
              )
            ]
          ]);
        }
      }
      linkGroup.elements.push(
        this.renderLinks(props.linkType, props.interpolationType, anchors)
      );
    }

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
    const props = this.object.properties;

    const linkGroup = Graphics.makeGroup([]);

    const renderState: RenderState = {
      colorFunction: this.parent.resolveMapping(this.object.mappings.color, {
        r: 0,
        g: 0,
        b: 0
      } as Color),
      opacityFunction: this.parent.resolveMapping(
        this.object.mappings.opacity,
        1
      ),
      strokeWidthFunction: this.parent.resolveMapping(
        this.object.mappings.strokeWidth,
        1
      )
    };

    const links = this.object;
    const chart = this.parent.object;
    const chartState = this.parent.state;
    const dataset = this.parent.dataflow;

    const layoutIndices = props.linkTable.plotSegments.map(lid =>
      indexOf(chart.elements, l => l._id == lid)
    );
    const layouts = layoutIndices.map(
      i => chart.elements[i]
    ) as Specification.PlotSegment[];
    const layoutStates = layoutIndices.map(
      i => chartState.elements[i]
    ) as Specification.PlotSegmentState[];
    const layoutClasses = layoutStates.map(layoutState =>
      manager.getPlotSegmentClass(layoutState)
    );
    const glyphs = layouts.map(layout => getById(chart.glyphs, layout.glyph));
    const anchor1 = this.resolveLinkAnchorPoints(props.anchor1, glyphs[0]);
    const anchor2 = this.resolveLinkAnchorPoints(props.anchor2, glyphs[1]);

    const linkTable = this.parent.dataflow.getTable(props.linkTable.table);
    const tables = layouts.map((layout, layoutIndex) => {
      const table = this.parent.dataflow.getTable(layout.table);
      const id2RowGlyphIndex = new Map<string, [number[], number]>();
      for (
        let i = 0;
        i < layoutStates[layoutIndex].dataRowIndices.length;
        i++
      ) {
        const rowIndex = layoutStates[layoutIndex].dataRowIndices[i];
        const rowIDs = rowIndex.map(i => table.getRow(i).id).join(",");
        id2RowGlyphIndex.set(rowIDs, [rowIndex, i]);
      }
      return {
        table,
        id2RowGlyphIndex
      };
    });

    // Prepare data rows
    const rowIndices: number[] = [];
    for (let i = 0; i < linkTable.rows.length; i++) {
      rowIndices.push(i);
    }

    const anchors: AnchorAttributes[][][] = [];
    for (let i = 0; i < rowIndices.length; i++) {
      const rowIndex = rowIndices[i];
      const row = linkTable.getGroupedContext([rowIndex]);
      const rowItem = linkTable.getRow(rowIndex);

      const r1 = tables[0].id2RowGlyphIndex.get(rowItem.source_id.toString());
      const r2 = tables[1].id2RowGlyphIndex.get(rowItem.target_id.toString());

      if (!r1 || !r2) {
        continue;
      }

      const [iRow0, i0] = r1;
      const [iRow1, i1] = r2;

      anchors.push([
        [
          this.getAnchorPoints(
            renderState,
            anchor1,
            layoutClasses[0],
            layoutStates[0].glyphs[i0],
            row
          ),
          null
        ],
        [
          null,
          this.getAnchorPoints(
            renderState,
            anchor2,
            layoutClasses[1],
            layoutStates[1].glyphs[i1],
            row
          )
        ]
      ]);
    }

    linkGroup.elements.push(
      this.renderLinks(props.linkType, props.interpolationType, anchors)
    );

    return linkGroup;
  }
}

export function registerClasses() {
  ObjectClasses.Register(SeriesLinksClass);
  ObjectClasses.Register(LayoutsLinksClass);
  ObjectClasses.Register(TableLinksClass);
}

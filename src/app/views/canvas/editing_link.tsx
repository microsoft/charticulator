// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Hammer from "hammerjs";
import * as React from "react";

import {
  Geometry,
  getById,
  getIndexById,
  Graphics,
  Point,
  Prototypes,
  Specification,
  ZoomInfo
} from "../../../core";
import { Actions } from "../../actions";
import { renderSVGPath } from "../../renderer";
import { AppStore } from "../../stores";

export interface EditingLinkProps {
  width: number;
  height: number;
  zoom: ZoomInfo;

  store: AppStore;

  link: Specification.Links;
}

export interface MarkAnchorDescription {
  mode: "begin" | "end";
  markID: string;
  anchor: Prototypes.LinkAnchor.Description;
  offsetX: number;
  offsetY: number;
  coordinateSystem: Graphics.CoordinateSystem;
}

export interface EditingLinkState {
  stage: "select-source" | "select-target";
  firstAnchor: MarkAnchorDescription;
  secondAnchor: MarkAnchorDescription;
  currentMouseLocation: Point;
}

export class EditingLink extends React.Component<
  EditingLinkProps,
  EditingLinkState
> {
  public refs: {
    container: SVGGElement;
    handler: SVGRectElement;
  };

  private markPlaceholders = new WeakMap<SVGGElement, MarkAnchorDescription>();
  private hammer: HammerManager;

  constructor(props: EditingLinkProps) {
    super(props);
    this.state = {
      stage: "select-source",
      firstAnchor: null,
      secondAnchor: null,
      currentMouseLocation: { x: 0, y: 0 }
    };
  }

  private getMarkAtPoint(x: number, y: number) {
    let element = document.elementFromPoint(x, y);
    let mark: MarkAnchorDescription = null;
    while (element) {
      if (element instanceof SVGGElement) {
        if (this.markPlaceholders.has(element)) {
          mark = this.markPlaceholders.get(element);
          break;
        }
      }
      element = element.parentElement;
    }
    return mark;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.container);
    this.hammer.add(new Hammer.Pan());
    this.hammer.add(new Hammer.Tap());
    this.hammer.on("tap panend", e => {
      const pageX = e.center.x;
      const pageY = e.center.y;

      const markInfo = this.getMarkAtPoint(pageX, pageY);
      if (markInfo) {
        let anchor: Specification.Types.LinkAnchorPoint[];
        anchor = markInfo.anchor.points.map(pt => {
          return {
            x: { element: markInfo.anchor.element, attribute: pt.xAttribute },
            y: { element: markInfo.anchor.element, attribute: pt.yAttribute },
            direction: pt.direction
          } as Specification.Types.LinkAnchorPoint;
        });
        if (markInfo.mode == "begin") {
          new Actions.SetObjectProperty(
            this.props.link,
            "anchor1",
            null,
            anchor
          ).dispatch(this.props.store.dispatcher);
        } else {
          new Actions.SetObjectProperty(
            this.props.link,
            "anchor2",
            null,
            anchor
          ).dispatch(this.props.store.dispatcher);
        }
      } else {
        new Actions.ClearSelection().dispatch(this.props.store.dispatcher);
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  private renderAnchor(
    coordinateSystem: Graphics.CoordinateSystem,
    dx: number,
    dy: number,
    anchor: Prototypes.LinkAnchor.Description
  ) {
    const transformPoint = (point: Point) => {
      const x = point.x + dx;
      const y = point.y + dy;
      let p = coordinateSystem.transformPoint(x, y);
      p = Graphics.transform(coordinateSystem.getBaseTransform(), p);
      return Geometry.applyZoom(this.props.zoom, { x: p.x, y: -p.y });
    };
    if (anchor.points.length == 2) {
      const path = Graphics.makePath();
      Prototypes.Links.LinksClass.BandPath(
        path,
        {
          points: anchor.points.map(p => {
            return { x: p.x + dx, y: p.y + dy, direction: p.direction };
          }),
          coordinateSystem,
          curveness: this.props.link.properties.curveness as number
        },
        false,
        true
      );
      const transform = `translate(${this.props.zoom.centerX},${
        this.props.zoom.centerY
      }) scale(${this.props.zoom.scale})`;
      const d = renderSVGPath(path.path.cmds);
      return (
        <g transform={transform}>
          <path
            d={d}
            className="element-ghost-stroke"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={d}
            className="element-stroke"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
      // let p1 = transformPoint(anchor.points[0]);
      // let p2 = transformPoint(anchor.points[1]);
      // return (
      //     <g>
      //         <line className="element-ghost-stroke" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
      //         <line className="element-stroke" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
      //     </g>
      // );
    } else {
      const p = transformPoint(anchor.points[0]);
      return (
        <g>
          <circle className="element-ghost-shape" cx={p.x} cy={p.y} r={8} />
          <circle className="element-shape" cx={p.x} cy={p.y} r={3} />
        </g>
      );
    }
  }

  private renderMarkPlaceholders() {
    const manager = this.props.store.chartManager;

    // Get the two glyphs
    const props = this.props.link
      .properties as Prototypes.Links.LinksProperties;
    const lineMode: string = props.linkType;
    let glyphs: Array<{
      glyph: Specification.Glyph;
      glyphState: Specification.GlyphState;
      coordinateSystem: Graphics.CoordinateSystem;
    }> = [];
    switch (this.props.link.classID) {
      case "links.through":
        {
          const plotSegmentClass = manager.getClassById(
            props.linkThrough.plotSegment
          ) as Prototypes.PlotSegments.PlotSegmentClass;
          const coordinateSystem = plotSegmentClass.getCoordinateSystem();
          const facets = Prototypes.Links.facetRows(
            manager.dataflow.getTable(plotSegmentClass.object.table),
            plotSegmentClass.state.dataRowIndices,
            props.linkThrough.facetExpressions.map(x =>
              manager.dataflow.cache.parse(x)
            )
          );
          const glyph = getById(
            manager.chart.glyphs,
            plotSegmentClass.object.glyph
          );
          const rowToMarkState = new Map<string, Specification.GlyphState>();
          for (
            let i = 0;
            i < plotSegmentClass.state.dataRowIndices.length;
            i++
          ) {
            rowToMarkState.set(
              plotSegmentClass.state.dataRowIndices[i].join(","),
              plotSegmentClass.state.glyphs[i]
            );
          }
          let firstNonEmptyFacet = 0;
          for (; firstNonEmptyFacet < facets.length; firstNonEmptyFacet++) {
            if (facets[firstNonEmptyFacet].length >= 2) {
              break;
            }
          }
          if (firstNonEmptyFacet < facets.length) {
            glyphs = [
              {
                glyph,
                glyphState: rowToMarkState.get(
                  facets[firstNonEmptyFacet][0].join(",")
                ),
                coordinateSystem
              },
              {
                glyph,
                glyphState: rowToMarkState.get(
                  facets[firstNonEmptyFacet][1].join(",")
                ),
                coordinateSystem
              }
            ];
          }
        }
        break;
      case "links.between":
        {
          const plotSegmentClasses = props.linkBetween.plotSegments.map(
            x =>
              manager.getClassById(
                x
              ) as Prototypes.PlotSegments.PlotSegmentClass
          );
          const glyphObjects = plotSegmentClasses.map(x =>
            getById(manager.chart.glyphs, x.object.glyph)
          );
          glyphs = [
            {
              glyph: glyphObjects[0],
              glyphState: plotSegmentClasses[0].state.glyphs[0],
              coordinateSystem: plotSegmentClasses[0].getCoordinateSystem()
            },
            {
              glyph: glyphObjects[1],
              glyphState: plotSegmentClasses[1].state.glyphs[0],
              coordinateSystem: plotSegmentClasses[1].getCoordinateSystem()
            }
          ];
        }
        break;
      case "links.table":
        {
          const plotSegmentClasses = props.linkTable.plotSegments.map(
            x =>
              manager.getClassById(
                x
              ) as Prototypes.PlotSegments.PlotSegmentClass
          );
          const glyphObjects = plotSegmentClasses.map(x =>
            getById(manager.chart.glyphs, x.object.glyph)
          );
          const linkTable = this.props.store.chartManager.dataflow.getTable(
            props.linkTable.table
          );
          const tables = plotSegmentClasses.map(plotSegmentClass => {
            const table = this.props.store.chartManager.dataflow.getTable(
              plotSegmentClass.object.table
            );
            const id2RowGlyphIndex = new Map<string, [number[], number]>();
            for (
              let i = 0;
              i < plotSegmentClass.state.dataRowIndices.length;
              i++
            ) {
              const rowIndex = plotSegmentClass.state.dataRowIndices[i];
              const rowIDs = rowIndex.map(i => table.getRow(i).id).join(",");
              id2RowGlyphIndex.set(rowIDs, [rowIndex, i]);
            }
            return {
              table,
              id2RowGlyphIndex
            };
          });
          // Find the first links with nodes are exists in main table
          const rowItem: Specification.DataRow = linkTable.rows.find(
            row =>
              tables[0].id2RowGlyphIndex.get(row.source_id.toString()) !=
                undefined &&
              tables[1].id2RowGlyphIndex.get(row.target_id.toString()) !=
                undefined
          );
          if (rowItem) {
            const [iRow0, i0] = tables[0].id2RowGlyphIndex.get(
              rowItem.source_id.toString()
            );
            const [iRow1, i1] = tables[1].id2RowGlyphIndex.get(
              rowItem.target_id.toString()
            );
            glyphs = [
              {
                glyph: glyphObjects[0],
                glyphState: plotSegmentClasses[0].state.glyphs[i0],
                coordinateSystem: plotSegmentClasses[0].getCoordinateSystem()
              },
              {
                glyph: glyphObjects[1],
                glyphState: plotSegmentClasses[1].state.glyphs[i1],
                coordinateSystem: plotSegmentClasses[1].getCoordinateSystem()
              }
            ];
          } else {
            glyphs = [];
          }
        }
        break;
    }

    // Render mark anchor candidates
    const elements = glyphs.map(
      ({ glyph, glyphState, coordinateSystem }, glyphIndex) => {
        const anchorX = glyphState.marks[0].attributes.x as number;
        const anchorY = glyphState.marks[0].attributes.y as number;
        const offsetX = (glyphState.attributes.x as number) - anchorX;
        const offsetY = (glyphState.attributes.y as number) - anchorY;
        const marks = glyph.marks.map((element, elementIndex) => {
          if (glyph.marks.length > 1 && element.classID == "mark.anchor") {
            return null;
          }
          const markClass = manager.getMarkClass(
            glyphState.marks[elementIndex]
          );
          const mode: "begin" | "end" = glyphIndex == 0 ? "begin" : "end";
          let anchors = markClass.getLinkAnchors(mode);
          anchors = anchors.filter(anchor => {
            if (lineMode == "line") {
              return anchor.points.length == 1;
            }
            if (lineMode == "band") {
              return anchor.points.length == 2;
            }
          });
          return (
            <g key={element._id}>
              {anchors.map((anchor, index) => (
                <g
                  className="anchor"
                  key={`m${index}`}
                  ref={g => {
                    if (g != null) {
                      this.markPlaceholders.set(g, {
                        mode,
                        markID: element._id,
                        anchor,
                        offsetX,
                        offsetY,
                        coordinateSystem
                      });
                    }
                  }}
                >
                  {this.renderAnchor(
                    coordinateSystem,
                    offsetX,
                    offsetY,
                    anchor
                  )}
                </g>
              ))}
            </g>
          );
        });
        return <g key={glyphIndex}>{marks}</g>;
      }
    );
    const currentAnchors = glyphs.map(
      ({ glyph, glyphState, coordinateSystem }, glyphIndex) => {
        const anchorX = glyphState.marks[0].attributes.x as number;
        const anchorY = glyphState.marks[0].attributes.y as number;
        const offsetX = (glyphState.attributes.x as number) - anchorX;
        const offsetY = (glyphState.attributes.y as number) - anchorY;
        const anchor = glyphIndex == 0 ? props.anchor1 : props.anchor2;
        const element = anchor[0].x.element;
        const elementState =
          glyphState.marks[getIndexById(glyph.marks, element)];
        const anchorDescription: Prototypes.LinkAnchor.Description = {
          element,
          points: anchor.map(a => {
            return {
              x: elementState.attributes[a.x.attribute] as number,
              xAttribute: a.x.attribute,
              y: elementState.attributes[a.y.attribute] as number,
              yAttribute: a.y.attribute,
              direction: a.direction
            };
          })
        };
        return {
          coordinateSystem,
          offsetX,
          offsetY,
          anchor: anchorDescription
        };
      }
    );
    let currentLinkElement: JSX.Element = null;
    if (currentAnchors.length == 2) {
      const path = Graphics.makePath();
      const anchor1 = {
        coordinateSystem: currentAnchors[0].coordinateSystem,
        points: currentAnchors[0].anchor.points.map(p => {
          return {
            x: p.x + currentAnchors[0].offsetX,
            y: p.y + currentAnchors[0].offsetY,
            direction: p.direction
          };
        }),
        curveness: this.props.link.properties.curveness as number
      };
      const anchor2 = {
        coordinateSystem: currentAnchors[1].coordinateSystem,
        points: currentAnchors[1].anchor.points.map(p => {
          return {
            x: p.x + currentAnchors[1].offsetX,
            y: p.y + currentAnchors[1].offsetY,
            direction: p.direction
          };
        }),
        curveness: this.props.link.properties.curveness as number
      };
      Prototypes.Links.LinksClass.LinkPath(
        path,
        props.linkType,
        props.interpolationType,
        anchor1,
        anchor2
      );
      const transform = `translate(${this.props.zoom.centerX},${
        this.props.zoom.centerY
      }) scale(${this.props.zoom.scale})`;
      currentLinkElement = (
        <g transform={transform}>
          <path
            d={renderSVGPath(path.path.cmds)}
            className={`link-hint-${props.linkType}`}
          />
        </g>
      );
    }
    return (
      <g>
        {currentLinkElement}
        {elements}
        {currentAnchors.map(
          ({ coordinateSystem, offsetX, offsetY, anchor }, index) => (
            <g className="anchor active" key={index}>
              {this.renderAnchor(coordinateSystem, offsetX, offsetY, anchor)}
            </g>
          )
        )}
      </g>
    );
  }

  public getPointFromEvent(point: Point): Point {
    const r = this.refs.handler.getBoundingClientRect();
    const p = Geometry.unapplyZoom(this.props.zoom, {
      x: point.x - r.left,
      y: point.y - r.top
    });
    return { x: p.x, y: -p.y };
  }

  public render() {
    return (
      <g className="creating-link" ref="container">
        {this.renderMarkPlaceholders()}
      </g>
    );
  }
}

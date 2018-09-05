/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as Hammer from "hammerjs";

import {
  Point,
  ZoomInfo,
  Geometry,
  Specification,
  Prototypes,
  Dataset,
  zipArray,
  zip,
  getById,
  getByName,
  indexOf,
  uniqueID,
  Graphics,
  getIndexById
} from "../../../core";
import { classNames } from "../../utils";
import { SnappableGuide } from "./snapping";
import {
  renderTransform,
  renderGraphicalElementSVG,
  renderSVGPath
} from "../../renderer";
import { ChartStore } from "../../stores";
import { ContextedComponent } from "../../context_component";
import { DataFieldSelector } from "../dataset/data_field_selector";
import { ButtonRaised, ToolButton } from "../../components";
import { Radio } from "../panels/widgets/controls";
import { Actions } from "../../actions";

export interface EditingLinkProps {
  width: number;
  height: number;
  zoom: ZoomInfo;

  store: ChartStore;

  link: Specification.Links;
}

export interface MarkAnchorDescription {
  mode: "begin" | "end";
  // plotSegmentIndex: number;
  // glyphIndex?: number;
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

// function isSameAnchor(anchor1: MarkAnchorDescription, anchor2: MarkAnchorDescription) {
//     if (anchor1 == null || anchor2 == null) return false;
//     if (anchor1.plotSegmentIndex != anchor2.plotSegmentIndex) return false;
//     if (anchor1.glyphIndex != anchor2.glyphIndex) return false;
//     if (anchor1.markIndex != anchor2.markIndex) return false;
//     return true;
// }

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
    // this.hammer.on("panstart", (e) => {
    //     let pageX = e.center.x - e.deltaX;
    //     let pageY = e.center.y - e.deltaY;
    //     let startMarkInfo = this.getMarkAtPoint(pageX, pageY);
    //     if (startMarkInfo) {
    //         this.setState({
    //             stage: "select-target",
    //             firstAnchor: startMarkInfo
    //         });
    //     } else {
    //         // this.props.onCancel();
    //     }
    // });
    // this.hammer.on("pan", (e) => {
    //     let info = this.getMarkAtPoint(e.center.x, e.center.y);
    //     this.setState({
    //         secondAnchor: info
    //     });
    // });
    // this.hammer.on("panend", (e) => {

    // });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  // private getAnchorContext(anchor: MarkAnchorDescription) {
  //     let plotSegment = this.props.store.chart.elements[anchor.plotSegmentIndex] as Specification.PlotSegment;
  //     let plotSegmentState = this.props.store.chartState.elements[anchor.plotSegmentIndex] as Specification.PlotSegmentState;
  //     let glyph = getById(this.props.store.chart.glyphs, plotSegment.glyph);
  //     let mark = glyph.marks[anchor.markIndex];
  //     let glyphState = plotSegmentState.glyphs[anchor.glyphIndex];
  //     let markState = glyphState.marks[anchor.markIndex];
  //     return { plotSegment, plotSegmentState, glyphState, markState, glyph, mark };
  // }

  // private getAnchorData(anchor: MarkAnchorDescription): [Dataset.Table, number] {
  //     let ctx = this.getAnchorContext(anchor);
  //     let idx = ctx.plotSegmentState.dataRowIndices[anchor.glyphIndex];
  //     let table = getByName(this.props.store.datasetStore.dataset.tables, ctx.plotSegment.table);
  //     return [table, idx];
  // }

  // public getAnchorLinkAnchors(anchor: MarkAnchorDescription): Specification.Types.LinkAnchorPoint[] {
  //     let ctx = this.getAnchorContext(anchor);
  //     return anchor.anchor.points.map(p => {
  //         return {
  //             x: { element: ctx.mark._id, attribute: p.xAttribute },
  //             y: { element: ctx.mark._id, attribute: p.yAttribute },
  //             direction: p.direction
  //         };
  //     });
  // }

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
          const rowToMarkState = new Map<number, Specification.GlyphState>();
          for (
            let i = 0;
            i < plotSegmentClass.state.dataRowIndices.length;
            i++
          ) {
            rowToMarkState.set(
              plotSegmentClass.state.dataRowIndices[i],
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
                glyphState: rowToMarkState.get(facets[firstNonEmptyFacet][0]),
                coordinateSystem
              },
              {
                glyph,
                glyphState: rowToMarkState.get(facets[firstNonEmptyFacet][1]),
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
            const id2RowGlyphIndex = new Map<string, [number, number]>();
            for (
              let i = 0;
              i < plotSegmentClass.state.dataRowIndices.length;
              i++
            ) {
              const rowIndex = plotSegmentClass.state.dataRowIndices[i];
              const row = table.getRow(rowIndex);
              id2RowGlyphIndex.set(row.id.toString(), [rowIndex, i]);
            }
            return {
              table,
              id2RowGlyphIndex
            };
          });
          const rowItem = linkTable.getRow(0);
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

  // public renderLinkHint() {
  //     let lineElements: JSX.Element = null;
  //     if (this.state.firstAnchor && this.state.secondAnchor) {
  //         let { linkType, reverseAnchor2 } = this.determineLinkType();
  //         let points1 = this.state.firstAnchor.anchor.points.map(point => {
  //             let tr = this.state.firstAnchor.coordinateSystem.getLocalTransform(point.x + this.state.firstAnchor.offsetX, point.y + this.state.firstAnchor.offsetY);
  //             tr = Graphics.concatTransform(this.state.firstAnchor.coordinateSystem.getBaseTransform(), tr);
  //             let dir = Graphics.transform({ x: 0, y: 0, angle: tr.angle }, point.direction);
  //             return {
  //                 x: tr.x, y: tr.y,
  //                 direction: dir
  //             };
  //         });
  //         let points2 = this.state.secondAnchor.anchor.points.map(point => {
  //             let tr = this.state.secondAnchor.coordinateSystem.getLocalTransform(point.x + this.state.secondAnchor.offsetX, point.y + this.state.secondAnchor.offsetY);
  //             tr = Graphics.concatTransform(this.state.secondAnchor.coordinateSystem.getBaseTransform(), tr);
  //             let dir = Graphics.transform({ x: 0, y: 0, angle: tr.angle }, point.direction);
  //             return {
  //                 x: tr.x, y: tr.y,
  //                 direction: dir
  //             };
  //         });
  //         if (reverseAnchor2) {
  //             points2.reverse();
  //         }
  //         let linkElement: Graphics.Element;
  //         let className: string;
  //         switch (linkType) {
  //             case "line": {
  //                 linkElement = Graphics.makeLineLink(points1[0], points2[0]);
  //                 className = "link-hint-line";
  //             } break;
  //             case "bezier": {
  //                 linkElement = Graphics.makeBezierLink(points1[0], points2[0]);
  //                 className = "link-hint-line";
  //             } break;
  //             case "circle": {
  //                 linkElement = Graphics.makeCircleLink(points1[0], points2[0]);
  //                 className = "link-hint-line";
  //             } break;
  //             case "line-band": {
  //                 linkElement = Graphics.makeLineLinkBand(points1[0], points1[1], points2[0], points2[1]);
  //                 className = "link-hint-band";
  //             } break;
  //             case "bezier-band": {
  //                 linkElement = Graphics.makeBezierLinkBand(points1[0], points1[1], points2[0], points2[1]);
  //                 className = "link-hint-band";
  //             } break;
  //             case "circle-band": {
  //                 linkElement = Graphics.makeCircleLinkBand(points1[0], points1[1], points2[0], points2[1]);
  //                 className = "link-hint-band";
  //             } break;
  //         }
  //         lineElements = (
  //             <g>
  //                 {renderGraphicalElementSVG(linkElement, { className: className })}
  //             </g>
  //         );
  //     } else if (this.state.firstAnchor) {
  //         let points1 = this.state.firstAnchor.anchor.points.map(point => {
  //             let tr = this.state.firstAnchor.coordinateSystem.getLocalTransform(point.x + this.state.firstAnchor.offsetX, point.y + this.state.firstAnchor.offsetY);
  //             tr = Graphics.concatTransform(this.state.firstAnchor.coordinateSystem.getBaseTransform(), tr);
  //             let dir = Graphics.transform({ x: 0, y: 0, angle: tr.angle }, point.direction);
  //             return {
  //                 x: tr.x, y: tr.y,
  //                 direction: dir
  //             };
  //         });
  //         let points1Center: Point = { x: 0, y: 0 };
  //         for (let i = 0; i < points1.length; i++) {
  //             points1Center.x += points1[i].x / points1.length;
  //             points1Center.y += points1[i].y / points1.length;
  //         }
  //         let points2 = points1.map(p => {
  //             return {
  //                 x: p.x - points1Center.x + this.state.currentMouseLocation.x,
  //                 y: p.y - points1Center.y + this.state.currentMouseLocation.y,
  //                 direction: { x: 0, y: 0 }
  //             }
  //         });
  //         let linkElement: Graphics.Element;
  //         let className: string;
  //         switch (points1.length) {
  //             case 1: {
  //                 linkElement = Graphics.makeBezierLink(points1[0], points2[0]);
  //                 className = "link-hint-line is-dashed";
  //             } break;
  //             case 2: {
  //                 linkElement = Graphics.makeBezierLinkBand(points1[0], points1[1], points2[0], points2[1]);
  //                 className = "link-hint-band is-dashed";
  //             } break;
  //         }
  //         lineElements = (
  //             <g>
  //                 {renderGraphicalElementSVG(linkElement, { className: className })}
  //             </g>
  //         );
  //     }
  //     let transform = `translate(${this.props.zoom.centerX},${this.props.zoom.centerY}) scale(${this.props.zoom.scale})`;
  //     return (
  //         <g transform={transform}>
  //             {lineElements}
  //         </g>
  //     );
  // }

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
        {/* Block regular canvas interactions */}
        {/* <rect className="interaction-handler"
                    style={{ cursor: "default" }}
                    ref="handler"
                    x={0} y={0}
                    width={this.props.width} height={this.props.height}
                /> */}
        {this.renderMarkPlaceholders()}
      </g>
    );
  }
}

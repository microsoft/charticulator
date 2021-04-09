// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Geometry, Point, Prototypes, ZoomInfo } from "../../../core";
import { DragContext, DragModifiers, Droppable } from "../../controllers";
import * as globals from "../../globals";
import { classNames, toSVGNumber } from "../../utils";

export interface DropZoneViewProps {
  zone: Prototypes.DropZones.Description;
  zoom: ZoomInfo;
  onDragEnter: (
    data: any
  ) => (point: Point, modifiers: DragModifiers) => boolean;
}

export interface DropZoneViewState {
  active: boolean;
}

export class DropZoneView
  extends React.Component<DropZoneViewProps, DropZoneViewState>
  implements Droppable {
  public refs: {
    container: SVGGElement;
  };

  constructor(props: DropZoneViewProps) {
    super(props);
    this.state = { active: false };
  }

  public componentDidMount() {
    globals.dragController.registerDroppable(this, this.refs.container);
  }

  public componentWillUnmount() {
    globals.dragController.unregisterDroppable(this);
  }

  public onDragEnter(ctx: DragContext) {
    const data = ctx.data;
    const handler = this.props.onDragEnter(data);
    if (handler) {
      this.setState({
        active: true,
      });
      ctx.onLeave(() => {
        this.setState({
          active: false,
        });
      });
      ctx.onDrop((point: Point, modifiers: DragModifiers) => {
        return handler(point, modifiers);
      });
      return true;
    } else {
      return false;
    }
  }

  public makeClosePath(...points: Point[]) {
    return `M${points.map((d) => `${d.x},${d.y}`).join("L")}Z`;
  }
  public makeDashedLine(p1: Point, p2: Point) {
    return (
      <line
        className="dropzone-element-dashline"
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
      />
    );
  }
  public makeLine(
    p1: Point,
    p2: Point,
    arrow1: number = 0,
    arrow2: number = 0
  ) {
    const d1 = Geometry.vectorScale(
      Geometry.vectorNormalize(Geometry.vectorSub(p2, p1)),
      arrow1
    );
    const n1 = Geometry.vectorScale(Geometry.vectorRotate90(d1), 0.25);
    const p1n = Geometry.vectorAdd(p1, d1);
    const p1a1 = Geometry.vectorAdd(p1n, n1);
    const p1a2 = Geometry.vectorSub(p1n, n1);
    const d2 = Geometry.vectorScale(
      Geometry.vectorNormalize(Geometry.vectorSub(p2, p1)),
      arrow2
    );
    const n2 = Geometry.vectorScale(Geometry.vectorRotate90(d2), 0.25);
    const p2n = Geometry.vectorSub(p2, d2);
    const p2a1 = Geometry.vectorAdd(p2n, n2);
    const p2a2 = Geometry.vectorSub(p2n, n2);
    return (
      <g className="dropzone-element-line">
        <line
          x1={toSVGNumber(p1n.x)}
          y1={toSVGNumber(p1n.y)}
          x2={toSVGNumber(p2n.x)}
          y2={toSVGNumber(p2n.y)}
          style={{ strokeLinecap: "butt" }}
        />
        {arrow1 > 0 ? <path d={this.makeClosePath(p1a1, p1a2, p1)} /> : null},
        {arrow2 > 0 ? <path d={this.makeClosePath(p2a1, p2a2, p2)} /> : null}
      </g>
    );
  }

  public makeTextAtCenter(
    p1: Point,
    p2: Point,
    text: string,
    dx: number = 0,
    dy: number = 0
  ) {
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const height = 9;
    let extra = "";
    if (Math.abs(angle) < Math.PI / 2) {
      extra = `translate(0, ${-height / 2}) rotate(180) translate(0, ${
        height / 2
      })`;
    }
    return (
      <g
        transform={`translate(${toSVGNumber(cx)},${toSVGNumber(cy)}) rotate(${
          ((angle + Math.PI) / Math.PI) * 180
        }) translate(${toSVGNumber(dx)},${toSVGNumber(dy)}) ${extra}`}
      >
        <text
          className="dropzone-element-text"
          x={0}
          y={0}
          style={{ textAnchor: "middle" }}
        >
          {text}
        </text>
      </g>
    );
  }

  public renderElement(z: Prototypes.DropZones.Description) {
    switch (z.type) {
      case "line": {
        const zone = z as Prototypes.DropZones.Line;
        let { p1: zp2, p2: zp1 } = zone;
        zp1 = Geometry.applyZoom(this.props.zoom, { x: zp1.x, y: -zp1.y });
        zp2 = Geometry.applyZoom(this.props.zoom, { x: zp2.x, y: -zp2.y });

        const vD = Geometry.vectorNormalize(Geometry.vectorSub(zp2, zp1));
        const vN = Geometry.vectorRotate90(vD);
        const p1 = Geometry.vectorAdd(zp1, Geometry.vectorScale(vN, 5));
        const p2 = Geometry.vectorAdd(zp2, Geometry.vectorScale(vN, 5));
        return (
          <g>
            <path
              className="dropzone-highlighter"
              d={this.makeClosePath(
                // zp1, zp2,
                Geometry.vectorAdd(zp1, Geometry.vectorScale(vN, -10)),
                Geometry.vectorAdd(zp2, Geometry.vectorScale(vN, -10)),
                Geometry.vectorAdd(zp2, Geometry.vectorScale(vN, 25)),
                Geometry.vectorAdd(zp1, Geometry.vectorScale(vN, 25))
              )}
            />
            <path
              className="dropzone-element-solid"
              d={this.makeClosePath(
                zp1,
                zp2,
                Geometry.vectorAdd(zp2, Geometry.vectorScale(vN, 5)),
                Geometry.vectorAdd(zp1, Geometry.vectorScale(vN, 5))
              )}
            />
            {this.makeTextAtCenter(zp1, zp2, zone.title, 0, -6)}
          </g>
        );
      }
      case "arc": {
        const makeArc = (
          x: number,
          y: number,
          radius: number,
          startAngle: number,
          endAngle: number
        ) => {
          const angleOffset = -90;
          const start = [
            x +
              radius *
                Math.cos(Geometry.degreesToRadians(angleOffset + startAngle)),
            y +
              radius *
                Math.sin(Geometry.degreesToRadians(angleOffset + startAngle)),
          ];
          const end = [
            x +
              radius *
                Math.cos(Geometry.degreesToRadians(angleOffset + endAngle)),
            y +
              radius *
                Math.sin(Geometry.degreesToRadians(angleOffset + endAngle)),
          ];
          const largeArcFlag = endAngle - startAngle < 180 ? 0 : 1;
          return [
            "M",
            start[0].toFixed(6),
            start[1].toFixed(6),
            "A",
            radius.toFixed(6),
            radius.toFixed(6),
            0,
            largeArcFlag,
            1,
            end[0].toFixed(6),
            end[1].toFixed(6),
          ].join(" ");
        };
        const zone = z as Prototypes.DropZones.Arc;
        const zcenter = Geometry.applyZoom(this.props.zoom, {
          x: zone.center.x,
          y: -zone.center.y,
        });
        const zradius = zone.radius * this.props.zoom.scale;
        const width = 5;
        const angle1 = zone.angleStart;
        let angle2 = zone.angleEnd;
        const angleCenter = (angle1 + angle2) / 2;
        if ((angle2 - angle1) % 360 == 0) {
          angle2 -= 1e-4;
        }
        const arc = makeArc(
          zcenter.x,
          zcenter.y,
          zradius + width / 2,
          angle1,
          angle2
        );
        const p1 = Geometry.vectorAdd(
          zcenter,
          Geometry.vectorRotate(
            { x: zradius + 5, y: 0 },
            Geometry.degreesToRadians(-angleCenter + 1 + 90)
          )
        );
        const p2 = Geometry.vectorAdd(
          zcenter,
          Geometry.vectorRotate(
            { x: zradius + 5, y: 0 },
            Geometry.degreesToRadians(-angleCenter - 1 + 90)
          )
        );
        return (
          <g>
            <path
              className="dropzone-highlighter-stroke"
              d={arc}
              style={{ strokeWidth: 25 }}
            />
            <path
              className="dropzone-element-arc"
              d={arc}
              style={{ strokeWidth: 5 }}
            />
            {this.makeTextAtCenter(p1, p2, zone.title, 0, 8)}
          </g>
        );
      }
      // case "coordinate": {
      //     let zone = z as Prototypes.DropZones.Coordinate;
      //     let p1 = Geometry.applyZoom(this.props.zoom, { x: zone.p.x, y: zone.p.y });
      //     let p2 = Geometry.applyZoom(this.props.zoom, { x: zone.p.x, y: zone.p.y });
      //     let distance = 20;
      //     let length = 25;
      //     if (zone.mode == "x") {
      //         p1.y -= distance * zone.direction;
      //         p2.y -= distance * zone.direction;
      //         p1.x += length / 2 * zone.direction;
      //         p2.x -= length / 2 * zone.direction;
      //     }
      //     if (zone.mode == "y") {
      //         p1.x -= distance * zone.direction;
      //         p2.x -= distance * zone.direction;
      //         p1.y -= length / 2 * zone.direction;
      //         p2.y += length / 2 * zone.direction;
      //     }
      //     return (
      //         <g>
      //             {zone.mode == "x" ? (
      //                 <rect className="dropzone-highlighter"
      //                     x={Math.min(p1.x, p2.x)}
      //                     width={Math.abs(p2.x - p1.x)}
      //                     y={p1.y - 10}
      //                     height={20}
      //                 />
      //             ) : (
      //                     <rect className="dropzone-highlighter"
      //                         y={Math.min(p1.y, p2.y)}
      //                         height={Math.abs(p2.y - p1.y)}
      //                         x={p1.x - 10}
      //                         width={20}
      //                     />
      //                 )}
      //             {this.makeDashedLine({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, Geometry.applyZoom(this.props.zoom, zone.p))}
      //             {this.makeLine(p1, p2, 10, 10)}
      //             {this.makeTextAtCenter(p1, p2, zone.title, 0, -5)}
      //         </g>
      //     )
      // }
      case "region": {
        const zone = z as Prototypes.DropZones.Region;
        const p1 = Geometry.applyZoom(this.props.zoom, {
          x: zone.p1.x,
          y: -zone.p1.y,
        });
        const p2 = Geometry.applyZoom(this.props.zoom, {
          x: zone.p2.x,
          y: -zone.p2.y,
        });
        return (
          <g>
            <rect
              className="dropzone-highlighter"
              opacity={0.5}
              x={Math.min(p1.x, p2.x)}
              y={Math.min(p1.y, p2.y)}
              width={Math.abs(p2.x - p1.x)}
              height={Math.abs(p2.y - p1.y)}
            />
            <rect
              className="dropzone-element-solid"
              opacity={0.5}
              x={Math.min(p1.x, p2.x)}
              y={Math.min(p1.y, p2.y)}
              width={Math.abs(p2.x - p1.x)}
              height={Math.abs(p2.y - p1.y)}
            />
            {this.makeTextAtCenter(
              { x: p1.x, y: (p1.y + p2.y) / 2 },
              { x: p2.x, y: (p1.y + p2.y) / 2 },
              zone.title,
              0,
              0
            )}
          </g>
        );
      }
      case "rectangle": {
        const zone = z as Prototypes.DropZones.Rectangle;
        const c = Geometry.applyZoom(this.props.zoom, {
          x: zone.cx,
          y: -zone.cy,
        });
        const width = this.props.zoom.scale * zone.width;
        const height = this.props.zoom.scale * zone.height;
        return (
          <g transform={`translate(${c.x},${c.y}) rotate(${-zone.rotation})`}>
            <rect
              className="dropzone-highlighter"
              opacity={0.5}
              x={-width / 2}
              y={-height / 2}
              width={width}
              height={height}
            />
            <rect
              className="dropzone-element-solid"
              opacity={0.5}
              x={-width / 2}
              y={-height / 2}
              width={width}
              height={height}
            />
            {this.makeTextAtCenter(
              { x: -width / 2, y: height / 2 },
              { x: width / 2, y: height / 2 },
              zone.title,
              0,
              0
            )}
          </g>
        );
      }
    }
  }

  public render() {
    const z = this.props.zone;

    return (
      <g
        ref="container"
        className={classNames("dropzone", `dropzone-${z.type}`, [
          "active",
          this.state.active,
        ])}
      >
        {this.renderElement(z)}
      </g>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import { Prototypes, Geometry, ZoomInfo, Graphics, Point } from "../../../core";

import { Actions } from "../../actions";

import { classNames, toSVGZoom, toSVGNumber } from "../../utils";
import { renderGraphicalElementSVG } from "../../renderer";

export interface BoundingBoxViewProps {
  boundingBox: Prototypes.BoundingBox.Description;
  zoom: ZoomInfo;
  active?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  coordinateSystem?: Graphics.CoordinateSystem;
  offset?: Point;
}

export class BoundingBoxView extends React.Component<BoundingBoxViewProps, {}> {
  constructor(props: BoundingBoxViewProps) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  private handleClick() {
    if (this.props.onClick) {
      this.props.onClick();
    }
  }

  private handleMouseEnter() {
    if (this.props.onMouseEnter) {
      this.props.onMouseEnter();
    }
  }

  private handleMouseLeave() {
    if (this.props.onMouseLeave) {
      this.props.onMouseLeave();
    }
  }

  public render() {
    const bbox = this.props.boundingBox;
    const zoom = this.props.zoom;
    const offset = this.props.offset || { x: 0, y: 0 };
    const coordinateSystem =
      this.props.coordinateSystem || new Graphics.CartesianCoordinates();
    const helper = new Graphics.CoordinateSystemHelper(coordinateSystem);
    const mainClassName = classNames(
      "bounding-box",
      ["active", this.props.active],
      ["visible", bbox.visible],
      ["interactable", this.props.onClick != null]
    );
    switch (bbox.type) {
      case "rectangle": {
        const rect = bbox as Prototypes.BoundingBox.Rectangle;
        const cx = rect.cx + offset.x;
        const cy = rect.cy + offset.y;
        const element = helper.rect(
          cx - rect.width / 2,
          cy - rect.height / 2,
          cx + rect.width / 2,
          cy + rect.height / 2
        );
        const p = Geometry.applyZoom(zoom, { x: cx, y: -cy });
        return (
          <g
            className={mainClassName}
            onClick={this.handleClick}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            transform={`${toSVGZoom(zoom)} translate(${toSVGNumber(
              coordinateSystem.getBaseTransform().x
            )},${toSVGNumber(-coordinateSystem.getBaseTransform().y)})`}
          >
            {renderGraphicalElementSVG(element, {
              className: "element-shape ghost",
              noStyle: true,
            })}
            {renderGraphicalElementSVG(element, {
              className: "element-shape indicator",
              noStyle: true,
            })}
          </g>
        );
      }
      case "anchored-rectangle": {
        const rect = bbox as Prototypes.BoundingBox.AnchoredRectangle;
        const cx = rect.anchorX + offset.x;
        const cy = rect.anchorY + offset.y;
        const trCenter = {
          x: rect.cx,
          y: rect.cy,
          angle: rect.rotation,
        };
        const tr = Graphics.concatTransform(
          Graphics.concatTransform(
            coordinateSystem.getBaseTransform(),
            coordinateSystem.getLocalTransform(cx, cy)
          ),
          trCenter
        );
        const p = Geometry.applyZoom(zoom, { x: tr.x, y: -tr.y });
        const margin = 0;
        return (
          <g
            className={mainClassName}
            transform={`translate(${toSVGNumber(p.x)},${toSVGNumber(
              p.y
            )})rotate(${-tr.angle})`}
            onClick={this.handleClick}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
          >
            <rect
              className="element-shape ghost"
              x={toSVGNumber((-rect.width / 2) * zoom.scale - margin)}
              y={toSVGNumber((-rect.height / 2) * zoom.scale - margin)}
              width={toSVGNumber(rect.width * zoom.scale + margin * 2)}
              height={toSVGNumber(rect.height * zoom.scale + margin * 2)}
            />
            <rect
              className="element-shape indicator"
              x={toSVGNumber((-rect.width / 2) * zoom.scale)}
              y={toSVGNumber((-rect.height / 2) * zoom.scale)}
              width={toSVGNumber(rect.width * zoom.scale)}
              height={toSVGNumber(rect.height * zoom.scale)}
            />
          </g>
        );
      }
      case "circle": {
        const circle = bbox as Prototypes.BoundingBox.Circle;
        const cx = circle.cx + offset.x;
        const cy = circle.cy + offset.y;
        const center = coordinateSystem.transformPointWithBase(cx, cy);
        const margin = 2;
        const p = Geometry.applyZoom(zoom, { x: center.x, y: -center.y });
        const radius = circle.radius * zoom.scale;
        return (
          <g
            className={mainClassName}
            onClick={this.handleClick}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
          >
            <circle
              className="element-shape ghost"
              cx={toSVGNumber(p.x)}
              cy={toSVGNumber(p.y)}
              r={toSVGNumber(radius + margin)}
            />
            <circle
              className="element-shape indicator"
              cx={toSVGNumber(p.x)}
              cy={toSVGNumber(p.y)}
              r={toSVGNumber(radius)}
            />
          </g>
        );
      }
      case "line": {
        const line = bbox as Prototypes.BoundingBox.Line;
        if (line.morphing) {
          const element = helper.line(
            line.x1 + offset.x,
            line.y1 + offset.y,
            line.x2 + offset.x,
            line.y2 + offset.y
          );
          return (
            <g
              className={mainClassName}
              onClick={this.handleClick}
              onMouseEnter={this.handleMouseEnter}
              onMouseLeave={this.handleMouseLeave}
              transform={`${toSVGZoom(zoom)} translate(${toSVGNumber(
                coordinateSystem.getBaseTransform().x
              )},${toSVGNumber(-coordinateSystem.getBaseTransform().y)})`}
            >
              {renderGraphicalElementSVG(element, {
                className: "element-line ghost",
                noStyle: true,
              })}
              {renderGraphicalElementSVG(element, {
                className: "element-line indicator",
                noStyle: true,
              })}
            </g>
          );
        } else {
          let p1 = coordinateSystem.transformPointWithBase(
            line.x1 + offset.x,
            line.y1 + offset.y
          );
          let p2 = coordinateSystem.transformPointWithBase(
            line.x2 + offset.x,
            line.y2 + offset.y
          );
          p1 = Geometry.applyZoom(zoom, { x: p1.x, y: -p1.y });
          p2 = Geometry.applyZoom(zoom, { x: p2.x, y: -p2.y });
          return (
            <g
              className={mainClassName}
              onClick={this.handleClick}
              onMouseEnter={this.handleMouseEnter}
              onMouseLeave={this.handleMouseLeave}
            >
              <line
                className="element-line ghost"
                x1={toSVGNumber(p1.x)}
                y1={toSVGNumber(p1.y)}
                x2={toSVGNumber(p2.x)}
                y2={toSVGNumber(p2.y)}
              />
              <line
                className="element-line indicator"
                x1={toSVGNumber(p1.x)}
                y1={toSVGNumber(p1.y)}
                x2={toSVGNumber(p2.x)}
                y2={toSVGNumber(p2.y)}
              />
            </g>
          );
        }
      }
    }
  }
}

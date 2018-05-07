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
        let bbox = this.props.boundingBox;
        let zoom = this.props.zoom;
        let offset = this.props.offset || { x: 0, y: 0 };
        let coordinateSystem = this.props.coordinateSystem || new Graphics.CartesianCoordinates();
        let helper = new Graphics.CoordinateSystemHelper(coordinateSystem);
        let mainClassName = classNames("bounding-box",
            ["active", this.props.active],
            ["visible", bbox.visible],
            ["interactable", this.props.onClick != null]
        );
        switch (bbox.type) {
            case "rectangle": {
                let rect = bbox as Prototypes.BoundingBox.Rectangle;
                let cx = rect.cx + offset.x;
                let cy = rect.cy + offset.y;
                let element = helper.rect(cx - rect.width / 2, cy - rect.height / 2, cx + rect.width / 2, cy + rect.height / 2);
                let p = Geometry.applyZoom(zoom, { x: cx, y: -cy });
                return (
                    <g
                        className={mainClassName}
                        onClick={this.handleClick}
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                        transform={`${toSVGZoom(zoom)} translate(${toSVGNumber(coordinateSystem.getBaseTransform().x)},${toSVGNumber(-coordinateSystem.getBaseTransform().y)})`}
                    >
                        {renderGraphicalElementSVG(element, { className: "element-shape ghost", noStyle: true })}
                        {renderGraphicalElementSVG(element, { className: "element-shape indicator", noStyle: true })}
                    </g>
                );
            }
            case "anchored-rectangle": {
                let rect = bbox as Prototypes.BoundingBox.AnchoredRectangle;
                let cx = rect.anchorX + offset.x;
                let cy = rect.anchorY + offset.y;
                let trCenter = {
                    x: rect.cx,
                    y: rect.cy,
                    angle: rect.rotation
                };
                let tr = Graphics.concatTransform(Graphics.concatTransform(coordinateSystem.getBaseTransform(), coordinateSystem.getLocalTransform(cx, cy)), trCenter);
                let p = Geometry.applyZoom(zoom, { x: tr.x, y: -tr.y });
                let margin = 0;
                return (
                    <g
                        className={mainClassName}
                        transform={`translate(${toSVGNumber(p.x)},${toSVGNumber(p.y)})rotate(${-tr.angle})`}
                        onClick={this.handleClick}
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                    >
                        <rect className="element-shape ghost"
                            x={-rect.width / 2 * zoom.scale - margin}
                            y={-rect.height / 2 * zoom.scale - margin}
                            width={rect.width * zoom.scale + margin * 2}
                            height={rect.height * zoom.scale + margin * 2}
                        />
                        <rect className="element-shape indicator"
                            x={-rect.width / 2 * zoom.scale}
                            y={-rect.height / 2 * zoom.scale}
                            width={rect.width * zoom.scale}
                            height={rect.height * zoom.scale}
                        />
                    </g>
                );
            }
            case "circle": {
                let circle = bbox as Prototypes.BoundingBox.Circle;
                let cx = circle.cx + offset.x;
                let cy = circle.cy + offset.y;
                let center = coordinateSystem.transformPointWithBase(cx, cy);
                let margin = 2;
                let p = Geometry.applyZoom(zoom, { x: center.x, y: -center.y });
                let radius = circle.radius * zoom.scale;
                return (
                    <g
                        className={mainClassName}
                        onClick={this.handleClick}
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                    >
                        <circle className="element-shape ghost"
                            cx={p.x}
                            cy={p.y}
                            r={radius + margin}
                        />
                        <circle className="element-shape indicator"
                            cx={p.x}
                            cy={p.y}
                            r={radius}
                        />
                    </g>
                );
            }
            case "line": {
                let line = bbox as Prototypes.BoundingBox.Line;
                if (line.morphing) {
                    let element = helper.line(line.x1 + offset.x, line.y1 + offset.y, line.x2 + offset.x, line.y2 + offset.y);
                    return (
                        <g
                            className={mainClassName}
                            onClick={this.handleClick}
                            onMouseEnter={this.handleMouseEnter}
                            onMouseLeave={this.handleMouseLeave}
                            transform={`${toSVGZoom(zoom)} translate(${toSVGNumber(coordinateSystem.getBaseTransform().x)},${toSVGNumber(-coordinateSystem.getBaseTransform().y)})`}
                        >
                            {renderGraphicalElementSVG(element, { className: "element-line ghost", noStyle: true })}
                            {renderGraphicalElementSVG(element, { className: "element-line indicator", noStyle: true })}
                        </g>
                    );
                } else {
                    let p1 = coordinateSystem.transformPointWithBase(line.x1 + offset.x, line.y1 + offset.y);
                    let p2 = coordinateSystem.transformPointWithBase(line.x2 + offset.x, line.y2 + offset.y);
                    p1 = Geometry.applyZoom(zoom, { x: p1.x, y: -p1.y });
                    p2 = Geometry.applyZoom(zoom, { x: p2.x, y: -p2.y });
                    return (
                        <g
                            className={mainClassName}
                            onClick={this.handleClick}
                            onMouseEnter={this.handleMouseEnter}
                            onMouseLeave={this.handleMouseLeave}
                        >
                            <line className="element-line ghost"
                                x1={p1.x} y1={p1.y}
                                x2={p2.x} y2={p2.y}
                            />
                            <line className="element-line indicator"
                                x1={p1.x} y1={p1.y}
                                x2={p2.x} y2={p2.y}
                            />
                        </g>
                    );
                }
            }
        }
    }
}
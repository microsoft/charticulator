import * as React from "react";
import * as Hammer from "hammerjs";

import { Point, ZoomInfo, Geometry, Specification, Prototypes } from "../../../core";
import { SnappableGuide } from "./snapping";
import { Actions } from "../../actions";

export interface CreatingComponentProps {
    width: number;
    height: number;
    zoom: ZoomInfo;

    guides: SnappableGuide<any>[];

    mode: string;

    onCreate: (...args: [number, Specification.Mapping][]) => void;
    onCancel: () => void;
}

export interface CreatingComponentState {
    points?: Point[];
    draggingPoint?: Point;
    activeGuides: SnappableGuide<any>[];
    hoverCandidateX: [number, Specification.Mapping];
    hoverCandidateY: [number, Specification.Mapping];
}

export interface SnappingElementMapping extends Specification.Mapping {
    type: "_element";
    element: string;
    attribute: string;
}

export class PointSnapping {
    threshold: number;
    guides: SnappableGuide<any>[];
    snappedGuides: Set<SnappableGuide<any>>;

    constructor(guides: SnappableGuide<any>[], threshold: number = 10) {
        this.guides = guides;
        this.snappedGuides = new Set<SnappableGuide<any>>();
        this.threshold = threshold;
    }

    public beginSnapping() {
        this.snappedGuides = new Set<SnappableGuide<any>>();
    }

    public snapXValue(x: number): [number, Specification.Mapping] {
        let candidate: Specification.Mapping = null;
        let candidateGuide: SnappableGuide<any> = null;
        let candidateDistance = 1e10;
        let candidateValue = 0;
        for (let guide of this.guides) {
            switch (guide.guide.type) {
                case "x": {
                    let axis = guide.guide as Prototypes.SnappingGuides.Axis;
                    let d = Math.abs(axis.value - x);
                    if (d < this.threshold && (candidate == null || d < candidateDistance)) {
                        candidateDistance = d;
                        if (guide.element == null) {
                            candidate = { type: "parent", parentAttribute: axis.attribute } as Specification.ParentMapping;
                        } else {
                            candidate = { type: "_element", element: guide.element._id, attribute: axis.attribute } as SnappingElementMapping;
                        }
                        candidateValue = axis.value;
                        candidateGuide = guide;
                    }
                } break;
            }
        }
        if (candidate) {
            this.snappedGuides.add(candidateGuide);
            return [candidateValue, candidate];
        } else {
            return [x, null];
        }
    }

    public snapYValue(y: number): [number, Specification.Mapping] {
        let candidate: Specification.Mapping = null;
        let candidateGuide: SnappableGuide<any> = null;
        let candidateDistance = 1e10;
        let candidateValue = 0;
        for (let guide of this.guides) {
            switch (guide.guide.type) {
                case "y": {
                    let axis = guide.guide as Prototypes.SnappingGuides.Axis;
                    let d = Math.abs(axis.value - y);
                    if (d < this.threshold && (candidate == null || d < candidateDistance)) {
                        candidateDistance = d;
                        if (guide.element == null) {
                            candidate = { type: "parent", parentAttribute: axis.attribute } as Specification.ParentMapping;
                        } else {
                            candidate = { type: "_element", element: guide.element._id, attribute: axis.attribute } as SnappingElementMapping;
                        }
                        candidateValue = axis.value;
                        candidateGuide = guide;
                    }
                } break;
            }
        }
        if (candidate) {
            this.snappedGuides.add(candidateGuide);
            return [candidateValue, candidate];
        } else {
            return [y, null];
        }
    }

    public endSnapping() {
        return this.snappedGuides;
    }
}

export class CreatingComponent extends React.Component<CreatingComponentProps, CreatingComponentState> {
    refs: {
        handler: SVGRectElement;
    }

    hammer: HammerManager;

    constructor(props: CreatingComponentProps) {
        super(props);
        this.state = {
            points: null,
            draggingPoint: null,
            activeGuides: [],
            hoverCandidateX: null,
            hoverCandidateY: null
        }
    }

    public getPointFromEvent(point: Point): Point {
        let r = this.refs.handler.getBoundingClientRect();
        let p = Geometry.unapplyZoom(this.props.zoom, {
            x: point.x - r.left,
            y: point.y - r.top
        });
        return { x: p.x, y: -p.y };
    }

    private isHammering = false;

    public componentDidMount() {
        this.hammer = new Hammer(this.refs.handler);
        switch (this.props.mode) {
            case "point":
            case "hline":
            case "vline": {
                this.hammer.add(new Hammer.Tap());
                this.hammer.on("tap", (e) => {
                    let p = this.getPointFromEvent(e.center);
                    let p0X = this.state.hoverCandidateX;
                    let p0Y = this.state.hoverCandidateY;
                    if (p0X == null) {
                        p0X = [p.x, null];
                    }
                    if (p0Y == null) {
                        p0Y = [p.y, null];
                    }
                    if (this.props.mode == "point") {
                        this.props.onCreate(p0X, p0Y);
                    }
                    if (this.props.mode == "hline") {
                        this.props.onCreate(p0Y);
                    }
                    if (this.props.mode == "vline") {
                        this.props.onCreate(p0X);
                    }
                })
            } break;
            case "line":
            case "rectangle": {
                this.hammer.add(new Hammer.Pan());
                this.hammer.add(new Hammer.Tap());
                this.hammer.on("tap", (e) => {
                    this.props.onCancel();
                });
                let p0X: [number, Specification.Mapping] = null;
                let p0Y: [number, Specification.Mapping] = null;
                let p1X: [number, Specification.Mapping] = null;
                let p1Y: [number, Specification.Mapping] = null;

                this.hammer.on("panstart", (e) => {
                    this.isHammering = true;
                    let p0 = this.getPointFromEvent(Geometry.vectorSub(e.center, { x: e.deltaX, y: e.deltaY }));
                    let mgr = new PointSnapping(this.props.guides, 10 / this.props.zoom.scale);
                    mgr.beginSnapping();
                    p0X = mgr.snapXValue(p0.x);
                    p0Y = mgr.snapYValue(p0.y);
                    mgr.endSnapping();
                    this.setState({
                        points: [{ x: p0X[0], y: p0Y[0] }],
                        draggingPoint: { x: p0X[0], y: p0Y[0] }
                    });
                });
                this.hammer.on("pan", (e) => {
                    let p1 = this.getPointFromEvent(e.center);
                    let mgr = new PointSnapping(this.props.guides, 10 / this.props.zoom.scale);
                    mgr.beginSnapping();
                    p1X = mgr.snapXValue(p1.x);
                    p1Y = mgr.snapYValue(p1.y);
                    let guides = mgr.endSnapping();

                    this.setState({
                        points: [{ x: p0X[0], y: p0Y[0] }],
                        draggingPoint: { x: p1X[0], y: p1Y[0] },
                        activeGuides: Array.from(guides)
                    });
                });
                this.hammer.on("panend", (e) => {
                    this.isHammering = false;
                    this.setState({
                        points: null,
                        draggingPoint: null,
                        activeGuides: []
                    });
                    this.props.onCreate(p0X, p0Y, p1X, p1Y);
                });
            }
        }
    }

    public componentWillUnmount() {
        this.hammer.destroy();
    }

    public getPixelPoint(p: Point) {
        return Geometry.applyZoom(this.props.zoom, { x: p.x, y: -p.y });
    }

    public renderHint(): JSX.Element {
        switch (this.props.mode) {
            case "point": {
                if (this.state.hoverCandidateX == null || this.state.hoverCandidateY == null) return null;
                let pp = this.getPixelPoint({ x: this.state.hoverCandidateX[0], y: this.state.hoverCandidateY[0] });
                return <circle
                    cx={pp.x}
                    cy={pp.y}
                    r={3}
                />;
            }
            case "hline": {
                if (this.state.hoverCandidateX == null || this.state.hoverCandidateY == null) return null;
                let pp = this.getPixelPoint({ x: this.state.hoverCandidateX[0], y: this.state.hoverCandidateY[0] });
                return <line
                    x1={0} x2={this.props.width}
                    y1={pp.y} y2={pp.y}
                />;
            }
            case "vline": {
                if (this.state.hoverCandidateX == null || this.state.hoverCandidateY == null) return null;
                let pp = this.getPixelPoint({ x: this.state.hoverCandidateX[0], y: this.state.hoverCandidateY[0] });
                return <line
                    y1={0} y2={this.props.height}
                    x1={pp.x} x2={pp.x}
                />;
            }
            case "line": {
                let { points, draggingPoint } = this.state;
                if (points == null || points.length != 1 || draggingPoint == null) return null;
                let p1 = this.getPixelPoint(points[0]);
                let p2 = this.getPixelPoint(draggingPoint);
                return (
                    <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                    />
                );
            }
            case "rectangle": {
                let { points, draggingPoint } = this.state;
                if (points == null || points.length != 1 || draggingPoint == null) return null;
                let p1 = this.getPixelPoint(points[0]);
                let p2 = this.getPixelPoint(draggingPoint);
                return (
                    <rect
                        x={Math.min(p1.x, p2.x)}
                        y={Math.min(p1.y, p2.y)}
                        width={Math.abs(p1.x - p2.x)}
                        height={Math.abs(p1.y - p2.y)}
                    />
                );
            }
        }
    }

    public renderSnappingGuides() {
        let guides = this.state.activeGuides;
        if (!guides || guides.length == 0) return null;
        return guides.map((guide, idx) => {
            let key = `m${idx}`;
            switch (guide.guide.type) {
                case "x": {
                    let axisGuide = guide.guide as Prototypes.SnappingGuides.Axis;
                    return <line key={key} className="snapping-guide"
                        x1={axisGuide.value * this.props.zoom.scale + this.props.zoom.centerX}
                        x2={axisGuide.value * this.props.zoom.scale + this.props.zoom.centerX}
                        y1={0}
                        y2={this.props.height}
                    />
                }
                case "y": {
                    let axisGuide = guide.guide as Prototypes.SnappingGuides.Axis;
                    return <line key={key} className="snapping-guide"
                        y1={-axisGuide.value * this.props.zoom.scale + this.props.zoom.centerY}
                        y2={-axisGuide.value * this.props.zoom.scale + this.props.zoom.centerY}
                        x1={0}
                        x2={this.props.width}
                    />
                }
            }
        });
    }

    public render() {
        return (
            <g className="creating-component">
                {this.renderSnappingGuides()}
                {this.renderHint()}
                <rect className="interaction-handler"
                    style={{ cursor: "crosshair" }}
                    ref="handler"
                    x={0} y={0}
                    width={this.props.width} height={this.props.height}
                    onMouseEnter={(e) => {
                        let move = (e: MouseEvent) => {
                            let mgr = new PointSnapping(this.props.guides, 10 / this.props.zoom.scale);
                            if (this.isHammering) return;

                            let p = this.getPointFromEvent({ x: e.pageX, y: e.pageY });
                            mgr.beginSnapping();
                            let hx = mgr.snapXValue(p.x);
                            let hy = mgr.snapYValue(p.y);
                            this.setState({
                                activeGuides: Array.from(mgr.endSnapping()),
                                hoverCandidateX: hx,
                                hoverCandidateY: hy
                            });
                        };
                        let leave = () => {
                            this.refs.handler.removeEventListener("mousemove", move);
                            this.refs.handler.removeEventListener("mouseleave", leave);
                        };
                        this.refs.handler.addEventListener("mousemove", move);
                        this.refs.handler.addEventListener("mouseleave", leave);
                    }}
                />
            </g>
        )
    }
}

export interface CreatingComponentFromCreatingInteractionProps {
    width: number;
    height: number;
    zoom: ZoomInfo;

    guides: SnappableGuide<any>[];

    description: Prototypes.CreatingInteraction.Description;
    onCreate: (mappings: { [name: string]: [number, Specification.Mapping] }, attributes: { [name: string]: Specification.AttributeValue }) => void;
    onCancel: () => void;
}

export class CreatingComponentFromCreatingInteraction extends React.Component<CreatingComponentFromCreatingInteractionProps, {}> {
    public doCreate(inMappings: { [name: string]: [number, Specification.Mapping] }) {
        let desc = this.props.description;
        let mappings: { [name: string]: [number, Specification.Mapping] } = {};
        let attributes: { [name: string]: Specification.AttributeValue } = {};
        for (let attr in desc.mapping) {
            if (inMappings.hasOwnProperty(attr)) {
                let name = desc.mapping[attr];
                mappings[name] = inMappings[attr];
            }
        }
        for (let attr in desc.valueMappings) {
            mappings[attr] = [null, { type: "value", value: desc.valueMappings[attr] } as Specification.ValueMapping];
        }
        for (let attr in desc.attributes) {
            attributes[attr] = desc.attributes[attr];
        }
        this.props.onCreate(mappings, attributes);
    }

    public render() {
        let desc = this.props.description;
        let mode = "point";
        let onCreate: (...args: [number, Specification.Mapping][]) => void = this.props.onCancel;

        function autoSwap(a: [number, Specification.Mapping], b: [number, Specification.Mapping]) {
            if (a[0] < b[0]) {
                return [a, b];
            } else {
                return [b, a];
            }
        }

        switch (desc.type) {
            case "point": {
                mode = "point";
                onCreate = (x, y) => {
                    this.doCreate({ x: x, y: y });
                };
            } break;
            case "line-segment": {
                mode = "line";
                onCreate = (x1, y1, x2, y2) => {
                    this.doCreate({ x1: x1, y1: y1, x2: x2, y2: y2 });
                };
            } break;
            case "rectangle": {
                mode = "rectangle";
                onCreate = (x1, y1, x2, y2) => {
                    [x1, x2] = autoSwap(x1, x2);
                    [y1, y2] = autoSwap(y1, y2);
                    this.doCreate({ xMin: x1, yMin: y1, xMax: x2, yMax: y2 });
                };
            } break;
        }
        return (
            <CreatingComponent
                width={this.props.width} height={this.props.height} zoom={this.props.zoom}
                guides={this.props.guides}
                mode={mode}
                onCancel={this.props.onCancel}
                onCreate={onCreate}
            />
        );
    }
}
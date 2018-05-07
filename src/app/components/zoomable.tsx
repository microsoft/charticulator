import * as React from "react";
import * as Hammer from "hammerjs";

import { Point, ZoomInfo, Geometry } from "../../core";

export interface ZoomableCanvasProps {
    width: number;
    height: number;
    onZooming?: (zoom: ZoomInfo) => void;
}

export interface ZoomableCanvasState {
    zoom: ZoomInfo;
}

export class ZoomableCanvas extends React.Component<ZoomableCanvasProps, ZoomableCanvasState> {
    refs: {
        container: SVGGElement;
        handler: SVGRectElement;
    }

    hammer: HammerManager;

    constructor(props: ZoomableCanvasProps) {
        super(props);
        this.state = {
            zoom: {
                centerX: props.width / 2,
                centerY: props.height / 2,
                scale: 1
            }
        };
    }

    public setZooming(zoom: ZoomInfo) {
        this.setState({
            zoom: zoom
        });
    }

    public canvasToPixel(pt: Point): Point {
        return Geometry.applyZoom(this.state.zoom, pt);
    }

    public pixelToCanvas(pt: Point): Point {
        return Geometry.unapplyZoom(this.state.zoom, pt);
    }

    public getRelativePoint(point: Point): Point {
        let r = this.refs.container.getBoundingClientRect();
        return {
            x: point.x - r.left,
            y: point.y - r.top
        };
    }

    public componentDidMount() {
        this.hammer = new Hammer(this.refs.handler);
        // this.hammer.add(new Hammer.Pan());
        // this.hammer.add(new Hammer.Pinch());
        // let centerX: number = null;
        // let centerY: number = null;
        // this.hammer.on("panstart", (e) => {
        //     centerX = this.state.centerX;
        //     centerY = this.state.centerY;
        // });
        // this.hammer.on("pan", (e) => {
        //     this.setState({
        //         centerX: centerX + e.deltaX,
        //         centerY: centerY + e.deltaY,
        //     });
        // });

        // this.hammer.on("pinch", (e) => {
        //     console.log("Pinch", e);
        // });
    }

    public componentWillUnmount() {
        this.hammer.destroy();
    }

    public render() {
        let transform = `translate(${this.state.zoom.centerX},${this.state.zoom.centerY}) scale(${this.state.zoom.scale})`;
        return (
            <g ref="container">
                <rect ref="handler" x={0} y={0} width={this.props.width} height={this.props.height} style={{
                    fill: "transparent",
                    stroke: "none",
                    pointerEvents: "fill"
                }} />
                <g transform={transform}>{this.props.children}</g>
            </g>
        );
    }
}
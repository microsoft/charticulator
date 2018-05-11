import * as Graphics from "../../../graphics";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../../solver";
import * as Specification from "../../../specification";

import { getById, max, Point, uniqueID, zipArray } from "../../../common";
import { AttributeDescription, BoundingBox, Controls, DropZones, Handles, ObjectClasses, ObjectClassMetadata, SnappingGuides } from "../../common";

import { PlotSegmentClass } from "../index";

import { buildAxisWidgets } from "../axis";
import { StaticMapService } from "./map_service";

export type CartesianAxisMode = "null" | "default" | "numerical" | "categorical";

export interface MapAttributes extends Specification.AttributeMap {
    x1: number; y1: number;
    x2: number; y2: number;
}

export interface MapState extends Specification.PlotSegmentState {
    attributes: MapAttributes;
}

export interface MapProperties extends Specification.AttributeMap {
    longitudeData: Specification.Types.AxisDataBinding;
    latitudeData: Specification.Types.AxisDataBinding;
    mapType: "roadmap" | "satellite" | "hybrid" | "terrain";
}

export interface MapObject extends Specification.PlotSegment {
    properties: MapProperties;
}


export class MapPlotSegment extends PlotSegmentClass {
    public static classID: string = "plot-segment.map";
    public static type: string = "plot-segment";

    public static metadata: ObjectClassMetadata = {
        iconPath: "plot-segment/map"
    };

    public static defaultMappingValues: Specification.AttributeMap = {
    };

    public static defaultProperties: Specification.AttributeMap = {
        mapType: "roadmap"
    };

    public readonly state: MapState;
    public readonly object: MapObject;

    public attributeNames: string[] = ["x1", "x2", "y1", "y2"];
    public attributes: { [name: string]: AttributeDescription } = {
        x1: { name: "x1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        x2: { name: "x2", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y1: { name: "y1", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y2: { name: "y2", type: "number", mode: "positional", strength: VariableStrength.NONE }
    };

    // The map service for this map
    public mapService: StaticMapService = StaticMapService.GetService();

    public initializeState(): void {
        const attrs = this.state.attributes;
        attrs.x1 = -100;
        attrs.x2 = 100;
        attrs.y1 = -100;
        attrs.y2 = 100;
    }

    public buildConstraints(solver: ConstraintSolver): void {
        const [latitude, longitude, zoom] = this.getCenterZoom();
        const longitudeData = this.object.properties.longitudeData;
        const latitudeData = this.object.properties.latitudeData;
        if (latitudeData && longitudeData) {
            const latExpr = this.parent.dataflow.cache.parse(latitudeData.expression);
            const lngExpr = this.parent.dataflow.cache.parse(longitudeData.expression);
            const table = this.parent.dataflow.getTable(this.object.table);
            const [cx, cy] = this.mercatorProjection(latitude, longitude);

            for (const [glyphState, index] of zipArray(this.state.glyphs, this.state.dataRowIndices)) {
                const row = table.getRowContext(index);
                const lat = latExpr.getNumberValue(row);
                const lng = lngExpr.getNumberValue(row);
                const p = this.getProjectedPoints([[lat, lng]])[0];
                solver.addLinear(ConstraintStrength.HARD, p[0], [], [[1, solver.attr(glyphState.attributes, "x")]]);
                solver.addLinear(ConstraintStrength.HARD, p[1], [], [[1, solver.attr(glyphState.attributes, "y")]]);
            }
        }
    }

    public getBoundingBox(): BoundingBox.Description {
        const attrs = this.state.attributes;
        const { x1, x2, y1, y2 } = attrs;
        return {
            type: "rectangle",
            cx: (x1 + x2) / 2,
            cy: (y1 + y2) / 2,
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
            rotation: 0
        } as BoundingBox.Rectangle;
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        const attrs = this.state.attributes;
        const { x1, y1, x2, y2 } = attrs;
        return [
            { type: "x", value: x1, attribute: "x1" } as SnappingGuides.Axis,
            { type: "x", value: x2, attribute: "x2" } as SnappingGuides.Axis,
            { type: "y", value: y1, attribute: "y1" } as SnappingGuides.Axis,
            { type: "y", value: y2, attribute: "y2" } as SnappingGuides.Axis
        ];
    }

    public mercatorProjection(lat: number, lng: number): [number, number] {
        // WebMercator Projection:
        // x, y range: [0, 256]
        const x = 128 / 180 * (180 + lng)
        const y = 128 / 180 * (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat / 180 * Math.PI / 2)));

        return [x, y];

        // // Bing's version as of here: https://msdn.microsoft.com/en-us/library/bb259689.aspx
        // // Same as Google's Version
        // let sin = Math.sin(lat / 180 * Math.PI);
        // let x1 = (lng + 180) / 360 * 256;
        // let y1 = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256;

        // console.log((x - x1).toFixed(8), (y - y1).toFixed(8));
    }

    // Get (x, y) coordinates based on longitude and latitude
    public getProjectedPoints(points: Array<[number, number]>): Array<[number, number]> {
        const attrs = this.state.attributes;
        const [cLatitude, cLongitude, zoom] = this.getCenterZoom();
        const [cX, cY] = this.mercatorProjection(cLatitude, cLongitude);
        const scale = Math.pow(2, zoom);
        const { x1, y1, x2, y2 } = attrs;
        return points.map((p) => {
            const [x, y] = this.mercatorProjection(p[0], p[1]);
            return [
                (x - cX) * scale + (x1 + x2) / 2,
                -(y - cY) * scale + (y1 + y2) / 2
            ] as [number, number];
        });
    }

    public getCenterZoom(): [number, number, number] {
        const attrs = this.state.attributes;
        const props = this.object.properties;

        let minLongitude = -180;
        let maxLongitude = 180;
        let minLatitude = -50;
        let maxLatitude = 50;

        if (props.latitudeData != null) {
            minLatitude = props.latitudeData.domainMin;
            maxLatitude = props.latitudeData.domainMax;
        }
        if (props.longitudeData != null) {
            minLongitude = props.longitudeData.domainMin;
            maxLongitude = props.longitudeData.domainMax;
        }

        const [xMin, yMin] = this.mercatorProjection(minLatitude, minLongitude);
        const [xMax, yMax] = this.mercatorProjection(maxLatitude, maxLongitude);
        // Find the appropriate zoom level for the given box.
        const scaleX = Math.abs(Math.abs(attrs.x2 - attrs.x1) / Math.abs(xMax - xMin));
        const scaleY = Math.abs(Math.abs(attrs.y2 - attrs.y1) / Math.abs(yMax - yMin));
        const scale = Math.min(scaleX, scaleY);
        const zoom = Math.floor(Math.log2(scale));
        const latitude = (minLatitude + maxLatitude) / 2;
        const longitude = (minLongitude + maxLongitude) / 2;
        return [latitude, longitude, zoom];
    }

    public getPlotSegmentGraphics(glyphGraphics: Graphics.Element): Graphics.Group {
        const attrs = this.state.attributes;
        const { x1, y1, x2, y2 } = attrs;
        const [latitude, longitude, zoom] = this.getCenterZoom();
        const width = x2 - x1;
        const height = y2 - y1;
        const img = {
            type: "image",
            src: this.mapService.getImageryURLAtPoint({
                center: {
                    latitude,
                    longitude
                },
                type: this.object.properties.mapType,
                zoom,
                width,
                height,
                resolution: "high"
            }),
            x: x1,
            y: y1,
            width,
            height
        } as Graphics.Image;
        return Graphics.makeGroup([img, glyphGraphics]);
    }

    public getDropZones(): DropZones.Description[] {
        const attrs = this.state.attributes;
        const { x1, y1, x2, y2, x, y } = attrs;
        const zones: DropZones.Description[] = [];
        zones.push(
            {
                type: "line",
                p1: { x: x2, y: y1 }, p2: { x: x1, y: y1 },
                title: "Longitude",
                dropAction: {
                    axisInference: { property: "longitudeData" }
                }
            } as DropZones.Line
        );
        zones.push(
            {
                type: "line",
                p1: { x: x1, y: y1 }, p2: { x: x1, y: y2 },
                title: "Latitude",
                dropAction: {
                    axisInference: { property: "latitudeData" }
                }
            } as DropZones.Line
        );
        return zones;
    }

    public getHandles(): Handles.Description[] {
        const attrs = this.state.attributes;
        const rows = this.parent.dataflow.getTable(this.object.table).rows;
        const { x1, x2, y1, y2 } = attrs;
        const h: Handles.Description[] = [
            { type: "line", axis: "y", value: y1, span: [x1, x2], actions: [{ type: "attribute", attribute: "y1" }] } as Handles.Line,
            { type: "line", axis: "y", value: y2, span: [x1, x2], actions: [{ type: "attribute", attribute: "y2" }] } as Handles.Line,
            { type: "line", axis: "x", value: x1, span: [y1, y2], actions: [{ type: "attribute", attribute: "x1" }] } as Handles.Line,
            { type: "line", axis: "x", value: x2, span: [y1, y2], actions: [{ type: "attribute", attribute: "x2" }] } as Handles.Line,
            { type: "point", x: x1, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y1" }] } as Handles.Point,
            { type: "point", x: x2, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y1" }] } as Handles.Point,
            { type: "point", x: x1, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y2" }] } as Handles.Point,
            { type: "point", x: x2, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y2" }] } as Handles.Point
        ];
        return h;
    }

    public getAttributePanelWidgets(m: Controls.WidgetManager): Controls.Widget[] {
        const props = this.object.properties;
        const widgets: Controls.Widget[] = [
            ...buildAxisWidgets(props.latitudeData, "latitudeData", m, "Latitude"),
            ...buildAxisWidgets(props.longitudeData, "longitudeData", m, "Longitude"),
            m.sectionHeader("Map Style"),
            m.inputSelect({ property: "mapType" }, {
                type: "dropdown",
                showLabel: true,
                labels: ["Roadmap", "Satellite", "Hybrid", "Terrain"],
                options: ["roadmap", "satellite", "hybrid", "terrain"]
            })
        ];
        return widgets
    }
}

ObjectClasses.Register(MapPlotSegment);
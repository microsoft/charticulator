import * as Specification from "../../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../../solver";
import * as Graphics from "../../../graphics";

import { SnappingGuides, AttributeDescription, DropZones, Handles, Controls, ObjectClasses, ObjectClassMetadata, BoundingBox } from "../../common";
import { Point, uniqueID, getById, max, zipArray } from "../../../common";

import { PlotSegmentClass } from "../index";

import { StaticMapService } from "./map_service";
import { buildAxisWidgets } from "../axis";

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
        let attrs = this.state.attributes;
        attrs.x1 = -100;
        attrs.x2 = 100;
        attrs.y1 = -100;
        attrs.y2 = 100;
    }

    public buildConstraints(solver: ConstraintSolver): void {
        let [latitude, longitude, zoom] = this.getCenterZoom();
        let longitudeData = this.object.properties.longitudeData;
        let latitudeData = this.object.properties.latitudeData;
        if (latitudeData && longitudeData) {
            let latExpr = this.parent.dataflow.cache.parse(latitudeData.expression);
            let lngExpr = this.parent.dataflow.cache.parse(longitudeData.expression);
            let table = this.parent.dataflow.getTable(this.object.table);
            let [cx, cy] = this.mercatorProjection(latitude, longitude);

            for (let [glyphState, index] of zipArray(this.state.glyphs, this.state.dataRowIndices)) {
                let row = table.getRowContext(index);
                let lat = latExpr.getNumberValue(row);
                let lng = lngExpr.getNumberValue(row);
                let p = this.getProjectedPoints([[lat, lng]])[0];
                solver.addLinear(ConstraintStrength.HARD, p[0], [], [[1, solver.attr(glyphState.attributes, "x")]]);
                solver.addLinear(ConstraintStrength.HARD, p[1], [], [[1, solver.attr(glyphState.attributes, "y")]]);
            }
        }
    }

    public getBoundingBox(): BoundingBox.Description {
        let attrs = this.state.attributes;
        let { x1, x2, y1, y2 } = attrs;
        return <BoundingBox.Rectangle>{
            type: "rectangle",
            cx: (x1 + x2) / 2,
            cy: (y1 + y2) / 2,
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
            rotation: 0
        };
    }

    public getSnappingGuides(): SnappingGuides.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        return [
            <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
            <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
            <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
            <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" }
        ];
    }

    public mercatorProjection(lat: number, lng: number): [number, number] {
        // WebMercator Projection:
        // x, y range: [0, 256]
        let x = 128 / 180 * (180 + lng)
        let y = 128 / 180 * (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat / 180 * Math.PI / 2)));

        return [x, y];

        // // Bing's version as of here: https://msdn.microsoft.com/en-us/library/bb259689.aspx
        // // Same as Google's Version
        // let sin = Math.sin(lat / 180 * Math.PI);
        // let x1 = (lng + 180) / 360 * 256;
        // let y1 = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256;

        // console.log((x - x1).toFixed(8), (y - y1).toFixed(8));
    }

    // Get (x, y) coordinates based on longitude and latitude
    public getProjectedPoints(points: [number, number][]): [number, number][] {
        let attrs = this.state.attributes;
        let [cLatitude, cLongitude, zoom] = this.getCenterZoom();
        let [cX, cY] = this.mercatorProjection(cLatitude, cLongitude);
        let scale = Math.pow(2, zoom);
        let { x1, y1, x2, y2 } = attrs;
        return points.map((p) => {
            let [x, y] = this.mercatorProjection(p[0], p[1]);
            return [
                (x - cX) * scale + (x1 + x2) / 2,
                -(y - cY) * scale + (y1 + y2) / 2
            ] as [number, number];
        });
    }

    public getCenterZoom(): [number, number, number] {
        let attrs = this.state.attributes;
        let props = this.object.properties;

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

        let [xMin, yMin] = this.mercatorProjection(minLatitude, minLongitude);
        let [xMax, yMax] = this.mercatorProjection(maxLatitude, maxLongitude);
        // Find the appropriate zoom level for the given box.
        let scaleX = Math.abs(Math.abs(attrs.x2 - attrs.x1) / Math.abs(xMax - xMin));
        let scaleY = Math.abs(Math.abs(attrs.y2 - attrs.y1) / Math.abs(yMax - yMin));
        let scale = Math.min(scaleX, scaleY);
        let zoom = Math.floor(Math.log2(scale));
        let latitude = (minLatitude + maxLatitude) / 2;
        let longitude = (minLongitude + maxLongitude) / 2;
        return [latitude, longitude, zoom];
    }

    public getPlotSegmentGraphics(glyphGraphics: Graphics.Element): Graphics.Group {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2 } = attrs;
        let [latitude, longitude, zoom] = this.getCenterZoom();
        let width = x2 - x1;
        let height = y2 - y1;
        let img = {
            type: "image",
            src: this.mapService.getImageryURLAtPoint({
                center: {
                    latitude: latitude,
                    longitude: longitude
                },
                type: this.object.properties.mapType,
                zoom: zoom,
                width: width,
                height: height,
                resolution: "high"
            }),
            x: x1,
            y: y1,
            width: width,
            height: height
        } as Graphics.Image;
        return Graphics.makeGroup([img, glyphGraphics]);
    }

    public getDropZones(): DropZones.Description[] {
        let attrs = this.state.attributes;
        let { x1, y1, x2, y2, x, y } = attrs;
        let zones: DropZones.Description[] = [];
        zones.push(
            <DropZones.Line>{
                type: "line",
                p1: { x: x2, y: y1 }, p2: { x: x1, y: y1 },
                title: "Longitude",
                dropAction: {
                    axisInference: { property: "longitudeData" }
                }
            }
        );
        zones.push(
            <DropZones.Line>{
                type: "line",
                p1: { x: x1, y: y1 }, p2: { x: x1, y: y2 },
                title: "Latitude",
                dropAction: {
                    axisInference: { property: "latitudeData" }
                }
            }
        );
        return zones;
    }

    public getHandles(): Handles.Description[] {
        let attrs = this.state.attributes;
        let rows = this.parent.dataflow.getTable(this.object.table).rows;
        let { x1, x2, y1, y2 } = attrs;
        let h: Handles.Description[] = [
            <Handles.Line>{ type: "line", axis: "y", value: y1, span: [x1, x2], actions: [{ type: "attribute", attribute: "y1" }] },
            <Handles.Line>{ type: "line", axis: "y", value: y2, span: [x1, x2], actions: [{ type: "attribute", attribute: "y2" }] },
            <Handles.Line>{ type: "line", axis: "x", value: x1, span: [y1, y2], actions: [{ type: "attribute", attribute: "x1" }] },
            <Handles.Line>{ type: "line", axis: "x", value: x2, span: [y1, y2], actions: [{ type: "attribute", attribute: "x2" }] },
            <Handles.Point>{ type: "point", x: x1, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y1" }] },
            <Handles.Point>{ type: "point", x: x2, y: y1, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y1" }] },
            <Handles.Point>{ type: "point", x: x1, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x1" }, { type: "attribute", source: "y", attribute: "y2" }] },
            <Handles.Point>{ type: "point", x: x2, y: y2, actions: [{ type: "attribute", source: "x", attribute: "x2" }, { type: "attribute", source: "y", attribute: "y2" }] }
        ];
        return h;
    }

    public getAttributePanelWidgets(m: Controls.WidgetManager): Controls.Widget[] {
        let props = this.object.properties;
        let widgets: Controls.Widget[] = [
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
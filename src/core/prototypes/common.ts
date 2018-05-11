import { Color, Point } from "../common";
import { VariableStrength } from "../solver";
import * as Specification from "../specification";

import * as Graphics from "../graphics";

export * from "./object";
export * from "./chart_element";

import * as Controls from "./controls";
export { Controls };

export interface OrderDescriptionItem extends Specification.AttributeMap {
    column: string;
    order: "ascending" | "descending";
}

export type OrderDescription = OrderDescriptionItem[];

export interface DataMappingHints {
    rangeNumber?: [number, number];
    autoRange?: boolean;
    rangeString?: string[];
    stringBehavior?: "categorical" | "text";
    newScale?: boolean;
}

export interface TemplateParameters {
    properties?: Specification.Template.Property[];
    inferences?: Specification.Template.Inference[];
}

export namespace DropZones {
    export interface Description {
        type: string;
        /** If set, restrict the data that can be dropped */
        accept?: DropFilter;
        /** Action to perform after drop */
        dropAction: DropAction;
    }

    export interface DropFilter {
        /** Only accept data from a certain table */
        table?: string;
        /** Only accept data with a certain kind */
        kind?: string;
        /** Only accept certain scaffolds */
        scaffolds?: string[];
    }

    export interface DropAction {
        /** Map data using inferred scale */
        scaleInference?: {
            attribute: string;
            attributeType: string;
            hints?: DataMappingHints;
        };
        /** Set AxisDataBinding to property */
        axisInference?: {
            property: string;
            /** If set, extend instead of replace the axis */
            appendToProperty?: string;
        };
        /** Extend a plot segment */
        extendPlotSegment?: {
        };
    }

    export interface Line extends Description {
        type: "line";
        p1: Point;
        p2: Point;
        title: string;
    }

    export interface Arc extends Description {
        type: "arc";
        center: Point;
        radius: number;
        angleStart: number;
        angleEnd: number;
        title: string;
    }

    export interface Region extends Description {
        type: "region";
        p1: Point;
        p2: Point;
        title: string;
    }

    export interface Rectangle extends Description {
        type: "rectangle";
        cx: number;
        cy: number;
        width: number;
        height: number;
        rotation: number; // in degrees
        title: string;
    }
}

export namespace Handles {

    export interface Description {
        type: string;
        visible?: boolean;
        actions: HandleAction[];
    }

    export interface HandleAction {
        type: "property" | "attribute" | "attribute-value-mapping";
        source?: string;
        property?: string;
        field?: string | string[];
        attribute?: string;

        minimum?: number;
        maximum?: number;
    }

    /** A point with x, y coordinates */
    export interface Point extends Description {
        type: "point";
        x: number;
        y: number;
    }

    /** A line with a x or y coordiante, and a span on the other */
    export interface Line extends Description {
        type: "line";
        axis: "x" | "y";
        value: number;
        span: [number, number];
    }

    export interface RelativeLine extends Description {
        type: "relative-line";
        axis: "x" | "y",
        reference: number;
        value: number;
        sign: number;
        span: [number, number];
    }

    /** A x or y gap */
    export interface GapRatio extends Description {
        type: "gap-ratio";
        axis: "x" | "y";
        reference: number;
        value: number;
        scale: number;
        span: [number, number];
        range: [number, number];
        coordinateSystem: Graphics.CoordinateSystem;
    }

    /** A x or y margin */
    export interface Margin extends Description {
        type: "margin";
        axis: "x" | "y";
        value: number;
        total?: number;
        range?: [number, number];
        sign: number;
        x: number;
        y: number;
    }

    export interface Angle extends Description {
        type: "angle";
        cx: number;
        cy: number;
        radius: number;
        value: number;
        clipAngles: [number, number];
        icon: ">" | "<" | "o";
    }

    export interface DistanceRatio extends Description {
        type: "distance-ratio";
        cx: number; cy: number;
        startAngle: number;
        endAngle: number;
        value: number;
        startDistance: number;
        endDistance: number;
        clipRange: [number, number];
    }

    export interface InputCurve extends Description {
        type: "input-curve";
        x1: number; y1: number;
        x2: number; y2: number;
    }

    export interface TextAlignment extends Description {
        type: "text-alignment";
        text: string;
        alignment: Specification.Types.TextAlignment;
        rotation: number;
        anchorX: number;
        anchorY: number;
        textWidth: number;
        textHeight: number;
    }
}

export namespace BoundingBox {

    export interface Description {
        type: string;
        visible?: boolean;
    }

    export interface Rectangle extends Description {
        type: "rectangle";
        cx: number;
        cy: number;
        width: number;
        height: number;
    }

    export interface AnchoredRectangle extends Description {
        type: "anchored-rectangle";
        cx: number;
        cy: number;
        width: number;
        height: number;
        rotation: number;

        anchorX: number;
        anchorY: number;
    }

    export interface Circle extends Description {
        type: "circle";
        cx: number;
        cy: number;
        radius: number;
    }

    export interface Line extends Description {
        type: "line";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        morphing?: boolean;
    }
}

export namespace SnappingGuides {
    export interface Description {
        type: string;
        visible: boolean;
    }

    export interface Axis extends Description {
        type: "x" | "y";
        value: number;
        attribute: string;
    }

    export interface Label extends Description {
        type: "label";
        x: number;
        y: number;
        text: string;
    }
}

export namespace LinkAnchor {
    export interface Description {
        element: string;
        points: Array<{
            x: number;
            y: number;
            xAttribute: string;
            yAttribute: string;
            direction?: {
                x: number;
                y: number;
            };
        }>;
    };
}

export namespace CreatingInteraction {
    export interface Description {
        type: string;
        mapping: { [name: string]: string };
        valueMappings?: { [name: string]: Specification.AttributeValue };
        attributes?: { [name: string]: Specification.AttributeValue };
    }

    export interface Point extends Description {
        type: "point";
        // x, y
    }

    export interface Rectangle extends Description {
        type: "rectangle";
        // xMin, yMin, xMax, yMax
    }

    export interface LineSegment extends Description {
        type: "line-segment";
        // x1, y1, x2, y2
    }

    export interface HLine extends Description {
        type: "hline";
        // y
    }

    export interface HLineSegment extends Description {
        type: "hline-segment";
        // xMin, xMax, y
    }

    export interface VLine extends Description {
        type: "vline";
        // x
    }

    export interface VLineSegment extends Description {
        type: "vline-segment";
        // yMin, yMax, x
    }
}

export namespace TemplateMetadata {
    export interface ChartMetadata {
        dataSlots: DataSlot[];
        inference: Array<{ id: string, infer: Inference }>;
        mappings: Array<{ id: string, attribute: string, slot: string }>;
    }

    export interface DataSlot {
        name: string;
        kind: "numerical" | "categorical";
    }

    export interface Inference {
        type: string;
        defaultLabel: string;
    }

    /** Infer axis parameter, set to axis property */
    export interface Axis extends Inference {
        type: "axis";
        property: string;
        field?: string[];

        dataExpression: string;

        kind: "numerical" | "categorical";
    }

    /** Infer scale parameter, set to scale's domain property */
    export interface Scale extends Inference {
        type: "scale";
        kind: "numerical" | "categorical";
        target: "number" | "color";

        properties: {
            min?: string;
            max?: string;
            mapping?: string;
        };
    }

    /** Infer order parameter, set to orderBy */
    export interface Order extends Inference {
        type: "order";
        property: string;
        field?: string[];

        dataExpression: string;
    }
}
import * as Specification from "../../specification";
import * as Graphics from "../../graphics";
import * as Expression from "../../expression";

import { ConstraintSolver, ConstraintStrength } from "../../solver";
import { Point, uniqueID } from "../../common";
import { ObjectClass, SnappingGuides, AttributeDescription, DropZones, Handles, BoundingBox, LinkAnchor, BuildConstraintsContext } from "../common";

export interface CreationParameters {
    dropPoint: Point;
}

export abstract class MarkClass extends ObjectClass {
    public readonly object: Specification.Element;
    public readonly state: Specification.MarkState;

    /** Fill the default state */
    public initializeState(): void { }

    /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
    public buildConstraints(solver: ConstraintSolver, context: BuildConstraintsContext): void { }

    /** Get the graphical element from the element */
    public getGraphics(coordinateSystem: Graphics.CoordinateSystem, offset: Point, glyphIndex?: number): Graphics.Element { return null; }

    /** Get DropZones given current state */
    public getDropZones(): DropZones.Description[] { return []; }

    /** Get link anchors for this mark */
    public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] { return []; }

    /** Get handles given current state */
    public getHandles(): Handles.Description[] { return []; }

    /** Get bounding box */
    public getBoundingBox(): BoundingBox.Description { return null; }

    /** Get alignment guides */
    public getSnappingGuides(): SnappingGuides.Description[] { return []; }
}

import "./anchor";
import "./symbol";
import "./rect";
import "./line";
import "./text";
// import "./textbox";
import "./dataAxis";

export { AnchorElementAttributes, AnchorElement } from "./anchor";
export { SymbolElementAttributes, SymbolElement } from "./symbol";
export { RectElementAttributes, RectElement } from "./rect";
export { LineElementAttributes, LineElement } from "./line";
export { TextElementAttributes, TextElement } from "./text";
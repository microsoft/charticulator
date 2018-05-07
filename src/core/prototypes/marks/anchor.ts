// Special element: Anchor

import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength, VariableStrength } from "../../solver";
import { Point, uniqueID } from "../../common";

import { ObjectClasses, ObjectClassMetadata, SnappingGuides, AttributeDescription, DropZones, Handles, LinkAnchor, Controls } from "../common";
import { MarkClass, CreationParameters } from "./index";

import * as Graphics from "../../graphics";

export interface AnchorElementAttributes extends Specification.AttributeMap {
    x: number;
    y: number;
}

export interface AnchorElementState extends Specification.MarkState {
    attributes: AnchorElementAttributes;
}

export class AnchorElement extends MarkClass {
    public static classID = "mark.anchor";
    public static type = "mark";

    public static metadata: ObjectClassMetadata = {
        displayName: "Anchor",
        iconPath: "mark/anchor"
    };

    public readonly state: AnchorElementState;

    // Get a list of elemnt attributes
    public attributeNames: string[] = ["x", "y"];
    public attributes: { [name: string]: AttributeDescription } = {
        x: { name: "x", type: "number", mode: "positional", strength: VariableStrength.NONE },
        y: { name: "y", type: "number", mode: "positional", strength: VariableStrength.NONE }
    }

    // Initialize the state of an element so that everything has a valid value
    public initializeState(): void {
        let attrs = this.state.attributes;
        attrs.x = 0;
        attrs.y = 0;
    }

    // Get bounding rectangle given current state
    public getHandles(): Handles.Description[] {
        return [];
        // let attrs = this.state.attributes as AnchorElementAttributes;
        // let { x, y } = attrs;
        // return [
        //     <Handles.Point>{
        //         type: "point",
        //         x: x, y: y,
        //         actions: []
        //     }
        // ]
    }

    // /** Get link anchors for this mark */
    // public getLinkAnchors(): LinkAnchor.Description[] {
    //     let attrs = this.state.attributes;
    //     return [
    //         {
    //             element: this.object._id,
    //             points: [
    //                 { x: attrs.x, y: attrs.y, xAttribute: "x", yAttribute: "y", direction: { x: 0, y: 1 } }
    //             ]
    //         }
    //     ];
    // }

    public static createDefault(glyph: Specification.Glyph): Specification.Element {
        let element = super.createDefault(glyph);
        element.mappings.x = <Specification.ParentMapping>{ type: "parent", parentAttribute: "icx" };
        element.mappings.y = <Specification.ParentMapping>{ type: "parent", parentAttribute: "icy" };
        return element;
    }

    public getAttributePanelWidgets(manager: Controls.WidgetManager): Controls.Widget[] {
        let props = this.object.properties;
        return [manager.label("(drag the anchor in the glyph editor)")];
    }
}

ObjectClasses.Register(AnchorElement);
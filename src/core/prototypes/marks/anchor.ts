// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
// Special element: Anchor

import * as Specification from "../../specification";
import {
  AttributeDescription,
  Controls,
  Handles,
  ObjectClassMetadata
} from "../common";
import { MarkClass } from "./mark";

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
    x: {
      name: "x",
      type: Specification.AttributeType.Number
    },
    y: {
      name: "y",
      type: Specification.AttributeType.Number
    }
  };

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    const attrs = this.state.attributes;
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

  public static createDefault(
    glyph: Specification.Glyph
  ): Specification.Element {
    const element = super.createDefault(glyph);
    element.mappings.x = {
      type: "parent",
      parentAttribute: "icx"
    } as Specification.ParentMapping;
    element.mappings.y = {
      type: "parent",
      parentAttribute: "icy"
    } as Specification.ParentMapping;
    return element;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    return [manager.label("(drag the anchor in the glyph editor)")];
  }
}

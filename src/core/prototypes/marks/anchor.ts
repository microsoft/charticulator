// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
// Special element: Anchor

import { strings } from "../../../strings";
import * as Specification from "../../specification";
import { MappingType } from "../../specification";
import {
  AttributeDescription,
  Controls,
  Handles,
  ObjectClassMetadata,
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
    iconPath: "mark/anchor",
  };

  public readonly state: AnchorElementState;

  /** Get a list of element attributes */
  public attributeNames: string[] = ["x", "y"];
  public attributes: { [name: string]: AttributeDescription } = {
    x: {
      name: "x",
      type: Specification.AttributeType.Number,
    },
    y: {
      name: "y",
      type: Specification.AttributeType.Number,
    },
  };

  /** Initialize the state of an element so that everything has a valid value */
  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x = 0;
    attrs.y = 0;
  }

  /** Get bounding rectangle given current state */
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
    element.mappings.x = <Specification.ParentMapping>{
      type: MappingType.parent,
      parentAttribute: "icx",
    };
    element.mappings.y = <Specification.ParentMapping>{
      type: MappingType.parent,
      parentAttribute: "icy",
    };
    return element;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [manager.label(strings.objects.anchor.label)];
  }
}

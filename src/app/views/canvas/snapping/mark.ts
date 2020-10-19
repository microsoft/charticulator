// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Specification, Prototypes } from "../../../../core";
import { Actions } from "../../../actions";
import { GuideClass } from "../../../../core/prototypes/guides";
import { isType } from "../../../../core/prototypes";
import { SnappingAction, SnappableGuide } from "./common";
import { SnappingSession } from "./session";

export type MarkSnappableGuide = SnappableGuide<Specification.Element>;

export class MarkSnappingSession extends SnappingSession<
  Specification.Element
> {
  public mark: Specification.Glyph;
  public element: Specification.Element;

  constructor(
    guides: Array<SnappableGuide<Specification.Element>>,
    mark: Specification.Glyph,
    element: Specification.Element,
    elementState: Specification.MarkState,
    bound: Prototypes.Handles.Description,
    threshold: number
  ) {
    super(
      guides.filter(x => {
        // element cannot snap to itself
        if (x.element === element) {
          return false;
        }
        // special rules for guides
        if (element.classID === GuideClass.classID) {
          // guide cannot snap to a mark
          if (x.element && isType(x.element.classID, "mark")) {
            return false;
          }
        }
        return true;
      }),
      bound,
      threshold,
      false
    );

    this.mark = mark;
    this.element = element;
  }

  public getActions(
    actions: Array<SnappingAction<Specification.Element>>
  ): Actions.Action {
    const g = new Actions.MarkActionGroup();
    const updates: { [name: string]: Specification.AttributeValue } = {};
    let hasUpdates = false;
    for (const action of actions) {
      switch (action.type) {
        case "snap":
          {
            if (action.snapElement == null) {
              g.add(
                new Actions.SetMarkAttribute(
                  this.mark,
                  this.element,
                  action.attribute,
                  {
                    type: "parent",
                    parentAttribute: action.snapAttribute
                  } as Specification.ParentMapping
                )
              );
            } else {
              g.add(
                new Actions.SnapMarks(
                  this.mark,
                  this.element,
                  action.attribute,
                  action.snapElement,
                  action.snapAttribute
                )
              );
            }
          }
          break;
        case "move":
          {
            updates[action.attribute] = action.value;
            hasUpdates = true;
          }
          break;
        case "property":
          {
            g.add(
              new Actions.SetObjectProperty(
                this.element,
                action.property,
                action.field,
                action.value
              )
            );
          }
          break;
        case "value-mapping":
          {
            g.add(
              new Actions.SetMarkAttribute(
                this.mark,
                this.element,
                action.attribute,
                {
                  type: "value",
                  value: action.value
                } as Specification.ValueMapping
              )
            );
          }
          break;
      }
    }
    if (hasUpdates) {
      g.add(new Actions.UpdateMarkAttribute(this.mark, this.element, updates));
    }
    // console.log(g);
    return g;
  }
}

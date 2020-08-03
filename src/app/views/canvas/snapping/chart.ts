// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Specification, Prototypes } from "../../../../core";
import { Actions } from "../../../actions";
import { SnappingAction, SnappableGuide } from "./common";
import { SnappingSession } from "./session";

export type ChartSnappableGuide = SnappableGuide<Specification.ChartElement>;

export class ChartSnappingSession extends SnappingSession<
  Specification.ChartElement
> {
  public markLayout: Specification.ChartElement;

  constructor(
    guides: Array<SnappableGuide<Specification.ChartElement>>,
    markLayout: Specification.ChartElement,
    bound: Prototypes.Handles.Description,
    threshold: number
  ) {
    super(guides.filter(x => x.element != markLayout), bound, threshold);
    this.markLayout = markLayout;
  }

  public getActions(
    actions: Array<SnappingAction<Specification.ChartElement>>
  ): Actions.Action[] {
    const result: Actions.Action[] = [];
    for (const action of actions) {
      switch (action.type) {
        case "snap":
          {
            if (action.snapElement == null) {
              result.push(
                new Actions.SetChartElementMapping(
                  this.markLayout,
                  action.attribute,
                  {
                    type: "parent",
                    parentAttribute: action.snapAttribute
                  } as Specification.ParentMapping
                )
              );
            } else {
              result.push(
                new Actions.SnapChartElements(
                  this.markLayout,
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
            const updates: {
              [name: string]: Specification.AttributeValue;
            } = {};
            updates[action.attribute] = action.value;
            result.push(
              new Actions.UpdateChartElementAttribute(this.markLayout, updates)
            );
          }
          break;
        case "property":
          {
            result.push(
              new Actions.SetObjectProperty(
                this.markLayout,
                action.property,
                action.field,
                action.value
              )
            );
          }
          break;
        case "value-mapping":
          {
            result.push(
              new Actions.SetChartElementMapping(
                this.markLayout,
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
    return result;
  }
}

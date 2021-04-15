// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Specification, Prototypes } from "../../../../core";
import { SnappingAction } from "./common";
import { SnappingSession } from "./session";

export class MoveSnappingSession extends SnappingSession<void> {
  constructor(handle: Prototypes.Handles.Description) {
    super([], handle, 10, handle.options && handle.options.snapToClosestPoint);
  }

  public getUpdates(actions: (SnappingAction<void>)[]) {
    const updates: { [name: string]: Specification.AttributeValue } = {};
    for (const action of actions) {
      updates[action.attribute] = action.value;
    }
    return updates;
  }
}

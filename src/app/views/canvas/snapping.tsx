// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Specification, Prototypes } from "../../../core";
import {
  SnappingSession,
  SnappingAction
} from "./snapping/common";

export class MoveSnappingSession extends SnappingSession<void> {
  constructor(handle: Prototypes.Handles.Description) {
    super([], handle, 10);
  }

  public getUpdates(actions: Array<SnappingAction<void>>) {
    const updates: { [name: string]: Specification.AttributeValue } = {};
    for (const action of actions) {
      updates[action.attribute] = action.value;
    }
    return updates;
  }
}

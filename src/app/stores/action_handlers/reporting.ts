// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { ActionHandlerRegistry } from "./registry";

export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.AddMessage, function(action) {
    this.messageState.set(action.type, action.options.text);
    this.emit(AppStore.EVENT_GRAPHICS);
  });

  REG.add(Actions.ClearMessages, function(action) {
    this.messageState.clear();
    this.emit(AppStore.EVENT_GRAPHICS);
  });

  REG.add(Actions.RemoveMessage, function(action) {
    this.messageState.delete(action.type);
    this.emit(AppStore.EVENT_GRAPHICS);
  });
}

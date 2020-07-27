// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  deepClone,
  Expression,
  Prototypes,
  Scale,
  setField,
  Solver,
  Specification,
  uniqueID
} from "../../../core";
import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { ChartElementSelection } from "../selection";
import { ActionHandlerRegistry } from "./registry";
import { BindDataToAxis } from "../../actions/actions";

export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.AddMessage, function(action) {
    this.messageState.set(action.type, action.options.text);
  });

  REG.add(Actions.ClearMessages, function(action) {
    this.messageState.clear();
  });

  REG.add(Actions.RemoveMessage, function(action) {
    this.messageState.delete(action.type);
  });
}

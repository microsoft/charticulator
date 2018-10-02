// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { ActionHandlerRegistry } from "./registry";

import registerChartActions from "./chart";
import registerDocumentActions from "./document";
import registerGlyphActions from "./glyph";
import registerMarkActions from "./mark";
import registerSelectionActions from "./selection";

export function registerActionHandlers(
  REG: ActionHandlerRegistry<AppStore, Actions.Action>
) {
  registerDocumentActions(REG);
  registerChartActions(REG);
  registerGlyphActions(REG);
  registerMarkActions(REG);
  registerSelectionActions(REG);
}

export { ActionHandlerRegistry };

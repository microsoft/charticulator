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
import { ValueType } from "../../../core/expression/classes";
import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { ChartElementSelection } from "../selection";
import { ActionHandlerRegistry } from "./registry";

export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.SaveExportTemplatePropertyName, function(action) {
    this.setPropertyExportName(action.propertyName, action.value);
  });
}

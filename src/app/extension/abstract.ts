// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Dispatcher } from "../../core";
import { Action } from "../actions/actions";
import { AppStore } from "../stores";

export interface ExtensionContext {
  getGlobalDispatcher(): Dispatcher<Action>;
  getAppStore(): AppStore;
}

export interface Extension {
  activate(context: ExtensionContext): void;
  deactivate(): void;
}

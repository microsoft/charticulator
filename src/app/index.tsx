// The entry JavaScript file for the web app.

import * as React from "react";
import * as ReactDOM from "react-dom";

import { MainView } from "./main_view";
import { MainStore } from "./stores";

import * as Core from "../core";
export { Core };

export { Actions, DragData } from "./actions";
export { ExtensionContext, Extension } from "./extension";
export { Application, ApplicationExtensionContext } from "./application";

export { TestApplication } from "./test";

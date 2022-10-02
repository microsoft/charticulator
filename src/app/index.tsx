// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * ![App workflow](media://workflow.png)
 *
 * Charticulator follows the basic Flux application architecture, with the addition
 * of a constraint solver. The application maintains a chart specification
 * and a chart state. The chart specification describes the chart in a JSON
 * object that mirrors the framework. The chart
 * state stores all of the chart elements’ attributes. Together, they form the
 * {@link AppStore} part of the Flux architecture. For each chart editing interaction,
 * an {@link Action} is emitted and dispatched through the global {@link BaseStore.dispatcher}
 * to the {@link AppStore}. The store then modifies the chart specification and
 * invokes the constraint solver({@link ChartConstraintSolver}) component to update the chart state. Once
 * the state is successfully updated, the {@link AppStore} emits an update event ({@link AppStore.EVENT_GRAPHICS}) in {@link AppStore.solveConstraintsAndUpdateGraphics} method
 * which causes the user interface components to update.
 *
 * * {@link "app/actions/actions"} contains all Actions definitions for application
 *
 * * {@link "app/backend/indexed_db"} contains class {@link IndexedDBBackend}. It wraps [IndexedDB API](https://developer.mozilla.org/docs/Web/API/IndexedDB_API) to save user charts in the browser storage.
 *
 * * {@link "app/components/index"} contains general high-level components for UI. Other low-level components ("bricks" of UI) are in {@link "app/views/index"} module.
 *
 * Charticulator has {@link WidgetManager} class for managing those components. It's "facade" over all components.
 *
 * {@link ObjectClass.getAttributePanelWidgets} method uses interface of {@link WidgetManager} to build UI for mark attributes. (See {@link "core/prototypes/marks/index"})
 *
 * * {@link "app/views/index"} module contains general views for dataset displaying, file views for open, save, create chart and different panes like attribute panel link creator, object list editor, scale editor, scale panel with used scales list.
 *
 * * {@link "app/views/dataset/table_view"} contains view for displaying dataset as table on creating the new chart or for displaying data samples after importing data
 *
 * * {@link "app/views/dataset/dataset_view"} the left side panel to display columns from main table and links table
 *
 * * {@link "app/views/file_view/index"} views for opening, saving, creating charts
 *
 * * {@link "app/views/panels/index"} TODO describe panels
 *
 * * {@link "app/template/index"} contains class and interface for building chart template
 *
 * @packageDocumentation
 * @preferred
 */

// The entry JavaScript file for the web app.
import * as Core from "../core";
export { Core };

export { Actions, DragData } from "./actions";
export { ExtensionContext, Extension } from "./extension";
export {
  Application,
  ApplicationExtensionContext,
  NestedEditorData,
  NestedEditorEventType,
} from "./application";
export { CharticulatorAppConfig, MainViewConfig } from "./config";
export { addSVGIcon, getSVGIcon } from "./resources";
export { ExportTemplateTarget } from "./template";
export { Widgets } from "./views/panels/index";
export { expect_deep_approximately_equals } from "./utils/index";
export { PopupContainer } from "./controllers/popup_controller";
// tslint:disable-next-line
export * as globals from "./globals";

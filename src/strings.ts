// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MainTabs } from "./app/views/file_view";
import { DataType } from "./core/specification";

export const strings = {
  app: {
    name: "Charticulator",
    nestedChartTitle: "Nested Chart | Charticulator",
  },
  about: {
    version: (version: string, url: string) =>
      `Version: ${version}, URL: ${url}`,
    license: "Show License",
  },
  button: {
    no: "No",
    yes: "Yes",
  },
  defaultDataset: {
    city: "City",
    month: "Month",
    months: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
    temperature: "Temperature",
    value: "Value",
  },
  dialog: {
    resetConfirm: "Are you really willing to reset the chart?",
  },
  error: {
    storeNotFound: (componentName: string) =>
      `store not found in component ${componentName}`,
  },
  help: {
    contact: "Contact Us",
    gallery: "Example Gallery",
    gettingStarted: "Getting Started",
    home: "Charticulator Home",
    issues: "Report an Issue",
    version: (version: string) => `Version: ${version}`,
  },
  mainTabs: {
    about: "About",
    export: "Export",
    new: "New",
    open: "Open",
    options: "Options",
    save: "Save As",
  } as { [key in MainTabs]: string },
  mainView: {
    attributesPaneltitle: "Attributes",
    datasetPanelTitle: "Dataset",
    errorsPanelTitle: "Errors",
    glyphPaneltitle: "Glyph",
    layersPanelTitle: "Layers",
    scalesPanelTitle: "Scales",
  },
  menuBar: {
    defaultTemplateName: "Charticulator Template",
    export: "Export",
    exportTemplate: "Export template",
    help: "Help",
    home: "Open file menu",
    importTemplate: "Import template",
    new: "New (Ctrl-N)",
    open: "Open (Ctrl-O)",
    redo: "Redo (Ctrl-Y)",
    reset: "Reset",
    save: "Save (Ctrl-S)",
    saveButton: "Save",
    saveNested: "Save Nested Chart",
    undo: "Undo (Ctrl-Z)",
  },
  typeDisplayNames: {
    boolean: "Boolean",
    date: "Date",
    number: "Number",
    string: "String",
  } as { [key in DataType]: string },
};

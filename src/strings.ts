// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MainTabs } from "./app/views/file_view";
import { DataType } from "./core/specification";

export const strings = {
  app: {
    nestedChartTitle: "Nested Chart | Charticulator",
  },
  about: {
    version: (version: string, url: string) =>
      `Version: ${version}, URL: ${url}`,
    license: "Show License",
  },
  defaultDataset: {
    city: "City",
    month: "Month",
    months: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
    temperature: "Temperature",
    value: "Value",
  },
  error: {
    storeNotFound: (componentName: string) =>
      `store not found in component ${componentName}`,
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
  typeDisplayNames: {
    boolean: "Boolean",
    date: "Date",
    number: "Number",
    string: "String",
  } as { [key in DataType]: string },
};

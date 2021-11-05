// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import { saveAs } from "file-saver";
import { Prototypes, deepClone, uniqueID } from "../../../core";
import { Actions } from "../../actions";
import {
  renderDataURLToPNG,
  stringToDataURL,
  convertColumns,
} from "../../utils";
import { AppStore } from "../app_store";
import { Migrator } from "../migrator";
import { ActionHandlerRegistry } from "./registry";
import { getConfig } from "../../config";
import { ChartTemplateBuilder } from "../../template";
import {
  NestedEditorEventType,
  NestedEditorMessage,
  NestedEditorMessageType,
} from "../../application";

/** Handlers for document-level actions such as Load, Save, Import, Export, Undo/Redo, Reset */
// eslint-disable-next-line
export default function (REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  // eslint-disable-next-line
  REG.add(Actions.Export, function (action) {
    (async () => {
      // Export as vector graphics
      if (action.type == "svg") {
        const svg = await this.renderLocalSVG();
        const blob = new Blob([svg], { type: "image/svg;charset=utf-8" });
        saveAs(blob, "charticulator.svg", true);
      }
      // Export as bitmaps
      if (action.type == "png" || action.type == "jpeg") {
        const svgDataURL = stringToDataURL(
          "image/svg+xml",
          await this.renderLocalSVG()
        );
        renderDataURLToPNG(svgDataURL, {
          mode: "scale",
          scale: action.options.scale || 2,
          background: "#ffffff",
        }).then((png) => {
          png.toBlob((blob) => {
            saveAs(
              blob,
              "charticulator." + (action.type == "png" ? "png" : "jpg"),
              true
            );
          }, "image/" + action.type);
        });
      }
      // Export as interactive HTML
      if (action.type == "html") {
        const containerScriptText = await (
          await fetch(getConfig().ContainerURL)
        ).text();

        const template = deepClone(this.buildChartTemplate());

        const htmlString = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Charticulator HTML Export</title>
            <script type="text/javascript">${containerScriptText}</script>
            <style type="text/css">
              #container {
                display: block;
                position: absolute;
                left: 0; right: 0; top: 0; bottom: 0;
              }
            </style>
          </head>
          <body>
            <div id="container"></div>
            <script type="text/javascript">
              CharticulatorContainer.initialize().then(function() {
                const currentChart = ${JSON.stringify(this.chart)};
                const chartState = ${JSON.stringify(this.chartState)};
                const dataset = ${JSON.stringify(this.dataset)};
                const template = ${JSON.stringify(template)};
                const chartTemplate = new CharticulatorContainer.ChartTemplate(
                  template
                );
                chartTemplate.reset();

                const defaultTable = dataset.tables[0];
                const columns = defaultTable.columns;
                chartTemplate.assignTable(defaultTable.name, defaultTable.name);
                for (const column of columns) {
                  chartTemplate.assignColumn(
                    defaultTable.name,
                    column.name,
                    column.name
                  );
                }

                // links table
                const linksTable = dataset.tables[1];
                const links = linksTable && (linksTable.columns);
                if (links) {
                  chartTemplate.assignTable(linksTable.name, linksTable.name);
                  for (const column of links) {
                    chartTemplate.assignColumn(
                      linksTable.name,
                      column.name,
                      column.name
                    );
                  }
                }
                const instance = chartTemplate.instantiate(dataset);

                const { chart } = instance;

                for (const property of template.properties) {
                  if (property.target.attribute) {
                    CharticulatorContainer.ChartTemplate.SetChartAttributeMapping(
                      chart,
                      property.objectID,
                      property.target.attribute,
                      {
                        type: "value",
                        value: property.default,
                      }
                    );
                  }
                  
                }

                const container = new CharticulatorContainer.ChartContainer({ chart: chart }, dataset);
                const width = document.getElementById("container").getBoundingClientRect().width;
                const height = document.getElementById("container").getBoundingClientRect().height;
                container.mount("container", width, height);
                window.addEventListener("resize", function() {
                  container.resize(
                    document.getElementById("container").getBoundingClientRect().width,
                    document.getElementById("container").getBoundingClientRect().height
                  );
                });
              });
            </script>
          </body>
          </html>
        `;
        const blob = new Blob([htmlString]);
        saveAs(blob, "charticulator.html", true);
      }
    })();
  });

  REG.add(Actions.ExportTemplate, function (this, action) {
    action.target.generate(action.properties).then((base64) => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {
        type: "application/x-binary",
      });
      FileSaver.saveAs(
        blob,
        action.target.getFileName
          ? action.target.getFileName(action.properties)
          : "charticulator." + action.target.getFileExtension(action.properties)
      );
    });
  });

  REG.add(Actions.Save, function (action) {
    this.backendSaveChart()
      .then(() => {
        if (action.onFinish) {
          action.onFinish();
        }
      })
      .catch((error: Error) => {
        if (action.onFinish) {
          action.onFinish(error);
        }
      });
  });

  REG.add(Actions.SaveAs, function (action) {
    this.backendSaveChartAs(action.saveAs)
      .then(() => {
        if (action.onFinish) {
          action.onFinish();
        }
      })
      .catch((error: Error) => {
        if (action.onFinish) {
          action.onFinish(error);
        }
      });
  });

  REG.add(Actions.Open, function (action) {
    this.backendOpenChart(action.id)
      .then(() => {
        if (action.onFinish) {
          action.onFinish();
        }
      })
      .catch((error: Error) => {
        if (action.onFinish) {
          action.onFinish(error);
        }
      });
  });

  REG.add(Actions.Load, function (action) {
    this.historyManager.clear();
    const state = new Migrator().migrate(
      action.projectData,
      CHARTICULATOR_PACKAGE.version
    );
    this.loadState(state);
  });

  REG.add(Actions.ImportDataset, function (action) {
    this.currentChartID = null;
    this.dataset = action.dataset;
    this.originDataset = deepClone(this.dataset);
    this.historyManager.clear();
    this.newChartEmpty();
    this.emit(AppStore.EVENT_DATASET);
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.ImportChartAndDataset, function (action) {
    this.currentChartID = null;
    this.currentSelection = null;
    this.dataset = action.dataset;
    this.originDataset = deepClone(this.dataset);

    this.chart = action.specification;

    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset,
      null,
      {},
      {},
      action.originSpecification
        ? deepClone(action.originSpecification)
        : this.chartManager.getOriginChart()
    );
    this.chartManager.onUpdate(() => {
      this.solveConstraintsAndUpdateGraphics();
    });
    this.chartState = this.chartManager.chartState;

    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.UpdatePlotSegments, function () {
    this.updatePlotSegments();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.UpdateDataAxis, function () {
    this.updateDataAxes();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.ReplaceDataset, function (action) {
    this.currentChartID = null;
    this.currentSelection = null;
    this.dataset = action.dataset;
    this.originDataset = deepClone(this.dataset);

    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset,
      null,
      {},
      {},
      action.keepState ? this.chartManager.getOriginChart() : null
    );
    this.chartManager.onUpdate(() => {
      this.solveConstraintsAndUpdateGraphics();
    });
    this.chartState = this.chartManager.chartState;
    this.updatePlotSegments();
    this.updateDataAxes();
    this.updateScales();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.ConvertColumnDataType, function (action) {
    this.saveHistory();

    const table = this.dataset.tables.find(
      (table) => table.name === action.tableName
    );
    if (!table) {
      return;
    }

    const column = table.columns.find(
      (column) => column.name === action.column
    );
    if (!column) {
      return;
    }

    const originTable = this.originDataset.tables.find(
      (table) => table.name === action.tableName
    );
    let originColumn = originTable.columns.find(
      (column) => column.name === action.column
    );
    if (originColumn.metadata.rawColumnName) {
      originColumn = originTable.columns.find(
        (column) => column.name === originColumn.metadata.rawColumnName
      );
    }

    const result = convertColumns(table, column, originTable, action.type);
    if (result) {
      this.messageState.set("columnConvertError", result);
    }

    this.updatePlotSegments();
    this.updateDataAxes();
    this.updateScales();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.Undo, function () {
    const state = this.historyManager.undo(this.saveDecoupledState());
    if (state) {
      const ss = this.saveSelectionState();
      this.loadState(state);
      this.loadSelectionState(ss);
    }
  });

  REG.add(Actions.Redo, function () {
    const state = this.historyManager.redo(this.saveDecoupledState());
    if (state) {
      const ss = this.saveSelectionState();
      this.loadState(state);
      this.loadSelectionState(ss);
    }
  });

  REG.add(Actions.Reset, function () {
    this.saveHistory();

    this.currentSelection = null;
    this.currentTool = null;
    this.emit(AppStore.EVENT_SELECTION);
    this.emit(AppStore.EVENT_CURRENT_TOOL);

    this.newChartEmpty();

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.OpenNestedEditor, function ({ options, object, property }) {
    this.emit(AppStore.EVENT_OPEN_NESTED_EDITOR, options, object, property);
    const editorID = uniqueID();
    const newWindow = window.open(
      "index.html#!nestedEditor=" + editorID,
      "nested_chart_" + options.specification._id
    );
    const listener = (e: MessageEvent) => {
      if (e.origin == document.location.origin) {
        const data = <NestedEditorMessage>e.data;
        if (data.id == editorID) {
          switch (data.type) {
            case NestedEditorMessageType.Initialized:
              {
                const builder = new ChartTemplateBuilder(
                  options.specification,
                  options.dataset,
                  this.chartManager,
                  CHARTICULATOR_PACKAGE.version
                );

                const template = builder.build();
                newWindow.postMessage(
                  {
                    id: editorID,
                    type: NestedEditorEventType.Load,
                    specification: options.specification,
                    dataset: options.dataset,
                    width: options.width,
                    template,
                    height: options.height,
                    filterCondition: options.filterCondition,
                  },
                  document.location.origin
                );
              }
              break;
            case NestedEditorMessageType.Save:
              {
                this.setProperty({
                  object,
                  property: property.property,
                  field: property.field,
                  value: data.specification,
                  noUpdateState: property.noUpdateState,
                  noComputeLayout: property.noComputeLayout,
                });
              }
              break;
          }
        }
      }
    };
    window.addEventListener("message", listener);
  });
}

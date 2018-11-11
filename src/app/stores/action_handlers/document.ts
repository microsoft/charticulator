// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import { saveAs } from "file-saver";
import { Prototypes } from "../../../core";
import { Actions } from "../../actions";
import { renderDataURLToPNG, stringToDataURL } from "../../utils";
import { AppStore } from "../app_store";
import { Migrator } from "../migrator";
import { ActionHandlerRegistry } from "./registry";
import { getConfig } from "../../config";

/** Handlers for document-level actions such as Load, Save, Import, Export, Undo/Redo, Reset */
export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.Export, function(action) {
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
          background: "#ffffff"
        }).then(png => {
          png.toBlob(blob => {
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
        const containerScriptText = await (await fetch(
          getConfig().ContainerURL
        )).text();
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
                const chart = ${JSON.stringify(this.chart)};
                const chartState = ${JSON.stringify(this.chartState)};
                const dataset = ${JSON.stringify(this.dataset)};
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

  REG.add(Actions.ExportTemplate, function(this, action) {
    action.target.generate(action.properties).then(base64 => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {
        type: "application/x-binary"
      });
      FileSaver.saveAs(
        blob,
        action.target.getFileName
          ? action.target.getFileName(action.properties)
          : "charticulator." + action.target.getFileExtension(action.properties)
      );
    });
  });

  REG.add(Actions.Save, function(action) {
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

  REG.add(Actions.SaveAs, function(action) {
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

  REG.add(Actions.Open, function(action) {
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

  REG.add(Actions.Load, function(action) {
    this.historyManager.clear();
    const state = new Migrator().migrate(
      action.projectData,
      CHARTICULATOR_PACKAGE.version
    );
    this.loadState(state);
  });

  REG.add(Actions.ImportDataset, function(action) {
    this.currentChartID = null;
    this.dataset = action.dataset;
    this.historyManager.clear();
    this.newChartEmpty();
    this.emit(AppStore.EVENT_DATASET);
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.ImportChartAndDataset, function(action) {
    this.historyManager.clear();

    this.currentChartID = null;
    this.currentSelection = null;
    this.dataset = action.dataset;

    this.chart = action.specification;
    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset
    );
    this.chartState = this.chartManager.chartState;

    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.ReplaceDataset, function(action) {
    this.saveHistory();

    this.currentChartID = null;
    this.currentSelection = null;
    this.dataset = action.dataset;

    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset
    );
    this.chartState = this.chartManager.chartState;

    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.Undo, function(action) {
    const state = this.historyManager.undo(this.saveDecoupledState());
    if (state) {
      const ss = this.saveSelectionState();
      this.loadState(state);
      this.loadSelectionState(ss);
    }
  });

  REG.add(Actions.Redo, function(action) {
    const state = this.historyManager.redo(this.saveDecoupledState());
    if (state) {
      const ss = this.saveSelectionState();
      this.loadState(state);
      this.loadSelectionState(ss);
    }
  });

  REG.add(Actions.Reset, function(action) {
    this.saveHistory();

    this.currentSelection = null;
    this.currentTool = null;
    this.emit(AppStore.EVENT_SELECTION);
    this.emit(AppStore.EVENT_CURRENT_TOOL);

    this.newChartEmpty();

    this.solveConstraintsAndUpdateGraphics();
  });
}

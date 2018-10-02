// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import { saveAs } from "file-saver";
import { Prototypes } from "../../../core";
import { Actions } from "../../actions";
import { renderDataURLToPNG } from "../../utils";
import { AppStore } from "../app_store";
import { Migrator } from "../migrator";
import { ActionHandlerRegistry } from "./registry";

/** Handlers for document-level actions such as Load, Save, Import, Export, Undo/Redo, Reset */
export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.Export, function(action) {
    (async () => {
      if (action.type == "svg") {
        const svg = await this.renderLocalSVG();
        const blob = new Blob([svg], { type: "image/svg;charset=utf-8" });
        saveAs(blob, "charticulator.svg", true);
      }
      if (action.type == "png") {
        const svgDataURL =
          "data:image/svg+xml;base64," + btoa(await this.renderLocalSVG());
        renderDataURLToPNG(svgDataURL, {
          mode: "scale",
          scale: action.options.scale || 2,
          background: "#ffffff"
        }).then(png => {
          png.toBlob(blob => {
            saveAs(blob, "charticulator.png", true);
          }, "image/png");
        });
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

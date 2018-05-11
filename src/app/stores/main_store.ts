import { deepClone, EventEmitter, Specification } from "../../core";
import { Dispatcher } from "../../core";

import { Actions } from "../actions";

import { BaseStore } from "./base";

import { ChartStore, ChartStoreState } from "./chart";
import { DatasetStore, DatasetStoreState } from "./dataset";

import { Dataset } from "../../core";

import { renderDataURLToPNG } from "../utils";

import {
  renderChartToLocalString,
  renderChartToString
} from "../views/canvas/chart_display";

import { saveAs } from "file-saver";

import { CharticulatorWorker } from "../../worker";
import {
  AbstractBackend,
  ItemData,
  ItemDescription,
  ItemMetadata
} from "../backend/abstract";
import { IndexedDBBackend } from "../backend/indexedDB";
import { ExportTemplateTarget } from "../template";

export class HistoryManager<StateType> {
  public statesBefore: StateType[] = [];
  public statesAfter: StateType[] = [];

  public addState(state: StateType) {
    this.statesAfter = [];
    this.statesBefore.push(state);
  }

  public undo(currentState: StateType): StateType {
    if (this.statesBefore.length > 0) {
      const item = this.statesBefore.pop();
      this.statesAfter.push(currentState);
      return item;
    } else {
      return null;
    }
  }

  public redo(currentState: StateType): StateType {
    if (this.statesAfter.length > 0) {
      const item = this.statesAfter.pop();
      this.statesBefore.push(currentState);
      return item;
    } else {
      return null;
    }
  }

  public clear() {
    this.statesAfter = [];
    this.statesBefore = [];
  }
}

export interface MainStoreState {
  dataset: DatasetStoreState;
  chart: ChartStoreState;
}

export class MainStore extends BaseStore {
  public static EVENT_STATUSBAR = "status-bar";

  public readonly parent: null;
  public readonly worker: CharticulatorWorker;

  public datasetStore: DatasetStore;
  public chartStore: ChartStore;

  public statusBar: { [name: string]: string };

  public historyManager: HistoryManager<MainStoreState>;

  public backend: AbstractBackend;
  public currentChartID: string;

  constructor(worker: CharticulatorWorker, dataset: Dataset.Dataset) {
    super(null);
    this.worker = worker;

    this.backend = new IndexedDBBackend();

    this.statusBar = {};
    this.historyManager = new HistoryManager<MainStoreState>();

    this.datasetStore = new DatasetStore(this);
    this.datasetStore.setDataset(dataset);

    this.chartStore = new ChartStore(this);

    this.registerExportTemplateTarget(
      "Charticulator Template",
      (template: Specification.Template.ChartTemplate) => {
        return {
          getProperties: () => [],
          getFileExtension: () => "json",
          generate: () => {
            return new Promise<string>((resolve, reject) => {
              const r = btoa(JSON.stringify(template, null, 2));
              resolve(r);
            });
          }
        };
      }
    );
  }

  public saveState(): MainStoreState {
    return {
      dataset: this.datasetStore.saveState(),
      chart: this.chartStore.saveState()
    };
  }

  public saveDecoupledState(): MainStoreState {
    const state = this.saveState();
    return deepClone(state);
  }

  public loadState(state: MainStoreState) {
    this.datasetStore.loadState(state.dataset);
    this.chartStore.loadState(state.chart);
  }

  public saveHistory() {
    this.historyManager.addState(this.saveDecoupledState());
  }

  public renderSVG() {
    const svg =
      '<?xml version="1.0" standalone="no"?>' +
      renderChartToString(
        this.datasetStore.dataset,
        this.chartStore.chart,
        this.chartStore.chartState
      );
    return svg;
  }

  public async renderLocalSVG() {
    const svg = await renderChartToLocalString(
      this.datasetStore.dataset,
      this.chartStore.chart,
      this.chartStore.chartState
    );
    return '<?xml version="1.0" standalone="no"?>' + svg;
  }

  public handleAction(action: Actions.Action) {
    // if (action instanceof Actions.UpdateStatusBar) {
    //     for (let key in action.updates) {
    //         if (!action.updates.hasOwnProperty(key)) continue;
    //         this.statusBar[key] = action.updates[key];
    //     }
    //     this.emit(MainStore.EVENT_STATUSBAR);
    // }
    if (action instanceof Actions.Undo) {
      const state = this.historyManager.undo(this.saveDecoupledState());
      if (state) {
        const ss = this.chartStore.saveSelectionState();
        const dss = this.datasetStore.saveSelectionState();
        this.loadState(state);
        this.datasetStore.loadSelectionState(dss);
        this.chartStore.loadSelectionState(ss);
      }
    }
    if (action instanceof Actions.Redo) {
      const state = this.historyManager.redo(this.saveDecoupledState());
      if (state) {
        const ss = this.chartStore.saveSelectionState();
        const dss = this.datasetStore.saveSelectionState();
        this.loadState(state);
        this.datasetStore.loadSelectionState(dss);
        this.chartStore.loadSelectionState(ss);
      }
    }
    if (action instanceof Actions.Export) {
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
    }
    if (action instanceof Actions.Save) {
      const state = this.saveState();
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/x-json;charset=utf-8"
      });
      saveAs(blob, "charticulator.json", true);
    }
    if (action instanceof Actions.Load) {
      this.historyManager.clear();
      this.loadState(action.projectData);
    }
    if (action instanceof Actions.ImportDataset) {
      this.currentChartID = null;
      this.historyManager.clear();
    }
  }

  public async backendOpenChart(id: string) {
    const chart = await this.backend.get(id);
    this.currentChartID = id;
    this.historyManager.clear();
    this.loadState(chart.data.state);
  }

  public async backendSaveChart() {
    if (this.currentChartID != null) {
      const chart = await this.backend.get(this.currentChartID);
      chart.data.state = this.saveState();
      const svg =
        "data:image/svg+xml;base64," + btoa(await this.renderLocalSVG());
      const png = await renderDataURLToPNG(svg, {
        mode: "thumbnail",
        thumbnail: [200, 150]
      });
      chart.metadata.thumbnail = png.toDataURL();
      await this.backend.put(chart.id, chart.data, chart.metadata);
    }
  }

  public async backendSaveChartAs(name: string) {
    const state = this.saveState();
    const svg =
      "data:image/svg+xml;base64," + btoa(await this.renderLocalSVG());
    const png = await renderDataURLToPNG(svg, {
      mode: "thumbnail",
      thumbnail: [200, 150]
    });
    const id = await this.backend.create(
      "chart",
      {
        state,
        name
      },
      {
        name,
        dataset: this.datasetStore.dataset.name,
        thumbnail: png.toDataURL()
      }
    );
    this.currentChartID = id;
    return id;
  }

  private registeredExportTemplateTargets = new Map<
    string,
    (template: Specification.Template.ChartTemplate) => ExportTemplateTarget
  >();

  public registerExportTemplateTarget(
    name: string,
    ctor: (
      template: Specification.Template.ChartTemplate
    ) => ExportTemplateTarget
  ) {
    this.registeredExportTemplateTargets.set(name, ctor);
  }

  public unregisterExportTemplateTarget(name: string) {
    this.registeredExportTemplateTargets.delete(name);
  }

  public listExportTemplateTargets(): string[] {
    const r: string[] = [];
    this.registeredExportTemplateTargets.forEach((x, i) => {
      r.push(i);
    });
    return r;
  }

  public createExportTemplateTarget(
    name: string,
    template: Specification.Template.ChartTemplate
  ): ExportTemplateTarget {
    return this.registeredExportTemplateTargets.get(name)(template);
  }
}

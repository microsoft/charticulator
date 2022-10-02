/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable max-lines-per-function */

import * as React from "react";
import * as ReactDOM from "react-dom";

import { MainView } from "./main_view";
import { AppStore, Migrator } from "./stores";

import {
  initialize,
  Dispatcher,
  Specification,
  Dataset,
  deepClone,
  setFormatOptions,
  defaultCurrency,
  defaultDelimiter,
  defaultDigitsGroup,
  defaultNumberFormat,
  parseSafe,
  Prototypes,
} from "../core";
import { ExtensionContext, Extension } from "./extension";
import { Action } from "./actions/actions";

import { CharticulatorWorker, CharticulatorWorkerInterface } from "../worker";
import { CharticulatorAppConfig } from "./config";

import { ExportTemplateTarget } from "./template";
import { parseHashString } from "./utils";
import { Actions } from "./actions";
import { DatasetSourceSpecification } from "../core/dataset/loader";
import { LocaleFileFormat } from "../core/dataset/dsv_parser";
import { MainTabs } from "./views/file_view";
import { makeDefaultDataset } from "./default_dataset";
import { strings } from "../strings";
import { LocalStorageKeys } from "./globals";

// Also available from @uifabric/icons (7 and earlier) and @fluentui/font-icons-mdl2 (8+)
import { initializeIcons } from "../fabric-icons/src/index";
initializeIcons();
import { defaultVersionOfTemplate } from "./stores/defaults";
import { MenuBarHandlers, MenubarTabButton } from "./views/menubar";
import { TelemetryRecorder } from "./components";
import { AttributeMap, MappingType } from "../core/specification";
import { NestedChartEditorOptions } from "../core/prototypes/controls";
import { EditorType } from "./stores/app_store";
import { LocalizationConfig } from "../container/container";

export class ApplicationExtensionContext implements ExtensionContext {
  constructor(public app: Application) { }

  public getGlobalDispatcher(): Dispatcher<Action> {
    return this.app.appStore.dispatcher;
  }

  /** Get the store */
  public getAppStore(): AppStore {
    return this.app.appStore;
  }

  public getApplication(): Application {
    return this.app;
  }
}
export const enum NestedEditorMessageType {
  Save = "save",
  Initialized = "initialized",
}
export interface NestedEditorMessage {
  id: string;
  type: NestedEditorMessageType;
  specification?: Specification.Chart;
  template?: Specification.Template.ChartTemplate;
}

export enum NestedEditorEventType {
  Load = "load",
  Save = "save",
}

export interface NestedEditorData {
  id: string;
  type: NestedEditorEventType;
  dataset: Dataset.Dataset;
  specification: Specification.Chart;
  originSpecification?: Specification.Chart;
  template: Specification.Template.ChartTemplate;
  width: number;
  height: number;
  filterCondition: {
    column: string;
    value: any;
  };
}

export class Application {
  public worker: CharticulatorWorkerInterface;
  public appStore: AppStore;
  public mainView: MainView;
  public extensionContext: ApplicationExtensionContext;

  private config: CharticulatorAppConfig;
  private containerID: string;

  private nestedEditor: {
    onOpenEditor: (
      options: Prototypes.Controls.NestedChartEditorOptions,
      object: Specification.Object<AttributeMap>,
      property: Prototypes.Controls.Property
    ) => void;
  };

  public destroy() {
    ReactDOM.unmountComponentAtNode(document.getElementById(this.containerID));
  }

  public async initialize(
    config: CharticulatorAppConfig,
    containerID: string,
    workerConfig: {
      workerScriptContent?: string;
      worker?: CharticulatorWorkerInterface;
    },
    localization: LocalizationConfig,
    handlers?: {
      menuBarHandlers?: MenuBarHandlers;
      telemetry?: TelemetryRecorder;
      tabButtons?: MenubarTabButton[];
      nestedEditor?: {
        onOpenEditor: (
          options: Prototypes.Controls.NestedChartEditorOptions,
          object: Specification.Object<AttributeMap>,
          property: Prototypes.Controls.Property
        ) => void;
      };
    }
  ) {
    this.config = config;
    this.containerID = containerID;
    await initialize(config);

    if (workerConfig.worker) {
      this.worker = workerConfig.worker;
    } else {
      this.worker = new CharticulatorWorker(workerConfig.workerScriptContent);
    }
    await this.worker.initialize(config);

    this.appStore = new AppStore(this.worker, makeDefaultDataset());

    if (handlers?.nestedEditor) {
      this.nestedEditor = handlers?.nestedEditor;
      if (handlers?.nestedEditor.onOpenEditor) {
        this.appStore.addListener(
          AppStore.EVENT_OPEN_NESTED_EDITOR,
          (
            options: NestedChartEditorOptions,
            object: Specification.Object<AttributeMap>,
            property: Prototypes.Controls.Property
          ) => {
            this.nestedEditor.onOpenEditor(options, object, property);
          }
        );
      }
    }

    try {
      const CurrencySymbol = parseSafe(
        window.localStorage.getItem(LocalStorageKeys.CurrencySymbol),
        defaultCurrency
      );
      const DelimiterSymbol = parseSafe(
        window.localStorage.getItem(LocalStorageKeys.DelimiterSymbol) ||
        defaultDelimiter,
        defaultDelimiter
      );
      const GroupSymbol = parseSafe(
        window.localStorage.getItem(LocalStorageKeys.GroupSymbol),
        defaultDigitsGroup
      );
      const NumberFormatRemove = parseSafe(
        window.localStorage.getItem(LocalStorageKeys.NumberFormatRemove) ||
        defaultNumberFormat.remove,
        defaultNumberFormat.remove
      );

      this.appStore.setLocaleFileFormat({
        currency: parseSafe(CurrencySymbol, defaultCurrency),
        delimiter: DelimiterSymbol,
        group: parseSafe(GroupSymbol, defaultDigitsGroup),
        numberFormat: {
          decimal: NumberFormatRemove === "," ? "." : ",",
          remove: NumberFormatRemove === "," ? "," : ".",
        },
      });
      setFormatOptions({
        currency: parseSafe(CurrencySymbol, defaultCurrency),
        grouping: parseSafe(GroupSymbol, defaultDigitsGroup),
        decimal: NumberFormatRemove === "," ? "." : ",",
        thousands: NumberFormatRemove === "," ? "," : ".",
      });
    } catch (ex) {
      setFormatOptions({
        currency: [localization?.currency, ""] ?? defaultCurrency,
        grouping: defaultDigitsGroup,
        decimal: localization?.decimalDelimiter ?? defaultNumberFormat.decimal,
        thousands:
          localization?.thousandsDelimiter ?? defaultNumberFormat.decimal,
      });
      console.warn("Loading localization settings failed");
    }

    (window as any).mainStore = this.appStore;
    ReactDOM.render(
      <MainView
        store={this.appStore}
        ref={(e) => (this.mainView = e)}
        viewConfiguration={this.config.MainView}
        menuBarHandlers={handlers?.menuBarHandlers}
        tabButtons={handlers?.tabButtons}
        telemetry={handlers?.telemetry}
      />,
      document.getElementById(containerID)
    );

    this.extensionContext = new ApplicationExtensionContext(this);

    // Load extensions if any
    if (config.Extensions) {
      config.Extensions.forEach((ext) => {
        const scriptTag = document.createElement("script");
        if (typeof ext.script == "string") {
          scriptTag.src = ext.script;
        } else {
          scriptTag.integrity = ext.script.integrity;
          scriptTag.src = ext.script.src + "?sha256=" + ext.script.sha256;
        }
        scriptTag.onload = () => {
          // An extension may include script for its initialization
          const initFn = new Function("application", ext.initialize);
          initFn(this);
        };
        document.body.appendChild(scriptTag);
      });
    }

    await this.processHashString();
  }

  // eslint-disable-next-line
  public setupNestedEditor(
    id: string,
    onInitialized?: (
      id: string,
      load: (data: NestedEditorData) => void
    ) => void,
    onSave?: (data: any) => void,
    onClose?: () => void,
    editorMode?: EditorType
  ) {
    const appStore = this.appStore;
    const setupCallback = ((data: any) => {
      const info: NestedEditorData = data;
      info.specification.mappings.width = {
        type: MappingType.value,
        value: info.width,
      } as Specification.ValueMapping;
      info.specification.mappings.height = {
        type: MappingType.value,
        value: info.height,
      } as Specification.ValueMapping;

      const chartManager = new Prototypes.ChartStateManager(
        info.specification,
        info.dataset,
        null,
        {},
        {},
        deepClone(info.specification)
      );

      // if version wasn't saved in template we assume it is 2.0.3
      if (info.template && info.template.version == undefined) {
        info.template.version = defaultVersionOfTemplate;
      }
      const newState = new Migrator().migrate(
        {
          chart: chartManager.chart,
          chartState: chartManager.chartState,
          dataset: chartManager.dataset,
          version: info.template?.version || defaultVersionOfTemplate,
          originDataset: appStore.originDataset,
        },
        CHARTICULATOR_PACKAGE.version
      );
      appStore.dispatcher.dispatch(
        new Actions.ImportChartAndDataset(
          info.specification,
          info.dataset,
          {
            filterCondition: info.filterCondition,
          },
          info.originSpecification
        )
      );

      if (info.template) {
        info.template.version = newState.version;
      }
      if (onClose) {
        appStore.addListener(AppStore.EVENT_NESTED_EDITOR_CLOSE, () => {
          onClose();
        });
      }

      let type =
        this.config.CorsPolicy && this.config.CorsPolicy.Embedded
          ? EditorType.Embedded
          : EditorType.Nested;

      // settings from outside overrides the configuration
      if (editorMode) {
        type = editorMode;
      }

      appStore.setupNestedEditor((newSpecification) => {
        const template = deepClone(appStore.buildChartTemplate());
        if (window.opener) {
          window.opener.postMessage(
            {
              id,
              type: NestedEditorMessageType.Save,
              specification: newSpecification,
              template,
            } as NestedEditorMessage,
            document.location.origin
          );
        } else {
          if (this.config.CorsPolicy && this.config.CorsPolicy.TargetOrigins) {
            window.parent.postMessage(
              {
                id,
                type: NestedEditorMessageType.Save,
                specification: newSpecification,
                template,
              } as NestedEditorMessage,
              this.config.CorsPolicy.TargetOrigins
            );
          }
          if (
            (this.config.CorsPolicy && this.config.CorsPolicy.Embedded) ||
            onSave
          ) {
            onSave({
              specification: newSpecification,
              template,
            } as NestedEditorMessage);
          }
        }
      }, type);
    }).bind(this);
    window.addEventListener("message", (e: MessageEvent) => {
      if (e.data.id != id) {
        return;
      }
      setupCallback(e.data);
    });
    if (window.opener) {
      window.opener.postMessage(
        {
          id,
          type: NestedEditorMessageType.Initialized,
        } as NestedEditorMessage,
        document.location.origin
      );
    } else {
      if (this.config.CorsPolicy && this.config.CorsPolicy.TargetOrigins) {
        window.parent.postMessage(
          {
            id,
            type: NestedEditorMessageType.Initialized,
          } as NestedEditorMessage,
          this.config.CorsPolicy.TargetOrigins
        );
      } else if (
        (this.config.CorsPolicy &&
          this.config.CorsPolicy.Embedded &&
          onInitialized) ||
        onInitialized
      ) {
        onInitialized(id, (data: any) => {
          setupCallback(data);
        });
      }
    }
  }

  public async processHashString() {
    // Load saved state or data from hash
    const hashParsed = parseHashString(document.location.hash);

    if (hashParsed.nestedEditor) {
      document.title = strings.app.nestedChartTitle;
      this.setupNestedEditor(hashParsed.nestedEditor);
    } else if (hashParsed.loadDataset) {
      // Load from a dataset specification json format
      const spec: DatasetSourceSpecification = JSON.parse(hashParsed.dataset);
      const loader = new Dataset.DatasetLoader();
      const dataset = await loader.loadDatasetFromSourceSpecification(spec);
      this.appStore.dispatcher.dispatch(new Actions.ImportDataset(dataset));
    } else if (hashParsed.loadCSV) {
      // Quick load from one or two CSV files
      // default to comma delimiter, and en-US number format
      const localeFileFormat: LocaleFileFormat = {
        delimiter: defaultDelimiter,
        numberFormat: defaultNumberFormat,
        currency: null,
        group: null,
      };
      const spec: DatasetSourceSpecification = {
        tables: hashParsed.loadCSV
          .split("|")
          .map((x) => ({ url: x, localeFileFormat })),
      };
      const loader = new Dataset.DatasetLoader();
      const dataset = await loader.loadDatasetFromSourceSpecification(spec);
      this.appStore.dispatcher.dispatch(new Actions.ImportDataset(dataset));
    } else if (hashParsed.load) {
      // Load a saved state
      const value = await fetch(hashParsed.load);
      const json = await value.json();
      this.appStore.dispatcher.dispatch(new Actions.Load(json.state));
    } else {
      this.mainView.refMenuBar.showFileModalWindow(MainTabs.new);
    }
  }

  public addExtension(extension: Extension) {
    extension.activate(this.extensionContext);
  }

  public registerExportTemplateTarget(
    name: string,
    ctor: (
      template: Specification.Template.ChartTemplate
    ) => ExportTemplateTarget
  ) {
    this.appStore.registerExportTemplateTarget(name, ctor);
  }

  public unregisterExportTemplateTarget(name: string) {
    this.appStore.unregisterExportTemplateTarget(name);
  }
}

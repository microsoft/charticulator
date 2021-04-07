// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOM from "react-dom";

import { MainView } from "./main_view";
import { AppStore } from "./stores";

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
import { MenuBarHandlers } from "./views/menubar";
import { TelemetryRecorder } from "./components";
import { MappingType } from "../core/specification";

export class ApplicationExtensionContext implements ExtensionContext {
  constructor(public app: Application) {}

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

export class Application {
  public worker: CharticulatorWorkerInterface;
  public appStore: AppStore;
  public mainView: MainView;
  public extensionContext: ApplicationExtensionContext;

  private config: CharticulatorAppConfig;
  private containerID: string;

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
    handlers?: {
      menuBarHandlers?: MenuBarHandlers;
      telemetry?: TelemetryRecorder;
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
      console.warn("Loadin localization settings failed");
    }

    // (window as any).mainStore = this.appStore;

    const mainView = (
      <MainView
        store={this.appStore}
        ref={(e) => (this.mainView = e)}
        viewConfiguration={this.config.MainView}
        menuBarHandlers={handlers?.menuBarHandlers}
        telemetry={handlers?.telemetry}
      />
    );

    ReactDOM.render(mainView, document.getElementById(containerID));

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

  public setupNestedEditor(
    id: string,
    onInitialized?: (id: string, load: (data: any) => void) => void,
    onSave?: (data: any) => void
  ) {
    const appStore = this.appStore;
    const setupCallback = ((data: any) => {
      const info: {
        dataset: Dataset.Dataset;
        specification: Specification.Chart;
        template: Specification.Template.ChartTemplate;
        width: number;
        height: number;
        filterCondition: {
          column: string;
          value: any;
        };
      } = data;
      info.specification.mappings.width = {
        type: MappingType.value,
        value: info.width,
      } as Specification.ValueMapping;
      info.specification.mappings.height = {
        type: MappingType.value,
        value: info.height,
      } as Specification.ValueMapping;
      appStore.dispatcher.dispatch(
        new Actions.ImportChartAndDataset(info.specification, info.dataset, {
          filterCondition: info.filterCondition,
        })
      );
      appStore.originTemplate = info.template;
      appStore.setupNestedEditor(
        (newSpecification) => {
          const template = deepClone(appStore.buildChartTemplate());
          if (window.opener) {
            window.opener.postMessage(
              {
                id,
                type: "save",
                specification: newSpecification,
                template,
              },
              document.location.origin
            );
          } else {
            if (
              this.config.CorsPolicy &&
              this.config.CorsPolicy.TargetOrigins
            ) {
              window.parent.postMessage(
                {
                  id,
                  type: "save",
                  specification: newSpecification,
                  template,
                },
                this.config.CorsPolicy.TargetOrigins
              );
            }
            if (
              this.config.CorsPolicy &&
              this.config.CorsPolicy.Embedded &&
              onSave
            ) {
              onSave({
                specification: newSpecification,
                template,
              });
            }
          }
        },
        this.config.CorsPolicy && this.config.CorsPolicy.Embedded
          ? "embedded"
          : "nested"
      );
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
          type: "initialized",
        },
        document.location.origin
      );
    } else {
      if (this.config.CorsPolicy && this.config.CorsPolicy.TargetOrigins) {
        window.parent.postMessage(
          {
            id,
            type: "initialized",
          },
          this.config.CorsPolicy.TargetOrigins
        );
      } else if (
        this.config.CorsPolicy &&
        this.config.CorsPolicy.Embedded &&
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

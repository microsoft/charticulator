import * as React from "react";
import * as ReactDOM from "react-dom";

import { MainView } from "./main_view";
import { MainStore } from "./stores";

import { CharticulatorCoreConfig, initialize, Dispatcher } from "../core";
import { ExtensionContext, Extension } from "./extension";
import { Action } from "./actions/actions";

import { CharticulatorWorker } from "../worker";
import { CharticulatorAppConfig } from "./config";

import { ExportTemplateTarget } from "./template";

export class ApplicationExtensionContext implements ExtensionContext {
  constructor(public app: Application) {}

  public getGlobalDispatcher(): Dispatcher<Action> {
    return this.app.mainStore.dispatcher;
  }

  public getMainStore(): MainStore {
    return this.app.mainStore;
  }

  public getApplication(): Application {
    return this.app;
  }
}

export class Application {
  public worker: CharticulatorWorker;
  public mainStore: MainStore;
  public extensionContext: ApplicationExtensionContext;

  public async initialize(
    config: CharticulatorAppConfig,
    containerID: string,
    workerScriptURL: string
  ) {
    await initialize(config);
    this.worker = new CharticulatorWorker(workerScriptURL);
    await this.worker.initialize(config);

    const rows: any[] = [];
    let monthIndex = 0;
    for (const month of [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ]) {
      let cityIndex = 0;
      for (const city of ["City1", "City2", "City3"]) {
        const temperature =
          50 +
          30 *
            Math.sin(
              (monthIndex + 0.5) * Math.PI / 12 + cityIndex * Math.PI / 2
            );
        rows.push({
          _id: "ID" + rows.length,
          Month: month,
          City: city,
          Temperature: temperature
        });
        cityIndex += 1;
      }
      monthIndex += 1;
    }
    this.mainStore = new MainStore(this.worker, {
      tables: [
        {
          name: "Temperature",
          columns: [
            {
              name: "Month",
              type: "string",
              metadata: {
                kind: "categorical",
                order: [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec"
                ]
              }
            },
            { name: "City", type: "string", metadata: { kind: "categorical" } },
            {
              name: "Temperature",
              type: "number",
              metadata: { kind: "numerical", format: ".1f" }
            }
          ],
          rows
        }
      ],
      name: "demo"
    });
    (window as any).mainStore = this.mainStore;
    ReactDOM.render(
      <MainView
        store={this.mainStore}
        disableFileView={config.DisableFileView}
      />,
      document.getElementById(containerID)
    );

    this.extensionContext = new ApplicationExtensionContext(this);

    // Load extensions if any
    if (config.Extensions) {
      config.Extensions.forEach(ext => {
        const scriptTag = document.createElement("script");
        scriptTag.src = ext.script;
        scriptTag.onload = () => {
          // tslint:disable-next-line no-eval
          eval(
            "(function() { return function(application) { " +
              ext.initialize +
              " } })()"
          )(this);
        };
        document.body.appendChild(scriptTag);
      });
    }
  }

  public addExtension(extension: Extension) {
    extension.activate(this.extensionContext);
  }

  public registerExportTemplateTarget(
    name: string,
    ctor: () => ExportTemplateTarget
  ) {
    this.mainStore.registerExportTemplateTarget(name, ctor);
  }

  public unregisterExportTemplateTarget(name: string) {
    this.mainStore.unregisterExportTemplateTarget(name);
  }
}

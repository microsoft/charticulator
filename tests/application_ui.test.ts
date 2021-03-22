// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { expect } from "chai";

import { Application } from "../dist/scripts/app/index";
import { CharticulatorWorker } from "../dist/scripts/worker/index";
declare const Charticulator: any;

describe("Charticulator", () => {
  let application: Application = null;
  // The directory containing test cases
  before(function (done) {
    this.timeout(10000);
    fetch(`./base/dist/scripts/config.json`).then((responce) => {
      responce.text().then((config) => {
        fetch(`./base/dist/scripts/worker.bundle.js`).then((responce) => {
          responce.text().then((script) => {
            const blob = new Blob([script], { type: "application/javascript" });

            const workerScript = URL.createObjectURL(blob);
            const container = document.createElement("div");
            container.id = "container";
            document.querySelector("body").appendChild(container);
            application = new Charticulator.Application();
            application.initialize(config as any, "container", workerScript);
            done();
          });
        });
      });
    });
  });

  it("application is defined", (done) => {
    const isDone = expect(application).to.not.null;
    done();
  }).timeout(10000);
}).timeout(100000);

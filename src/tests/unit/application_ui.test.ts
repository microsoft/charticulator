// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { expect } from "chai";

declare const CHARTICULATOR_CONFIG: any;
declare const CHARTICULATOR_PACKAGE: any;
declare const Charticulator: any;

describe("Plot segment", () => {
  // The directory containing test cases
  before((done) => {
    fetch(`./base/dist/scripts/config.json`).then((responce) => {
      responce.text().then((config) => {
        fetch(`./base/dist/scripts/worker.bundle.js`).then((responce) => {
          responce.text().then((script) => {
            const blob = new Blob([script], { type: "application/javascript" });

            const workerScript = URL.createObjectURL(blob);
            expect(Charticulator).to.not.null(
              "",
              "Charticulator name space is loaded"
            );
            const container = document.createElement("div");
            container.id = "container";
            document.querySelector("body").appendChild(container);
            const application = new Charticulator.Application();
            application.initialize(config as any, "container", workerScript);
            done();
          });
        });
      });
    });
  });

  it("binding data to axis adds property", (done) => {
    done();
  });
}).timeout(100000);

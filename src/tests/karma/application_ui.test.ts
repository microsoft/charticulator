// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";

import { Application } from "../../app/index";
import { Actions } from "../../app/index";
import { ObjectItem } from "../../core/prototypes";
import { DataKind, DataType } from "../../core/specification";
import { OrderMode } from "../../core/specification/types";
import { strings } from "../../strings";
import { findElementsByClassID } from "./utils";
import { DragData } from "../../app";
// declare const Charticulator: any;

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
            application = new Application();
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
  }).timeout(1000000);

  xit("binds data to X axis", (done) => {
    const store = application.appStore;

    const plotSegments = [
      ...findElementsByClassID(store.chart, "plot-segment"),
    ];

    plotSegments.forEach((ps: ObjectItem) => {
      new Actions.BindDataToAxis(
        ps.object,
        "xData",
        null,
        new DragData.DataExpression(
          store.dataset.tables[0],
          "avg(Month)",
          DataType.Date,
          {
            kind: DataKind.Temporal,
            orderMode: OrderMode.order,
            order: strings.dataset.months,
          },
          null
        )
      ).dispatch(store.dispatcher);
    });
    done();
  }).timeout(1000000);
}).timeout(100000);

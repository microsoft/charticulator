// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect, use } from "chai";

import { Application } from "../../app/index";
import { Actions } from "../../app/index";
import { ObjectItem } from "../../core/prototypes";
import { DataKind, DataType } from "../../core/specification";
import { OrderMode } from "../../core/specification/types";
import { strings } from "../../strings";
import {
  closeStartMenuPanel,
  findElementsByClassID,
  getChartCanvas,
} from "./utils";
import { DragData } from "../../app";
import { Expression } from "../../core";
import { matchSnapshot } from "chai-karma-snapshot";
const config = require("../../../config.test.yml");
const workerBundle = require("raw-loader?esModule=false!../../../dist/scripts/worker.bundle.js");
use(matchSnapshot);

describe("Charticulator", () => {
  let application: Application = null;
  // The directory containing test cases
  before(function (done) {
    this.timeout(10000);
    const blob = new Blob([workerBundle], { type: "application/javascript" });

    const workerScript = URL.createObjectURL(blob);
    const container = document.createElement("div");
    container.id = "container";
    document.querySelector("body").appendChild(container);
    application = new Application();
    application
      .initialize(config as any, "container", workerScript)
      .then(() => {
        closeStartMenuPanel();
        done();
      });
  });

  it("application is defined", (done) => {
    const isDone =
      expect(application).to.not.null &&
      expect(application.appStore).to.not.null;
    done();
  }).timeout(1000000);

  it("binds data to X axis", (done) => {
    const store = application.appStore;

    const plotSegments = [
      ...findElementsByClassID(store.chart, "plot-segment"),
    ];

    plotSegments.forEach((ps: ObjectItem) => {
      const column = store.dataset.tables[0].columns[0];
      const aggregation = Expression.getDefaultAggregationFunction(column.type);
      const expression = Expression.functionCall(
        aggregation,
        Expression.variable(column.name)
      ).toString();

      new Actions.BindDataToAxis(
        ps.object,
        "xData",
        null,
        new DragData.DataExpression(
          store.dataset.tables[0],
          expression,
          DataType.String,
          {
            kind: DataKind.Categorical,
            orderMode: OrderMode.order,
            order: strings.dataset.months,
          },
          null
        )
      ).dispatch(store.dispatcher);
    });
    // wait the solver
    setTimeout(() => {
      expect(getChartCanvas()).to.matchSnapshot();
      done();
    }, 1000);
  });
}).timeout(100000);

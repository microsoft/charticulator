// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect, use } from "chai";

import { Application } from "../../app/index";
import { Actions } from "../../app/index";
import { ObjectItem } from "../../core/prototypes";
import {
  DataKind,
  DataType,
  ObjectProperties,
  PlotSegment,
} from "../../core/specification";
import { OrderMode } from "../../core/specification/types";
import { strings } from "../../strings";
import {
  clickOnToolbarButton,
  closeStartMenuPanel,
  findElementsByClassID,
  getChartCanvas,
  getLinkTypePanel,
  longTimeOut,
  mediumTimeOut,
  pathPrefix,
} from "./utils";
import { DragData } from "../../app";
import { Expression } from "../../core";
import { matchSnapshot } from "chai-karma-snapshot";
import { loadJSON, waitSolver } from "../unit/utils";
declare const viewport: any;
const config = require("../../../config.test.yml");
const workerBundle = require("raw-loader?esModule=false!../../../dist/scripts/worker.bundle.js");

describe("Charticulator", () => {
  use(matchSnapshot);
  let application: Application = null;
  // The directory containing test cases
  before(function (done) {
    viewport.set(1920, 977);
    this.timeout(mediumTimeOut);
    const blob = new Blob([workerBundle], { type: "application/javascript" });

    const workerScript = URL.createObjectURL(blob);
    const container = document.createElement("div");
    container.id = "container";
    document.querySelector("body").appendChild(container);
    application = new Application();
    application
      .initialize(config as any, "container", {
        workerScriptContent: workerScript,
      })
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
  }).timeout(longTimeOut);

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
        ps.object as PlotSegment<ObjectProperties>,
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

  it("creates column names legend", (done) => {
    clickOnToolbarButton("Legend");
    const panel = getLinkTypePanel();
    const isDefined = expect(panel).to.not.null;
    const columnNamesButton: HTMLSpanElement = panel.querySelector<
      HTMLDivElement
    >(".charticulator-panel-list-view").children[1] as HTMLSpanElement;
    // switch legend type to "column names"
    columnNamesButton.click();

    // get panel witch columns list
    const dataColumnsSelector = panel.querySelector(
      ".charticulator__data-field-selector"
    );
    // get list of columns
    const columns = dataColumnsSelector.querySelectorAll<HTMLSpanElement>(
      "span.el-text"
    );
    // select all coulmns
    columns.forEach((column) => column.click());

    const createLegendButton = panel.querySelector<HTMLSpanElement>(
      ".charticulator__button-raised span"
    );
    createLegendButton.click();
    expect(getChartCanvas()).to.matchSnapshot();
    done();
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  it("open chart", async () => {
    const chartFilePath = `base/${pathPrefix}/nightingale.chart`;
    const chartFile = await loadJSON(chartFilePath);
    const store = application.appStore;
    store.dispatcher.dispatch(new Actions.Load(chartFile.state));
    expect(getChartCanvas()).to.matchSnapshot();
  });

  it("import template", async () => {
    const chartFilePath = `base/${pathPrefix}/default.chart`;
    const chartFile = await loadJSON(chartFilePath);
    const store = application.appStore;
    store.dispatcher.dispatch(new Actions.Load(chartFile.state));
    await waitSolver();

    const templateFilePath = `base/${pathPrefix}/default.tmplt`;
    const templateFile = await loadJSON(templateFilePath);
    store.dispatcher.dispatch(
      new Actions.ImportChartAndDataset(
        templateFile.specification,
        store.dataset,
        {}
      )
    );
    await waitSolver();

    expect(getChartCanvas()).to.matchSnapshot();
  }).timeout(longTimeOut);
}).timeout(longTimeOut);

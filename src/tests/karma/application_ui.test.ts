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
import { Dataset, Expression } from "../../core";
import { matchSnapshot } from "chai-karma-snapshot";
import { loadJSON, waitSolver } from "../unit/utils";
import { setSVGNumberDigits } from "../../app/utils";
import { AppStore } from "src/app/stores";
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
    setSVGNumberDigits(0);
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
  it("open nightingale chart", async () => {
    const chartFilePath = `base/${pathPrefix}/nightingale.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  });

  // test checks that charticulator opens saved chart correctly
  it("open mushrooms chart", async () => {
    const chartFilePath = `base/${pathPrefix}/mushrooms.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  });

  // test checks that charticulator opens saved chart correctly
  it("open bump_chart chart", async () => {
    const chartFilePath = `base/${pathPrefix}/bump_chart.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  });

  // test checks that charticulator opens saved chart correctly
  it("open bubble_chart chart", async () => {
    const chartFilePath = `base/${pathPrefix}/bubble_chart.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  });

  it("import default template", async () => {
    const chartFilePath = `base/${pathPrefix}/default.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));

    const templateFilePath = `base/${pathPrefix}/default.tmplt`;
    await testImport(
      application.appStore,
      await loadJSON(templateFilePath),
      application.appStore.dataset
    );
  }).timeout(longTimeOut);
}).timeout(longTimeOut);

async function testOpenChart(application: Application, chartFile: any) {
  application.appStore.dispatcher.dispatch(new Actions.Load(chartFile.state));
  await waitSolver();
  expect(getChartCanvas()).to.matchSnapshot();
}

async function testImport(
  store: AppStore,
  templateFile: any,
  dataset: Dataset.Dataset
) {
  store.dispatcher.dispatch(
    new Actions.ImportChartAndDataset(templateFile.specification, dataset, {})
  );
  await waitSolver();

  expect(getChartCanvas()).to.matchSnapshot();
}

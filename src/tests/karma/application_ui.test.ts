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
  clickOnButtonByTitle,
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
import { matchSnapshot } from "./serializer";
import { loadJSON, waitSolver } from "../unit/utils";
import { AppStore } from "../../app/stores";
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
      .initialize(
        config as any,
        "container",
        {
          workerScriptContent: workerScript,
        },
        {
          currency: "$",
          thousandsDelimiter: ",",
          decimalDelimiter: ".",
        }
      )
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

  xit("binds data to X axis", async () => {
    const store = application.appStore;

    const plotSegments = [
      ...findElementsByClassID(store.chart, "plot-segment"),
    ];

    plotSegments.forEach((ps: ObjectItem) => {
      const column = store.dataset.tables[0].columns[0];
      const aggregation = Expression.getDefaultAggregationFunction(
        column.type,
        DataKind.Categorical
      );
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
          expression
        ),
        false
      ).dispatch(store.dispatcher);
    });
    // wait the solver
    await waitSolver();
    expect(getChartCanvas()).to.matchSnapshot();
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  it("open mushrooms chart", async () => {
    const chartFilePath = `base/${pathPrefix}/mushrooms.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  it("open bump_chart chart", async () => {
    const chartFilePath = `base/${pathPrefix}/bump_chart.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  it("open bubble_chart chart", async () => {
    const chartFilePath = `base/${pathPrefix}/bubble_chart.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  xit("open 200_Mushrooms chart", async () => {
    const chartFilePath = `base/${pathPrefix}/200_Mushrooms.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  xit("open World_Population_2017 chart", async () => {
    const chartFilePath = `base/${pathPrefix}/World_Population_2017.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  }).timeout(longTimeOut);

  // test checks that charticulator opens saved chart correctly
  it("open nightingale chart", async () => {
    const chartFilePath = `base/${pathPrefix}/nightingale.chart`;
    await testOpenChart(application, await loadJSON(chartFilePath));
  }).timeout(longTimeOut);

  xit("creates column names legend", async () => {
    await clickOnButtonByTitle("Legend");
    const panel = getLinkTypePanel();

    //panel is active
    expect(panel).to.not.null;

    // switch legend type to "column names"
    await clickOnButtonByTitle("Column names");

    // get panel witch columns list
    const dataColumnsSelector = panel.querySelector(
      ".charticulator__data-field-selector"
    );
    // get list of columns
    const columns = dataColumnsSelector.querySelectorAll<HTMLSpanElement>(
      "span.el-text"
    );
    // select all columns
    columns.forEach((column) => column.click());

    //click to create legend button
    await clickOnButtonByTitle("Create Legend");

    await waitSolver();
    expect(getChartCanvas()).to.matchSnapshot();
  }).timeout(longTimeOut);

  // it("import default template", async () => {
  //   const chartFilePath = `base/${pathPrefix}/default.chart`;
  //   await testOpenChart(application, await loadJSON(chartFilePath));
  //
  //   const templateFilePath = `base/${pathPrefix}/default.tmplt`;
  //   await testImport(
  //     application.appStore,
  //     await loadJSON(templateFilePath),
  //     application.appStore.dataset
  //   );
  // }).timeout(longTimeOut);
});
// .timeout(longTimeOut);

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

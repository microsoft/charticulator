// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
// Copyright (c) Microsoft Corporation. All rights reserved.

import { Browser, Page } from "puppeteer";

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

import { DragData } from "../../app";
import { Dataset, Expression } from "../../core";
import { AppStore } from "../../app/stores";
import {
  loadJSON,
  shortTimeOut,
  longTimeOut,
  getImageName,
  ImageType,
  checkDifference,
  getAllImageNames,
  checkTestCase,
  closeStartMenuPanel,
  loadChart,
  ScreenshotArea,
  waitSolver,
  waitServer,
  mediumTimeOut,
} from "./utils";
import { expect } from "chai";

declare var window: any;

// Licensed under the MIT license.
const puppeteer = require("puppeteer");

describe("Charticulator application", function () {
  this.timeout(longTimeOut);
  let browser: Browser;
  let page: Page;

  before(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=medium",
      ],
    });
    page = await browser.newPage();
    page.setViewport({
      height: 1080,
      width: 1920,
    });
    await waitServer();
  });

  after(async () => {
    await browser.close();
  });

  it("application ui loaded", async function () {
    await page.goto("http://localhost:4000");

    await waitSolver();
    await closeStartMenuPanel(page);
    await checkTestCase(page, this.test.title);

    const isAppDefined = await page.evaluate(() => {
      return (window as any).application !== undefined;
    });
    const isDone = expect(isAppDefined).to.true;
  }).timeout(mediumTimeOut);

  it("application loads bar chart", async function () {
    const chartFilePath = "bar-chart.json";

    await loadChart(page, chartFilePath);
    await waitSolver();
    await closeStartMenuPanel(page);
    await checkTestCase(page, this.test.title, ScreenshotArea.Page);
  }).timeout(mediumTimeOut);

  it("application loads nightingale chart", async function () {
    const chartFilePath = "nightingale.chart";

    await loadChart(page, chartFilePath);
    await waitSolver();
    await closeStartMenuPanel(page);
    await checkTestCase(page, this.test.title, ScreenshotArea.Page);
  }).timeout(mediumTimeOut);

  it("application loads bump_chart chart", async function () {
    const chartFilePath = "bump_chart.chart";

    await loadChart(page, chartFilePath);
    await waitSolver();
    await closeStartMenuPanel(page);
    await checkTestCase(page, this.test.title, ScreenshotArea.Page);
  }).timeout(mediumTimeOut);

  it("application loads bubble_chart chart", async function () {
    const chartFilePath = "bubble_chart.chart";

    await loadChart(page, chartFilePath);
    await waitSolver();
    await closeStartMenuPanel(page);
    await checkTestCase(page, this.test.title, ScreenshotArea.Page);
  }).timeout(mediumTimeOut);

  it("application loads mushrooms chart", async function () {
    const chartFilePath = "mushrooms.chart";

    await loadChart(page, chartFilePath);
    await waitSolver();
    await closeStartMenuPanel(page);
    await checkTestCase(page, this.test.title, ScreenshotArea.Page);
  }).timeout(mediumTimeOut);
}).timeout(longTimeOut * 3);

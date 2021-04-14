// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { AppStoreState } from "../../app/stores";
import { deepClone } from "../../core";
import { DefaultAttributes } from "../../core/prototypes";
import { Actions, Application } from "../../app";
import { Page } from "puppeteer";

const PNG = require("pngjs").PNG;
const pixelmatch = require("pixelmatch");

export const imagesDirectory = "src/tests/unit/images";

export enum ImageType {
  Base = "base",
  Current = "current",
  Diff = "diff",
}

export enum ScreenshotArea {
  Page = "page",
  Canvas = "canvas",
  Glyph = "glyph",
}

export function getAllImageNames(testCaseName: string) {
  return [
    getImageName(testCaseName, ImageType.Current),
    getImageName(testCaseName, ImageType.Base),
    getImageName(testCaseName, ImageType.Diff),
  ];
}

export function getImageName(
  testCaseName: string,
  imageType: ImageType,
  additionalPostfix?: string
) {
  if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory);
  }
  const base = path.join(imagesDirectory, testCaseName.replace(/\W/g, "_"));

  if (!fs.existsSync(base)) {
    fs.mkdirSync(base);
  }
  return (
    path.join(
      base,
      `${imageType}${additionalPostfix ? "-" + additionalPostfix : ""}`
    ) + ".png"
  );
}

export function checkDifference(
  baseImagePath: string,
  currentImagePath: string,
  diffOutput: string
) {
  if (!fs.existsSync(baseImagePath)) {
    fs.copyFileSync(currentImagePath, baseImagePath);
  }
  const baseImage = PNG.sync.read(fs.readFileSync(baseImagePath));
  const currentImage = PNG.sync.read(fs.readFileSync(currentImagePath));
  const { width, height } = baseImage;
  const diff = new PNG({ width, height });

  const res = pixelmatch(
    baseImage.data,
    currentImage.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1,
    }
  );
  if (res > ((width * height) / 100) * 5) {
    // if more that 5% of pixels are different
    fs.writeFileSync(diffOutput, PNG.sync.write(diff));
    return true;
  }

  return false;
}

export function makeDefaultAttributes(state: AppStoreState) {
  const defaultAttributes: DefaultAttributes = {};
  const { elements } = state.chart;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    defaultAttributes[el._id] = deepClone(
      state.chartState.elements[i].attributes
    );
  }
  return defaultAttributes;
}

/** Test if a deep equals b with tolerance on numeric values */
export function expect_deep_approximately_equals(a: any, b: any, tol: number) {
  if (a == null || b == null) {
    // If either of a, b is null/undefined
    expect(a).equals(b);
  } else if (typeof a == "object" && typeof b == "object") {
    if (a instanceof Array && b instanceof Array) {
      // Both are arrays, recursively test for each item in the arrays
      expect(a.length).to.equals(b.length);
      for (let i = 0; i < a.length; i++) {
        expect_deep_approximately_equals(a[i], b[i], tol);
      }
    } else if (a instanceof Array || b instanceof Array) {
      // One of them is an array, the other one isn't, error
      throw new Error("type mismatch");
    } else {
      // Both are objects, recursively test for each key in the objects
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      expect(keysA).to.deep.equals(keysB);
      for (const key of keysA) {
        expect_deep_approximately_equals(a[key], b[key], tol);
      }
    }
  } else {
    if (typeof a == "number" && typeof b == "number") {
      // If both are numbers, test approximately equals
      expect(a as number).to.approximately(b as number, tol);
    } else {
      // Otherwise, use regular equals
      expect(a).equals(b);
    }
  }
}

// The directory containing chart cases
export const pathPrefix = "src/tests/unit/charts";
export async function loadJSON(chartfile: string) {
  const file = fs.readFileSync(path.join(pathPrefix, chartfile), "utf-8");
  return JSON.parse(file);
}

export async function waitSolver(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 1000));
}

export async function waitServer(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 30000));
}

export const longTimeOut = 1000000;
export const mediumTimeOut = 100000;
export const shortTimeOut = 3000;

declare var window: any;
declare var $: any;

export async function checkTestCase(
  page: Page,
  title: string,
  area: ScreenshotArea = ScreenshotArea.Page
) {
  const [currentImage, baseImage, diffImage] = getAllImageNames(title);

  if (area === ScreenshotArea.Page) {
    await page.screenshot({
      path: currentImage,
    });
  }
  if (area === ScreenshotArea.Canvas) {
    const canvasElement = await page.$(".chart-editor-view .canvas-view > g");
    await canvasElement.screenshot({
      path: currentImage,
    });
  }

  const isNoDiffrenece = expect(
    checkDifference(baseImage, currentImage, diffImage)
  ).to.false;
}

export async function loadChart(page: Page, chartFilePath: string) {
  const chartFile = await loadJSON(chartFilePath);
  await page.evaluateHandle((chartFile: any) => {
    const action: Actions.Load = new window.Charticulator.Actions.Load(
      chartFile.state
    );
    const application: Application = window.application;
    application.appStore.dispatcher.dispatch(action);
  }, chartFile);
}

export async function closeStartMenuPanel(page: Page) {
  try {
    const element = await page.waitForSelector(
      ".popup-container-modal .el-button-back",
      {
        timeout: 1000,
      }
    );
    if (element) {
      await element.click();
    }
  } catch (ex) {}
}

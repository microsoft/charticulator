// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Prototypes } from "../../core";
import { Chart } from "../../core/specification";

export function closeStartMenuPanel() {
  document
    .querySelector<HTMLElement>(".popup-container-modal .el-button-back")
    .click();
}

export function getChartCanvas() {
  return document.querySelector<SVGRectElement>(
    "div.chart-editor-canvas-view > svg.canvas-view"
  );
}

export function* findElementsByClassID(chart: Chart, classID: string) {
  for (const item of Prototypes.forEachObject(chart)) {
    if (Prototypes.isType(item.object.classID, classID)) {
      yield item;
    }
  }
}

export function clickOnToolbarButton(buttonName: string) {
  const toolbarButtons = document.querySelectorAll<HTMLDivElement>(`
    .charticulator__toolbar-horizontal .charticulator__button-multi-tool, 
    .charticulator__button-tool, charticulator__toolbar-vertical 
    .charticulator__button-multi-tool, .charticulator__button-tool`);

  toolbarButtons.forEach((button) => {
    if (button.title === buttonName) {
      button.click();
    }
  });
}

export function getLinkTypePanel() {
  return document.querySelector("div.charticulator__link-type-table");
}

export const longTimeOut = 1000000;
export const mediumTimeOut = 100000;
export const shortTimeOut = 3000;
// The directory containing chart cases
export const pathPrefix = "tests/unit/charts";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  DragController,
  PopupController,
  ResizeListeners,
} from "./controllers";

export let dragController = new DragController();
export let popupController = new PopupController();
export let resizeListeners = new ResizeListeners();

export enum LocalStorageKeys {
  NumberFormatRemove = "numberFormatRemove",
  DelimiterSymbol = "delimiterSymbol",
  CurrencySymbol = "currencySymbol",
  GroupSymbol = "groupSymbol",
}

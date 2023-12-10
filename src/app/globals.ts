// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  DragController,
  PopupController,
  ResizeListeners,
} from "./controllers";

export const dragController = new DragController();
export const popupController = new PopupController();
export const resizeListeners = new ResizeListeners();

export enum LocalStorageKeys {
  NumberFormatRemove = "numberFormatRemove",
  DelimiterSymbol = "delimiterSymbol",
  CurrencySymbol = "currencySymbol",
  GroupSymbol = "groupSymbol",
  UtcTimeZone = "utcTimeZone",
  bFormat = "bFormat",
}

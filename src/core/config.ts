/**
 * @ignore
 * @packageDocumentation
 * @preferred
 */

import { LocalizationConfig } from "../container/container";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
export interface CharticulatorCoreConfig {
  MapService?: {
    provider: string;
    apiKey: string;
  };
  localization: LocalizationConfig
}

let config: CharticulatorCoreConfig;

export function setConfig(_?: CharticulatorCoreConfig) {
  if (_ == null) {
    config = {
      localization: {
        currency: "$",
        thousandsDelimiter: ",",
        decemalDelimiter: ".",
        billionsFormat: "billions"
      }
    };
  } else {
    config = _;
  }
}

export function getConfig(): CharticulatorCoreConfig {
  return config;
}

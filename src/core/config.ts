/**
 * @ignore
 * @packageDocumentation
 * @preferred
 */

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
export interface CharticulatorCoreConfig {
  MapService?: {
    provider: string;
    apiKey: string;
  };
}

let config: CharticulatorCoreConfig;

export function setConfig(_?: CharticulatorCoreConfig) {
  if (_ == null) {
    config = {};
  } else {
    config = _;
  }
}

export function getConfig(): CharticulatorCoreConfig {
  return config;
}

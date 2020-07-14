// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { LocaleFileFormat } from "../dataset/dsv_parser";

export interface LocaleProvider {
  getLocaleFileFormat(): LocaleFileFormat;
  setLocaleFileFormat(value: LocaleFileFormat): void;
}

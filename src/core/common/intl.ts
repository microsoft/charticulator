// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { LocaleDelimiter } from "../dataset/dsv_parser";

export interface IntlProvider {
    getLocaleDelimiter(): LocaleDelimiter;
    setLocaleDelimiter(value: LocaleDelimiter): void;
}

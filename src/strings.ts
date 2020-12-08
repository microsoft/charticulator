// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MainTabs } from "./app/views/file_view";
import { DataType } from "./core/specification";

export const strings = {
    mainTabs: <{ [key in MainTabs]: string }>{
        about: "About",
        export: "Export",
        new: "New",
        open: "Open",
        options: "Options",
        save: "Save As"
    },
    typeDisplayNames: <{ [key in DataType]: string }>{
        boolean: "Boolean",
        date: "Date",
        number: "Number",
        string: "String",
    }
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ObjectClasses } from "../object";
import { CreationParameters, MarkClass } from "./mark";

import { AnchorElement } from "./anchor";
import { DataAxisClass } from "./data_axis";
import { ImageElementClass } from "./image";
import { LineElementClass } from "./line";
import { NestedChartElementClass } from "./nested_chart";
import { RectElementClass } from "./rect";
import { SymbolElementClass } from "./symbol";
import { TextElementClass } from "./text";
import { IconElementClass } from "./icon";
import { TextboxElementClass } from "./textbox";

export function registerClasses() {
  ObjectClasses.Register(AnchorElement);
  ObjectClasses.Register(RectElementClass);
  ObjectClasses.Register(LineElementClass);
  ObjectClasses.Register(SymbolElementClass);
  ObjectClasses.Register(TextElementClass);
  ObjectClasses.Register(TextboxElementClass);
  ObjectClasses.Register(ImageElementClass);
  ObjectClasses.Register(IconElementClass);
  ObjectClasses.Register(NestedChartElementClass);
  ObjectClasses.Register(DataAxisClass);
}

export { CreationParameters, MarkClass };

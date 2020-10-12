// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ObjectClasses } from "../common";
import { CustomLegendClass } from "./custom_legend";
import { CategoricalLegendClass } from "./categorical_legend";
import { NumericalColorLegendClass } from "./color_legend";
import { NumericalNumberLegendClass } from "./numerical_legend";

export function registerClasses() {
  ObjectClasses.Register(CustomLegendClass);
  ObjectClasses.Register(CategoricalLegendClass);
  ObjectClasses.Register(NumericalColorLegendClass);
  ObjectClasses.Register(NumericalNumberLegendClass);
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { PolarLineTestView } from "./polar_line";
import { ColorFilterTestView } from "./colorFilter";

export function register(f: any) {
  f("Graphics/PolarLine", PolarLineTestView);
  f("Graphics/ColorFilter", ColorFilterTestView);
}

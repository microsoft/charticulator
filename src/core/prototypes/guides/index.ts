// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ObjectClasses } from "../object";
import { GuideCoordinatorClass } from "./guide_coordinator";
import { GuidePolarCoordinatorClass } from "./polar_coordinator";
import { GuideClass } from "./guide";

export {
  GuideClass,
  GuideAxis,
  GuideProperties,
  GuideAttributeNames,
  GuideAttributes,
  GuidePropertyNames,
} from "./guide";

export {
  GuideCoordinatorAttributes,
  GuideCoordinatorClass,
  GuideCoordinatorProperties,
} from "./guide_coordinator";
export {
  PolarGuideCoordinatorAttributes,
  PolarGuideCoordinatorProperties,
  GuidePolarCoordinatorClass,
  GuidePolarCoordinatorProperties,
  PolarGuideObject,
  PolarGuideState,
} from "./polar_coordinator";

export function registerClasses() {
  ObjectClasses.Register(GuideClass);
  ObjectClasses.Register(GuideCoordinatorClass);
  ObjectClasses.Register(GuidePolarCoordinatorClass);
}

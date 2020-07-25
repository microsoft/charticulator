// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Specification, Prototypes } from "../../../../core";

export interface SnappableGuide<ElementType> {
  element: ElementType;
  guide: Prototypes.SnappingGuides.Description;
}

export interface SnappingAction<ElementType> {
  type: "snap" | "move" | "property" | "value-mapping";
  attribute?: string;
  property?: string;
  field?: string | string[];

  // move
  value?: Specification.AttributeValue;

  // snap
  snapElement?: ElementType;
  snapAttribute?: string;
}

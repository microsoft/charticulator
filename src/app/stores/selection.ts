// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Specification } from "../../core";

/** Base class for selections */
export abstract class Selection {}

/** ChartElement selection */
export class ChartElementSelection extends Selection {
  constructor(public chartElement: Specification.ChartElement) {
    super();
  }
}

/** Glyph selection */
export class GlyphSelection extends Selection {
  constructor(
    public plotSegment: Specification.PlotSegment = null,
    public glyph: Specification.Glyph
  ) {
    super();
  }
}

/** Mark selection */
export class MarkSelection extends Selection {
  constructor(
    public plotSegment: Specification.PlotSegment,
    public glyph: Specification.Glyph,
    public mark: Specification.Element
  ) {
    super();
  }
}

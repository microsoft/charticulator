// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Dispatcher } from "../common";
import { Glyph, Element, PlotSegment } from "../specification";
import * as Specification from "../specification";

// Helper functions for digest
export function objectDigest(obj?: Specification.Object) {
  return obj ? [obj.classID, obj._id] : null;
}

export class Action {
  public dispatch(dispatcher: Dispatcher<Action>) {
    dispatcher.dispatch(this);
  }

  public digest() {
    return { name: this.constructor.name };
  }
}

export class SelectMark extends Action {
  constructor(
    public plotSegment: PlotSegment,
    public glyph: Glyph,
    public mark: Element,
    public glyphIndex: number = null
  ) {
    super();
  }

  public digest() {
    return {
      name: "SelectMark",
      plotSegment: objectDigest(this.plotSegment),
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark),
      glyphIndex: this.glyphIndex
    };
  }
}

export class ClearSelection extends Action {
  public digest() {
    return {
      name: "ClearSelection"
    };
  }
}

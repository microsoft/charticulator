// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Dispatcher } from "../common";
import { Glyph, Element, PlotSegment } from "../specification";

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
      plotSegment: [this.plotSegment.classID, this.plotSegment._id],
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
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

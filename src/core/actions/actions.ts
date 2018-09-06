/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { Dispatcher } from "../common";
import { Glyph, Element } from "../specification";

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
    public glyph: Glyph,
    public mark: Element,
    public dataRowIndex: number[] = null
  ) {
    super();
  }

  public digest() {
    return {
      name: "SelectMark",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
      dataRowIndex: this.dataRowIndex
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

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Core part has two actions {@link SelectMark} and {@link ClearSelection}.
 *
 * {@link SelectMark} dispatches on selection
 *
 * {@link ClearSelection} dispatches on reset selection
 *
 * {@link Action} is base class for actions
 *
 * @packageDocumentation
 * @preferred
 */

import { Dispatcher } from "../common";
import { Glyph, Element, PlotSegment } from "../specification";
import * as Specification from "../specification";

// Helper functions for digest
export function objectDigest(obj?: Specification.Object) {
  return obj ? [obj.classID, obj._id] : null;
}

/**
 * Base class for all actions to describe all user interactions with charticulators objects
 * Actions dispatches by {@link BaseStore.dispatcher} method of the store.
 * List of charticulator app actions can be found in {@link "app/actions/actions"} module
 */
export class Action {
  public dispatch(dispatcher: Dispatcher<Action>) {
    dispatcher.dispatch(this);
  }

  public digest() {
    return { name: this.constructor.name };
  }
}

/** Dispatches when user selects the mark on the chart */
export class SelectMark extends Action {
  /**
   * @param plotSegment plot segment where mark was selected
   * @param glyph glyph where mark was selected (on a glyph editor or on a chart)
   * @param mark selected mark
   * @param glyphIndex index of glyph
   */
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

/** Dispatches when user reset selection of the mark on the chart */
export class ClearSelection extends Action {
  public digest() {
    return {
      name: "ClearSelection"
    };
  }
}

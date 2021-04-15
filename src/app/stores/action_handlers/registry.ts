import { Actions } from "../../actions";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/** A registry of action handlers */
export class ActionHandlerRegistry<ThisType, BaseAction> {
  private handlers: {
    constructor: any;
    handler: (this: ThisType, action: BaseAction) => void;
  }[] = [];

  /**
   * Register an action handler function
   * @param constructor the action constructor
   * @param handler the action handler
   */
  public add<ActionType extends BaseAction>(
    constructor: new (...args: any[]) => ActionType,
    handler: (this: ThisType, action: ActionType) => void
  ) {
    this.handlers.push({ constructor, handler });
  }

  /**
   * Find and call the handler(s) for the action
   * @param thisArg the this argument for the handler
   * @param action the action to pass to
   */
  public handleAction(thisArg: ThisType, action: BaseAction) {
    for (const handler of this.handlers) {
      if (action instanceof handler.constructor) {
        handler.handler.call(thisArg, action);
      }
    }
  }
}

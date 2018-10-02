// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class ActionHandlerRegistry<ThisType, BaseAction> {
  private handlers: Array<{
    constructor: any;
    handler: (this: ThisType, action: BaseAction) => void;
  }> = [];

  /**
   * Register an action handler function
   * @param constructor the action constructor
   * @param handler the action handler
   */
  public add<ActionType extends BaseAction>(
    constructor: { new (...args: any[]): ActionType },
    handler: (this: ThisType, action: ActionType) => void
  ) {
    for (const handler of this.handlers) {
      if (constructor == handler.constructor) {
        console.log("Already added:", constructor);
      }
    }
    this.handlers.push({ constructor, handler });
  }

  public handleAction(thisArg: ThisType, action: BaseAction) {
    for (const handler of this.handlers) {
      if (action instanceof handler.constructor) {
        handler.handler.call(thisArg, action);
      }
    }
  }
}

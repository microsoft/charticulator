import { EventEmitter } from "../../core";
import { Dispatcher } from "../../core";

import { uniqueID } from "../../core";
import { Actions } from "../actions";

export class BaseStore extends EventEmitter {
  public readonly _id: string;
  public readonly parent: BaseStore;
  public readonly dispatcher: Dispatcher<Actions.Action>;
  public readonly dispatcherID: string;

  constructor(parent: BaseStore | null) {
    super();

    this._id = uniqueID();
    this.parent = parent;
    if (parent != null) {
      this.dispatcher = parent.dispatcher;
    } else {
      this.dispatcher = new Dispatcher<Actions.Action>();
    }
    this.dispatcherID = this.dispatcher.register(action =>
      this.handleAction(action)
    );
  }

  // Override this in the child store
  public handleAction(action: Actions.Action) {}

  public destroy() {
    if (this.dispatcherID != null) {
      this.dispatcher.unregister(this.dispatcherID);
    }
  }
}

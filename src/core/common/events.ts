// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
export class EventSubscription {
  public emitter: EventEmitter;
  public event: string;
  public listener: Function;
  public next: EventSubscription;
  public prev: EventSubscription;

  constructor(emitter: EventEmitter, event: string, listener: Function) {
    this.emitter = emitter;
    this.event = event;
    this.listener = listener;
  }

  public remove() {
    this.emitter.removeSubscription(this);
  }
}

export class EventEmitter {
  private eventSubscriptions = new Map<
    string,
    { first: EventSubscription; last: EventSubscription }
  >();

  public addListener(event: string, listener: Function) {
    const sub = new EventSubscription(this, event, listener);
    sub.prev = null;
    sub.next = null;
    if (this.eventSubscriptions.has(event)) {
      const head = this.eventSubscriptions.get(event);
      if (head.first == null) {
        head.first = sub;
        head.last = sub;
      } else {
        head.last.next = sub;
        sub.prev = head.last;
        head.last = sub;
      }
    } else {
      this.eventSubscriptions.set(event, {
        first: sub,
        last: sub,
      });
    }
    return sub;
  }

  public emit(event: string, ...parameters: any[]) {
    if (this.eventSubscriptions.has(event)) {
      let p = this.eventSubscriptions.get(event).first;
      while (p) {
        p.listener(...parameters);
        p = p.next;
      }
    }
  }

  public removeSubscription(subscription: EventSubscription) {
    const head = this.eventSubscriptions.get(subscription.event);
    if (subscription.prev != null) {
      subscription.prev.next = subscription.next;
    } else {
      head.first = subscription.next;
    }
    if (subscription.next != null) {
      subscription.next.prev = subscription.prev;
    } else {
      head.last = subscription.prev;
    }
  }
}

function compareOrder(a: [number, number], b: [number, number]): number {
  if (a[0] == b[0]) {
    return a[1] - b[1];
  } else {
    return a[0] - b[0];
  }
}

export class Dispatcher<ActionType> {
  public static PRIORITY_LOW = 70;
  public static PRIORITY_DEFAULT = 50;
  public static PRIORITY_HIGH = 30;

  private registeredItems = new Map<
    string,
    {
      order: [number, number];
      stage: number;
      callback: (action: ActionType) => void;
    }
  >();
  private currentID: number = 0;
  private isDispatching: boolean = false;
  private dispatchingIndex: number = 0;
  private currentAction: ActionType;

  public dispatch(action: ActionType) {
    if (this.isDispatching) {
      throw new Error(
        "Dispatcher: cannot dispatch in the middle of a dispatch"
      );
    }
    this.isDispatching = true;
    this.dispatchingIndex = 0;
    this.currentAction = action;

    this.registeredItems.forEach((x) => (x.stage = 0));

    try {
      // Order the items by order of registration
      let items = Array.from(this.registeredItems.values());
      items = items.sort((a, b) => compareOrder(a.order, b.order));
      // Dispatch in the order
      for (const item of items) {
        if (item.stage != 0) {
          continue;
        }
        this.invoke(item);
      }
    } finally {
      delete this.currentAction;
      this.isDispatching = false;
    }
  }

  private invoke(item: {
    stage: number;
    callback: (action: ActionType) => void;
  }) {
    item.stage = 1;
    item.callback(this.currentAction);
    this.dispatchingIndex += 1;
    item.stage = 2;
  }

  public register(
    callback: (action: ActionType) => void,
    priority: number = Dispatcher.PRIORITY_DEFAULT
  ) {
    const id = "ID" + (this.currentID++).toString();
    this.registeredItems.set(id, {
      order: [priority, this.currentID],
      stage: 0,
      callback,
    });
    return id;
  }

  public unregister(id: string) {
    this.registeredItems.delete(id);
  }

  public waitFor(ids: string[]) {
    ids = ids
      .filter((a) => this.registeredItems.has(a))
      .sort((a, b) =>
        compareOrder(
          this.registeredItems.get(a).order,
          this.registeredItems.get(b).order
        )
      );
    for (const id of ids) {
      const item = this.registeredItems.get(id);
      if (item.stage == 1) {
        console.warn(
          "Dispatcher: circular dependency detected in waitFor " + id
        );
        continue;
      } else if (item.stage == 2) {
        continue;
      }
      this.invoke(item);
    }
  }
}

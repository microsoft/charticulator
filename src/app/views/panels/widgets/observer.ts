// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Prototypes, Specification } from "../../../../core";
import { CharticulatorPropertyAccessors } from "./manager";

interface EventListener {
  update(
    property: Prototypes.Controls.Property | Prototypes.Controls.Property[],
    value: Specification.AttributeValue
  ): void;
}

export enum EventType {
  UPDATE_FIELD,
}

interface EventListenerType {
  listener: EventListener;
  type: EventType;
}

export class EventManager {
  private listeners: EventListenerType[] = [];

  public subscribe(type: EventType, listener: EventListener) {
    this.listeners.push({
      listener,
      type,
    });
  }

  public notify(
    type: EventType,
    property: Prototypes.Controls.Property | Prototypes.Controls.Property[],
    value: Specification.AttributeValue
  ) {
    for (let i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].type === type) {
        this.listeners[i].listener.update(property, value);
      }
    }
  }
}

export class UIManagerListener implements EventListener {
  constructor(private manager: CharticulatorPropertyAccessors) {}

  update(
    property: Prototypes.Controls.Property,
    value: Specification.AttributeValue
  ): void {
    this.manager.emitSetProperty(property, value);
  }
}

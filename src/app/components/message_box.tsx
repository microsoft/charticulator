// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../resources";

import { EventSubscription, MessageType, messageTypes } from "../../core";

import { AppStore } from "../stores";
import { ContextedComponent } from "../context_component";
import { Element } from "../../core/specification";
import { SVGImageIcon } from ".";
import { RemoveMessage } from "../actions/actions";

export class MessagePanel extends ContextedComponent<
  {
    store: AppStore;
  },
  Record<string, never>
> {
  public mappingButton: Element;
  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate()),
    ];
  }

  public componentWillUnmount() {
    this.tokens.forEach((token) => token.remove());
    this.tokens = [];
  }

  public renderUnexpectedState(message: string) {
    return (
      <div className="attribute-editor charticulator__widget-container">
        <div className="attribute-editor-unexpected">{message}</div>
      </div>
    );
  }

  public render(): any {
    const store = this.props.store;
    const messages: Map<MessageType | string, string> = store.messageState;

    return (
      <div className="charticulator__object-list-editor">
        {Array.from(messages, ([key]) => key).map((key, index) => {
          const message = messages.get(key);
          if (messageTypes.find((k) => k === key)) {
            return (
              <div key={index}>
                <div key={index} className="el-object-item auto-height">
                  <span className="el-text">{message}</span>
                </div>
              </div>
            );
          } else {
            return (
              <div key={index}>
                <div
                  key={index}
                  className="el-object-item auto-height"
                  onClick={() => {
                    this.store.dispatcher.dispatch(new RemoveMessage(key));
                  }}
                >
                  <span className="el-text">{message}</span>
                  <SVGImageIcon url={R.getSVGIcon("ChromeClose")} />
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { classNames } from "../utils";
import { DraggableElement, ClickableSVGElement } from "./draggable";

import * as globals from "../globals";

import { PopupView } from "../controllers";

import * as React from "react";
import * as R from "../resources";

import { EventSubscription, Prototypes, MessageTypes } from "../../core";
import { SVGImageIcon } from "../components";

import { AppStore } from "../stores";
// import { ReorderListView } from "./.";
import { ContextedComponent } from "../context_component";
import { Element } from "../../core/specification";
import { ReorderListView } from "../views/panels/object_list_editor";

function getObjectIcon(classID: string) {
  return R.getSVGIcon(
    Prototypes.ObjectClasses.GetMetadata(classID).iconPath || "object"
  );
}

export class MessagePanel extends ContextedComponent<
  {
    store: AppStore;
  },
  {}
> {
  public mappingButton: Element;
  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate())
    ];
  }

  public componentWillUnmount() {
    this.tokens.forEach(token => token.remove());
    this.tokens = [];
  }

  public renderUnexpectedState(message: string) {
    return (
      <div className="attribute-editor charticulator__widget-container">
        <div className="attribute-editor-unexpected">{message}</div>
      </div>
    );
  }

  private getPropertyDisplayName(name: string) {
    return name[0].toUpperCase() + name.slice(1);
  }

  public render(): any {
    const store = this.props.store;
    const messages: Map<MessageTypes, string> = store.messageState;

    return (
      <div className="charticulator__object-list-editor">
        {Array.from(messages, ([key, value]) => key).map((key, index) => {
          const message = messages.get(key);
          return (
            <div key={index}>
              <div key={index} className="el-object-item">
                {/* <SVGImageIcon
                  url={R.getSVGIcon(
                    Prototypes.ObjectClasses.GetMetadata(scale.classID).iconPath
                  )}
                /> */}
                <span className="el-text">{message}</span>
              </div>
              {/* <ReorderListView enabled={true} onReorder={(a, b) => {}}>
                <p>Error</p>
              </ReorderListView> */}
            </div>
          );
        })}
      </div>
    );
  }
}

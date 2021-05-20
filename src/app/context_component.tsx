// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { AppStore } from "./stores";
import { Action } from "./actions/actions";
import { strings } from "../strings";

export interface MainContextInterface {
  store: AppStore;
}

export const MainContextTypes = {
  store: (props: any, propName: string, componentName: string) => {
    if (props[propName] instanceof AppStore) {
      return null;
    } else {
      return new Error(strings.error.storeNotFound(componentName));
    }
  },
};

export class ContextedComponent<TProps, TState> extends React.Component<
  TProps,
  TState
> {
  public context: MainContextInterface;

  constructor(props: TProps, context: MainContextInterface) {
    super(props, context);
  }

  public static contextTypes = MainContextTypes;

  public dispatch(action: Action) {
    this.context.store.dispatcher.dispatch(action);
  }

  public get store(): AppStore {
    return this.context.store;
  }
}

export const MainReactContext = React.createContext<MainContextInterface>(null);

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { AppStore } from "./stores";
import { Action } from "./actions/actions";

export interface MainContext {
  store: AppStore;
}

export let MainContextTypes = {
  store: (props: any, propName: string, componentName: string) => {
    if (props[propName] instanceof AppStore) {
      return null;
    } else {
      return new Error(`store not found in component ${componentName}`);
    }
  }
};

export class ContextedComponent<TProps, TState> extends React.Component<
  TProps,
  TState
> {
  public context: MainContext;

  constructor(props: TProps, context: MainContext) {
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

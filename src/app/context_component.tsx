import * as React from "react";
import { MainStore } from "./stores/main_store";
import { Action } from "./actions/actions";
import { ChartStore, DatasetStore } from "./stores";

export interface MainContext {
    store: MainStore;
}

export let MainContextTypes = {
    store: (props: any, propName: string, componentName: string) => {
        if (props[propName] instanceof MainStore) {
            return null;
        } else {
            return new Error(`store not found in component ${componentName}`);
        }
    }
}

export class ContextedComponent<TProps, TState> extends React.Component<TProps, TState> {
    context: MainContext;

    constructor(props: TProps, context: MainContext) {
        super(props, context);
    }

    public static contextTypes = MainContextTypes;

    public dispatch(action: Action) {
        this.context.store.dispatcher.dispatch(action);
    }

    public get mainStore(): MainStore { return this.context.store; }
    public get chartStore(): ChartStore { return this.context.store.chartStore; }
    public get datasetStore(): DatasetStore { return this.context.store.datasetStore; }
}
import { Dispatcher } from "../../core";
import { Action } from "../actions/actions";
import { MainStore } from "../stores/main_store";

export interface ExtensionContext {
    getGlobalDispatcher(): Dispatcher<Action>;
    getMainStore(): MainStore;
}

export interface Extension {
    activate(context: ExtensionContext): void;
    deactivate(): void;
}
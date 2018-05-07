import * as React from "react";

import { MenuButton, SVGImageIcon, AppButton, ToolButton, ErrorBoundary } from "./components";
import * as R from "./resources";

import { DatasetView, MarkEditorView, ChartEditorView, AttributePanel } from "./views";
import { MainStore } from "./stores";

import { DragStateView, PopupContainer, ModalView } from "./controllers";
import * as globals from "./globals";

import { Actions } from "./actions";

import { HorizontalSplitPaneView } from "./components";

import { MinimizablePanelView, MinimizablePane } from "./components";

import { FileView } from "./views";
import { StatusBar } from "./views";

import { Toolbar } from "./views/tool_bar";
import { ObjectListEditor } from "./views/panels/object_list_editor";

export interface MainViewProps {
    store: MainStore;
    disableFileView?: boolean;
}

export interface MainViewState {
}


export class MainView extends React.Component<MainViewProps, MainViewState> {
    refs: {
        canvasViewContainer: HTMLDivElement;
    }

    constructor(props: MainViewProps) {
        super(props);

        this.state = {
        };

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    public componentDidMount() {
        window.addEventListener("keydown", this.onKeyDown);

        this.showFileModalWindow("new");
    }

    public static childContextTypes = {
        store: (s: MainStore) => s instanceof MainStore
    };

    public getChildContext() {
        return {
            store: this.props.store
        };
    }

    public keyboardMap: { [name: string]: string } = {
        "ctrl-z": "undo",
        "ctrl-y": "redo",
        "ctrl-s": "save",
        "ctrl-shift-s": "export",
        "ctrl-n": "new",
        "ctrl-o": "open",
        "backspace": "delete",
        "delete": "delete",
        "escape": "escape"
    };

    public onKeyDown(e: KeyboardEvent) {
        if (e.target == document.body) {
            let prefix = "";
            if (e.shiftKey) {
                prefix = "shift-" + prefix;
            }
            if (e.ctrlKey || e.metaKey) {
                prefix = "ctrl-" + prefix;
            }
            let name = `${prefix}${e.key}`.toLowerCase();
            if (this.keyboardMap[name]) {
                let command = this.keyboardMap[name];
                switch (command) {
                    case "new": {
                        this.showFileModalWindow("open");
                    } break;
                    case "open": {
                        this.showFileModalWindow("open");
                    } break;
                    case "save": {
                        if (this.props.store.currentChartID) {
                            this.props.store.backendSaveChart();
                        } else {
                            this.showFileModalWindow("save");
                        }
                    } break;
                    case "export": {
                        this.showFileModalWindow("export");
                    } break;
                    case "undo": {
                        new Actions.Undo().dispatch(this.props.store.dispatcher);
                    } break;
                    case "redo": {
                        new Actions.Redo().dispatch(this.props.store.dispatcher);
                    } break;
                    case "delete": {
                        this.props.store.chartStore.deleteSelection();
                    } break;
                    case "escape": {
                        this.props.store.chartStore.handleEscapeKey();
                    } break;
                }
                e.preventDefault();
            }
        }
    }

    public componentWillUnmount() {
        window.removeEventListener("keydown", this.onKeyDown);
    }

    public onLoadChart() {
        var input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", ".json");
        input.onchange = () => {
            if (input.files.length == 1) {
                let file = input.files[0];
                let reader = new FileReader();
                reader.onload = () => {
                    let result: string = reader.result;
                    new Actions.Load(JSON.parse(result)).dispatch(this.props.store.dispatcher);
                };
                reader.readAsText(file, "utf-8");
            }
        };
        input.click();
    }

    public showFileModalWindow(defaultTab: string = "open") {
        if (this.props.disableFileView) return;
        globals.popupController.showModal((context) => {
            return (
                <ModalView context={context}>
                    <FileView backend={this.props.store.backend} defaultTab={defaultTab} store={this.props.store} onClose={() => context.close()} />
                </ModalView>
            );
        }, { anchor: null });
    }
    public render() {
        return (
            <div className="charticulator__application" onDragOver={(e) => e.preventDefault()}>
                <section className="charticulator__menu-bar">
                    <div className="charticulator__menu-bar-left">
                        <AppButton onClick={() => this.showFileModalWindow("open")} />
                        <span className="charticulator__menu-bar-separator" />
                        <MenuButton url={R.getSVGIcon("toolbar/new")} title="New (Ctrl-N)" onClick={() => {
                            this.showFileModalWindow("new");
                        }} />
                        <MenuButton url={R.getSVGIcon("toolbar/open")} title="Open (Ctrl-O)" onClick={() => {
                            this.showFileModalWindow("open");
                        }} />
                        <MenuButton url={R.getSVGIcon("toolbar/save")} title="Save (Ctrl-S)" onClick={() => {
                            if (this.props.store.currentChartID) {
                                this.props.store.backendSaveChart();
                            } else {
                                this.showFileModalWindow("save");
                            }
                        }} />
                        <span className="charticulator__menu-bar-separator" />
                        <MenuButton url={R.getSVGIcon("toolbar/undo")} title="Undo (Ctrl-Z)" onClick={() => new Actions.Undo().dispatch(this.props.store.dispatcher)} />
                        <MenuButton url={R.getSVGIcon("toolbar/redo")} title="Redo (Ctrl-Y)" onClick={() => new Actions.Redo().dispatch(this.props.store.dispatcher)} />
                        <span className="charticulator__menu-bar-separator" />
                        <MenuButton url={R.getSVGIcon("toolbar/trash")} title="Reset" onClick={() => {
                            if (confirm("Are you really willing to reset the chart?")) {
                                new Actions.Reset().dispatch(this.props.store.dispatcher);
                            }
                        }} />
                    </div>
                    <div className="charticulator__menu-bar-right">
                        {/* <MenuButton url={R.getSVGIcon("toolbar/help")} title="Open help page" /> */}
                    </div>
                </section>
                <section className="charticulator__panel-container">
                    <div className="charticulator__panel charticulator__panel-dataset">
                        <MinimizablePanelView>
                            <MinimizablePane title="Dataset" scroll={true} hideHeader={true}>
                                <ErrorBoundary>
                                    <DatasetView store={this.props.store.datasetStore} />
                                </ErrorBoundary>
                            </MinimizablePane>
                        </MinimizablePanelView>
                    </div>
                    <div className="charticulator__panel charticulator__panel-editor">
                        <div className="charticulator__panel-editor-toolbar">
                            <Toolbar store={this.props.store.chartStore} />
                        </div>
                        <div className="charticulator__panel-editor-panel-container">
                            <div className="charticulator__panel-editor-panel charticulator__panel-editor-panel-panes">
                                <MinimizablePanelView>
                                    <MinimizablePane title="Glyph" scroll={false}>
                                        <ErrorBoundary>
                                            <MarkEditorView store={this.props.store.chartStore} />
                                        </ErrorBoundary>
                                    </MinimizablePane>
                                    <MinimizablePane title="Layers" scroll={true} maxHeight={200}>
                                        <ErrorBoundary>
                                            <ObjectListEditor />
                                        </ErrorBoundary>
                                    </MinimizablePane>
                                    <MinimizablePane title="Attributes" scroll={true}>
                                        <ErrorBoundary>
                                            <AttributePanel store={this.props.store.chartStore} />
                                        </ErrorBoundary>
                                    </MinimizablePane>
                                </MinimizablePanelView>
                            </div>
                            <div className="charticulator__panel-editor-panel charticulator__panel-editor-panel-chart">
                                <ErrorBoundary>
                                    <ChartEditorView store={this.props.store.chartStore} />
                                </ErrorBoundary>
                            </div>
                        </div>
                    </div>
                </section>
                <PopupContainer controller={globals.popupController} />
                <DragStateView controller={globals.dragController} />
            </div>
        )
    }
}

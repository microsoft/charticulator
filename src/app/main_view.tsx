import * as React from "react";
import * as ReactDOM from "react-dom";

import {
  MenuButton,
  SVGImageIcon,
  AppButton,
  ToolButton,
  ErrorBoundary,
  FloatingPanel
} from "./components";
import * as R from "./resources";

import {
  DatasetView,
  MarkEditorView,
  ChartEditorView,
  AttributePanel
} from "./views";
import { MainStore } from "./stores";

import {
  DragStateView,
  PopupContainer,
  ModalView,
  PopupView
} from "./controllers";
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
  glyphViewMaximized: boolean;
  layersViewMaximized: boolean;
  attributeViewMaximized: boolean;
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
  public refs: {
    canvasViewContainer: HTMLDivElement;
    helpButton: MenuButton;
  };

  constructor(props: MainViewProps) {
    super(props);

    this.state = {
      glyphViewMaximized: false,
      layersViewMaximized: false,
      attributeViewMaximized: false
    };

    this.onKeyDown = this.onKeyDown.bind(this);
  }

  public componentDidMount() {
    window.addEventListener("keydown", this.onKeyDown);
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
    backspace: "delete",
    delete: "delete",
    escape: "escape"
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
      const name = `${prefix}${e.key}`.toLowerCase();
      if (this.keyboardMap[name]) {
        const command = this.keyboardMap[name];
        switch (command) {
          case "new":
            {
              this.showFileModalWindow("open");
            }
            break;
          case "open":
            {
              this.showFileModalWindow("open");
            }
            break;
          case "save":
            {
              if (this.props.store.currentChartID) {
                this.props.store.backendSaveChart();
              } else {
                this.showFileModalWindow("save");
              }
            }
            break;
          case "export":
            {
              this.showFileModalWindow("export");
            }
            break;
          case "undo":
            {
              new Actions.Undo().dispatch(this.props.store.dispatcher);
            }
            break;
          case "redo":
            {
              new Actions.Redo().dispatch(this.props.store.dispatcher);
            }
            break;
          case "delete":
            {
              this.props.store.chartStore.deleteSelection();
            }
            break;
          case "escape":
            {
              this.props.store.chartStore.handleEscapeKey();
            }
            break;
        }
        e.preventDefault();
      }
    }
  }

  public componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  public onLoadChart() {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", ".json");
    input.onchange = () => {
      if (input.files.length == 1) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const result: string = reader.result;
          new Actions.Load(JSON.parse(result)).dispatch(
            this.props.store.dispatcher
          );
        };
        reader.readAsText(file, "utf-8");
      }
    };
    input.click();
  }

  public hideFileModalWindow(defaultTab: string = "open") {
    globals.popupController.reset();
  }

  public showFileModalWindow(defaultTab: string = "open") {
    if (this.props.disableFileView) {
      return;
    }
    globals.popupController.showModal(
      context => {
        return (
          <ModalView context={context}>
            <FileView
              backend={this.props.store.backend}
              defaultTab={defaultTab}
              store={this.props.store}
              onClose={() => context.close()}
            />
          </ModalView>
        );
      },
      { anchor: null }
    );
  }
  public render() {
    return (
      <div
        className="charticulator__application"
        onDragOver={e => e.preventDefault()}
        onDrop={e => e.preventDefault()}
      >
        <section className="charticulator__menu-bar">
          <div className="charticulator__menu-bar-left">
            <AppButton onClick={() => this.showFileModalWindow("open")} />
            <span className="charticulator__menu-bar-separator" />
            <MenuButton
              url={R.getSVGIcon("toolbar/new")}
              title="New (Ctrl-N)"
              onClick={() => {
                this.showFileModalWindow("new");
              }}
            />
            <MenuButton
              url={R.getSVGIcon("toolbar/open")}
              title="Open (Ctrl-O)"
              onClick={() => {
                this.showFileModalWindow("open");
              }}
            />
            <MenuButton
              url={R.getSVGIcon("toolbar/save")}
              title="Save (Ctrl-S)"
              onClick={() => {
                if (this.props.store.currentChartID) {
                  this.props.store.backendSaveChart();
                } else {
                  this.showFileModalWindow("save");
                }
              }}
            />
            <span className="charticulator__menu-bar-separator" />
            <MenuButton
              url={R.getSVGIcon("toolbar/undo")}
              title="Undo (Ctrl-Z)"
              onClick={() =>
                new Actions.Undo().dispatch(this.props.store.dispatcher)
              }
            />
            <MenuButton
              url={R.getSVGIcon("toolbar/redo")}
              title="Redo (Ctrl-Y)"
              onClick={() =>
                new Actions.Redo().dispatch(this.props.store.dispatcher)
              }
            />
            <span className="charticulator__menu-bar-separator" />
            <MenuButton
              url={R.getSVGIcon("toolbar/trash")}
              title="Reset"
              onClick={() => {
                if (confirm("Are you really willing to reset the chart?")) {
                  new Actions.Reset().dispatch(this.props.store.dispatcher);
                }
              }}
            />
          </div>
          <div className="charticulator__menu-bar-right">
            <MenuButton
              url={R.getSVGIcon("toolbar/help")}
              title="Help"
              ref="helpButton"
              onClick={() => {
                globals.popupController.popupAt(
                  context => {
                    return (
                      <PopupView
                        context={context}
                        className="charticulator__menu-popup"
                      >
                        <div className="charticulator__menu-dropdown">
                          <div className="el-item">
                            <a
                              target="_blank"
                              href="https://charticulator.com/docs/getting-started.html"
                            >
                              Getting Started
                            </a>
                          </div>
                          <div className="el-item">
                            <a
                              target="_blank"
                              href="https://charticulator.com/gallery/index.html"
                            >
                              Example Gallery
                            </a>
                          </div>
                          <div className="el-item">
                            <a
                              target="_blank"
                              href="https://github.com/Microsoft/charticulator/issues/new"
                            >
                              Report an Issue
                            </a>
                          </div>
                          <div className="el-item">
                            <a
                              target="_blank"
                              href="https://charticulator.com/"
                            >
                              Charticulator Home
                            </a>
                          </div>
                          <div className="el-item">
                            <a href="mailto:charticulator@microsoft.com">
                              Contact Us
                            </a>
                          </div>
                        </div>
                      </PopupView>
                    );
                  },
                  {
                    anchor: ReactDOM.findDOMNode(
                      this.refs.helpButton
                    ) as Element,
                    alignX: "end-inner"
                  }
                );
              }}
            />
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
              <div
                className="charticulator__panel-editor-panel charticulator__panel-editor-panel-panes"
                style={{
                  display:
                    this.state.glyphViewMaximized &&
                    this.state.attributeViewMaximized &&
                    this.state.layersViewMaximized
                      ? "none"
                      : undefined
                }}
              >
                <MinimizablePanelView>
                  {this.state.glyphViewMaximized ? null : (
                    <MinimizablePane
                      title="Glyph"
                      scroll={false}
                      onMaximize={() =>
                        this.setState({ glyphViewMaximized: true })
                      }
                    >
                      <ErrorBoundary>
                        <MarkEditorView
                          store={this.props.store.chartStore}
                          height={300}
                        />
                      </ErrorBoundary>
                    </MinimizablePane>
                  )}
                  {this.state.layersViewMaximized ? null : (
                    <MinimizablePane
                      title="Layers"
                      scroll={true}
                      maxHeight={200}
                      onMaximize={() =>
                        this.setState({ layersViewMaximized: true })
                      }
                    >
                      <ErrorBoundary>
                        <ObjectListEditor />
                      </ErrorBoundary>
                    </MinimizablePane>
                  )}
                  {this.state.attributeViewMaximized ? null : (
                    <MinimizablePane
                      title="Attributes"
                      scroll={true}
                      onMaximize={() =>
                        this.setState({ attributeViewMaximized: true })
                      }
                    >
                      <ErrorBoundary>
                        <AttributePanel store={this.props.store.chartStore} />
                      </ErrorBoundary>
                    </MinimizablePane>
                  )}
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
        <div className="charticulator__floating-panels">
          {this.state.glyphViewMaximized ? (
            <FloatingPanel
              peerGroup="panels"
              title="Glyph"
              onClose={() => this.setState({ glyphViewMaximized: false })}
            >
              <ErrorBoundary>
                <MarkEditorView store={this.props.store.chartStore} />
              </ErrorBoundary>
            </FloatingPanel>
          ) : null}
          {this.state.layersViewMaximized ? (
            <FloatingPanel
              scroll={true}
              peerGroup="panels"
              title="Layers"
              onClose={() => this.setState({ layersViewMaximized: false })}
            >
              <ErrorBoundary>
                <ObjectListEditor />
              </ErrorBoundary>
            </FloatingPanel>
          ) : null}
          {this.state.attributeViewMaximized ? (
            <FloatingPanel
              scroll={true}
              peerGroup="panels"
              title="Attributes"
              onClose={() => this.setState({ attributeViewMaximized: false })}
            >
              <ErrorBoundary>
                <AttributePanel store={this.props.store.chartStore} />
              </ErrorBoundary>
            </FloatingPanel>
          ) : null}
        </div>
        <PopupContainer controller={globals.popupController} />
        <DragStateView controller={globals.dragController} />
      </div>
    );
  }
}

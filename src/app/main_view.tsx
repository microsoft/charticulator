/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as globals from "./globals";

import {
  ErrorBoundary,
  FloatingPanel,
  MinimizablePane,
  MinimizablePanelView
} from "./components";
import { DragStateView, PopupContainer } from "./controllers";
import { MainStore } from "./stores";
import {
  AttributePanel,
  ChartEditorView,
  DatasetView,
  MarkEditorView
} from "./views";
import { MenuBar } from "./views/menubar";
import { ObjectListEditor } from "./views/panels/object_list_editor";
import { Toolbar } from "./views/tool_bar";

export interface MainViewProps {
  store: MainStore;
}

export interface MainViewState {
  glyphViewMaximized: boolean;
  layersViewMaximized: boolean;
  attributeViewMaximized: boolean;
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
  public refMenuBar: MenuBar;

  constructor(props: MainViewProps) {
    super(props);

    this.state = {
      glyphViewMaximized: false,
      layersViewMaximized: false,
      attributeViewMaximized: false
    };
  }

  public static childContextTypes = {
    store: (s: MainStore) => s instanceof MainStore
  };

  public getChildContext() {
    return {
      store: this.props.store
    };
  }

  public render() {
    return (
      <div
        className="charticulator__application"
        onDragOver={e => e.preventDefault()}
        onDrop={e => e.preventDefault()}
      >
        <MenuBar ref={e => (this.refMenuBar = e)} />
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

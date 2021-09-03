// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  ErrorBoundary,
  MinimizablePane,
  MinimizablePanelView,
  TelemetryRecorder,
} from "./components";
import { strings } from "../strings";
import { AttributePanel, MarkEditorView } from "./views";
import { ObjectListEditor } from "./views/panels/object_list_editor";
import * as React from "react";
import { MainViewState } from "./main_view";
import { AppStore } from "./stores";

interface EditorPanelsProps {
  state: MainViewState;
  setState: (newState: MainViewState) => void;
  telemetry?: TelemetryRecorder;
  store: AppStore;
}

export class EditorPanels extends React.Component<
  EditorPanelsProps,
  Record<string, unknown>
> {
  constructor(props: EditorPanelsProps) {
    super(props);
    this.props.store.addListener(AppStore.EVENT_GRAPHICS, () =>
      this.forceUpdate()
    );
  }

  render() {
    return (
      <div
        className="charticulator__panel-editor-panel charticulator__panel-editor-panel-panes"
        style={{
          display:
            this.props.state.glyphViewMaximized &&
            this.props.state.attributeViewMaximized &&
            this.props.state.layersViewMaximized
              ? "none"
              : undefined,
        }}
      >
        <MinimizablePanelView>
          {this.props.state.glyphViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.glyphPaneltitle}
              scroll={false}
              onMaximize={() =>
                this.props.setState({
                  ...this.props.state,
                  glyphViewMaximized: true,
                })
              }
            >
              <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                <MarkEditorView height={300} />
              </ErrorBoundary>
            </MinimizablePane>
          )}
          {this.props.state.layersViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.layersPanelTitle}
              scroll={true}
              maxHeight={200}
              onMaximize={() =>
                this.props.setState({
                  ...this.props.state,
                  layersViewMaximized: true,
                })
              }
            >
              <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                <ObjectListEditor />
              </ErrorBoundary>
            </MinimizablePane>
          )}
          {this.props.state.attributeViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.attributesPaneltitle}
              scroll={true}
              onMaximize={() =>
                this.props.setState({
                  ...this.props.state,
                  attributeViewMaximized: true,
                })
              }
            >
              <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                <AttributePanel store={this.props.store} />
              </ErrorBoundary>
            </MinimizablePane>
          )}
        </MinimizablePanelView>
      </div>
    );
  }
}

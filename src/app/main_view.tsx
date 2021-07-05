// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as globals from "./globals";

import {
  ErrorBoundary,
  FloatingPanel,
  MinimizablePane,
  MinimizablePanelView,
  MessagePanel,
  TelemetryRecorder,
  TelemetryContext,
} from "./components";
import { DragStateView, PopupContainer } from "./controllers";
import { AppStore } from "./stores";
import {
  AttributePanel,
  ChartEditorView,
  DatasetView,
  MarkEditorView,
} from "./views";
import { MenuBar, MenuBarHandlers } from "./views/menubar";
import { ObjectListEditor } from "./views/panels/object_list_editor";
import { ScalesPanel } from "./views/panels/scales_panel";
import { strings } from "../strings";
import { FluentUIToolbar } from "./views/fluentui_tool_bar";
import { MainReactContext } from "./context_component";

export enum UndoRedoLocation {
  MenuBar = "menubar",
  ToolBar = "toolbar",
}

export enum PositionsLeftRight {
  Left = "left",
  Right = "right",
}

export enum PositionsLeftRightTop {
  Left = "left",
  Right = "right",
  Top = "top",
}

export enum LayoutDirection {
  Vertical = "vertical",
  Horizontal = "horizontal",
}

export interface MainViewConfig {
  ColumnsPosition: PositionsLeftRight;
  EditorPanelsPosition: PositionsLeftRight;
  ToolbarPosition: PositionsLeftRightTop;
  MenuBarButtons: PositionsLeftRight;
  MenuBarSaveButtons: PositionsLeftRight;
  Name?: string;
  ToolbarLabels: boolean;
  UndoRedoLocation: UndoRedoLocation;
}

export interface MainViewProps {
  store: AppStore;
  viewConfiguration: MainViewConfig;
  menuBarHandlers?: MenuBarHandlers;
  telemetry?: TelemetryRecorder;
}

export interface MainViewState {
  glyphViewMaximized: boolean;
  layersViewMaximized: boolean;
  attributeViewMaximized: boolean;
  scaleViewMaximized: boolean;
  fieldViewMaximized: boolean;
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
  public refMenuBar: MenuBar;

  private viewConfiguration: MainViewConfig;

  constructor(props: MainViewProps) {
    super(props);

    if (!props.viewConfiguration) {
      this.viewConfiguration = {
        ColumnsPosition: PositionsLeftRight.Left,
        EditorPanelsPosition: PositionsLeftRight.Left,
        ToolbarPosition: PositionsLeftRightTop.Top,
        MenuBarButtons: PositionsLeftRight.Left,
        MenuBarSaveButtons: PositionsLeftRight.Left,
        ToolbarLabels: true,
        UndoRedoLocation: UndoRedoLocation.MenuBar,
      };
    } else {
      this.viewConfiguration = props.viewConfiguration;
    }

    this.state = {
      glyphViewMaximized: false,
      layersViewMaximized: false,
      attributeViewMaximized: false,
      scaleViewMaximized: false,
    };

    props.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate());
  }

  public static childContextTypes = {
    store: (s: AppStore) => s instanceof AppStore,
  };

  public getChildContext() {
    return {
      store: this.props.store,
    };
  }

  // eslint-disable-next-line
  public render() {
    const toolBarCreator = (config: {
      undoRedoLocation: UndoRedoLocation;
      layout: LayoutDirection;
      toolbarLabels: boolean;
    }) => {
      return (
        <div className={`charticulator__panel-editor-toolbar-${config.layout}`}>
          {/* <Toolbar toolbarLabels={config.toolbarLabels} undoRedoLocation={config.undoRedoLocation} layout={config.layout} /> */}
          <FluentUIToolbar
            toolbarLabels={config.toolbarLabels}
            undoRedoLocation={config.undoRedoLocation}
            layout={config.layout}
          />
        </div>
      );
    };

    const datasetPanel = () => {
      return (
        <div
          className="charticulator__panel charticulator__panel-dataset"
          style={{
            display:
              this.state.scaleViewMaximized && this.state.fieldViewMaximized
                ? "none"
                : undefined,
          }}
        >
          <MinimizablePanelView>
            {/* <MinimizablePane
              title={strings.dataset.tableTitleColumns}
              scroll={true}
              hideHeader={false}
              onMaximize={() => this.setState({ fieldViewMaximized: true })}
            >
              <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                <DatasetView store={this.props.store} />
              </ErrorBoundary>
            </MinimizablePane> */}
            {this.state.fieldViewMaximized ? null : (
              <MinimizablePane
                title={strings.dataset.tableTitleColumns}
                scroll={true}
                hideHeader={false}
                onMaximize={() => this.setState({ fieldViewMaximized: true })}
              >
                <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                  <DatasetView store={this.props.store} />
                </ErrorBoundary>
              </MinimizablePane>
            )}
            {this.state.scaleViewMaximized ? null : (
              <MinimizablePane
                title={strings.mainView.scalesPanelTitle}
                scroll={true}
                onMaximize={() => this.setState({ scaleViewMaximized: true })}
              >
                <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                  <ScalesPanel store={this.props.store} />
                </ErrorBoundary>
              </MinimizablePane>
            )}
          </MinimizablePanelView>
        </div>
      );
    };

    const editorPanels = () => {
      return (
        <div
          className="charticulator__panel-editor-panel charticulator__panel-editor-panel-panes"
          style={{
            display:
              this.state.glyphViewMaximized &&
              this.state.attributeViewMaximized &&
              this.state.layersViewMaximized
                ? "none"
                : undefined,
          }}
        >
          <MinimizablePanelView>
            {this.state.glyphViewMaximized ? null : (
              <MinimizablePane
                title={strings.mainView.glyphPaneltitle}
                scroll={false}
                onMaximize={() => this.setState({ glyphViewMaximized: true })}
              >
                <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                  <MarkEditorView height={300} />
                </ErrorBoundary>
              </MinimizablePane>
            )}
            {this.state.layersViewMaximized ? null : (
              <MinimizablePane
                title={strings.mainView.layersPanelTitle}
                scroll={true}
                maxHeight={200}
                onMaximize={() => this.setState({ layersViewMaximized: true })}
              >
                <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                  <ObjectListEditor />
                </ErrorBoundary>
              </MinimizablePane>
            )}
            {this.state.attributeViewMaximized ? null : (
              <MinimizablePane
                title={strings.mainView.attributesPaneltitle}
                scroll={true}
                onMaximize={() =>
                  this.setState({ attributeViewMaximized: true })
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
    };

    const chartPanel = () => {
      return (
        <div className="charticulator__panel-editor-panel charticulator__panel-editor-panel-chart">
          <ErrorBoundary telemetryRecorder={this.props.telemetry}>
            <ChartEditorView store={this.props.store} />
          </ErrorBoundary>
        </div>
      );
    };

    return (
      <div
        className="charticulator__application"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      >
        <MainReactContext.Provider
          value={{
            store: this.props.store,
          }}
        >
          <TelemetryContext.Provider value={this.props.telemetry}>
            <MenuBar
              alignButtons={this.viewConfiguration.MenuBarButtons}
              alignSaveButton={this.viewConfiguration.MenuBarSaveButtons}
              undoRedoLocation={this.viewConfiguration.UndoRedoLocation}
              name={this.viewConfiguration.Name}
              ref={(e) => (this.refMenuBar = e)}
              handlers={this.props.menuBarHandlers}
            />
            {this.viewConfiguration.ToolbarPosition ==
              PositionsLeftRightTop.Top &&
              toolBarCreator({
                layout: LayoutDirection.Horizontal,
                toolbarLabels: this.viewConfiguration.ToolbarLabels,
                undoRedoLocation: this.viewConfiguration.UndoRedoLocation,
              })}
            <section className="charticulator__panel-container">
              {this.viewConfiguration.ColumnsPosition ==
                PositionsLeftRight.Left && datasetPanel()}
              <div className="charticulator__panel charticulator__panel-editor">
                <div className="charticulator__panel-editor-panel-container">
                  {this.viewConfiguration.EditorPanelsPosition ==
                    PositionsLeftRight.Left && editorPanels()}
                  {this.viewConfiguration.ToolbarPosition ==
                    PositionsLeftRightTop.Left &&
                    toolBarCreator({
                      layout: LayoutDirection.Vertical,
                      toolbarLabels: this.viewConfiguration.ToolbarLabels,
                      undoRedoLocation: this.viewConfiguration.UndoRedoLocation,
                    })}
                  {chartPanel()}
                  {this.viewConfiguration.ToolbarPosition ==
                    PositionsLeftRightTop.Right &&
                    toolBarCreator({
                      layout: LayoutDirection.Vertical,
                      toolbarLabels: this.viewConfiguration.ToolbarLabels,
                      undoRedoLocation: this.viewConfiguration.UndoRedoLocation,
                    })}
                  {this.viewConfiguration.EditorPanelsPosition ==
                    PositionsLeftRight.Right && editorPanels()}
                </div>
              </div>
              {this.viewConfiguration.ColumnsPosition ==
                PositionsLeftRight.Right && datasetPanel()}
            </section>
            <div className="charticulator__floating-panels">
              {this.state.glyphViewMaximized ? (
                <FloatingPanel
                  peerGroup="panels"
                  title={strings.mainView.glyphPaneltitle}
                  onClose={() => this.setState({ glyphViewMaximized: false })}
                >
                  <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                    <MarkEditorView />
                  </ErrorBoundary>
                </FloatingPanel>
              ) : null}
              {this.state.layersViewMaximized ? (
                <FloatingPanel
                  scroll={true}
                  peerGroup="panels"
                  title={strings.mainView.layersPanelTitle}
                  onClose={() => this.setState({ layersViewMaximized: false })}
                >
                  <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                    <ObjectListEditor />
                  </ErrorBoundary>
                </FloatingPanel>
              ) : null}
              {this.state.attributeViewMaximized ? (
                <FloatingPanel
                  scroll={true}
                  peerGroup="panels"
                  title={strings.mainView.attributesPaneltitle}
                  onClose={() =>
                    this.setState({ attributeViewMaximized: false })
                  }
                >
                  <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                    <AttributePanel store={this.props.store} />
                  </ErrorBoundary>
                </FloatingPanel>
              ) : null}
              {this.state.scaleViewMaximized ? (
                <FloatingPanel
                  scroll={true}
                  peerGroup="panels"
                  title={strings.mainView.scalesPanelTitle}
                  onClose={() => this.setState({ scaleViewMaximized: false })}
                >
                  <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                    <ScalesPanel store={this.props.store} />
                  </ErrorBoundary>
                </FloatingPanel>
              ) : null}
              {this.state.fieldViewMaximized ? (
                <FloatingPanel
                  scroll={true}
                  peerGroup="panels"
                  title={strings.dataset.tableTitleColumns}
                  onClose={() => this.setState({ fieldViewMaximized: false })}
                >
                  <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                    <DatasetView store={this.props.store} />
                  </ErrorBoundary>
                </FloatingPanel>
              ) : null}
            </div>
            <PopupContainer controller={globals.popupController} />
            {this.props.store.messageState.size ? (
              <div className="charticulator__floating-panels_errors">
                <FloatingPanel
                  floatInCenter={true}
                  scroll={true}
                  peerGroup="messages"
                  title={strings.mainView.errorsPanelTitle}
                  closeButtonIcon={"ChromeClose"}
                  height={200}
                  width={350}
                >
                  <ErrorBoundary telemetryRecorder={this.props.telemetry}>
                    <MessagePanel store={this.props.store} />
                  </ErrorBoundary>
                </FloatingPanel>
              </div>
            ) : null}
            <DragStateView controller={globals.dragController} />
          </TelemetryContext.Provider>
        </MainReactContext.Provider>
      </div>
    );
  }
}

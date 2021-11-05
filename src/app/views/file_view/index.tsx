// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Components to save, open, create, export charts.
 *
 * ![File view](media://file_view.png)
 *
 * * {@link "app/views/file_view/new_view"} / {@link "app/views/file_view/import_data_view"} - component with two file inputs for main table data and links table data
 *
 * ![File view](media://file_view_new.png)
 *
 * * {@link "app/views/file_view/open_view"}
 *
 * ![File view](media://file_view_open.png)
 *
 * * {@link "app/views/file_view/save_view"}
 *
 * ![File view](media://file_view_save.png)
 *
 * * {@link "app/views/file_view/export_view"}
 *
 * ![File view](media://file_view_export.png)
 *
 * @packageDocumentation
 * @preferred
 */
import * as React from "react";
import * as R from "../../resources";

import { AbstractBackend } from "../../backend/abstract";
import {
  ErrorBoundary,
  SVGImageIcon,
  TelemetryContext,
} from "../../components";
import { AppStore } from "../../stores";
import { classNames, stringToDataURL } from "../../utils";
import { FileViewExport } from "./export_view";
import { FileViewNew } from "./new_view";
import { FileViewOpen } from "./open_view";
import { FileViewSaveAs } from "./save_view";
import { FileViewOptionsView } from "./options_view";
import { strings } from "../../../strings";
import { MainReactContext } from "../../context_component";

export enum MainTabs {
  about = "about",
  export = "export",
  new = "new",
  open = "open",
  options = "options",
  save = "save",
}

const tabOrder: MainTabs[] = [
  MainTabs.new,
  MainTabs.open,
  MainTabs.save,
  MainTabs.export,
  MainTabs.options,
  null,
  MainTabs.about,
];

export class CurrentChartView extends React.PureComponent<
  { store: AppStore },
  { svgDataURL: string }
> {
  constructor(props: { store: AppStore }) {
    super(props);
    this.state = {
      svgDataURL: null,
    };
    this.renderImage();
  }
  public async renderImage() {
    const svg = await this.props.store.renderLocalSVG();
    this.setState({
      svgDataURL: stringToDataURL("image/svg+xml", svg),
    });
  }
  public render() {
    return (
      <div className="current-chart-view">
        <img src={this.state.svgDataURL} />
      </div>
    );
  }
}

export interface FileViewProps {
  store: AppStore;
  backend: AbstractBackend;
  defaultTab?: MainTabs;
  onClose: () => void;
}

export interface FileViewState {
  currentTab: MainTabs;
}

export class FileView extends React.Component<FileViewProps, FileViewState> {
  public refs: {
    inputSaveChartName: HTMLInputElement;
  };

  private buttonBack: HTMLElement;
  constructor(props: FileViewProps) {
    super(props);
    this.state = {
      currentTab: this.props.defaultTab || MainTabs.open,
    };
  }

  componentDidMount() {
    setTimeout(() => {
      this.buttonBack?.focus();
    }, 100);
  }

  public switchTab(currentTab: MainTabs) {
    this.setState({ currentTab });
  }

  public renderContent() {
    switch (this.state.currentTab) {
      case MainTabs.new: {
        return (
          <FileViewNew store={this.props.store} onClose={this.props.onClose} />
        );
      }
      case MainTabs.save: {
        return (
          <FileViewSaveAs
            store={this.props.store}
            onClose={this.props.onClose}
          />
        );
      }
      case MainTabs.export: {
        return (
          <FileViewExport
            store={this.props.store}
            onClose={this.props.onClose}
          />
        );
      }
      case MainTabs.options: {
        return <FileViewOptionsView onClose={this.props.onClose} />;
      }
      case MainTabs.about: {
        return (
          <iframe
            className="charticulator__file-view-about"
            src="about.html"
            style={{ flex: "1" }}
          />
        );
      }
      case MainTabs.open:
      default: {
        return (
          <FileViewOpen store={this.props.store} onClose={this.props.onClose} />
        );
      }
    }
  }

  public render() {
    return (
      <MainReactContext.Provider value={{ store: this.props.store }}>
        <div className="charticulator__file-view">
          <div className="charticulator__file-view-tabs">
            <div
              ref={(r) => (this.buttonBack = r)}
              tabIndex={0}
              className="el-button-back"
              onClick={() => this.props.onClose()}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  this.props.onClose();
                }
              }}
            >
              <SVGImageIcon url={R.getSVGIcon("toolbar/back")} />
            </div>
            {tabOrder.map((t, index) =>
              t === null ? (
                <div key={index} className="el-sep" />
              ) : (
                <div
                  tabIndex={0}
                  key={index}
                  className={classNames("el-tab", [
                    "active",
                    this.state.currentTab == t,
                  ])}
                  onClick={() => this.switchTab(t)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      this.switchTab(t);
                    }
                  }}
                >
                  {strings.mainTabs[t]}
                </div>
              )
            )}
          </div>
          <TelemetryContext.Consumer>
            {(telemetryRecorder) => {
              return (
                <ErrorBoundary telemetryRecorder={telemetryRecorder}>
                  {this.renderContent()}
                </ErrorBoundary>
              );
            }}
          </TelemetryContext.Consumer>
        </div>
      </MainReactContext.Provider>
    );
  }
}

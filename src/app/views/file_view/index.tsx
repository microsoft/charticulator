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
import { ErrorBoundary, SVGImageIcon } from "../../components";
import { AppStore } from "../../stores";
import { classNames, stringToDataURL } from "../../utils";
import { FileViewExport } from "./export_view";
import { FileViewNew } from "./new_view";
import { FileViewOpen } from "./open_view";
import { FileViewSaveAs } from "./save_view";
import { FileViewOptions } from "./options_view";

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
  defaultTab?: string;
  onClose: () => void;
}

export interface FileViewState {
  currentTab: string;
}

export class FileView extends React.Component<FileViewProps, FileViewState> {
  public refs: {
    inputSaveChartName: HTMLInputElement;
  };

  constructor(props: FileViewProps) {
    super(props);
    this.state = {
      currentTab: this.props.defaultTab || "open",
    };
  }

  public switchTab(name: string) {
    this.setState({
      currentTab: name,
    });
  }

  public renderContent() {
    switch (this.state.currentTab) {
      case "new": {
        return <FileViewNew onClose={this.props.onClose} />;
      }
      case "save": {
        return <FileViewSaveAs onClose={this.props.onClose} />;
      }
      case "export": {
        return <FileViewExport onClose={this.props.onClose} />;
      }
      case "options": {
        return <FileViewOptions onClose={this.props.onClose} />;
      }
      case "about": {
        return (
          <iframe
            className="charticulator__file-view-about"
            src="about.html"
            style={{ flex: "1" }}
          />
        );
      }
      case "open":
      default: {
        return <FileViewOpen onClose={this.props.onClose} />;
      }
    }
  }

  public render() {
    return (
      <div className="charticulator__file-view">
        <div className="charticulator__file-view-tabs">
          <div className="el-button-back" onClick={() => this.props.onClose()}>
            <SVGImageIcon url={R.getSVGIcon("toolbar/back")} />
          </div>
          <div
            className={classNames("el-tab", [
              "active",
              this.state.currentTab == "new",
            ])}
            onClick={() => this.switchTab("new")}
          >
            New
          </div>
          <div
            className={classNames("el-tab", [
              "active",
              this.state.currentTab == "open",
            ])}
            onClick={() => this.switchTab("open")}
          >
            Open
          </div>
          <div
            className={classNames("el-tab", [
              "active",
              this.state.currentTab == "save",
            ])}
            onClick={() => this.switchTab("save")}
          >
            Save As
          </div>
          <div
            className={classNames("el-tab", [
              "active",
              this.state.currentTab == "export",
            ])}
            onClick={() => this.switchTab("export")}
          >
            Export
          </div>
          <div
            className={classNames("el-tab", [
              "active",
              this.state.currentTab == "options",
            ])}
            onClick={() => this.switchTab("options")}
          >
            Options
          </div>
          <div className="el-sep" />
          <div
            className={classNames("el-tab", [
              "active",
              this.state.currentTab == "about",
            ])}
            onClick={() => this.switchTab("about")}
          >
            About
          </div>
        </div>
        <ErrorBoundary>{this.renderContent()}</ErrorBoundary>
      </div>
    );
  }
}

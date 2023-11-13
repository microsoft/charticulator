// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../../resources";

import { CurrentChartView } from ".";
import { SVGImageIcon } from "../../components";
import { Actions } from "../../actions";
import { strings } from "../../../strings";
import { AppStore } from "../../stores";
import { Button } from "@fluentui/react-components";

export interface FileViewSaveAsProps {
  onClose: () => void;
  store: AppStore;
}
export interface FileViewSaveAsState {
  saving?: boolean;
  error?: string;
}

export class FileViewSaveAs extends React.Component<
  React.PropsWithChildren<FileViewSaveAsProps>,
  FileViewSaveAsState
> {
  public state: FileViewSaveAsState = {};

  public render() {
    let inputSaveChartName: HTMLInputElement;

    return (
      <section className="charticulator__file-view-content is-fix-width">
        <h1>{strings.mainTabs.save}</h1>
        <section>
          <CurrentChartView store={this.props.store} />
          <div className="form-group">
            <input
              ref={(e) => (inputSaveChartName = e)}
              type="text"
              required={true}
              defaultValue={this.props.store.dataset.name}
            />
            <label>{strings.fileSave.chartName}</label>
            <i className="bar" />
          </div>
          <div className="buttons">
            <span className="el-progress">
              {this.state.saving ? (
                <SVGImageIcon url={R.getSVGIcon("loading")} />
              ) : null}
            </span>
            <Button
              // iconProps={{
              //   iconName: "Save",
              // }}
              icon={<SVGImageIcon url={R.getSVGIcon("Save")} />}
              // styles={primaryButtonStyles}
              title={strings.fileSave.saveButton}
              onClick={() => {
                const name = inputSaveChartName.value.trim();
                this.setState(
                  {
                    saving: true,
                  },
                  () => {
                    this.props.store.dispatcher.dispatch(
                      new Actions.SaveAs(name, (error) => {
                        if (error) {
                          this.setState({
                            saving: true,
                            error: error.message,
                          });
                        } else {
                          this.props.onClose();
                        }
                      })
                    );
                  }
                );
              }}
            >
              {strings.fileSave.saveButton}
            </Button>
          </div>
          {this.state.error ? (
            <div className="error">{this.state.error}</div>
          ) : null}
        </section>
      </section>
    );
  }
}

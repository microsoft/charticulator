// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../../resources";

import { CurrentChartView } from ".";
import { ButtonRaised, SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";
import { Actions } from "../../actions";

export interface FileViewSaveAsProps {
  onClose: () => void;
}
export interface FileViewSaveAsState {
  saving?: boolean;
  error?: string;
}

export class FileViewSaveAs extends ContextedComponent<
  FileViewSaveAsProps,
  FileViewSaveAsState
> {
  public state: FileViewSaveAsState = {};

  public render() {
    let inputSaveChartName: HTMLInputElement;

    return (
      <section className="charticulator__file-view-content is-fix-width">
        <h1>Save As</h1>
        <section>
          <CurrentChartView store={this.mainStore} />
          <div className="form-group">
            <input
              ref={e => (inputSaveChartName = e)}
              type="text"
              required={true}
              defaultValue={this.mainStore.datasetStore.dataset.name}
            />
            <label>Chart Name</label>
            <i className="bar" />
          </div>
          <div className="buttons">
            <span className="el-progress">
              {this.state.saving ? (
                <SVGImageIcon url={R.getSVGIcon("loading")} />
              ) : null}
            </span>
            <ButtonRaised
              url={R.getSVGIcon("toolbar/save")}
              text="Save to My Charts"
              onClick={() => {
                const name = inputSaveChartName.value.trim();
                this.setState(
                  {
                    saving: true
                  },
                  () => {
                    this.dispatch(
                      new Actions.SaveAs(name, error => {
                        if (error) {
                          this.setState({
                            saving: true,
                            error: error.message
                          });
                        } else {
                          this.props.onClose();
                        }
                      })
                    );
                  }
                );
              }}
            />
          </div>
          {this.state.error ? (
            <div className="error">{this.state.error}</div>
          ) : null}
        </section>
      </section>
    );
  }
}

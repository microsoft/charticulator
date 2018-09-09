/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/

import * as React from "react";
import * as R from "../../resources";

import { CurrentChartView } from ".";
import { ButtonRaised } from "../../components";
import { ContextedComponent } from "../../context_component";

export class FileViewSaveAs extends ContextedComponent<
  {
    onClose: () => void;
  },
  {}
> {
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
            <ButtonRaised
              url={R.getSVGIcon("toolbar/save")}
              text="Save to My Charts"
              onClick={() => {
                const name = inputSaveChartName.value.trim();
                this.mainStore.backendSaveChartAs(name).then(() => {
                  this.props.onClose();
                });
              }}
            />
          </div>
        </section>
      </section>
    );
  }
}

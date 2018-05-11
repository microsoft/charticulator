import * as React from "react";

import * as R from "../../resources";
import { Actions } from "../../actions";
import { ContextedComponent } from "../../context_component";
import { ImportDataView } from "./import_data_view";
import { CurrentChartView } from ".";
import { ButtonRaised } from "../../components";

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

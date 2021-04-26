// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import { strings } from "../../../strings";
import { Actions } from "../../actions";
import { ContextedComponent } from "../../context_component";
import { ImportDataView } from "./import_data_view";

export class FileViewNew extends ContextedComponent<
  {
    onClose: () => void;
  },
  {}
> {
  public render() {
    return (
      <section className="charticulator__file-view-content">
        <h1>{strings.mainTabs.new}</h1>
        <ImportDataView
          store={this.context.store}
          onConfirmImport={(dataset) => {
            this.dispatch(new Actions.ImportDataset(dataset));
            this.props.onClose();
          }}
        />
      </section>
    );
  }
}

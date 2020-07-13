// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Actions } from "../../actions";
import { ContextedComponent } from "../../context_component";
import { ImportDataView } from "./import_data_view";
import { IntlProvider } from "../../../core/common/intl";

export class FileViewNew extends ContextedComponent<
  {
    onClose: () => void;
    intlProvider: IntlProvider;
  },
  {}
> {
  public render() {
    return (
      <section className="charticulator__file-view-content">
        <h1>New</h1>
        <ImportDataView
          intlProvider={this.props.intlProvider}
          onConfirmImport={dataset => {
            this.dispatch(new Actions.ImportDataset(dataset));
            this.props.onClose();
          }}
        />
      </section>
    );
  }
}

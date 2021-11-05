// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import { strings } from "../../../strings";
import { Actions } from "../../actions";
import { AppStore } from "../../stores";
import { ImportDataView } from "./import_data_view";

export class FileViewNew extends React.Component<
  {
    store: AppStore;
    onClose: () => void;
  },
  {}
> {
  public render() {
    return (
      <section className="charticulator__file-view-content">
        <h1>{strings.mainTabs.new}</h1>
        <ImportDataView
          store={this.props.store}
          onConfirmImport={(dataset) => {
            this.props.store.dispatcher.dispatch(
              new Actions.ImportDataset(dataset)
            );
            this.props.onClose();
          }}
        />
      </section>
    );
  }
}

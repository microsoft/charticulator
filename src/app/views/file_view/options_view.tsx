// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { ContextedComponent } from "../../context_component";
import { LocaleFileFormat } from "../../../core/dataset/dsv_parser";
import { strings } from "../../../strings";

export class FileViewOptions extends ContextedComponent<
  {
    onClose: () => void;
  },
  {}
> {
  public changeLocaleFileFormat(localeFileFormat: LocaleFileFormat) {
    this.store.setLocaleFileFormat(localeFileFormat);
    this.forceUpdate();
  }

  public render() {
    const localeFileFormat = this.context.store.getLocaleFileFormat();
    return (
      <section className="charticulator__file-view-content">
        <h1>{strings.mainTabs.options}</h1>
        <div>
          <h2>{strings.options.fileFormat}</h2>
          <div>
            <div className="form-group">
              <select
                onChange={(e) =>
                  this.changeLocaleFileFormat({
                    ...localeFileFormat,
                    delimiter: e.target.options[e.target.selectedIndex].value,
                  })
                }
                value={localeFileFormat.delimiter}
              >
                <option value=",">{strings.options.comma}</option>
                <option value=";">{strings.options.semicolon}</option>
              </select>
              <label>{strings.options.delimiter}</label>
            </div>
            <div className="form-group">
              <select
                onChange={(e) => {
                  const isDot =
                    e.target.options[e.target.selectedIndex].value === ".";
                  this.changeLocaleFileFormat({
                    ...localeFileFormat,
                    numberFormat: {
                      decimal: isDot ? "." : ",",
                      remove: isDot ? "," : ".",
                    },
                  });
                }}
                value={localeFileFormat.numberFormat.decimal}
              >
                <option value=".">{strings.options.numberFormatDot}</option>
                <option value=",">{strings.options.numberFormatComma}</option>
              </select>
              <label>{strings.options.numberFormat}</label>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

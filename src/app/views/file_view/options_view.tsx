// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { ContextedComponent } from "../../context_component";
import { LocaleFileFormat } from "../../../core/dataset/dsv_parser";

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
        <h1>Options</h1>
        <div>
          <h2>Import file format</h2>
          <div>
          <div className="form-group">
              <select
                onChange={e =>
                  this.changeLocaleFileFormat({
                    ...localeFileFormat,
                    delimiter: e.target.options[e.target.selectedIndex].value
                  })
                }
                value={localeFileFormat.delimiter}
              >
                <option value=",">comma</option>
                <option value=";">semicolon</option>
              </select>
              <label>CSV Delimiter</label>
            </div>
            <div className="form-group">
              <select
                onChange={e =>
                  e.target.options[e.target.selectedIndex].value === "."
                    ? this.changeLocaleFileFormat({
                        ...localeFileFormat,
                        numberFormat: {
                          decimal: ".",
                          remove: ","
                        }
                      })
                    : this.changeLocaleFileFormat({
                        ...localeFileFormat,
                        numberFormat: {
                          decimal: ",",
                          remove: "."
                        }
                      })
                }
                value={localeFileFormat.numberFormat.decimal}
              >
                <option value=".">Decimal: . Separator: ,</option>
                <option value=",">Decimal: , Separator: .</option>
              </select>
              <label>Number format</label>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

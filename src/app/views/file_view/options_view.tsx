// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { LocaleFileFormat } from "../../../core/dataset/dsv_parser";
import { strings } from "../../../strings";
import { ContextedComponent, MainContext } from "../../context_component";
import { AppStore } from "../../stores";
import { useLocalStorage } from "../../utils/hooks";

export interface FileViewOptionsProps {
  onClose: () => void;
}

const FileViewOptionsView: React.FC<FileViewOptionsProps & MainContext> = ({
  store,
  onClose,
}) => {
  const localeFileFormat = store.getLocaleFileFormat();

  const [numberFormatDecimal, setNumberFormatDecimal] = useLocalStorage<string>(
    localeFileFormat.numberFormat.decimal,
    "numberFormatRemove"
  );
  const [delimiterSymbol, setDelimiterSymbol] = useLocalStorage<string>(
    localeFileFormat.delimiter,
    "delimiterSymbol"
  );

  const changeLocaleFileFormat = (localeFileFormat: LocaleFileFormat) => {
    store.setLocaleFileFormat(localeFileFormat);
  };

  return (
    <section className="charticulator__file-view-content">
      <h1>{strings.mainTabs.options}</h1>
      <div>
        <h2>{strings.options.fileFormat}</h2>
        <div>
          <div className="form-group">
            <select
              onChange={(e) => {
                changeLocaleFileFormat({
                  ...localeFileFormat,
                  delimiter: e.target.options[e.target.selectedIndex].value,
                });
                setDelimiterSymbol(
                  e.target.options[e.target.selectedIndex].value
                );
              }}
              value={delimiterSymbol}
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
                changeLocaleFileFormat({
                  ...localeFileFormat,
                  numberFormat: {
                    decimal: isDot ? "." : ",",
                    remove: isDot ? "," : ".",
                  },
                });
                setNumberFormatDecimal(
                  e.target.options[e.target.selectedIndex].value
                );
              }}
              value={numberFormatDecimal}
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
};

// TODO create HOC
export class FileViewOptions extends ContextedComponent<
  {
    onClose: () => void;
  },
  {}
> {
  public render() {
    return (
      <FileViewOptionsView
        onClose={this.props.onClose}
        store={this.context.store}
      />
    );
  }
}

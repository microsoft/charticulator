// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { useContext } from "react";
import {
  defaultCurrency,
  defaultDigitsGroup,
  parseSafe,
  setFormatOptions,
} from "../../../core/common";
import { LocaleFileFormat } from "../../../core/dataset/dsv_parser";
import { strings } from "../../../strings";
import {
  ContextedComponent,
  MainContextInterface,
} from "../../context_component";
import { MainContext } from "../../context_provider";
import { LocalStorageKeys } from "../../globals";
import { AppStore } from "../../stores";
import { useLocalStorage } from "../../utils/hooks";
import { InputText } from "../panels/widgets/controls";

export interface FileViewOptionsProps {
  onClose: () => void;
}

export const FileViewOptions: React.FC<FileViewOptionsProps> = ({
  onClose,
}) => {
  const { store } = useContext(MainContext);

  const localeFileFormat: LocaleFileFormat = store.getLocaleFileFormat();

  const [numberFormatDecimal, setNumberFormatDecimal] = useLocalStorage<string>(
    localeFileFormat.numberFormat.decimal,
    LocalStorageKeys.NumberFormatRemove
  );
  const [delimiterSymbol, setDelimiterSymbol] = useLocalStorage<string>(
    localeFileFormat.delimiter,
    LocalStorageKeys.DelimiterSymbol
  );

  const [currencySymbol, setCurrencySymbol] = useLocalStorage<string>(
    localeFileFormat.currency,
    LocalStorageKeys.CurrencySymbol
  );

  const [groupSymbol, setGroupSymbol] = useLocalStorage<string>(
    localeFileFormat.group,
    LocalStorageKeys.GroupSymbol
  );

  const changeLocaleFileFormat = (localeFileFormat: LocaleFileFormat) => {
    store.setLocaleFileFormat(localeFileFormat);
    store.solveConstraintsAndUpdateGraphics();
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
                setFormatOptions({
                  decimal: isDot ? "." : ",",
                  thousands: isDot ? "," : ".",
                  currency: parseSafe(
                    localeFileFormat.currency,
                    defaultCurrency
                  ),
                  grouping: parseSafe(
                    localeFileFormat.group,
                    defaultDigitsGroup
                  ),
                });
              }}
              value={numberFormatDecimal}
            >
              <option value=".">{strings.options.numberFormatDot}</option>
              <option value=",">{strings.options.numberFormatComma}</option>
            </select>
            <label>{strings.options.numberFormat}</label>
          </div>
          {/* Uncomment to enable configuration for locale: currency symbol and groupping digits */}
          {/*
            <div className="form-group">
            <InputText
              defaultValue={currencySymbol}
              placeholder={"currency"}
              onEnter={(value) => {
                setFormatOptions({
                  decimal: localeFileFormat.numberFormat.decimal,
                  thousands:
                    localeFileFormat.numberFormat.decimal === "," ? "." : ",",
                  grouping: parseSafe(localeFileFormat.group, defaultDigitsGroup),
                  currency: parseSafe(value, defaultCurrency),
                });
                setCurrencySymbol(value);
                changeLocaleFileFormat({
                  ...localeFileFormat,
                  currency: value,
                });
                return true;
              }}
            />
            <label>{strings.options.currencyFormat}</label>
          </div>

          <div className="form-group">
            <InputText
              defaultValue={groupSymbol}
              placeholder={"group"}
              onEnter={(value) => {
                setFormatOptions({
                  decimal: localeFileFormat.numberFormat.decimal,
                  thousands:
                    localeFileFormat.numberFormat.decimal === "," ? "." : ",",
                  grouping: parseSafe(value, defaultDigitsGroup),
                  currency: parseSafe(localeFileFormat.currency, defaultCurrency),
                });
                setGroupSymbol(value);
                changeLocaleFileFormat({
                  ...localeFileFormat,
                  group: value,
                });
                return true;
              }}
            />
            <label>{strings.options.groups}</label>
          </div> */}
        </div>
      </div>
    </section>
  );
};

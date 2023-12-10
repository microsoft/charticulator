// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { useContext } from "react";

import {
  BillionsFormat,
  defaultCurrency,
  defaultDigitsGroup,
  parseSafe,
  setBillionsFormatOption,
  setFormatOptions,
  setTimeZone,
} from "../../../core/common";
import { LocaleFileFormat } from "../../../core/dataset/dsv_parser";
import { strings } from "../../../strings";
import { MainReactContext } from "../../context_component";
import { LocalStorageKeys } from "../../globals";
import { AppStore } from "../../stores";
import { useLocalStorage } from "../../utils/hooks";

export interface FileViewOptionsProps {
  onClose: () => void;
}

// eslint-disable-next-line
export const FileViewOptionsView: React.FC<FileViewOptionsProps> = () => {
  const { store } = useContext(MainReactContext);

  const localeFileFormat: LocaleFileFormat = store.getLocaleFileFormat();

  const [numberFormatRemove, setNumberFormatRemove] = useLocalStorage<string>(
    localeFileFormat.numberFormat.remove,
    LocalStorageKeys.NumberFormatRemove
  );
  const [delimiterSymbol, setDelimiterSymbol] = useLocalStorage<string>(
    localeFileFormat.delimiter,
    LocalStorageKeys.DelimiterSymbol
  );
  const [utcTimeZone, setUtcTimeZone] = useLocalStorage<boolean>(
    localeFileFormat.utcTimeZone,
    LocalStorageKeys.UtcTimeZone
  );
  const [billionsFormat, setBillionsFormat] = useLocalStorage<BillionsFormat>(
    'giga',
    LocalStorageKeys.bFormat
  );

  // const [currencySymbol, setCurrencySymbol] = useLocalStorage<string>(
  //   localeFileFormat.currency,
  //   LocalStorageKeys.CurrencySymbol
  // );

  // const [groupSymbol, setGroupSymbol] = useLocalStorage<string>(
  //   localeFileFormat.group,
  //   LocalStorageKeys.GroupSymbol
  // );

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
                const isDecimalDot =
                  e.target.options[e.target.selectedIndex].value === ","; // values is removeal
                changeLocaleFileFormat({
                  ...localeFileFormat,
                  numberFormat: {
                    decimal: isDecimalDot ? "." : ",",
                    remove: isDecimalDot ? "," : ".",
                  },
                });
                setNumberFormatRemove(isDecimalDot ? "," : ".");
                setFormatOptions({
                  decimal: isDecimalDot ? "." : ",",
                  thousands: isDecimalDot ? "," : ".",
                  currency: parseSafe(
                    localeFileFormat.currency,
                    defaultCurrency
                  ),
                  grouping: parseSafe(
                    localeFileFormat.group,
                    defaultDigitsGroup
                  ),
                  billionsFormat: billionsFormat
                });
              }}
              value={numberFormatRemove}
            >
              <option value=",">{strings.options.numberFormatDot}</option>
              <option value=".">{strings.options.numberFormatComma}</option>
            </select>
            <label>{strings.options.numberFormat}</label>
          </div>

          <div className="form-group">
            <select
              onChange={(e) => {
                changeLocaleFileFormat({
                  ...localeFileFormat,
                  utcTimeZone:
                    e.target.options[e.target.selectedIndex].value === "true",
                });
                setUtcTimeZone(
                  e.target.options[e.target.selectedIndex].value === "true"
                );
                setTimeZone(
                  e.target.options[e.target.selectedIndex].value === "true"
                );
              }}
              value={utcTimeZone ? "true" : "false"}
            >
              <option value="true">{strings.options.utc}</option>
              <option value="false">{strings.options.local}</option>
            </select>
            <label>{strings.options.timeZone}</label>
          </div>

          <div className="form-group">
            <select
              onChange={(e) => {
                setBillionsFormat(e.target.options[e.target.selectedIndex].value as BillionsFormat);
                setBillionsFormatOption(e.target.options[e.target.selectedIndex].value as BillionsFormat);
              }}
              value={billionsFormat}
            >
              <option value="giga">{strings.options.giga}</option>
              <option value="billions">{strings.options.billions}</option>
            </select>
            <label>{strings.options.bFormat}</label>
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

// TODO create HOC
export class FileViewOptions extends React.Component<
  React.PropsWithChildren<{
    onClose: () => void;
    store: AppStore;
  }>,
  Record<string, unknown>
> {
  public render() {
    return (
      <FileViewOptionsView
        onClose={this.props.onClose}
        // store={this.props.store}
      />
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
// import {
//   IComboBoxOption,
//   ComboBox as FluentCombobox,
//   Label,
// } from "@fluentui/react";
import { fontList } from "../../../../../core";
// import {
//   defaultLabelStyle,
//   defaultStyle,
//   defultComponentsHeight,
// } from "./fluentui_customized_components";
import { Combobox, Option, Label } from "@fluentui/react-components";

export interface ComboBoxFontFamilyProps {
  defaultValue: string;
  label?: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}

export const FluentComboBoxFontFamily: React.FC<ComboBoxFontFamilyProps> = (
  props
) => {
  const [currentValue, setCurrentValue] = React.useState<string>(
    props.defaultValue
  );

  const optionsWithCustomStyling: Record<string, any>[] = React.useMemo<
    Record<string, any>[]
  >(() => {
    const currentFontList = [...new Set([...fontList, currentValue])];

    return currentFontList.map((fontName: string) => ({
      key: fontName,
      text: fontName,
      data: {
        fontFamily: fontName,
      }
      // styles: {
      //   optionText: {
      //     fontFamily: fontName,
      //   },
      //   root: {
      //     ...defultComponentsHeight,
      //     minHeight: defultComponentsHeight.height,
      //   },
      // },
    }));
  }, [currentValue]);

  const onCancel = React.useCallback(() => props.onCancel?.(), [props]);
  const onEnter = React.useCallback(
    (event, value) => {
      const currentInputValue: string = event.target.value;
      const currentFontValue: string =
        value?.key?.toString() ??
        (currentInputValue.length > 0 ? currentInputValue : props.defaultValue);
      setCurrentValue(currentFontValue);
      props.onEnter?.(currentFontValue);
    },
    [props]
  );

  return (
    <>
      <Label>
        {props.label}
      </Label>
      <Combobox
        // styles={{
        //   ...defaultStyle,
        //   root: {
        //     ...defultComponentsHeight,
        //   },
        // }}
        value={currentValue}
        // label={props.label}
        // onRenderLabel={({ props }) => (
        //   <Label styles={defaultLabelStyle}>{props.label}</Label>
        // )}
        autoComplete="on"
        // options={optionsWithCustomStyling}
        onOptionSelect={(e, { optionValue }) => {
          onEnter(e, optionValue);
        }}
        onAbort={onCancel}
        // allowFreeform
      >{
        optionsWithCustomStyling.map(o => {
          return (
            <Option value={o.key as string} text={o.text}>
              <span style={{
                fontFamily: o.data.fontFamily
              }}>{o.text}</span>
            </Option>
          )
        })
      }</Combobox>
    </>
  );
};

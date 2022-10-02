// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  IComboBoxOption,
  ComboBox as FluentCombobox,
  Label,
} from "@fluentui/react";
import { fontList } from "../../../../../core";
import {
  defaultLabelStyle,
  defaultStyle,
  defaultComponentsHeight,
} from "./fluentui_customized_components";

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

  const optionsWithCustomStyling: IComboBoxOption[] = React.useMemo<
    IComboBoxOption[]
  >(() => {
    const currentFontList = [...new Set([...fontList, currentValue])];

    return currentFontList.map((fontName: string) => ({
      key: fontName,
      text: fontName,
      styles: {
        optionText: {
          fontFamily: fontName,
        },
        root: {
          ...defaultComponentsHeight,
          minHeight: defaultComponentsHeight.height,
        },
      },
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
    <FluentCombobox
      styles={{
        ...defaultStyle,
        root: {
          ...defaultComponentsHeight,
        },
      }}
      selectedKey={currentValue}
      label={props.label}
      onRenderLabel={({ props }) => (
        <Label styles={defaultLabelStyle}>{props.label}</Label>
      )}
      autoComplete="on"
      options={optionsWithCustomStyling}
      onChange={onEnter}
      onAbort={onCancel}
      allowFreeform
    />
  );
};

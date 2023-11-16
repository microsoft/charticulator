// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Input, Label } from "@fluentui/react-components";

import * as React from "react";
import {
  Expression,
  replaceNewLineBySymbol,
  replaceSymbolByTab,
  replaceSymbolByNewLine,
  replaceTabBySymbol,
} from "../../../../../core";
import { FluentColumnLayout } from "./fluentui_customized_components";
import { InputExpressionProps } from "./fluentui_input_expression";

export interface InputFormatProps {
  validate?: (value: string) => Expression.VerifyUserExpressionReport;
  defaultValue?: string;
  placeholder?: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
  textExpression?: boolean;
  allowNull?: boolean;
}

export interface InputFormatState {
  errorMessage?: string;
  errorIndicator: boolean;
  value?: string;
}

export const FluentInputFormat: React.FC<InputExpressionProps> = (
  props: InputExpressionProps
) => {
  const [value, setValue] = React.useState(props.defaultValue);

  const doEnter = React.useCallback(() => {
    if (props.allowNull && value?.trim() == "") {
      setValue("");
      props.onEnter(null);
    } else {
      const result = props.validate(
        replaceTabBySymbol(replaceNewLineBySymbol(value))
      );
      if (result.pass) {
        setValue(result.formatted);
        props.onEnter(result.formatted);
      }
    }
  }, [props, value]);

  const doCancel = React.useCallback(() => {
    setValue(props.defaultValue || "");
    if (props.onCancel) {
      props.onCancel();
    }
  }, [props]);

  return (
    // <span className="charticulator__widget-control-input-expression">
    <>
      <FluentColumnLayout>
        <Label>{props.label}</Label>
        <Input
          // styles={defaultStyle}
          // label={props.label}
          // onRenderLabel={labelRender}
          placeholder={props.placeholder}
          type="text"
          // onGetErrorMessage={() => {
          //   const validateResults = props.validate?.(value);
          //   if (!validateResults.pass) {
          //     return validateResults.error;
          //   }
          // }}
          defaultValue={replaceSymbolByTab(
            replaceSymbolByNewLine(value || props.defaultValue)
          )}
          onChange={(event, { value: newValue }) => {
            // Check for parse errors while input
            if (props.allowNull && newValue?.trim() == "") {
              setValue(newValue);
            } else {
              Expression.verifyUserExpression(
                replaceTabBySymbol(replaceNewLineBySymbol(newValue)),
                {
                  textExpression: props.textExpression,
                }
              );
              setValue(newValue);
            }
          }}
          onBlur={() => {
            doEnter();
          }}
          onFocus={(e) => {
            e.target.select();
          }}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              doEnter();
            }
            if (e.key == "Escape") {
              doCancel();
            }
          }}
        />
      </FluentColumnLayout>
    </>
    // </span>
  );
};

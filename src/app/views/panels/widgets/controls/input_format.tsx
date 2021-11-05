// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import {
  Expression,
  replaceNewLineBySymbol,
  replaceSymbolByTab,
  replaceSymbolByNewLine,
  replaceTabBySymbol,
} from "../../../../../core";
import { classNames } from "../../../../utils";

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

export class InputFormat extends React.Component<
  InputFormatProps,
  InputFormatState
> {
  protected refInput: HTMLInputElement;
  public state: InputFormatState = {
    errorMessage: null,
    errorIndicator: false,
    value: this.props.defaultValue || "",
  };

  public componentWillReceiveProps(newProps: InputFormatProps) {
    this.setState({
      errorMessage: null,
      errorIndicator: false,
      value: newProps.defaultValue || "",
    });
  }

  protected doEnter() {
    if (this.props.allowNull && this.refInput.value.trim() == "") {
      this.setState({
        value: "",
        errorIndicator: false,
        errorMessage: null,
      });
      this.props.onEnter(null);
    } else {
      const result = this.props.validate(
        replaceTabBySymbol(replaceNewLineBySymbol(this.refInput.value))
      );
      if (result.pass) {
        this.setState({
          value: result.formatted,
          errorIndicator: false,
          errorMessage: null,
        });
        this.props.onEnter(result.formatted);
      } else {
        this.setState({
          errorIndicator: true,
          errorMessage: result.error,
        });
      }
    }
  }
  protected doCancel() {
    this.setState({
      value: this.props.defaultValue || "",
      errorIndicator: false,
      errorMessage: null,
    });
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  public render() {
    return (
      <span className="charticulator__widget-control-input-expression">
        <input
          className={classNames(
            "charticulator__widget-control-input-expression-input",
            ["is-error", this.state.errorIndicator]
          )}
          type="text"
          ref={(e) => (this.refInput = e)}
          value={replaceSymbolByTab(replaceSymbolByNewLine(this.state.value))}
          placeholder={this.props.placeholder}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              this.doEnter();
            }
            if (e.key == "Escape") {
              this.doCancel();
            }
          }}
          onFocus={() => {
            this.refInput.select();
          }}
          onBlur={() => {
            this.doEnter();
          }}
          onChange={() => {
            // Check for parse errors while input
            const newValue = this.refInput.value;
            if (this.props.allowNull && newValue.trim() == "") {
              this.setState({
                value: newValue,
                errorIndicator: false,
              });
            } else {
              const result = Expression.verifyUserExpression(
                replaceTabBySymbol(replaceNewLineBySymbol(newValue)),
                {
                  textExpression: this.props.textExpression,
                }
              );
              this.setState({
                value: this.refInput.value,
                errorIndicator: !result.pass,
              });
            }
          }}
        />
        {this.state.errorMessage != null ? (
          <span className="charticulator__widget-control-input-expression-error">
            {this.state.errorMessage}
          </span>
        ) : null}
      </span>
    );
  }
}

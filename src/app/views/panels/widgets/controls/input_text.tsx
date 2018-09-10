// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

export interface InputTextProps {
  defaultValue?: string;
  placeholder?: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}

export class InputText extends React.Component<InputTextProps, {}> {
  public inputElement: HTMLInputElement;

  public componentWillUpdate(newProps: InputTextProps) {
    this.inputElement.value =
      newProps.defaultValue != null ? newProps.defaultValue : "";
  }

  public doEnter() {
    if (
      (this.props.defaultValue != null ? this.props.defaultValue : "") ==
      this.inputElement.value
    ) {
      return;
    }
    if (this.props.onEnter) {
      const ret = this.props.onEnter(this.inputElement.value);
      if (!ret) {
        this.inputElement.value =
          this.props.defaultValue != null ? this.props.defaultValue : "";
      }
    } else {
      this.inputElement.value =
        this.props.defaultValue != null ? this.props.defaultValue : "";
    }
  }

  public doCancel() {
    this.inputElement.value =
      this.props.defaultValue != null ? this.props.defaultValue : "";
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  public get value() {
    return this.inputElement.value;
  }

  public set value(v: string) {
    this.inputElement.value = v;
  }

  public render() {
    return (
      <input
        className="charticulator__widget-control-input-field"
        type="text"
        ref={e => (this.inputElement = e)}
        defaultValue={
          this.props.defaultValue != null ? this.props.defaultValue : ""
        }
        placeholder={this.props.placeholder}
        onKeyDown={e => {
          if (e.key == "Enter") {
            this.doEnter();
          }
          if (e.key == "Escape") {
            this.doCancel();
          }
        }}
        onFocus={e => {
          this.inputElement.select();
        }}
        onBlur={() => {
          this.doEnter();
        }}
      />
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { prettyNumber } from "../../../../../core";
import { Button, UpdownButton } from "./button";
import { InputText } from "./input_text";
import { Slider } from "./slider";

export interface InputNumberProps {
  defaultValue?: number;
  placeholder?: string;
  onEnter?: (value: number) => boolean;

  digits?: number;
  minimum?: number;
  maximum?: number;
  percentage?: boolean;

  showSlider?: boolean;
  sliderRange?: [number, number];
  sliderFunction?: "linear" | "sqrt";

  showUpdown?: boolean;
  updownTick?: number;
  updownRange?: [number, number];
  updownStyle?: "normal" | "font";
}

export class InputNumber extends React.Component<InputNumberProps, {}> {
  private textInput: InputText;

  private formatNumber(value: number) {
    if (value == null) {
      return "";
    }
    if (value != value) {
      return "N/A";
    }
    if (this.props.percentage) {
      return (
        prettyNumber(
          value * 100,
          this.props.digits != null ? this.props.digits : 2
        ) + "%"
      );
    } else {
      return prettyNumber(
        value,
        this.props.digits != null ? this.props.digits : 2
      );
    }
  }

  private parseNumber(str: string) {
    str = str.trim();
    if (str == "") {
      return null;
    }
    if (this.props.percentage) {
      str = str.replace(/\%$/, "");
      return +str / 100;
    } else {
      return +str;
    }
  }

  private reportValue(value: number) {
    if (value == null) {
      return this.props.onEnter(value);
    } else {
      if (this.props.minimum != null) {
        value = Math.max(this.props.minimum, value);
      }
      if (this.props.maximum != null) {
        value = Math.min(this.props.maximum, value);
      }
      return this.props.onEnter(value);
    }
  }

  public renderSlider() {
    let sliderMin = 0;
    let sliderMax = 1;
    if (this.props.minimum != null) {
      sliderMin = this.props.minimum;
    }
    if (this.props.maximum != null) {
      sliderMax = this.props.maximum;
    }
    if (this.props.sliderRange != null) {
      sliderMin = this.props.sliderRange[0];
      sliderMax = this.props.sliderRange[1];
    }
    return (
      <Slider
        width={70}
        min={sliderMin}
        max={sliderMax}
        defaultValue={this.props.defaultValue}
        mapping={this.props.sliderFunction}
        onChange={(newValue, isFinished) => {
          this.textInput.value = this.formatNumber(newValue);
          if (isFinished) {
            this.reportValue(newValue);
          }
        }}
      />
    );
  }

  public renderUpdown() {
    const tick = this.props.updownTick || 0.1;
    if (this.props.updownStyle == "font") {
      return [
        <Button
          key="up"
          icon="general/text-size-up"
          onClick={() => {
            this.reportValue(this.props.defaultValue + tick);
          }}
        />,
        <Button
          key="down"
          icon="general/text-size-down"
          onClick={() => {
            this.reportValue(this.props.defaultValue - tick);
          }}
        />
      ];
    } else {
      return (
        <UpdownButton
          onClick={part => {
            if (part == "up") {
              this.reportValue(this.props.defaultValue + tick);
            } else {
              this.reportValue(this.props.defaultValue - tick);
            }
          }}
        />
      );
    }
  }

  public render() {
    return (
      <span className="charticulator__widget-control-input-number">
        <div className="charticulator__widget-control-input-number-input">
          <InputText
            ref={e => (this.textInput = e)}
            placeholder={this.props.placeholder}
            defaultValue={this.formatNumber(this.props.defaultValue)}
            onEnter={str => {
              const num = this.parseNumber(str);
              return this.reportValue(num);
            }}
          />
        </div>
        {this.props.showSlider ? this.renderSlider() : null}
        {this.props.showUpdown ? this.renderUpdown() : null}
      </span>
    );
  }
}

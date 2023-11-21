/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Label, Input, Slider, SpinButton } from "@fluentui/react-components";

import * as React from "react";
import { prettyNumber } from "../../../../../core";
import { FluentColumnLayout } from "./fluentui_customized_components";
import { CSSProperties } from "react";

export interface InputNumberProps {
  defaultValue?: number;
  placeholder?: string;
  onEnter?: (value: number) => boolean;

  digits?: number;
  minimum?: number;
  maximum?: number;
  percentage?: boolean;
  step?: number;

  showSlider?: boolean;
  sliderRange?: [number, number];
  sliderFunction?: "linear" | "sqrt";

  showUpdown?: boolean;
  updownTick?: number;
  updownRange?: [number, number];
  updownStyle?: "normal" | "font";

  label?: string;
  stopPropagation?: boolean;

  styles?: CSSProperties;
}

export const FluentInputNumber: React.FC<InputNumberProps> = (props) => {
  const [value, setValue] = React.useState<string | number>(props.defaultValue);

  React.useEffect(() => {
    setValue(props.defaultValue);
  }, [props.defaultValue]);

  const formatNumber = (value: number) => {
    if (value == null) {
      return "";
    }
    if (value != value) {
      return "N/A";
    }
    if (props.percentage) {
      return prettyNumber(value * 100, props.digits != null ? props.digits : 2);
    } else {
      return prettyNumber(value, props.digits != null ? props.digits : 2);
    }
  };

  const parseNumber = (str: string) => {
    str = str.trim();
    if (str == "" || isNaN(+str)) {
      return null;
    }
    if (props.percentage) {
      str = str.replace(/%$/, "");
      return +str / 100;
    } else {
      return +str;
    }
  };

  const reportValue = (value: number) => {
    if (value == null) {
      return props.onEnter(value);
    } else {
      if (props.minimum != null) {
        value = Math.max(props.minimum, value);
      }
      if (props.maximum != null) {
        value = Math.min(props.maximum, value);
      }
      return props.onEnter(value);
    }
  };

  const renderSlider = () => {
    let sliderMin = 0;
    let sliderMax = 1;
    if (props.minimum != null) {
      sliderMin = props.minimum;
    }
    if (props.maximum != null) {
      sliderMax = props.maximum;
    }
    if (props.percentage) {
      sliderMax = 1;
      sliderMin = 0;
    }
    if (props.sliderRange != null) {
      sliderMin = props.sliderRange[0];
      sliderMax = props.sliderRange[1];
    }
    return (
      <Slider
        min={sliderMin}
        max={sliderMax}
        value={+value}
        step={
          props.percentage ? 0.01 : props.step != undefined ? props.step : 1
        }
        onChange={(e, { value }) => {
          setValue(+value.toFixed(4));
          reportValue(value);
        }}
      />
    );
  };

  const renderUpdown = () => {
    const tick = props.updownTick || 0.1;
    return (
      <>
        {!props.showSlider ? <Label>{props.label}</Label> : null}
        <SpinButton
          value={+value}
          step={tick}
          onChange={(e, { value, displayValue: str  }) => {
            // spin button click
            if (str == undefined && typeof value === 'number') {
              setValue(value);
            }
            // value changed by user text input
            if (
              str !== undefined &&
              ((str != "" && str.indexOf(".") === str.length - 1) ||
              (str.indexOf("-") === 0 && str.length === 1))
            ) {
              setValue(str);
            } else {
              const num = parseNumber(str);
              if (reportValue(num)) {
                setValue(num);
              }
            }
          }}
        />
      </>
    );
  };

  return (
    <>
      {props.showSlider ? (
        <Label>
          {props.label}
        </Label>
      ) : null}
      <FluentColumnLayout style={props.styles}>
        {props.showUpdown ? (
          renderUpdown()
        ) : (
          <>
            {!props.showSlider ? <Label>{props.label}</Label> : null}
            <Input
              placeholder={props.placeholder}
              value={
                typeof value === "string" &&
                ((value as string).indexOf(".") === value.length - 1 ||
                  ((value as string).indexOf("-") === 0 && value.length === 1))
                  ? value
                  : value == null
                  ? null
                  : formatNumber(+value)
              }
              onChange={(event, { value: str }) => {
                if (
                  (str != "" && str.indexOf(".") === str.length - 1) ||
                  (str.indexOf("-") === 0 && str.length === 1)
                ) {
                  setValue(str);
                } else {
                  const num = parseNumber(str);
                  if (reportValue(num)) {
                    setValue(num);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (props.stopPropagation) {
                  e.stopPropagation();
                }
              }}
            />
          </>
        )}
        {props.showSlider
          ? renderSlider()
          : null}
      </FluentColumnLayout>
    </>
  );
};

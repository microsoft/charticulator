/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  TextField,
  Slider,
  SpinButton,
  Label,
  Position,
} from "@fluentui/react";
import * as React from "react";
import { prettyNumber } from "../../../../../core";
import {
  defaultLabelStyle,
  FluentLabelFontWeight,
  FluentLayoutItem,
  FluentRowLayout,
  labelRender,
} from "./fluentui_customized_components";

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

  label?: string;
}

export const FluentInputNumber: React.FC<InputNumberProps> = (props) => {
  const [value, setValue] = React.useState(props.defaultValue);

  // force update state value
  if (value !== props.defaultValue) {
    setValue(props.defaultValue);
  }

  const formatNumber = (value: number) => {
    if (value == null) {
      return "";
    }
    if (value != value) {
      return "N/A";
    }
    if (props.percentage) {
      return (
        prettyNumber(value * 100, props.digits != null ? props.digits : 2) + "%"
      );
    } else {
      return prettyNumber(value, props.digits != null ? props.digits : 2);
    }
  };

  const parseNumber = (str: string) => {
    str = str.trim();
    if (str == "") {
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
        value={value}
        showValue={true}
        step={props.percentage ? 0.01 : 1}
        onChange={(newValue: number) => {
          setValue(+newValue.toFixed(4));
          reportValue(newValue);
        }}
      />
    );
  };

  const renderUpdown = () => {
    const tick = props.updownTick || 0.1;
    return (
      <>
        <FluentLabelFontWeight>
          <SpinButton
            label={!props.showSlider ? props.label : null}
            labelPosition={Position.top}
            value={formatNumber(value)}
            iconProps={
              props.updownStyle == "font"
                ? {
                    iconName: "Font",
                  }
                : null
            }
            step={tick}
            onIncrement={(value) => {
              if (reportValue(parseNumber(value) + tick)) {
                setValue(parseNumber(value) + tick);
              }
            }}
            onDecrement={(value) => {
              if (reportValue(parseNumber(value) - tick)) {
                setValue(parseNumber(value) - tick);
              }
            }}
            onValidate={(value) => {
              const num = parseNumber(value);
              if (reportValue(num)) {
                setValue(num);
                return formatNumber(parseNumber(value));
              }
            }}
          />
        </FluentLabelFontWeight>
      </>
    );
  };

  return (
    <>
      {props.showSlider ? (
        <Label styles={defaultLabelStyle}>{props.label}</Label>
      ) : null}
      <FluentRowLayout>
        {props.showSlider ? (
          <FluentLayoutItem flex={2}>{renderSlider()}</FluentLayoutItem>
        ) : null}
        <FluentLayoutItem flex={1}>
          {props.showUpdown ? (
            renderUpdown()
          ) : (
            <TextField
              onRenderLabel={labelRender}
              label={!props.showSlider ? props.label : null}
              placeholder={props.placeholder}
              value={formatNumber(value)}
              onChange={(event, str) => {
                const num = parseNumber(str);
                if (reportValue(num)) {
                  setValue(num);
                }
              }}
            />
          )}
        </FluentLayoutItem>
      </FluentRowLayout>
    </>
  );
};

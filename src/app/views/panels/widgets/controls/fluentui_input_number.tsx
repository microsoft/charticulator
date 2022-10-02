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
  defaultFontWeight,
  defaultLabelStyle,
  defaultStyle,
  defaultComponentsHeight,
  FluentLayoutItem,
  FluentRowLayout,
  labelRender,
  PlaceholderStyle,
} from "./fluentui_customized_components";
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
        styles={{
          root: {
            ...defaultComponentsHeight,
          },
          slideBox: {
            ...defaultComponentsHeight,
          },
        }}
        min={sliderMin}
        max={sliderMax}
        value={+value}
        showValue={true}
        step={
          props.percentage ? 0.01 : props.step != undefined ? props.step : 1
        }
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
        <SpinButton
          label={!props.showSlider ? props.label : null}
          labelPosition={Position.top}
          value={formatNumber(+value)}
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
              let val = num;
              if (props.minimum != null) {
                val = Math.max(props.minimum, num);
              }
              if (props.maximum != null) {
                val = Math.min(props.maximum, num);
              }
              setValue(val);
              return formatNumber(parseNumber(value));
            }
          }}
          styles={{
            ...defaultStyle,
            label: {
              lineHeight: "unset",
              fontWeight: defaultFontWeight,
              height: 25,
            },
            spinButtonWrapper: {
              height: (defaultStyle as any).fieldGroup.height,
              lineHeight: (defaultStyle as any).fieldGroup.lineHeight,
            },
          }}
        />
      </>
    );
  };

  return (
    <>
      {props.showSlider ? (
        <Label styles={defaultLabelStyle}>{props.label}</Label>
      ) : null}
      <FluentRowLayout style={props.styles}>
        <FluentLayoutItem flex={1}>
          {props.showUpdown ? (
            renderUpdown()
          ) : (
            <PlaceholderStyle>
              <TextField
                styles={defaultStyle}
                onRenderLabel={labelRender}
                label={!props.showSlider ? props.label : null}
                placeholder={props.placeholder}
                value={
                  typeof value === "string" &&
                  ((value as string).indexOf(".") === value.length - 1 ||
                    ((value as string).indexOf("-") === 0 &&
                      value.length === 1))
                    ? value
                    : value == null
                    ? null
                    : formatNumber(+value)
                }
                onChange={(event, str) => {
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
                suffix={props.percentage ? "%" : undefined}
              />
            </PlaceholderStyle>
          )}
        </FluentLayoutItem>
        {props.showSlider ? (
          <FluentLayoutItem flex={2}>{renderSlider()}</FluentLayoutItem>
        ) : null}
      </FluentRowLayout>
    </>
  );
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as globals from "../../../../globals";

import {
  Color,
  colorFromHTMLColor,
  ColorGradient,
  colorToHTMLColorHEX,
} from "../../../../../core";
import { GradientView } from "../../../../components";
import { PopupView } from "../../../../controllers/popup_controller";
import { ColorPicker } from "../../../../components/fluentui_color_picker";

import { AppStore } from "../../../../stores";

import { Callout, TextField } from "@fluentui/react";
import {
  defaultLabelStyle,
  defaultStyle,
  defultComponentsHeight,
  FluentTextField,
  labelRender,
} from "./fluentui_customized_components";
import { strings } from "../../../../../strings";
import { FluentUIGradientPicker } from "../../../../components/fluent_ui_gradient_picker";

export interface InputColorProps {
  defaultValue: Color;
  allowNull?: boolean;
  label?: string;
  onEnter: (value: Color) => boolean;
  store?: AppStore;
  noDefaultMargin?: boolean;
  labelKey?: string; //key for color picker
  width?: number;
  underline?: boolean;
  stopPropagation?: boolean;
  pickerBeforeTextField?: boolean;
}

const ID_PREFIX = "id_";

export class FluentInputColor extends React.Component<
  InputColorProps,
  Record<string, unknown>
> {
  constructor(props: InputColorProps) {
    super(props);
    this.state = { open: false };
  }

  public render() {
    let hex: string = "";
    if (this.props.defaultValue) {
      hex = colorToHTMLColorHEX(this.props.defaultValue);
    }
    const pickerId = this.props.labelKey.replace(/\W/g, "_");
    const picker: JSX.Element = (
      <span
        className="el-color-display"
        style={{
          backgroundColor: hex == "" ? "transparent" : hex,
          marginTop: this.props.noDefaultMargin ? 0 : null,
          marginRight: 5,
        }}
        id={ID_PREFIX + pickerId}
        onClick={() => {
          this.setState({ open: !this.state.open });
        }}
      />
    );
    return (
      <span className="charticulator__widget-control-input-color">
        {this.props.pickerBeforeTextField && picker}
        <FluentTextField>
          <TextField
            label={this.props.label}
            onRenderLabel={labelRender}
            placeholder={this.props.allowNull ? strings.core.none : ""}
            value={hex}
            onChange={(event, newValue) => {
              newValue = newValue.trim();
              if (newValue == "") {
                if (this.props.allowNull) {
                  return this.props.onEnter(null);
                } else {
                  return false;
                }
              }
              const color = colorFromHTMLColor(newValue);
              if (!color) {
                return false;
              }
              return this.props.onEnter(color);
            }}
            onKeyDown={(e) => {
              if (this.props.stopPropagation) {
                e.stopPropagation();
              }
            }}
            styles={{
              ...defaultStyle,
              fieldGroup: {
                ...defultComponentsHeight,
                width: this.props.width,
              },
              root: {
                ...defultComponentsHeight,
              },
              subComponentStyles: {
                label: {
                  ...defaultLabelStyle,
                },
              },
            }}
            underlined={this.props.underline ?? false}
          />
        </FluentTextField>
        {!this.props.pickerBeforeTextField && picker}
        {this.state.open && (
          <Callout
            target={`#${ID_PREFIX}${pickerId}`}
            onDismiss={() => this.setState({ open: !this.state.open })}
          >
            <ColorPicker
              store={this.props.store}
              allowNull={true}
              onPick={(color) => {
                if (color == null) {
                  this.props.onEnter(null);
                } else {
                  this.props.onEnter(color);
                }
                this.setState({ open: !this.state.open });
              }}
              defaultValue={colorFromHTMLColor(hex)}
              parent={this}
            />
          </Callout>
        )}
      </span>
    );
  }
}

export interface InputColorGradientProps {
  defaultValue: ColorGradient;
  onEnter: (value: ColorGradient) => boolean;
}

export class InputColorGradient extends React.Component<
  InputColorGradientProps,
  Record<string, unknown>
> {
  public render() {
    let colorButton: HTMLSpanElement;
    return (
      <span className="charticulator__widget-control-input-color-gradient">
        <span
          className="el-color-gradient-display"
          ref={(e) => (colorButton = e)}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                return (
                  <PopupView context={context}>
                    <FluentUIGradientPicker
                      defaultValue={this.props.defaultValue}
                      onPick={(gradient) => {
                        this.props.onEnter(gradient);
                      }}
                    />
                  </PopupView>
                );
              },
              { anchor: colorButton }
            );
          }}
        >
          <GradientView gradient={this.props.defaultValue} />
        </span>
      </span>
    );
  }
}

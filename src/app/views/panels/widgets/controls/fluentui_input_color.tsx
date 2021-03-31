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
import {
  ColorPicker,
  GradientPicker,
  GradientView,
} from "../../../../components";
import { PopupView } from "../../../../controllers/popup_controller";

import { AppStore } from "../../../../stores";

import { TextField } from "@fluentui/react";
import { FluentTextField } from "./fluentui_customized_components";

export interface InputColorProps {
  defaultValue: Color;
  allowNull?: boolean;
  label?: string;
  onEnter: (value: Color) => boolean;
  store?: AppStore;
}

export class FluentInputColor extends React.Component<InputColorProps, {}> {
  public render() {
    let hex: string = "";
    if (this.props.defaultValue) {
      hex = colorToHTMLColorHEX(this.props.defaultValue);
    }
    let colorButton: HTMLSpanElement;
    return (
      <span className="charticulator__widget-control-input-color">
        <FluentTextField>
          <TextField
            label={this.props.label}
            defaultValue={hex}
            placeholder={this.props.allowNull ? "(none)" : ""}
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
          />
        </FluentTextField>
        <span
          className="el-color-display"
          style={{ backgroundColor: hex == "" ? "transparent" : hex }}
          ref={(e) => (colorButton = e)}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                return (
                  <PopupView context={context}>
                    <ColorPicker
                      store={this.props.store}
                      allowNull={true}
                      onPick={(color) => {
                        if (color == null) {
                          this.props.onEnter(null);
                          context.close();
                        } else {
                          this.props.onEnter(color);
                        }
                      }}
                    />
                  </PopupView>
                );
              },
              { anchor: colorButton }
            );
          }}
        />
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
  {}
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
                    <GradientPicker
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
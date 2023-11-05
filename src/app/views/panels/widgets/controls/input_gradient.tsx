// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ColorGradient } from "../../../../../core";
import * as React from "react";
import * as globals from "../../../../globals";
import { PopupView } from "../../../../controllers";
import { GradientPicker, GradientView } from "../../../../components";

export interface InputColorGradientProps {
  defaultValue: ColorGradient;
  onEnter: (value: ColorGradient) => boolean;
}

export class InputColorGradient extends React.Component<
  React.PropsWithChildren<InputColorGradientProps>,
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

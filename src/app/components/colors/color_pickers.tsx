// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ColorPickerState } from "../fluentui_color_picker";
import { ToggleButton } from "@fluentui/react-components";

export enum PickerType {
  HCL = "hcl",
  HSV = "hsv",
}

interface ColorPickerButtonProps {
  state: ColorPickerState;
  onClick: () => void;
  type: PickerType;
}

export class ColorPickerButton extends React.Component<
  React.PropsWithChildren<ColorPickerButtonProps>,
  Record<string, unknown>
> {
  render() {
    const text =
      this.props.type === PickerType.HCL ? "HCL Picker" : "HSV Picker";
    return (
      <ToggleButton
        title={text}
        onClick={this.props.onClick}
        checked={this.props.state.currentPicker == this.props.type}
        // styles={defaultPaletteButtonsStyles}
      >
        {text}
      </ToggleButton>
    );
  }
}

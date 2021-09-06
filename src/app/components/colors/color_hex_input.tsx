// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { colorFromHTMLColor, colorToHTMLColorHEX } from "../../../core";
import { ColorSpacePickerState, InputField } from "../color_space_picker";

interface ColorHexInputProps {
  state: ColorSpacePickerState;
  updateState: (state: ColorSpacePickerState) => void;
}

export class ColorHexInput extends React.Component<
  ColorHexInputProps,
  Record<string, unknown>
> {
  render() {
    const currentColor = this.props.state.desc.toRGB(
      this.props.state.x1,
      this.props.state.x2,
      this.props.state.x3
    );
    const rgb = { r: currentColor[0], g: currentColor[1], b: currentColor[2] };

    return (
      <>
        <label>HEX</label>
        <InputField
          defaultValue={colorToHTMLColorHEX(rgb)}
          onEnter={(v) => {
            const color = colorFromHTMLColor(v);
            if (color) {
              const [x1, x2, x3] = this.props.state.desc.fromRGB(
                color.r,
                color.g,
                color.b
              );
              this.props.updateState({
                x1,
                x2,
                x3,
                desc: this.props.state.desc,
              });
              return true;
            }
          }}
        />
      </>
    );
  }
}

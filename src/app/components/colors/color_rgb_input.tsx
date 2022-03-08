// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { prettyNumber } from "../../../core";
import { ColorSpacePickerState, InputField } from "../color_space_picker";

interface ColorRgbInputProps {
  state: ColorSpacePickerState;
  updateState: (state: ColorSpacePickerState) => void;
}

export class ColorRgbInput extends React.Component<
  ColorRgbInputProps,
  Record<string, unknown>
> {
  private transformColorValue(value: number): string {
    const newColorValue = prettyNumber(value, 0);
    return newColorValue.length > 0 ? newColorValue : "0";
  }

  render() {
    const currentColor = this.props.state.desc.toRGB(
      this.props.state.x1,
      this.props.state.x2,
      this.props.state.x3
    );
    const rgb = { r: currentColor[0], g: currentColor[1], b: currentColor[2] };

    return (
      <>
        <div className="column">
          <div className="row">
            <label>R</label>
            <InputField
              defaultValue={this.transformColorValue(rgb.r)}
              onEnter={(v) => {
                let num = parseFloat(v);
                if (num == num && num != null) {
                  num = Math.max(0, Math.min(255, num));
                  const [x1, x2, x3] = this.props.state.desc.fromRGB(
                    num,
                    rgb.g,
                    rgb.b
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
          </div>
          <div className="row">
            <label>G</label>
            <InputField
              defaultValue={this.transformColorValue(rgb.g)}
              onEnter={(v) => {
                let num = parseFloat(v);
                if (num == num && num != null) {
                  num = Math.max(0, Math.min(255, num));
                  const [x1, x2, x3] = this.props.state.desc.fromRGB(
                    rgb.r,
                    num,
                    rgb.b
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
          </div>
          <div className="row">
            <label>B</label>
            <InputField
              defaultValue={this.transformColorValue(rgb.b)}
              onEnter={(v) => {
                let num = parseFloat(v);
                if (num == num && num != null) {
                  num = Math.max(0, Math.min(255, num));
                  const [x1, x2, x3] = this.props.state.desc.fromRGB(
                    rgb.r,
                    rgb.g,
                    num
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
          </div>
        </div>
      </>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Color } from "../../../core";
import {
  ColorSpaceDescription,
  ColorSpacePickerState,
} from "../color_space_picker";
import { Combobox, Option } from "@fluentui/react-components";

interface ColorSpaceSelectProps {
  onChange?: (newValue: Color) => void;
  colorSpaces: ColorSpaceDescription[];
  state: ColorSpacePickerState;
  updateState: (state: ColorSpacePickerState) => void;
}

export class ColorSpaceSelect extends React.Component<
  React.PropsWithChildren<ColorSpaceSelectProps>,
  Record<string, unknown>
> {
  render() {
    const options: {
      key: string;
      text: string;
    }[] = this.props.colorSpaces.map((x) => {
      return { key: x.name, text: x.name };
    });

    return (
      <Combobox
        // options={options}
        value={this.props.state.desc.name}
        onOptionSelect={(event, { optionValue }) => {
          if (optionValue) {
            for (const sp of this.props.colorSpaces) {
              if (sp.name == optionValue) {
                const [r, g, b] = this.props.state.desc.toRGB(
                  this.props.state.x1,
                  this.props.state.x2,
                  this.props.state.x3
                );
                const [x1, x2, x3] = sp.fromRGB(r, g, b);
                this.props.updateState({ desc: sp, x1, x2, x3 });
              }
            }
          }
        }}
      >
        {options.map((o) => (
          <Option value={o.key} text={o.text}>
            {o.text}
          </Option>
        ))}
      </Combobox>
    );
  }
}

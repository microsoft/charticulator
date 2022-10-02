// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ComboBox, IComboBoxOption } from "@fluentui/react";
import { defaultComponentsHeight } from "../../views/panels/widgets/controls/fluentui_customized_components";
import { Color } from "../../../core";
import {
  ColorSpaceDescription,
  ColorSpacePickerState,
} from "../color_space_picker";

interface ColorSpaceSelectProps {
  onChange?: (newValue: Color) => void;
  colorSpaces: ColorSpaceDescription[];
  state: ColorSpacePickerState;
  updateState: (state: ColorSpacePickerState) => void;
}

export class ColorSpaceSelect extends React.Component<
  ColorSpaceSelectProps,
  Record<string, unknown>
> {
  render() {
    const options: IComboBoxOption[] = this.props.colorSpaces.map((x) => {
      return { key: x.name, text: x.name };
    });

    return (
      <ComboBox
        options={options}
        defaultSelectedKey={this.props.state.desc.name}
        onChange={(event, option) => {
          if (option) {
            for (const sp of this.props.colorSpaces) {
              if (sp.name == option.key) {
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
        styles={{
          root: {
            ...defaultComponentsHeight,
          },
          input: {
            width: "100px !important",
          },
        }}
      />
    );
  }
}

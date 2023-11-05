// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { DefaultButton, Dropdown, IDropdownOption } from "@fluentui/react";
import { strings } from "../../../strings";
import { ColorGradient, deepClone } from "../../../core";
import {
  CustomGradientButtonsWrapper,
  defaultActionButtonsStyles,
  dropdownStyles,
} from "./styles";
import { Colorspace } from "../fluent_ui_gradient_picker";

interface CustomGradientButtonsProps {
  currentGradient: ColorGradient;
  selectGradient: (gradient: ColorGradient, emit: boolean) => void;
}

export class CustomGradientButtons extends React.Component<
  React.PropsWithChildren<CustomGradientButtonsProps>,
  Record<string, unknown>
> {
  render() {
    const currentGradient = this.props.currentGradient;
    const dropdownItems: IDropdownOption[] = [
      { key: Colorspace.HCL, text: "HCL" },
      { key: Colorspace.LAB, text: "Lab" },
    ];
    return (
      <CustomGradientButtonsWrapper>
        <div>
          <DefaultButton
            iconProps={{
              iconName: "Add",
            }}
            text={strings.scaleEditor.add}
            onClick={() => {
              const newGradient = deepClone(currentGradient);
              newGradient.colors.push({ r: 150, g: 150, b: 150 });
              this.props.selectGradient(newGradient, true);
            }}
            styles={defaultActionButtonsStyles}
          />
        </div>
        <div>
          <DefaultButton
            iconProps={{
              iconName: "Sort",
            }}
            text={strings.scaleEditor.reverse}
            onClick={() => {
              const newGradient = deepClone(currentGradient);
              newGradient.colors.reverse();
              this.props.selectGradient(newGradient, true);
            }}
            styles={defaultActionButtonsStyles}
          />
        </div>
        <Dropdown
          options={dropdownItems}
          onChange={(event, option) => {
            if (option) {
              const newGradient = deepClone(currentGradient);
              newGradient.colorspace = option.key as Colorspace;
              this.props.selectGradient(newGradient, true);
            }
          }}
          defaultSelectedKey={currentGradient.colorspace}
          styles={dropdownStyles}
        />
      </CustomGradientButtonsWrapper>
    );
  }
}

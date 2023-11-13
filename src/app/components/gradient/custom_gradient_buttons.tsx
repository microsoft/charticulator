// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { strings } from "../../../strings";
import { ColorGradient, deepClone } from "../../../core";
import { CustomGradientButtonsWrapper } from "./styles";
import { Colorspace } from "../fluent_ui_gradient_picker";
import { SVGImageIcon } from "../icons";
import * as R from "../../resources";
import { Button, Dropdown, Option } from "@fluentui/react-components";

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
    const dropdownItems: {
      key: string;
      text: string;
    }[] = [
      { key: Colorspace.HCL, text: "HCL" },
      { key: Colorspace.LAB, text: "Lab" },
    ];
    return (
      <CustomGradientButtonsWrapper>
        <div>
          <Button
            // iconProps={{
            // iconName: "Add",
            // }}
            title={strings.scaleEditor.add}
            icon={<SVGImageIcon url={R.getSVGIcon("ChromeClose")} />}
            onClick={() => {
              const newGradient = deepClone(currentGradient);
              newGradient.colors.push({ r: 150, g: 150, b: 150 });
              this.props.selectGradient(newGradient, true);
            }}
            // styles={defaultActionButtonsStyles}
          >
            {strings.scaleEditor.add}
          </Button>
        </div>
        <div>
          <Button
            // iconProps={{
            //   iconName: "Sort",
            // }}
            icon={<SVGImageIcon url={R.getSVGIcon("Sort")} />}
            title={strings.scaleEditor.reverse}
            onClick={() => {
              const newGradient = deepClone(currentGradient);
              newGradient.colors.reverse();
              this.props.selectGradient(newGradient, true);
            }}
            // styles={defaultActionButtonsStyles}
          >
            {strings.scaleEditor.reverse}
          </Button>
        </div>
        <Dropdown
          // options={dropdownItems}
          onOptionSelect={(event, { optionValue }) => {
            if (optionValue) {
              const newGradient = deepClone(currentGradient);
              newGradient.colorspace = optionValue as Colorspace;
              this.props.selectGradient(newGradient, true);
            }
          }}
          // defaultSelectedKey={currentGradient.colorspace}
          value={currentGradient.colorspace}
          // styles={dropdownStyles}
        >
          {dropdownItems.map((o) => (
            <Option value={o.key} text={o.text}>
              {o.text}
            </Option>
          ))}
        </Dropdown>
      </CustomGradientButtonsWrapper>
    );
  }
}

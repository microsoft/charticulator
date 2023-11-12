// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ColorGradient } from "../../core";
import { Pivot, PivotItem } from "@fluentui/react";
import { CustomGradientMenu } from "./gradient/custom_gradient_menu";
import { GradientPalettes } from "./gradient/gradient_palettes";

import {
  Tab,
  TabList,
} from "@fluentui/react-components";

export interface GradientPickerProps {
  defaultValue?: ColorGradient;
  onPick?: (gradient: ColorGradient) => void;
}

export interface GradientPickerState {
  currentTab: string;
  currentGradient: ColorGradient;
}

export enum Colorspace {
  LAB = "lab",
  HCL = "hcl",
}

export class FluentUIGradientPicker extends React.Component<
  React.PropsWithChildren<GradientPickerProps>,
  GradientPickerState
> {
  constructor(props: GradientPickerProps) {
    super(props);
    this.selectGradient = this.selectGradient.bind(this);
    this.state = {
      currentTab: "palettes",
      currentGradient: this.props.defaultValue || {
        colorspace: Colorspace.LAB,
        colors: [
          { r: 0, g: 0, b: 0 },
          { r: 255, g: 255, b: 255 },
        ],
      },
    };
  }

  public selectGradient(gradient: ColorGradient, emit: boolean = false) {
    this.setState(
      {
        currentGradient: gradient,
      },
      () => {
        if (emit) {
          if (this.props.onPick) {
            this.props.onPick(gradient);
          }
        }
      }
    );
  }

  public render() {
    return (
      <div className="gradient-picker">
        <Pivot aria-label="Basic Pivot Example">
          <PivotItem headerText="Palettes">
            <GradientPalettes selectGradient={this.selectGradient} />
          </PivotItem>
          <PivotItem headerText="Custom">
            <CustomGradientMenu
              currentGradient={this.state.currentGradient}
              selectGradient={this.selectGradient}
            />
          </PivotItem>
        </Pivot>
      </div>
    );
  }
}

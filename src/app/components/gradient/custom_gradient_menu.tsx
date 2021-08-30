// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ReorderListView } from "../../views/panels/object_list_editor";
import {
  Color,
  colorFromHTMLColor,
  ColorGradient,
  colorToHTMLColorHEX,
  deepClone,
} from "../../../core";
import { ColorPicker, colorToCSS } from "../fluentui_color_picker";
import { InputField } from "../color_space_picker";
import { Callout, DefaultButton } from "@fluentui/react";
import {
  ColorCell,
  ColorRowWrapper,
  deleteColorStyles,
} from "./styles";
import { GradientView } from "./gradient_palettes";
import { CustomGradientButtons } from "./custom_gradient_buttons";

interface CustomGradientMenuProps {
  currentGradient: ColorGradient;
  selectGradient: (gradient: ColorGradient, emit: boolean) => void;
}

interface CustomGradientMenuState {
  isPickerOpen: boolean;
  currentItemId: string;
  currentColor: Color;
  currentItemIdx: number;
}

export class CustomGradientMenu extends React.Component<
  CustomGradientMenuProps,
  CustomGradientMenuState
> {
  constructor(props: CustomGradientMenuProps) {
    super(props);

    this.state = {
      isPickerOpen: false,
      currentItemId: "",
      currentColor: null,
      currentItemIdx: null,
    };
  }

  render() {
    const currentGradient = this.props.currentGradient;
    return (
      <div>
        <div>
          <GradientView gradient={currentGradient} />
        </div>
        <div>
          <ReorderListView
            enabled={true}
            onReorder={(dragIndex, dropIndex) => {
              const newGradient = deepClone(currentGradient);
              ReorderListView.ReorderArray(
                newGradient.colors,
                dragIndex,
                dropIndex
              );
              this.props.selectGradient(newGradient, true);
            }}
          >
            {currentGradient.colors.map((color, i) => {
              return (
                <ColorRowWrapper key={`m${i}`}>
                  <ColorCell
                    id={`color_${i}`}
                    onClick={() => {
                      this.changeColorPickerState(`color_${i}`, color, i);
                    }}
                    $color={colorToCSS(color)}
                  />
                  <InputField
                    defaultValue={colorToHTMLColorHEX(color)}
                    onEnter={(value) => {
                      const newColor = colorFromHTMLColor(value);
                      const newGradient = deepClone(currentGradient);
                      newGradient.colors[i] = newColor;
                      this.props.selectGradient(newGradient, true);
                      return true;
                    }}
                  />
                  <DefaultButton
                    iconProps={{
                      iconName: "ChromeClose",
                    }}
                    styles={deleteColorStyles}
                    onClick={() => {
                      if (currentGradient.colors.length > 1) {
                        const newGradient = deepClone(
                          this.props.currentGradient
                        );
                        newGradient.colors.splice(i, 1);
                        this.props.selectGradient(newGradient, true);
                      }
                    }}
                  />
                </ColorRowWrapper>
              );
            })}
            {this.renderColorPicker()}
          </ReorderListView>
        </div>
        <CustomGradientButtons selectGradient={this.props.selectGradient} currentGradient={currentGradient} />
      </div>
    );
  }

  private changeColorPickerState(id: string, color: Color, idx: number) {
    this.setState({
      isPickerOpen: !this.state.isPickerOpen,
      currentItemId: id,
      currentColor: color,
      currentItemIdx: idx,
    });
  }

  private renderColorPicker(): JSX.Element {
    return (
      <>
        {this.state.isPickerOpen && (
          <Callout
            target={`#${this.state.currentItemId}`}
            onDismiss={() =>
              this.changeColorPickerState(this.state.currentItemId, null, null)
            }
            alignTargetEdge
          >
            <ColorPicker
              defaultValue={this.state.currentColor}
              onPick={(color) => {
                const newGradient = deepClone(this.props.currentGradient);
                newGradient.colors[this.state.currentItemIdx] = color;
                this.props.selectGradient(newGradient, true);
              }}
              parent={this}
            />
          </Callout>
        )}
      </>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Color } from "../../core";
import {
  addPowerBIThemeColors,
  ColorPalette,
  predefinedPalettes,
} from "../resources";
import { AppStore } from "../stores";
import { Label } from "@fluentui/react";
import { ColorGrid } from "./colors/color_grid";
import { NullButton } from "./colors/null_button";
import { ColorPickerButton, PickerType } from "./colors/color_pickers";
import { PaletteList } from "./colors/palette_list";
import { EditorType } from "../stores/app_store";
import { HCLColorPicker, HSVColorPicker } from "./colors/input_colors_pickers";
import {
  ColorsPickerLeftSectionWrapper,
  ColorsPickerWrapper,
  ColorsSectionWrapper,
  PickersSection,
  PickersSectionWrapper,
} from "./colors/styles";
import { PatternList } from "./patterns/pattern_list";
import { PatternEditor } from "./patterns/pattern_editor";
import { PatternPicker } from "./patterns/pattern_picker";

export function colorToCSS(color: Color) {
  return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(
    0
  )})`;
}

export interface ColorPickerProps {
  defaultValue?: Color;
  allowNull?: boolean;
  onPick?: (color: Color) => void;
  store?: AppStore;
  parent?: React.Component;
  closePicker?: () => void;
}

export interface ColorPickerState {
  currentPalette?: ColorPalette;
  currentPicker?: string;
  currentColor?: Color;
  currentPattern?: string;
}

export class ColorPicker extends React.Component<
  ColorPickerProps,
  ColorPickerState
> {
  constructor(props: ColorPickerProps) {
    super(props);
    addPowerBIThemeColors();
    if (this.props.defaultValue) {
      const colorCSS = colorToCSS(this.props.defaultValue);
      let matchedPalette: ColorPalette = null;
      for (const p of predefinedPalettes.filter((x) => x.type == "palette")) {
        for (const g of p.colors) {
          for (const c of g) {
            if (colorToCSS(c) == colorCSS) {
              matchedPalette = p;
              break;
            }
          }
          if (matchedPalette) {
            break;
          }
        }
        if (matchedPalette) {
          break;
        }
      }
      if (matchedPalette) {
        this.state = {
          currentPalette: matchedPalette,
          currentPicker: null,
          currentColor: this.props.defaultValue,
        };
      } else {
        this.state = {
          currentPalette: null,
          currentPicker: PickerType.HCL,
          currentColor: this.props.defaultValue,
        };
      }
    } else {
      this.state = {
        currentPalette: predefinedPalettes.filter(
          (x) => x.name == "Palette/ColorBrewer"
        )[0],
        currentPicker: null,
      };
    }

    //REMOVE TO OPEN COLOR PALETTE BY DEFAULT VALUE
    //OPEN DEFAULT COLOR PALETTE
    this.state = {
      currentPalette: predefinedPalettes.filter(
        (x) => x.name == "Palette/ColorBrewer"
      )[0],
      currentPicker: null,
      currentColor: this.props.defaultValue,
    };
  }

  // eslint-disable-next-line
  public render() {
    const editorType = this.props?.store?.editorType ?? EditorType.Chart;

    const isWeb =
      editorType === EditorType.Chart || editorType === EditorType.Nested;

    const pickersSection = (
      <>
        <PickersSectionWrapper>
          <PickersSection>
            <PaletteList
              palettes={predefinedPalettes.filter((x) => x.type == "palette")}
              selected={this.state.currentPalette}
              onClick={(p) => {
                this.setState({ currentPalette: p, currentPicker: null });
                this.props.parent?.forceUpdate();
              }}
            />
            <Label>Color Picker</Label>
            <ColorPickerButton
              state={this.state}
              onClick={() =>
                this.setState({
                  currentPalette: null,
                  currentPicker: PickerType.HCL,
                })
              }
              type={PickerType.HCL}
            />
            <ColorPickerButton
              state={this.state}
              onClick={() =>
                this.setState({
                  currentPalette: null,
                  currentPicker: PickerType.HSV,
                })
              }
              type={PickerType.HSV}
            />
            <PaletteList
              palettes={predefinedPalettes.filter((x) => x.type == "palette")}
              selected={this.state.currentPalette}
              onClick={(p) => {
                this.setState({ currentPalette: p, currentPicker: null });
                this.props.parent?.forceUpdate();
              }}
            />
            <PatternList
              onSelectPattern={(type: string) => {
                this.setState({
                  currentPalette: null,
                  currentPicker: PickerType.SVGPattern,
                  currentPattern: type,
                });
              }}
              onEdit={() => {
                this.setState({
                  currentPalette: null,
                  currentPicker: PickerType.SVGPatternEditor,
                  currentPattern: null,
                });
              }}
            />
          </PickersSection>
          <NullButton
            allowNull={this.props.allowNull}
            onPick={this.props.onPick}
          />
        </PickersSectionWrapper>
      </>
    );

    const colorsSection = (
      <ColorsSectionWrapper>
        {this.state.currentPalette != null ? (
          <ColorGrid
            colors={this.state.currentPalette.colors}
            defaultValue={this.state.currentColor}
            onClick={(c) => {
              this.props.onPick(c);
              this.setState({ currentColor: c });
              if (this.props.closePicker) {
                this.props.closePicker();
              }
            }}
          />
        ) : null}
        {this.state.currentPicker == PickerType.HCL ? (
          <HCLColorPicker
            defaultValue={this.state.currentColor || { r: 0, g: 0, b: 0 }}
            onChange={(c) => {
              this.props.onPick(c);
              this.setState({ currentColor: c });
            }}
          />
        ) : null}
        {this.state.currentPicker == PickerType.HSV ? (
          <HSVColorPicker
            defaultValue={this.state.currentColor || { r: 0, g: 0, b: 0 }}
            onChange={(c) => {
              this.props.onPick(c);
              this.setState({ currentColor: c });
            }}
          />
        ) : null}
        {this.state.currentPicker == PickerType.SVGPatternEditor ? (
          <PatternEditor patternName={this.state.currentPattern} />
        ) : null}
        {this.state.currentPicker == PickerType.SVGPattern ? (
          <PatternPicker patternName={this.state.currentPattern} />
        ) : null}
      </ColorsSectionWrapper>
    );

    return (
      <>
        <ColorsPickerWrapper>
          <ColorsPickerLeftSectionWrapper>
            {isWeb ? pickersSection : colorsSection}
          </ColorsPickerLeftSectionWrapper>
          {isWeb ? colorsSection : pickersSection}
        </ColorsPickerWrapper>
      </>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  Color,
  colorFromHTMLColor,
  ColorGradient,
  colorToHTMLColorHEX,
  deepClone,
  interpolateColors,
} from "../../core";
import { ColorPalette, predefinedPalettes } from "../resources";
import { ColorPicker, colorToCSS } from "./fluentui_color_picker";
import { InputField } from "./color_space_picker";
import { TabsView } from "./tabs_view";
import { ReorderListView } from "../views/panels/object_list_editor";
import { Button } from "../views/panels/widgets/controls";
import { Callout, Dropdown } from "@fluentui/react";
import { Colorspace } from "./fluent_ui_gradient_picker";

export interface GradientPickerProps {
  defaultValue?: ColorGradient;
  onPick?: (gradient: ColorGradient) => void;
}

export interface GradientPickerState {
  currentTab: string;
  currentGradient: ColorGradient;
  isPickerOpen: boolean;
  currentItemId: string;
  currentColor: Color;
  currentItemIdx: number;
}

export class GradientPicker extends React.Component<
  React.PropsWithChildren<GradientPickerProps>,
  GradientPickerState
> {
  public static tabs = [
    { name: "palettes", label: "Palettes" },
    { name: "custom", label: "Custom" },
  ];

  constructor(props: GradientPickerProps) {
    super(props);
    this.state = {
      currentTab: "palettes",
      currentGradient: this.props.defaultValue || {
        colorspace: Colorspace.LAB,
        colors: [
          { r: 0, g: 0, b: 0 },
          { r: 255, g: 255, b: 255 },
        ],
      },
      isPickerOpen: false,
      currentItemId: "",
      currentColor: null,
      currentItemIdx: null,
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

  public renderGradientPalettes() {
    const items = predefinedPalettes.filter(
      (x) => x.type == "sequential" || x.type == "diverging"
    );
    const groups: [string, ColorPalette[]][] = [];
    const group2Index = new Map<string, number>();
    for (const p of items) {
      const groupName = p.name.split("/")[0];
      let group: ColorPalette[];
      if (group2Index.has(groupName)) {
        group = groups[group2Index.get(groupName)][1];
      } else {
        group = [];
        group2Index.set(groupName, groups.length);
        groups.push([groupName, group]);
      }
      group.push(p);
    }
    return (
      <section className="palettes">
        <ul>
          {groups.map((group, index) => {
            return (
              <li key={`m${index}`}>
                <div className="label">{group[0]}</div>
                <ul>
                  {group[1].map((x) => {
                    const gradient: ColorGradient = {
                      colors: x.colors[0],
                      colorspace: Colorspace.LAB,
                    };
                    return (
                      <li
                        key={x.name}
                        className="item"
                        onClick={() => this.selectGradient(gradient, true)}
                      >
                        <GradientView gradient={gradient} />
                        <label>{x.name.split("/")[1]}</label>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
  private changeColorPickerState(id: string, color: Color, idx: number) {
    this.setState({
      ...this.state,
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
                const newGradient = deepClone(this.state.currentGradient);
                newGradient.colors[this.state.currentItemIdx] = color;
                this.selectGradient(newGradient, true);
              }}
              parent={this}
            />
          </Callout>
        )}
      </>
    );
  }

  // eslint-disable-next-line
  public render() {
    return (
      <div className="gradient-picker">
        <TabsView
          tabs={GradientPicker.tabs}
          currentTab={this.state.currentTab}
          onSelect={(tab) => this.setState({ currentTab: tab })}
        />
        {this.state.currentTab == "palettes"
          ? this.renderGradientPalettes()
          : null}
        {this.state.currentTab == "custom" ? (
          <section className="gradient-editor">
            <div className="row">
              <GradientView gradient={this.state.currentGradient} />
            </div>
            <div className="colors-scroll">
              <ReorderListView
                enabled={true}
                onReorder={(dragIndex, dropIndex) => {
                  const newGradient = deepClone(this.state.currentGradient);
                  ReorderListView.ReorderArray(
                    newGradient.colors,
                    dragIndex,
                    dropIndex
                  );
                  this.selectGradient(newGradient, true);
                }}
              >
                {this.state.currentGradient.colors.map((color, i) => {
                  return (
                    <div className="color-row" key={`m${i}`}>
                      <span
                        id={`color_${i}`}
                        className="color-item"
                        style={{ background: colorToCSS(color) }}
                        onClick={() => {
                          this.changeColorPickerState(`color_${i}`, color, i);
                        }}
                      />
                      <InputField
                        defaultValue={colorToHTMLColorHEX(color)}
                        onEnter={(value) => {
                          const newColor = colorFromHTMLColor(value);
                          const newGradient = deepClone(
                            this.state.currentGradient
                          );
                          newGradient.colors[i] = newColor;
                          this.selectGradient(newGradient, true);
                          return true;
                        }}
                      />
                      <Button
                        icon={"ChromeClose"}
                        onClick={() => {
                          if (this.state.currentGradient.colors.length > 1) {
                            const newGradient = deepClone(
                              this.state.currentGradient
                            );
                            newGradient.colors.splice(i, 1);
                            this.selectGradient(newGradient, true);
                          }
                        }}
                      />
                    </div>
                  );
                })}
                {this.renderColorPicker()}
              </ReorderListView>
            </div>
            <div className="row">
              <Button
                icon={"general/plus"}
                text="Add"
                onClick={() => {
                  const newGradient = deepClone(this.state.currentGradient);
                  newGradient.colors.push({ r: 150, g: 150, b: 150 });
                  this.selectGradient(newGradient, true);
                }}
              />{" "}
              <Button
                icon={"Sort"}
                text="Reverse"
                onClick={() => {
                  const newGradient = deepClone(this.state.currentGradient);
                  newGradient.colors.reverse();
                  this.selectGradient(newGradient, true);
                }}
              />{" "}
              <Dropdown
                options={[
                  { key: Colorspace.HCL, text: "HCL" },
                  { key: Colorspace.LAB, text: "Lab" },
                ]}
                onChange={(event, option) => {
                  if (option) {
                    const newGradient = deepClone(this.state.currentGradient);
                    newGradient.colorspace = option.key as Colorspace;
                    this.selectGradient(newGradient, true);
                  }
                }}
              />
            </div>
          </section>
        ) : null}
      </div>
    );
  }
}

export class GradientView extends React.PureComponent<
  {
    gradient: ColorGradient;
  },
  Record<string, never>
> {
  protected refCanvas: HTMLCanvasElement;

  public componentDidMount() {
    this.componentDidUpdate();
  }

  public componentDidUpdate() {
    // Chrome doesn't like get/putImageData in this method
    // Doing so will cause the popup editor to not layout, although any change in its style will fix
    setTimeout(() => {
      if (!this.refCanvas || !this.props.gradient) {
        return;
      }
      const ctx = this.refCanvas.getContext("2d");
      const width = this.refCanvas.width;
      const height = this.refCanvas.height;
      const scale = interpolateColors(
        this.props.gradient.colors,
        this.props.gradient.colorspace
      );
      const data = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < data.width; i++) {
        const t = i / (data.width - 1);
        const c = scale(t);
        for (let y = 0; y < data.height; y++) {
          let ptr = (i + y * data.width) * 4;
          data.data[ptr++] = c.r;
          data.data[ptr++] = c.g;
          data.data[ptr++] = c.b;
          data.data[ptr++] = 255;
        }
      }
      ctx.putImageData(data, 0, 0);
    }, 0);
  }

  public render() {
    return (
      <span className="gradient-view">
        <canvas ref={(e) => (this.refCanvas = e)} width={50} height={2} />
      </span>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ColorPalette, predefinedPalettes } from "../../resources";
import {
  ColorGradientWrapper,
  // colorPalettesLabelStyles,
  PalettesWrapper,
  TabWrapper,
} from "./styles";
// import { Label } from "@fluentui/react";
import { ColorGradient, interpolateColors } from "../../../core";
import { Colorspace } from "../fluent_ui_gradient_picker";
import { Label } from "@fluentui/react-components";

interface GradientPalettesProps {
  selectGradient: (gradient: ColorGradient, emit: boolean) => void;
}

export class GradientPalettes extends React.Component<
  React.PropsWithChildren<GradientPalettesProps>,
  Record<string, unknown>
> {
  render() {
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
      <TabWrapper>
        {groups.map((group, index) => {
          return (
            <div key={`group-section-${index}`}>
              <Label>{group[0]}</Label>
              {group[1].map((x) => {
                const gradient: ColorGradient = {
                  colors: x.colors[0],
                  colorspace: Colorspace.LAB,
                };
                return (
                  <PalettesWrapper
                    key={x.name}
                    onClick={() => this.props.selectGradient(gradient, true)}
                  >
                    <GradientView gradient={gradient} />
                    <Label>
                      {x.name.split("/")[1]}
                    </Label>
                  </PalettesWrapper>
                );
              })}
            </div>
          );
        })}
      </TabWrapper>
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
      <ColorGradientWrapper className="gradient-view">
        <canvas
          ref={(e) => (this.refCanvas = e)}
          height={2}
          style={{ width: "100%" }}
        />
      </ColorGradientWrapper>
    );
  }
}

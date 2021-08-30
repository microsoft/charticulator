// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ColorPalette } from "../../resources";
import * as React from "react";
import { DefaultButton, Label } from "@fluentui/react";
import { defaultPaletteButtonsStyles } from "./styles";

export interface PaletteListProps {
  selected: ColorPalette;
  palettes: ColorPalette[];
  onClick?: (palette: ColorPalette) => void;
}

export class PaletteList extends React.PureComponent<
  PaletteListProps,
  Record<string, unknown>
> {
  public render() {
    const palettes = this.props.palettes;
    const groups: [string, ColorPalette[]][] = [];
    const group2Index = new Map<string, number>();
    for (const p of palettes) {
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
      <ul>
        {groups.map((group, index) => {
          return (
            <React.Fragment key={`palette-group-wrapper-${index}`}>
              <Label key={`palette-label-${index}`}>{group[0]}</Label>
              {group[1].map((x) => (
                <DefaultButton
                  key={x.name}
                  onClick={() => this.props.onClick(x)}
                  text={x.name.split("/")[1]}
                  styles={defaultPaletteButtonsStyles}
                  checked={this.props.selected == x}
                />
              ))}
            </React.Fragment>
          );
        })}
      </ul>
    );
  }
}

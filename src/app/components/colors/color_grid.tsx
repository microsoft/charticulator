// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color } from "../../../core";
import * as React from "react";
import { ColorGridItem } from "./color_grid_item";
import { ColorGridColumnWrapper, ColorGridRowWrapper } from "./styles";

export interface ColorGridProps {
  defaultValue?: Color;
  colors: Color[][];
  onClick?: (color: Color) => void;
}

export class ColorGrid extends React.PureComponent<
  ColorGridProps,
  Record<string, unknown>
> {
  public render() {
    return (
      <ColorGridRowWrapper>
        {this.props.colors.map((colors, index) => (
          <ColorGridColumnWrapper key={`column-color-${index}`}>
            {colors.map((color, i) => (
              <ColorGridItem
                key={`color-item-${i}`}
                color={color}
                onClick={this.props.onClick}
                defaultValue={this.props.defaultValue}
              />
            ))}
          </ColorGridColumnWrapper>
        ))}
      </ColorGridRowWrapper>
    );
  }
}

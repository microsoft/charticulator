// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { colorToCSS } from "../fluentui_color_picker";
import * as React from "react";
import { Color } from "../../../core";
import styled from "styled-components";

interface ColorItemProps {
  color: string;
}

const ColorItem = styled.span<ColorItemProps>`
  display: block;
  box-sizing: border-box;
  border: 1px solid #8a8886;
  width: 20px;
  height: 20px;
  margin: 4px;
  background-color: ${(props) => props.color};
  cursor: pointer;
`;

interface ColorGridItemProps {
  color: Color;
  defaultValue?: Color;
  onClick?: (color: Color) => void;
}

export class ColorGridItem extends React.Component<
  ColorGridItemProps,
  Record<string, unknown>
> {
  render() {
    return (
      <span
        onClick={() => {
          if (this.props.onClick) {
            this.props.onClick(this.props.color);
          }
        }}
      >
        <ColorItem color={colorToCSS(this.props.color)} />
      </span>
    );
  }
}

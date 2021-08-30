// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IButtonStyles, IDropdownStyles, ILabelStyles } from "@fluentui/react";
import styled from "styled-components";

export const defaultActionButtonsStyles: IButtonStyles = {
  root: {
    height: 24,
    marginRight: 5,
  },
};
export const colorPalettesLabelStyles: ILabelStyles = {
  root: {
    marginLeft: 5,
    display: "inline-block",
    fontWeight: 400,
    cursor: "pointer",
  },
};

export const deleteColorStyles: IButtonStyles = {
  root: {
    height: 20,
    width: 20,
    minWidth: "unset",
    padding: "unset",
    border: "unset",
  },
};

export const dropdownStyles: Partial<IDropdownStyles> = {
  root: {
    display: "inline-block",
    height: 24,
    width: "100%",
  },
  dropdown: {
    height: 24,
  },
  title: {
    lineHeight: 24,
    height: 24,
    fontWeight: 600,
  },
  caretDown: {
    lineHeight: 24,
    height: 24,
  },
};

export const PalettesWrapper = styled.div`
  cursor: pointer;

  &:hover {
    background-color: #f3f2f1;
  }
`;

export const TabWrapper = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

export const ColorRowWrapper = styled.div`
  margin-top: 5px;
  display: flex;
`;

interface ColorCellProps {
  $color: string;
}

export const ColorCell = styled.span<ColorCellProps>`
  background: ${(props) => props.$color};
  width: 20px;
  height: 20px;
  display: inline-block;
  cursor: pointer;
  border: 1px solid #8a8886;
  margin-right: 5px;
`;

export const ColorGradientWrapper = styled.span`
  width: 50%;
  cursor: pointer;
`;

export const CustomGradientButtonsWrapper = styled.div`
  display: flex;
  margin-top: 10px;
`;

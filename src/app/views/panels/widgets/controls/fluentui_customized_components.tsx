// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  IDropdownProps,
  ILabelStyles,
  IRenderFunction,
  ITextFieldProps,
  Label,
} from "@fluentui/react";
import styled from "styled-components";

export const FluentButton = styled.div<{ marginTop?: string }>`
  margin-top: ${({ marginTop }) => marginTop || "24px"};
  display: inline-block;
  padding: 0px 4px 0px 0px;
  button {
    min-width: unset;
    padding: 4px;
  }
`;

export const FluentLabelHeader = styled.div<{
  marginBottom?: string;
  marginTop?: string;
  marginRight?: string;
}>`
  margin-bottom: ${({ marginBottom }) => marginBottom || "24px"};
  margin-top: ${({ marginTop }) => marginTop || "24px"};
  margin-right: ${({ marginRight: marginLeft }) => marginLeft || "0px"};
`;

export const FluentActionButton = styled.div`
  button {
    border: 1px solid;
    height: 32px;
    width: 100%;
  }
`;

export const FluentTextField = styled.div`
  flex: 1;
  * {
    flex: 1;
  }
`;

export const FluentCheckbox = styled.div`
  margin-top: 2px;
  margin-bottom: 2px;
`;

export const FluentRowLayout = styled.div`
  display: flex;
  flex-direction: row;
`;

export const FluentColumnLayout = styled.div`
  display: flex;
  flex-direction: column;
`;

export const FluentLayoutItem = styled.div<{ flex: number }>`
  flex: ${({ flex }) => flex || "1"};
`;

export const defaultFontWeight = 400;

export const defaultLabelStyle: ILabelStyles = {
  root: {
    fontWeight: defaultFontWeight,
  },
};

export const labelRender: IRenderFunction<ITextFieldProps & IDropdownProps> = ({
  label,
}) => (label ? <Label styles={defaultLabelStyle}>{label}</Label> : null);

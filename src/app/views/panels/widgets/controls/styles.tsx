// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import styled from "styled-components";
import { ITextFieldStyles, ITooltipHostStyles } from "@fluentui/react";

export const ImageMappingDragStateWrapper = styled.div`
  border: 1px solid #fa9e13;
  padding-left: 4px;
  width: 95%;
  background: #fa9e136b;
`;

export const ImageMappingTextFieldStyles: Partial<ITextFieldStyles> = {
  root: {
    height: 25,
  },
  wrapper: {
    height: 25,
  },
  field: {
    height: 25,
  },
};

export const ToolTipHostStyles: Partial<ITooltipHostStyles> = {
  root: {
    width: "100%",
    display: "unset",
    paddingLeft: "4px",
    paddingRight: "4px",
  },
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import styled from "styled-components";

export const defultBindButtonSize = {
  height: "32px",
  width: "32px",
};

export const FluentRowLayout = styled.div`
  display: flex;
  flex-direction: row;
`;

export const FluentDataBindingMenuItem = styled.div<Record<string, unknown>>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export const FluentDataBindingMenuLabel = styled.div`
  flex: 1;
  margin-left: 5px;
`;

export const FluentColumnLayout = styled.div`
  display: flex;
  flex-direction: column;
`;

export const defaultFontWeight = 400;

export const NestedChartButtonsWrapper = styled.div`
  margin-top: 5px;
`;

export const FluentGroupedList = styled.div<{ marginLeft?: number }>`
  .charticulator__widget-collapsible-panel-item {
    margin-left: ${({ marginLeft }) =>
      marginLeft != null ? marginLeft : "25px"};
    margin-right: 15px;
    min-width: 270px;
  }

  .ms-List-surface .ms-List-cell .ms-List-cell:last-child {
    margin-bottom: 5px;
  }

  .ms-List-surface .ms-List-page .ms-List-cell {
    min-height: 24px;
  }
`;
export const defultComponentsHeight = {
  height: "32px",
  lineHeight: "unset",
};

export const defaultStyle: any = {
  field: {
    defultComponentsHeight,
    height: "20px",
  },
  fieldGroup: defultComponentsHeight,
  dropdown: {
    boxSizing: "unset",
    ...defultComponentsHeight,
  },
  dropdownOptionText: {
    boxSizing: "unset",
    ...defultComponentsHeight,
  },
  dropdownItem: {
    boxSizing: "unset",
    minHeight: "25px",
    ...defultComponentsHeight,
  },
  dropdownItemHeader: {
    boxSizing: "unset",
    ...defultComponentsHeight,
  },
  dropdownItemSelected: {
    boxSizing: "unset",
    minHeight: "24px",
    lineHeight: "24px",
    ...defultComponentsHeight,
  },
  caretDown: {
    boxSizing: "unset",
    ...defultComponentsHeight,
  },
  caretDownWrapper: {
    boxSizing: "unset",
    marginTop: "5px",
    ...defultComponentsHeight,
  },
  title: {
    boxSizing: "unset",
    ...defultComponentsHeight,
    height: "22px",
    lineHeight: "unset",
  },
  label: {
    lineHeight: "unset",
  },
};

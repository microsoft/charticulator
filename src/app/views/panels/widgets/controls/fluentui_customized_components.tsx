// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  IButtonStyles,
  IDropdownProps,
  IGroupedListStyleProps,
  IGroupedListStyles,
  IGroupHeaderStyleProps,
  IGroupHeaderStyles,
  ILabelStyles,
  IRenderFunction,
  IStyleFunctionOrObject,
  ITextFieldProps,
  Label,
} from "@fluentui/react";
import styled from "styled-components";

export const defaultBindButtonSize = {
  height: "24px",
  width: "24px",
};

export const FluentButton = styled.div<{
  marginTop?: string;
  marginLeft?: string;
  paddingRight?: string;
}>`
  margin-top: ${({ marginTop }) => marginTop || "24px"};
  margin-left: ${({ marginLeft }) => marginLeft || "unset"};
  display: inline-block;
  padding: 0px ${({ paddingRight }) => paddingRight || "4px"} 0px 0px;
  height: ${defaultBindButtonSize.height};
  line-height: ${defaultBindButtonSize.height};
  button {
    padding: 4px;
  }
`;

export const FluentLabelHeader = styled.div<{
  marginBottom?: string;
  marginTop?: string;
  marginRight?: string;
}>`
  margin-bottom: ${({ marginBottom }) => marginBottom || "24px"};
  margin-top: ${({ marginTop }) => marginTop || "20px"};
  margin-right: ${({ marginRight: marginLeft }) => marginLeft || "2px"};
`;

export const FluentActionButton = styled.div`
  button {
    border: 1px solid;
    width: 100%;
    overflow: hidden;
  }
`;

export const FluentTextField = styled.div`
  flex: 1;
  * {
    flex: 1;
  }
`;

export const FluentCheckbox = styled.div`
  margin-bottom: 2px;
`;

export const FluentRowLayout = styled.div`
  display: flex;
  flex-direction: row;
`;

export const FluentDataBindingMenuItem = styled.div<{
  backgroundColor?: string;
  backgroundColorHover?: string;
}>`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  height: 26px;
  line-height: unset;
  background-color: ${({ backgroundColor }) => backgroundColor || null};
  &:hover {
    background-color: ${({ backgroundColorHover }) =>
      backgroundColorHover || null};
  }
  .ms-Dropdown-container {
    margin-top: 2px;
  }
`;

export const FluentDataBindingMenuLabel = styled.div`
  flex: 1;
  margin-left: 5px;
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
    lineHeight: "unset",
  },
};

export const labelRender: IRenderFunction<ITextFieldProps & IDropdownProps> = ({
  label,
}) => (label ? <Label styles={defaultLabelStyle}>{label}</Label> : null);

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
export const defaultComponentsHeight = {
  height: "24px",
  lineHeight: "unset",
};

export const groupHeaderStyles: IStyleFunctionOrObject<
  IGroupHeaderStyleProps,
  IGroupHeaderStyles
> = {
  title: {
    fontWeight: 600,
  },
  headerCount: {
    display: "none",
  },
  groupHeaderContainer: {
    ...defaultComponentsHeight,
  },
  expand: {
    ...defaultBindButtonSize,
    fontSize: "unset",
  },
  dropIcon: {
    display: "none",
  },
};

export const groupStyles: IStyleFunctionOrObject<
  IGroupedListStyleProps,
  IGroupedListStyles
> = {
  group: {
    borderTop: "1px #C8C6C4 solid",
  },
};

export const PlaceholderStyle = styled.div<{ color?: string }>`
  input {
    ::-webkit-input-placeholder {
      /* Chrome/Opera/Safari */
      color: ${({ color }) => color || "lightgray"};
    }
    ::-moz-placeholder {
      /* Firefox 19+ */
      color: ${({ color }) => color || "lightgray"};
    }
    :-ms-input-placeholder {
      /* IE 10+ */
      color: ${({ color }) => color || "lightgray"};
    }
    :-moz-placeholder {
      /* Firefox 18- */
      color: ${({ color }) => color || "lightgray"};
    }
  }
`;

export const FluentDropdown = styled.div`
  & svg {
    stroke: rgb(128, 128, 128) !important;
    fill: rgb(128, 128, 128) !important;
  }
  display: inline;
`;

export const FluentDropdownWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 20px;
`;

export const FluentDatePickerWrapper = styled.div`
  .ms-TextField-fieldGroup {
    height: 24px;
  }
  i {
    padding: 4px 5px 5px;
    line-height: unset;
  }
`;

export const defaultStyle: any = {
  field: {
    defaultComponentsHeight,
    height: "20px",
  },
  fieldGroup: defaultComponentsHeight,
  dropdown: {
    boxSizing: "unset",
    ...defaultComponentsHeight,
  },
  dropdownOptionText: {
    boxSizing: "unset",
    ...defaultComponentsHeight,
  },
  dropdownItem: {
    boxSizing: "unset",
    minHeight: "25px",
    ...defaultComponentsHeight,
  },
  dropdownItemHeader: {
    boxSizing: "unset",
    ...defaultComponentsHeight,
  },
  dropdownItemSelected: {
    boxSizing: "unset",
    minHeight: "24px",
    lineHeight: "24px",
    ...defaultComponentsHeight,
  },
  caretDown: {
    boxSizing: "unset",
    ...defaultComponentsHeight,
  },
  caretDownWrapper: {
    boxSizing: "unset",
    marginTop: "5px",
    ...defaultComponentsHeight,
  },
  title: {
    boxSizing: "unset",
    ...defaultComponentsHeight,
    height: "22px",
    lineHeight: "unset",
  },
  label: {
    lineHeight: "unset",
  },
};

export const PanelHeaderStyles: Partial<IButtonStyles> = {
  root: {
    border: "unset",
    height: 24,
    width: 24,
    display: "inline",
    padding: 0,
    minWidth: 24,
  },
  textContainer: {
    flexGrow: "unset",
  },
};

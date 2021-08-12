// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  IDropdownProps,
  IGroupedListStyleProps,
  IGroupedListStyles,
  IGroupHeaderStyleProps,
  IGroupHeaderStyles,
  ILabelStyles,
  IRenderFunction,
  IStyle,
  IStyleFunctionOrObject,
  ITextFieldProps,
  ITextFieldStyleProps,
  ITextFieldStyles,
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

export const NestedChartButtonsWrapper = styled.div`
  margin-top: 5px;
`;

export const FluentGroupedList = styled.div`
  .charticulator__widget-collapsible-panel-item {
    margin-left: 15px;
    margin-right: 15px;
    min-width: 270px;
  }

  .ms-List-surface .ms-List-cell .ms-List-cell:last-child {
    margin-bottom: 5px;
  }
`;

export const defultBindButtonSize = {
  height: "24px",
  width: "24px",
};

export const defultComponentsHeight = {
  height: "24px",
  lineHeight: "24px",
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
    ...defultComponentsHeight,
  },
  expand: {
    ...defultBindButtonSize,
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
  }
  display: inline;
`;

export const defaultStyle: any = {
  field: defultComponentsHeight,
  fieldGroup: defultComponentsHeight,
  dropdown: defultComponentsHeight,
  // dropdownItems: defultComponentnsHeight,
  dropdownOptionText: defultComponentsHeight,
  dropdownItem: {
    minHeight: "24px",
    ...defultComponentsHeight,
  },
  dropdownItemHeader: defultComponentsHeight,
  dropdownItemSelected: {
    minHeight: "24px",
    lineHeight: "24px",
    ...defultComponentsHeight,
  },
  caretDown: defultComponentsHeight,
  caretDownWrapper: defultComponentsHeight,
  title: defultComponentsHeight,
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IDropdownOption, IDropdownStyles } from "@fluentui/react";
import {
  defaultComponentsHeight,
  FluentDropdown,
  FluentDropdownWrapper,
} from "./controls/fluentui_customized_components";
import { Prototypes } from "../../../../core";
import { Icon } from "@fluentui/react/lib/Icon";
import * as React from "react";
import { CSSProperties } from "react";
import { SVGImageIcon } from "../../../../app/components";
import * as R from "../../../../app/resources";

export const dropdownStyles = (
  options: Prototypes.Controls.InputSelectOptions
): Partial<IDropdownStyles> => {
  return {
    title: {
      ...defaultComponentsHeight,
      borderWidth: options.hideBorder ? "0px" : null,
    },
    dropdownItemsWrapper: {
      minWidth: 90,
    },
    callout: {
      marginTop: options.shiftCallout ? options.shiftCallout : null,
    },
  };
};

export const iconStyles: CSSProperties = { marginRight: "8px" };

export const onRenderOption = (option: IDropdownOption): JSX.Element => {
  return (
    <>
      {option.data && option.data.icon && (
        <FluentDropdown>
          {option.data.isLocalIcons ? (
            <span style={iconStyles}>
              <SVGImageIcon url={R.getSVGIcon(option.data.icon)} />
            </span>
          ) : (
            <Icon
              style={iconStyles}
              iconName={option.data.icon}
              aria-hidden="true"
              title={option.data.icon}
            />
          )}
        </FluentDropdown>
      )}
      <span>{option.text}</span>
    </>
  );
};

export const onRenderTitle = (options: IDropdownOption[]): JSX.Element => {
  const option = options[0];

  return (
    <FluentDropdownWrapper>
      {option.data && option.data.icon && (
        <FluentDropdown>
          {option.data.isLocalIcons ? (
            <span style={iconStyles}>
              <SVGImageIcon url={R.getSVGIcon(option.data.icon)} />
            </span>
          ) : (
            <Icon
              style={iconStyles}
              iconName={option.data.icon}
              aria-hidden="true"
              title={option.data.icon}
            />
          )}
        </FluentDropdown>
      )}
      <span>{option.text}</span>
    </FluentDropdownWrapper>
  );
};

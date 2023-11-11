// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// import { Callout, DefaultButton, DirectionalHint } from "@fluentui/react";
import * as React from "react";
import { Prototypes } from "../../../../core";
import { PanelMode } from "../../../../core/prototypes/controls";

import { strings } from "../../../../strings";
import * as R from "../../../resources";

// import {
//   defultComponentsHeight,
//   FluentButton,
// } from "./controls/fluentui_customized_components";
import { FluentUIFilterEditor } from "./fluentui_filter_editor";
import { CharticulatorPropertyAccessors } from "./types";
import { Button, Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { SVGImageIcon } from "../../../components";

export const FilterPanel: React.FC<{
  text: string;
  options: Prototypes.Controls.FilterEditorOptions;
  manager: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors;
}> = ({ text, options, manager }) => {
  const [isOpen, setOpen] = React.useState(false);

  switch (options.mode) {
    case PanelMode.Button:
      if (options.value) {
        if (options.value.categories) {
          text = strings.filter.filterBy + options.value.categories.expression;
        }
        if (options.value.expression) {
          text = strings.filter.filterBy + options.value.expression;
        }
      }
      return (
        <>
          <Popover>
            {/* <FluentButton marginTop={"0px"}> */}
            <PopoverTrigger disableButtonEnhancement>
              <Button
                id="filterTarget"
                // text={text}
                // iconProps={{
                //   iconName: "Filter",
                // }}
                icon={<SVGImageIcon url={R.getSVGIcon('Filter')}/>}
                onClick={() => {
                  setOpen(!isOpen);
                }}
                // styles={{
                //   root: {
                //     minWidth: "unset",
                //     ...defultComponentsHeight,
                //   },
                // }}
              >{text}</Button>
            </PopoverTrigger>
            {/* </FluentButton> */}
            {/* {isOpen ? (
              <Callout
                onDismiss={() => setOpen(false)}
                target="#filterTarget"
                directionalHint={DirectionalHint.topCenter}
              >
                <FluentUIFilterEditor
                  manager={manager}
                  value={options.value}
                  options={options}
                />
              </Callout>
            ) : null} */}
            <PopoverSurface>
                <FluentUIFilterEditor
                  manager={manager}
                  value={options.value}
                  options={options}
                />
            </PopoverSurface>
          </Popover>
        </>
      );
    case PanelMode.Panel:
      return (
        <FluentUIFilterEditor
          manager={manager}
          value={options.value}
          options={options}
        />
      );
  }
};

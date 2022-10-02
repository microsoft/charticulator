// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Callout, DefaultButton, DirectionalHint } from "@fluentui/react";
import * as React from "react";
import { Prototypes } from "../../../../core";
import { PanelMode } from "../../../../core/prototypes/controls";

import { strings } from "../../../../strings";
import {
  defaultComponentsHeight,
  FluentButton,
} from "./controls/fluentui_customized_components";
import { FluentUIFilterEditor } from "./fluentui_filter_editor";
import { CharticulatorPropertyAccessors } from "./types";

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
          <FluentButton marginTop={"0px"}>
            <DefaultButton
              id="filterTarget"
              text={text}
              iconProps={{
                iconName: "Filter",
              }}
              onClick={() => {
                setOpen(!isOpen);
              }}
              styles={{
                root: {
                  minWidth: "unset",
                  ...defaultComponentsHeight,
                },
              }}
            />
          </FluentButton>
          {isOpen ? (
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
          ) : null}
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

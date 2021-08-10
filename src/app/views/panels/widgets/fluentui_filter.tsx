/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Callout, DefaultButton, DirectionalHint } from "@fluentui/react";
import * as React from "react";
import { Prototypes } from "../../../../core";

import { strings } from "../../../../strings";
import { FluentButton } from "./controls/fluentui_customized_components";
import { FluentUIFilterEditor } from "./fluentui_filter_editor";

export const FilterPanel: React.FC<{
  text: string;
  options: Prototypes.Controls.FilterEditorOptions;
}> = ({ text, options }) => {
  const [isOpen, setOpen] = React.useState(false);

  switch (options.mode) {
    case "button":
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
            />
          </FluentButton>
          {isOpen ? (
            <Callout
              target="#filterTarget"
              directionalHint={DirectionalHint.topCenter}
            >
              <FluentUIFilterEditor
                manager={options.manager}
                value={options.value}
                options={options}
              />
            </Callout>
          ) : null}
        </>
      );
    case "panel":
      return (
        <FluentUIFilterEditor
          manager={options.manager}
          value={options.value}
          options={options}
        />
      );
  }
};

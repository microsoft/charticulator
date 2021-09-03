// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  ContextualMenuItemType,
  ICommandBarItemProps,
  VerticalDivider,
} from "@fluentui/react";
import * as React from "react";

export function getCommandBarDivider(key: string): ICommandBarItemProps {
  return {
    key: key,
    itemType: ContextualMenuItemType.Divider,
    onRender: () => (
      <span style={{ margin: " 0 10px" }}>
        <VerticalDivider />
      </span>
    ),
  };
}


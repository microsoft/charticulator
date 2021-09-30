// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { CSSProperties, useState } from "react";
import { DefaultButton, Label } from "@fluentui/react";

interface CollapsiblePanelProps {
  widgets: JSX.Element[];
  header?: string;
  styles?: CSSProperties;
}

//Needs to handle tab index in plot segment
export const CustomCollapsiblePanel = ({
  widgets,
  header,
  styles,
}: CollapsiblePanelProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);

  const panelHeader = header ?? "";

  return (
    <>
      <PanelHeader
        header={panelHeader}
        setCollapsed={setCollapsed}
        collapsed={collapsed}
      />
      <div style={styles}>{!collapsed ? widgets : null}</div>
    </>
  );
};

interface PanelHeaderProps {
  header: string;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export const PanelHeader = ({
  header,
  setCollapsed,
  collapsed,
}: PanelHeaderProps): JSX.Element => {
  return (
    <div onClick={() => setCollapsed(!collapsed)}>
      <DefaultButton
        iconProps={{
          iconName: collapsed ? "ChevronRight" : "ChevronDown",
          styles: {
            root: {
              fontSize: "unset",
              height: 12,
            },
          },
        }}
        styles={{
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
        }}
        onClick={() => {
          setCollapsed(!collapsed);
        }}
      />
      <Label
        styles={{
          root: {
            display: "inline-block",
            cursor: "pointer",
          },
        }}
      >
        {header}
      </Label>
    </div>
  );
};

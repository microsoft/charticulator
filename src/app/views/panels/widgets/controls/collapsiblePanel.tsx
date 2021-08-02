// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  GroupedList,
  GroupHeader,
  IGroup,
  IGroupHeaderProps,
  SelectionMode,
} from "@fluentui/react";
import * as React from "react";
import {
  FluentGroupedList,
  groupHeaderStyles,
} from "./fluentui_customized_components";

export const CollapsiblePanel: React.FunctionComponent<{
  header: string;
  widgets: JSX.Element[];
  isCollapsed?: boolean;
}> = ({ header, widgets, isCollapsed }) => {
  const [groupState, setIsCollapsed] = React.useState<boolean>(
    isCollapsed === undefined ? true : isCollapsed
  );
  return (
    <FluentGroupedList>
      <GroupedList
        groupProps={{
          onRenderHeader: (props?: IGroupHeaderProps): JSX.Element => {
            return (
              <GroupHeader
                onRenderGroupHeaderCheckbox={() => null}
                {...props}
                styles={groupHeaderStyles}
                onToggleCollapse={(group) => {
                  setIsCollapsed(!group.isCollapsed);
                }}
              />
            );
          },
        }}
        selectionMode={SelectionMode.none}
        items={widgets
          .filter((w) => w !== null)
          .map((w, i) => ({
            key: i,
            item: w,
          }))}
        onRenderCell={(
          nestingDepth?: number,
          item?: {
            item: JSX.Element;
            key: number;
          },
          itemIndex?: number
        ) => {
          return item && typeof itemIndex === "number" && itemIndex > -1 ? (
            <div className="charticulator__widget-collapsible-panel-item">
              {item.item}
            </div>
          ) : null;
        }}
        groups={[
          {
            count: widgets.length,
            key: "group",
            level: 0,
            name: header,
            startIndex: 0,
            isCollapsed: groupState,
          },
        ]}
        compact={true}
      />
    </FluentGroupedList>
  );
};

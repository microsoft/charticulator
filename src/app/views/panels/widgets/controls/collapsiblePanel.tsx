// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  GroupedList,
  GroupHeader,
  IGroupHeaderProps,
  IRenderFunction,
  Label,
  SelectionMode,
} from "@fluentui/react";
import * as React from "react";
import {
  FluentGroupedList,
  groupHeaderStyles,
  groupStyles,
} from "./fluentui_customized_components";

interface CollapsiblePanelProps {
  header: string | IRenderFunction<IGroupHeaderProps>;
  widgets: JSX.Element[];
  isCollapsed?: boolean;
  alignVertically?: boolean;
}

export const CollapsiblePanel: React.FunctionComponent<CollapsiblePanelProps> = ({
  header,
  widgets,
  isCollapsed,
  alignVertically,
}) => {
  const [groupState, setIsCollapsed] = React.useState<boolean>(
    isCollapsed === undefined ? false : isCollapsed
  );

  return (
    <FluentGroupedList marginLeft={alignVertically ? 0 : null}>
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
                onGroupHeaderClick={(group) => {
                  props.onToggleCollapse(group);
                  setIsCollapsed(group.isCollapsed);
                }}
                onRenderTitle={
                  typeof header === "string"
                    ? () => <Label>{header}</Label>
                    : header
                }
              />
            );
          },
        }}
        selectionMode={SelectionMode.none}
        items={widgets
          .filter((w) => (Array.isArray(w) ? w?.[0] != null : w != null))
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
          return item &&
            item.item &&
            typeof itemIndex === "number" &&
            itemIndex > -1 ? (
            <div
              className="charticulator__widget-collapsible-panel-item"
              key={itemIndex}
            >
              {item.item}
            </div>
          ) : null;
        }}
        groups={[
          {
            count: widgets.length,
            key: "group",
            level: 0,
            name: typeof header === "string" ? header : "",
            startIndex: 0,
            isCollapsed: groupState,
          },
        ]}
        compact={true}
        styles={{
          ...groupStyles,
          groupIsDropping: {},
        }}
        focusZoneProps={{
          handleTabKey: 1,
        }}
      />
    </FluentGroupedList>
  );
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { useEffect } from "react";
import { AppStore } from "../../../../../app/stores";
import { Actions } from "../../../../../app";
import { CollapseOrExpandPanels } from "../../../../../core/specification/types";

import {
  Label,
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
} from "@fluentui/react-components";

interface CollapsiblePanelProps {
  header: string;
  widgets: JSX.Element[];
  isCollapsed?: boolean;
  alignVertically?: boolean;
  store?: AppStore;
}

// eslint-disable-next-line max-lines-per-function
export const CollapsiblePanel: React.FunctionComponent<CollapsiblePanelProps> = ({
  header,
  widgets,
  isCollapsed,
  store,
}) => {
  const collapsePanel = store
    ? false
    : isCollapsed === undefined
    ? false
    : isCollapsed;
  const [groupState, setGroupState] = React.useState<boolean>(collapsePanel);
  const [calloutVisible, setCalloutVisible] = React.useState(false);

  useEffect(() => {
    const collapsePanel = store
      ? store?.collapseOrExpandPanelsType === CollapseOrExpandPanels.Collapse
      : isCollapsed === undefined
      ? false
      : isCollapsed;
    setGroupState(collapsePanel);
  }, [store, store?.collapseOrExpandPanelsType, isCollapsed]);

  const onContextMenu = React.useCallback(
    (event) => {
      event.preventDefault();
      setCalloutVisible(!calloutVisible);
    },
    [calloutVisible]
  );

  const items = widgets
    .filter((w) => (Array.isArray(w) ? w?.[0] != null : w != null))
    .map((w, i) => ({
      key: i,
      item: w,
    }));

  return (
    <>
      {/* <FluentGroupedList marginLeft={alignVertically ? 0 : null}>
      <GroupedList
        groupProps={{
          onRenderHeader: (props?: IGroupHeaderProps): JSX.Element => {
            return (
              <GroupHeader
                onRenderGroupHeaderCheckbox={() => null}
                {...props}
                // styles={groupHeaderStyles}
                onToggleCollapse={(group) => {
                  setGroupState(!group.isCollapsed);
                  if (store) {
                    store.dispatcher.dispatch(
                      new Actions.ExpandOrCollapsePanelsUpdated(
                        CollapseOrExpandPanels.Custom
                      )
                    );
                  }
                }}
                onGroupHeaderClick={(group) => {
                  props.onToggleCollapse(group);
                  setGroupState(group.isCollapsed);
                }}
                onRenderTitle={
                  typeof header === "string"
                    ? () => (
                      <Label
                        onContextMenu={onContextMenu}
                        id={calloutId}
                        style={{
                          width: "100%",
                        }}
                      >
                        {header}
                      </Label>
                    )
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
          // ...groupStyles,
          groupIsDropping: {},
        }}
        focusZoneProps={{
          handleTabKey: 1,
        }}
      />
    </FluentGroupedList> */}
      <Accordion
        collapsible
        multiple
        openItems={!groupState ? ["1"] : []}
        onToggle={(e, data) => {
          const isCollapsed = !!data.openItems.find((o) => o === "1");
          setGroupState(!isCollapsed);
          if (store) {
            store.dispatcher.dispatch(
              new Actions.ExpandOrCollapsePanelsUpdated(
                CollapseOrExpandPanels.Custom
              )
            );
          }
        }}
      >
        <AccordionItem value="1">
          <AccordionHeader>
            {typeof header === "string" ? (
              <Label
                onContextMenu={onContextMenu}
                style={{
                  width: "100%",
                }}
              >
                {header}
              </Label>
            ) : (
              header
            )}
          </AccordionHeader>
          <AccordionPanel>
            {items.map((item, itemIndex) => {
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
            })}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};

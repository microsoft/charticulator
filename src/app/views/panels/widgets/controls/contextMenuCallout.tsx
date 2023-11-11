// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { AppStore } from "../../../../../app/stores";
import { strings } from "../../../../../strings";
import { Actions } from "../../../../../app";
import { CollapseOrExpandPanels } from "../../../../../core/specification/types";
import { Callout, getTheme, List } from "@fluentui/react";
import {
  FluentDataBindingMenuItem,
  FluentDataBindingMenuLabel,
} from "./fluentui_customized_components";

interface ContextMenuCalloutProps {
  store?: AppStore;
  calloutId: string;
  hideCallout: (value: boolean) => void;
  calloutVisible: boolean;
}

// eslint-disable-next-line max-lines-per-function
export const ContextMenuCallout = ({
  store,
  calloutId,
  hideCallout,
  calloutVisible,
}: ContextMenuCalloutProps): JSX.Element => {
  const menuItems = React.useMemo(() => {
    let items: {
      name: string;
      onClick: () => void;
    }[] = [];
    if (store) {
      items = [
        {
          name: strings.panels.collapseAllCategories,
          onClick: () => {
            store.dispatcher.dispatch(
              new Actions.ExpandOrCollapsePanelsUpdated(
                CollapseOrExpandPanels.Collapse
              )
            );
          },
        },
        {
          name: strings.panels.expandAllCategories,
          onClick: () => {
            store.dispatcher.dispatch(
              new Actions.ExpandOrCollapsePanelsUpdated(
                CollapseOrExpandPanels.Expand
              )
            );
          },
        },
      ];
    }
    return items;
  }, [store]);

  return (
    <>
      {calloutVisible && (
        <Callout
          target={`#${calloutId}`}
          isBeakVisible={false}
          onRestoreFocus={() => hideCallout(false)}
          directionalHint={5}
          onDismiss={() => hideCallout(false)}
        >
          <div>
            <List
              items={menuItems}
              onRenderCell={(item) => {
                const theme = getTheme();
                return (
                  <FluentDataBindingMenuItem
                    onClick={() => {
                      item.onClick();
                      hideCallout(false);
                    }}
                  >
                    <FluentDataBindingMenuLabel
                      style={{
                        padding: 2,
                      }}
                    >
                      {item.name}
                    </FluentDataBindingMenuLabel>
                  </FluentDataBindingMenuItem>
                );
              }}
            />
          </div>
        </Callout>
      )}
    </>
  );
};

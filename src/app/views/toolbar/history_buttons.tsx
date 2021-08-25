// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AppStore } from "../../stores";
import * as React from "react";
import { Actions } from "../../actions";
import { ICommandBarItemProps, IconButton } from "@fluentui/react";
import { strings } from "../../../strings";

export enum HistoryButtonsType {
  UNDO,
  REDO,
}

interface HistoryButtonsProps {
  type: HistoryButtonsType;
  iconName: string;
  store: AppStore;
}

export class HistoryButtons extends React.Component<HistoryButtonsProps, any> {
  constructor(props: HistoryButtonsProps) {
    super(props);
    this.props.store.addListener(AppStore.EVENT_GRAPHICS, () =>
      this.forceUpdate()
    );
  }

  render() {
    let disabled: boolean;
    let onClick: () => void;
    if (this.props.type === HistoryButtonsType.UNDO) {
      disabled = this.props.store.historyManager.statesBefore.length === 0;
      onClick = () => new Actions.Undo().dispatch(this.props.store.dispatcher);
    } else {
      disabled = this.props.store.historyManager.statesAfter.length === 0;
      onClick = () => new Actions.Redo().dispatch(this.props.store.dispatcher);
    }

    return (
      <IconButton
        iconProps={{
          iconName: this.props.iconName,
        }}
        onClick={onClick}
        disabled={disabled}
        styles={{
          rootDisabled: {
            backgroundColor: "unset",
          },
        }}
      />
    );
  }
}

export function getCommandBarHistoryButtons(
  store: AppStore
): ICommandBarItemProps[] {
  return [
    {
      key: "undo",
      iconProps: {
        iconName: "Undo",
      },
      title: strings.menuBar.undo,
      onRender: () => {
        return (
          <HistoryButtons
            store={store}
            iconName="Undo"
            type={HistoryButtonsType.UNDO}
          />
        );
      },
    },
    {
      key: "redo",
      iconProps: {
        iconName: "Redo",
      },
      title: strings.menuBar.redo,
      onRender: () => {
        return (
          <HistoryButtons
            store={store}
            iconName="Redo"
            type={HistoryButtonsType.REDO}
          />
        );
      },
    },
  ];
}

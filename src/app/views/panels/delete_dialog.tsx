// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { useCallback, useState } from "react";
import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
} from "@fluentui/react";
import * as R from "../../resources";
import { strings } from "../../../strings";
import { isInIFrame } from "../../utils";
import { Actions } from "../../actions";
import { MenuButton } from "../../components";
import { MainContextInterface } from "../../context_component";
import { primaryButtonStyles } from "../../../core";

interface DeleteDialogProps {
  context: MainContextInterface;
}

const dialogContentProps = {
  type: DialogType.normal,
  title: strings.dialog.deleteChart,
  subText: strings.dialog.resetConfirm,
};

export const DeleteDialog = ({ context }: DeleteDialogProps): JSX.Element => {
  const [isHidden, setIsHidden] = useState<boolean>(true);

  const onClick = useCallback(() => {
    if (isInIFrame()) {
      setIsHidden(false);
    } else {
      if (confirm(strings.dialog.resetConfirm)) {
        new Actions.Reset().dispatch(context.store.dispatcher);
      }
    }
  }, [context]);

  const toggleHideDialog = useCallback(() => {
    setIsHidden(true);
  }, []);

  const onDeleteChart = useCallback(() => {
    context.store.dispatcher.dispatch(new Actions.Reset());
    setIsHidden(true);
  }, [context]);

  return (
    <>
      <MenuButton
        url={R.getSVGIcon("toolbar/trash")}
        title={strings.menuBar.reset}
        text={strings.menuBar.reset}
        onClick={onClick}
      />
      <Dialog
        hidden={isHidden}
        onDismiss={toggleHideDialog}
        dialogContentProps={dialogContentProps}
      >
        <DialogFooter>
          <DefaultButton
            styles={primaryButtonStyles}
            onClick={onDeleteChart}
            text={strings.button.yes}
          />
          <DefaultButton onClick={toggleHideDialog} text={strings.button.no} />
        </DialogFooter>
      </Dialog>
    </>
  );
};

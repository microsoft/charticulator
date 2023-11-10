// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { useCallback, useState } from "react";
// import { DefaultButton } from "@fluentui/react";

import { Button, Dialog, DialogActions } from "@fluentui/react-components";

import * as R from "../../resources";
import { strings } from "../../../strings";
import { isInIFrame } from "../../utils";
import { Actions } from "../../actions";
import { MenuButton } from "../../components";
import { MainContextInterface } from "../../context_component";
import {
  getDefaultColorGeneratorResetFunction,
  // primaryButtonStyles,
} from "../../../core";

interface DeleteDialogProps {
  context: MainContextInterface;
}

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
    getDefaultColorGeneratorResetFunction()();
  }, [context]);

  return (
    <>
      <MenuButton
        url={R.getSVGIcon("toolbar/trash")}
        title={strings.menuBar.reset}
        text={strings.menuBar.reset}
        onClick={onClick}
      />
      <Dialog modalType="modal" open={!isHidden} defaultOpen={false}>
        {/* <DialogTitle >
          {dialogContentProps.title}
        </DialogTitle> */}
        <DialogActions>
          <Button
            // styles={primaryButtonStyles}
            onClick={onDeleteChart}
            // text={strings.button.yes}
          >{strings.button.yes}</Button>
          <Button
            onClick={toggleHideDialog}>
            {strings.button.no}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

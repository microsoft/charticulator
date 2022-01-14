// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
} from "@fluentui/react";
import { strings } from "../../../../strings";
import { primaryButtonStyles } from "../../../../core";

interface BindDataWarningDialogProps {
  isHidden: boolean;
  onClick: () => void;
}

export const BindDataWarningDialog = ({
  isHidden,
  onClick,
}: BindDataWarningDialogProps) => {
  const dialogContentProps = {
    type: DialogType.normal,
    title: strings.dialog.warning,
    subText: strings.dialog.bindLinksTableMessage,
  };

  return (
    <Dialog
      hidden={isHidden}
      onDismiss={onClick}
      dialogContentProps={dialogContentProps}
    >
      <DialogFooter>
        <DefaultButton
          styles={primaryButtonStyles}
          onClick={onClick}
          text={"OK"}
        />
      </DialogFooter>
    </Dialog>
  );
};

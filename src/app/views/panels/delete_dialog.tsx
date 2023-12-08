// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { useCallback, useState } from "react";

import { Button, Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";

import * as R from "../../resources";
import { strings } from "../../../strings";
import { isInIFrame } from "../../utils";
import { Actions } from "../../actions";
import { SVGImageIcon } from "../../components";
import { MainContextInterface } from "../../context_component";
import { getDefaultColorGeneratorResetFunction } from "../../../core";

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
      <Popover open={!isHidden}>
        <PopoverTrigger>
          <Button
            icon={<SVGImageIcon url={R.getSVGIcon("toolbar/trash")} />}
            title={strings.menuBar.reset}
            onClick={onClick}
            appearance="transparent"
            className="charticulator__button-menu-fluent"
          >
          {strings.menuBar.reset}
          </Button>
        </PopoverTrigger>
        <PopoverSurface>
          {strings.fileOpen.deleteConfirmation('')}
          <br/>
          <Button
            onClick={onDeleteChart}
          >
            {strings.button.yes}
          </Button>
          <Button onClick={toggleHideDialog}>{strings.button.no}</Button>
        </PopoverSurface>
      </Popover>
    </>
  );
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { DefaultButton } from "@fluentui/react";
import { defaultNoneButtonStyles, NullButtonWrapper } from "./styles";
import { Color } from "../../../core";

interface NullButtonProps {
  allowNull?: boolean;
  onPick: (color: Color) => void;
}

export class NullButton extends React.Component<
  React.PropsWithChildren<NullButtonProps>,
  Record<string, unknown>
> {
  render() {
    return (
      <>
        {this.props.allowNull ? (
          <NullButtonWrapper>
            <DefaultButton
              text={"none"}
              iconProps={{
                iconName: "ChromeClose",
              }}
              styles={defaultNoneButtonStyles}
              onClick={() => {
                this.props.onPick(null);
              }}
            />
          </NullButtonWrapper>
        ) : null}
      </>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Color } from "../../../core";
import { Button } from "@fluentui/react-components";
import { SVGImageIcon } from "../icons";
import * as R from "../../resources";

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
          // <NullButtonWrapper>
          <Button
            title={"none"}
            // iconProps={{
            //   iconName: "ChromeClose",
            // }}
            icon={<SVGImageIcon url={R.getSVGIcon("ChromeClose")} />}
            // styles={defaultNoneButtonStyles}
            onClick={() => {
              this.props.onPick(null);
            }}
          >
            {"none"}
          </Button>
        ) : // </NullButtonWrapper>
        null}
      </>
    );
  }
}

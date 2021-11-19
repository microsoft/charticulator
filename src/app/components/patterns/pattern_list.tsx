// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { DefaultButton, Label } from "@fluentui/react";
import { defaultPaletteButtonsStyles } from "../colors/styles";
import { strings } from "../../../strings";

export interface PatternListProps {
  onClick?: (palette: string) => void;
}

export class PatternList extends React.PureComponent<
  PatternListProps,
  Record<string, unknown>
> {
  public render() {
    return (
      <>
        <Label>{strings.patterns.patterns}</Label>
        <DefaultButton
          onClick={() => this.props.onClick("Circles")}
          text={strings.patterns.circles}
          styles={defaultPaletteButtonsStyles}
        />
        <DefaultButton
          onClick={() => this.props.onClick("Rects")}
          text={strings.patterns.rects}
          styles={defaultPaletteButtonsStyles}
        />
        <DefaultButton
          onClick={() => this.props.onClick("Editor")}
          text={strings.patterns.custom}
          styles={defaultPaletteButtonsStyles}
        />
      </>
    );
  }
}

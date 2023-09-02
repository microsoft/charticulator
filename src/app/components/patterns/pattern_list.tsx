// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { DefaultButton, IconButton, Label } from "@fluentui/react";
import { defaultPaletteButtonsStyles } from "../colors/styles";
import { strings } from "../../../strings";
import { predefinedPatterns } from "../../resources/patterns";

export interface PatternListProps {
  onSelectPattern?: (palette: string) => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

export class PatternList extends React.PureComponent<
  PatternListProps,
  Record<string, unknown>
> {
  public render() {
    const patternSet: Set<string> = new Set();
    predefinedPatterns.forEach((pattern) => {
      patternSet.add(pattern.name);
    });

    return (
      <>
        {[...patternSet.values()].map((patternName) => {
          return (
            <>
              <DefaultButton
                onClick={() => this.props.onSelectPattern(patternName)}
                text={patternName}
                styles={defaultPaletteButtonsStyles}
              />
            </>
          );
        })}
        {/* <Label>{strings.patterns.patterns}</Label> */}
        {/* <DefaultButton
                    onClick={() => this.props.onClick("Primitives")}
                    text={strings.patterns.primitives}
                    styles={defaultPaletteButtonsStyles}
                /> */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          <DefaultButton
            onClick={() => this.props.onEdit()}
            text={strings.patterns.custom}
            styles={defaultPaletteButtonsStyles}
          />
          <IconButton
            onClick={() => this.props.onRemove()}
            styles={{
              ...defaultPaletteButtonsStyles,
              root: {
                ...(defaultPaletteButtonsStyles as any).root,
                minWidth: "unset",
                maxWidth: "unset",
                width: 24,
              },
              flexContainer: {
                minWidth: "unset",
                maxWidth: "unset",
                width: 24,
              },
            }}
            iconProps={{
              iconName: "ChromeClose",
            }}
          />
        </div>
      </>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  DefaultButton,
  ITextField,
  Label,
  PrimaryButton,
  TextField,
} from "@fluentui/react";
import { defaultPaletteButtonsStyles } from "../colors/styles";
import { PatternViewer, ViewerType } from "./pattern_viewer";

export interface PatternEditorProps {
  patternName: string;
}

// eslint-disable-next-line
export const PatternEditor: React.FC<PatternEditorProps> = ({
  patternName,
}) => {
  const [pattern, setPattern] = React.useState(`
    <pattern id="pattern1"
            x="0" y="0" width="20" height="20"
            patternUnits="userSpaceOnUse" >

        <circle cx="10" cy="10" r="10" style="stroke: none; fill: #0000ff" />

        </pattern>
    `);

  const [patternID, setPatternID] = React.useState(`pattern1`);

  const textEditor = React.useRef<ITextField>();
  const textIdEditor = React.useRef<ITextField>();

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Label>Patterns {patternName}</Label>
          <DefaultButton
            text={"circle1"}
            styles={defaultPaletteButtonsStyles}
          />
          <DefaultButton
            text={"circle2"}
            styles={defaultPaletteButtonsStyles}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
            }}
          >
            <PrimaryButton text={"Add"} styles={defaultPaletteButtonsStyles} />
            <PrimaryButton
              text={"Remove"}
              styles={defaultPaletteButtonsStyles}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 10,
          }}
        >
          <Label>Preview</Label>
          <PatternViewer
            width={400}
            height={200}
            pattern={pattern}
            type={ViewerType.Chart}
            patternName={patternID}
          />
          <TextField defaultValue={patternID} componentRef={textIdEditor} />
          <TextField
            defaultValue={pattern}
            multiline
            rows={10}
            componentRef={textEditor}
          />
          <PrimaryButton
            onClick={() => {
              setPattern(textEditor.current.value);
              setPatternID(textIdEditor.current.value);
            }}
            styles={defaultPaletteButtonsStyles}
          >
            Save
          </PrimaryButton>
        </div>
      </div>
    </>
  );
};

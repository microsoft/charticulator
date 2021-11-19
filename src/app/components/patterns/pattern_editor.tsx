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

  const textEditor = React.useRef<ITextField>();

  const previewStyle = {
    stroke: "#000000",
    fill: "url(#pattern1)",
  };

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
          <svg width={400} height={200}>
            <defs
              dangerouslySetInnerHTML={{
                __html: pattern,
              }}
            ></defs>
            <rect style={previewStyle} x={0} width={20} height={30} />
            <rect style={previewStyle} x={25} width={20} height={70} />
            <rect style={previewStyle} x={50} width={20} height={170} />
            <rect style={previewStyle} x={75} width={20} height={70} />
            <rect style={previewStyle} x={100} width={20} height={10} />
            <rect style={previewStyle} x={125} width={20} height={90} />
            <rect style={previewStyle} x={150} width={20} height={50} />
            <rect style={previewStyle} x={175} width={20} height={140} />
            <rect style={previewStyle} x={200} width={20} height={120} />
            <rect style={previewStyle} x={225} width={20} height={5} />
            <rect style={previewStyle} x={250} width={20} height={70} />
            <rect style={previewStyle} x={275} width={20} height={15} />
            <rect style={previewStyle} x={300} width={20} height={75} />
            <rect style={previewStyle} x={325} width={20} height={50} />
            <rect style={previewStyle} x={350} width={20} height={150} />
            <rect style={previewStyle} x={375} width={20} height={100} />
          </svg>
          <TextField
            defaultValue={pattern}
            multiline
            rows={10}
            componentRef={textEditor}
          />
          <PrimaryButton
            onClick={() => {
              setPattern(textEditor.current.value);
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

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
import { strings } from "../../../strings";
import { userDefinedPatterns } from "../../resources/patterns";

export interface PatternEditorProps {
  patternName: string;
  pattern?: string;
}

// eslint-disable-next-line
export const PatternEditor: React.FC<PatternEditorProps> = ({
  patternName,
  pattern,
}) => {
  const [currentPattern, setPattern] = React.useState(pattern);

  const [patternID, setPatternID] = React.useState(`pattern1`);

  const textEditor = React.useRef<ITextField>();
  const textIdEditor = React.useRef<ITextField>();
  const textSetIdEditor = React.useRef<ITextField>();

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
          <Label>
            {strings.patterns.patterns} {patternName}
          </Label>
          {userDefinedPatterns.map((userPattern) => {
            return (
              <DefaultButton
                text={userPattern.mainID}
                styles={defaultPaletteButtonsStyles}
                onClick={() => {
                  setPatternID(userPattern.mainID);
                  setPattern(userPattern.pattern);
                }}
              />
            );
          })}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
            }}
          >
            <PrimaryButton
              text={"Add"}
              styles={{
                ...defaultPaletteButtonsStyles,
                root: {
                  ...(defaultPaletteButtonsStyles.root as any),
                  margin: 5,
                },
              }}
              onClick={() => {
                userDefinedPatterns.push({
                  mainID: "pattern" + userDefinedPatterns.length,
                  name: patternName,
                  pattern: `<pattern id="${
                    "pattern" + userDefinedPatterns.length
                  }" width="20" height="20" patternUnits="userSpaceOnUse" >
                  
                  </pattern>`,
                });
              }}
            />
            <PrimaryButton
              text={"Remove"}
              styles={{
                ...defaultPaletteButtonsStyles,
                root: {
                  ...(defaultPaletteButtonsStyles.root as any),
                  margin: 5,
                  marginRight: 0,
                },
              }}
              onClick={() => {
                console.log("remove " + patternID + " " + patternName);
              }}
            />
          </div>
          {/* <PrimaryButton
            text={"Remove pattern set"}
            styles={{
              ...defaultPaletteButtonsStyles,
              root: {
                ...(defaultPaletteButtonsStyles.root as any),
                marginLeft: 5
              }
            }}
            onClick={() => {
              console.log('remove ' + patternName)
            }}
          /> */}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 10,
          }}
        >
          <Label>{strings.patterns.patternsSetName}</Label>
          <TextField
            defaultValue={patternName}
            componentRef={textSetIdEditor}
            value={patternName}
          />
          <Label>{strings.patterns.preview}</Label>
          <PatternViewer
            width={400}
            height={200}
            pattern={currentPattern}
            type={ViewerType.Chart}
            patternName={patternID}
          />
          <Label>{strings.patterns.patternID}</Label>
          <TextField
            defaultValue={patternID}
            componentRef={textIdEditor}
            value={patternID}
          />
          <Label>{strings.patterns.source}</Label>
          <TextField
            defaultValue={currentPattern}
            value={currentPattern}
            multiline
            rows={10}
            componentRef={textEditor}
            onChange={(e, newValue) => {
              setPattern(newValue);
            }}
          />
          <PrimaryButton
            onClick={() => {
              setPattern(textEditor.current.value);
              setPatternID(textIdEditor.current.value);
            }}
          >
            {strings.patterns.save}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
};

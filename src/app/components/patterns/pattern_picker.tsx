// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { predefinedPatterns } from "../../resources/patterns";
import { PatternViewer, ViewerType } from "./pattern_viewer";

export interface PatternPickerProps {
  patternName: string;
  onPick?: (patternName: string, pattern: string) => void;
}

// eslint-disable-next-line
export const PatternPicker: React.FC<PatternPickerProps> = ({
  patternName,
}) => {
  const patterns = predefinedPatterns.filter(
    (pattern) => pattern.name === patternName
  );
  return (
    <>
      {patternName} has {patterns.length} patterns
      {patterns.map((pattern) => {
        return (
          <PatternViewer
            type={ViewerType.Rect}
            patternName={pattern.mainID}
            pattern={pattern.pattern}
            onClick={(patternName: string, pattern: string) => {
              console.log(patternName, pattern);
            }}
          />
        );
      })}
    </>
  );
};

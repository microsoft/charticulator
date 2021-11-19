// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
export interface PatternPalette {
  name: string;
  mainID: string;
  pattern: string;
}

export let predefinedPatterns: PatternPalette[] = [];

export const userDefinedPatterns: PatternPalette[] = [
  {
    mainID: "Circle1",
    name: "User circle",
    pattern: "<pattern><pattern/>",
  },
  {
    mainID: "Circle2",
    name: "User circle 3",
    pattern: "<pattern><pattern/>",
  },
];

export function addPatternPalette(
  patternsSetName: string,
  patternID: string,
  pattern: string
) {
  predefinedPatterns.push({
    name: patternsSetName,
    mainID: patternID,
    pattern,
  });
}

export function removePatternPalette(patternsName: string, patternID: string) {
  predefinedPatterns = predefinedPatterns.filter(
    (p) => p.mainID != patternID && p.name != patternsName
  );
}

addPatternPalette(
  "Figures",
  "star",
  `<pattern id="star" viewBox="0,0,10,10" width="10%" height="10%">
      <polygon points="0,0 2,5 0,10 5,8 10,10 8,5 10,0 5,2"/>
    </pattern>`
);

addPatternPalette(
  "Figures",
  "cubes",
  `<pattern id="cubes" x="0" y="126" patternUnits="userSpaceOnUse" width="40" height="40"> 
        <g id="cube">
        <rect width="20" height="20" />
        <rect width="20" height="20" />
        </g>
        <use x="0" y="0" xlink:href="#cube"></use>
        <use x="20" y="20" xlink:href="#cube"></use>
      </pattern>
    `
);

addPatternPalette(
  "Figures",
  "circle1",
  `<pattern id="circle1"
        x="0" y="0" width="20" height="20"
        patternUnits="userSpaceOnUse" >
    <circle cx="10" cy="10" r="10"/>
    </pattern>`
);

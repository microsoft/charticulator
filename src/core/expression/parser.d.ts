// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
// Declaration of the generated parser code

import { Expression, TextExpression } from "./classes";
export declare class Location {
  public offset: number;
  public line: number;
  public column: number;
}
export declare class SyntaxError {
  public message: string;
  public expected: [
    {
      type: string;
      description: string;
      parts: string[];
      inverted: boolean;
      ignoreCase: boolean;
    }
  ];
  public found: string;
  public location: {
    start: Location;
    end: Location;
  };
  public name: string;
}

export declare function parse(
  input: string,
  options?: { startRule: "start" | "start_text" }
): Expression | TextExpression;

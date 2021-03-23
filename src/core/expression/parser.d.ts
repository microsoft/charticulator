// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Expression, TextExpression } from "./classes";

declare module "*.pegjs" {
  export class Location {
    public offset: number;
    public line: number;
    public column: number;
  }
  export class SyntaxError {
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

  export function parse(
    input: string,
    options?: { startRule: "start" | "start_text" }
  ): Expression | TextExpression;
}

// Declaration of the generated parser code

import { Expression } from "./classes";
export declare class Location {
    offset: number;
    line: number;
    column: number;
}
export declare class SyntaxError {
    message: string;
    expected: [{ type: string, description: string, parts: string[], inverted: boolean, ignoreCase: boolean }];
    found: string;
    location: {
        start: Location,
        end: Location
    };
    name: string;
}

export declare function parse(input: string, options?: { [name: string]: string }): Expression;
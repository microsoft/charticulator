// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { ColorPicker } from "../../app/components";

export class ColorPickerTestView extends React.Component<{}, {}> {
  public render() {
    return (
      <div>
        <div
          style={{
            background: "#eee",
            border: "10px solid #aaa",
            display: "inline-block"
          }}
        >
          <ColorPicker
            defaultValue={{ r: 117, g: 232, b: 75 }}
            allowNull={true}
            onPick={value => {
              console.log(value);
            }}
          />
        </div>
      </div>
    );
  }
}

export function register(f: any) {
  f("ColorPicker", ColorPickerTestView);
}

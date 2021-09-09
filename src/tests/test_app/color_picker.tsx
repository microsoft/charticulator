// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { GradientPicker } from "../../app/components";

export class GradientPickerTestView extends React.Component<{}, {}> {
  public render() {
    return (
      <div>
        <div
          style={{
            background: "#eee",
            border: "10px solid #aaa",
            width: "300px",
            display: "inline-block",
          }}
        >
          <GradientPicker />
        </div>
      </div>
    );
  }
}

export function register(f: any) {
  f("GradientPicker", GradientPickerTestView);
}

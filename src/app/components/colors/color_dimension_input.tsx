// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { prettyNumber } from "../../../core";
import { InputField } from "../color_space_picker";

function clipToRange(num: number, range: [number, number]) {
  if (range[0] < range[1]) {
    return Math.max(range[0], Math.min(range[1], num));
  } else {
    return Math.max(range[1], Math.min(range[0], num));
  }
}

interface ColorDimensionInputProps {
  title: string;
  defaultValue: number;
  range: [number, number];
  updateState: (state: number) => void;
}

export class ColorDimensionInput extends React.Component<
  ColorDimensionInputProps,
  Record<string, unknown>
> {
  render() {
    return (
      <>
        <label>{this.props.title}</label>
        <InputField
          defaultValue={prettyNumber(this.props.defaultValue, 1)}
          onEnter={(v) => {
            let num = parseFloat(v);
            if (num == num && num != null) {
              num = clipToRange(num, this.props.range);
              this.props.updateState(num);
              // , () => this.raiseChange());
              return true;
            }
          }}
        />
      </>
    );
  }
}

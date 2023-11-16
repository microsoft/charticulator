// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { SVGImageIcon } from "../../../app/components";
import * as R from "../../../app/resources";
import { ToggleButton } from "@fluentui/react-components";

export interface PanelRadioControlProps {
  options: string[];
  icons?: string[];
  labels?: string[];
  showText?: boolean;
  asList?: boolean;
  value?: string;
  onChange?: (newValue: string) => void;
}

export class PanelRadioControl extends React.Component<
  React.PropsWithChildren<PanelRadioControlProps>,
  Record<string, unknown>
> {
  public render() {
    return (
      <span>
        {this.props.options.map((option, index) => {
          return (
            <ToggleButton
              checked={this.props.value == option}
              title={this.props.labels[index]}
              key={option}
              onClick={() => {
                if (this.props) {
                  this.props.onChange(option);
                }
              }}
              // iconProps={
              //   this.props.icons
              //     ? {
              //         iconName: this.props.icons[index],
              //       }
              //     : null
              // }
              icon={
                <SVGImageIcon url={R.getSVGIcon(this.props.icons[index])} />
              }
              // text={
              //   this.props.labels && this.props.showText
              //     ? this.props.labels[index]
              //     : null
              // }
              // styles={{
              //   root: {
              //     marginRight: 5,
              //     marginLeft: 5,
              //     ...defultComponentsHeight,
              //   },
              // }}
              // onRenderIcon={() => {
              //   return this.props.icons ? (
              //     <span style={{ marginRight: "0.3rem" }}>
              //       <SVGImageIcon url={R.getSVGIcon(this.props.icons[index])} />
              //     </span>
              //   ) : null;
              // }}
            >
              {this.props.labels && this.props.showText
                ? this.props.labels[index]
                : null}
            </ToggleButton>
          );
        })}
      </span>
    );
  }
}

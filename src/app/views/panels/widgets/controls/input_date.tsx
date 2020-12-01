// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { InputText } from "./input_text";
import { applyDateFormat } from "../../../../../core";
import { parseDate } from "../../../../../core/dataset/datetime";

export interface InputDateProps {
  defaultValue?: number | Date;
  placeholder?: string;
  onEnter?: (value: number) => boolean;
  showCalendar?: boolean;
  calendarRange?: [number, number];
  interval?: "second" | "minute" | "hour" | "day" | "month" | "year";
  dateDisplayFormat?: string;
}

export class InputDate extends React.Component<InputDateProps, {}> {
  private textInput: InputText;

  private formatDate(value: number | Date, interval: string) {
    if (value == null) {
      return "";
    }
    if (typeof value === "number") {
      return applyDateFormat(
        new Date(value),
        this.props.dateDisplayFormat || "%Y-%m-%dT%H:%M:%S"
      );
    }
    if (typeof Date === "object" && value instanceof Date) {
      return applyDateFormat(
        value,
        this.props.dateDisplayFormat || "%Y-%m-%dT%H:%M:%S"
      );
    }
  }

  public render() {
    return (
      <span className="charticulator__widget-control-input-number">
        <div className="charticulator__widget-control-input-number-input">
          {this.props.showCalendar ? (
            "datapicker" // TODO add component
          ) : (
            <InputText
              ref={(e) => (this.textInput = e)}
              placeholder={this.props.placeholder}
              defaultValue={this.formatDate(
                this.props.defaultValue,
                this.props.interval
              )}
              onEnter={(str) => {
                const date = parseDate(str);
                this.props.onEnter(date);
                return date != null;
              }}
            />
          )}
        </div>
      </span>
    );
  }
}

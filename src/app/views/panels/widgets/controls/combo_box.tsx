import * as React from "react";

export interface ComboBoxProps {
  defaultValue: string;
  options?: string[];
  renderOptionItem?: (option: string) => JSX.Element;
  optionsOnly?: boolean;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}
export interface ComboBoxState {}
export class ComboBox extends React.Component<ComboBoxProps, ComboBoxState> {
  public render() {
    return "HELLO";
  }
}

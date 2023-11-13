// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { Input } from "@fluentui/react-components";

export interface EditableTextViewProps {
  text: string;
  autofocus?: boolean;
  onEdit?: (newText: string) => void;
}

export interface EditableTextViewState {
  editing: boolean;
  currentText: string;
}

export class EditableTextView extends React.Component<
  React.PropsWithChildren<EditableTextViewProps>,
  EditableTextViewState
> {
  public refs: {
    input: HTMLInputElement;
  };

  public constructor(props: EditableTextViewProps) {
    super(props);
    this.state = {
      editing: this.props.autofocus || false,
      currentText: this.props.text,
    };
    this.confirmEdit = this.confirmEdit.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.startEdit = this.startEdit.bind(this);
  }

  public confirmEdit() {
    const text = this.state.currentText;
    this.setState({
      editing: false,
    });
    if (this.props.onEdit) {
      this.props.onEdit(text);
    }
  }

  public cancelEdit() {
    this.setState({
      editing: false,
    });
  }

  public startEdit() {
    this.setState({
      editing: true,
      currentText: this.props.text,
    });
  }

  public render() {
    return (
      <div>
        {/* <FluentTextField> */}
        <>
          {/* <Label>{}</Label> */}
          <Input
            value={this.state.currentText}
            // onRenderLabel={labelRender}
            type="text"
            onChange={(event, { value }) => {
              this.setState({ currentText: value });
            }}
            onBlur={() => {
              if (this.state.currentText == this.props.text) {
                this.cancelEdit();
              } else {
                this.setState({
                  currentText: this.props.text,
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                this.confirmEdit();
              }
              if (e.key == "Escape") {
                this.cancelEdit();
              }
            }}
            autoFocus={false}
            // styles={{
            //   fieldGroup: {
            //     border: !this.state.editing && "none",
            //   },
            // }}
          />
        </>
        {/* </FluentTextField> */}
      </div>
    );
  }
}

import * as React from "react";
import { ButtonFlat } from "./buttons";
import * as R from "../resources";

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
  EditableTextViewProps,
  EditableTextViewState
> {
  public refs: {
    input: HTMLInputElement;
  };

  public constructor(props: EditableTextViewProps) {
    super(props);
    this.state = {
      editing: this.props.autofocus || false,
      currentText: this.props.text
    };
    this.confirmEdit = this.confirmEdit.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.startEdit = this.startEdit.bind(this);
  }

  public confirmEdit() {
    const text = this.state.currentText;
    this.setState({
      editing: false
    });
    if (this.props.onEdit) {
      this.props.onEdit(text);
    }
  }

  public cancelEdit() {
    this.setState({
      editing: false
    });
  }

  public startEdit() {
    this.setState({
      editing: true,
      currentText: this.props.text
    });
  }

  public componentDidMount() {
    if (this.props.autofocus) {
      this.refs.input.select();
    }
  }

  public componentDidUpdate(
    prevProps: EditableTextViewProps,
    prevState: EditableTextViewState
  ) {
    if (prevState.editing == false && this.state.editing == true) {
      this.refs.input.select();
    }
  }

  public render() {
    if (this.state.editing) {
      return (
        <div className="editable-text-view editable-text-view-editing">
          <input
            type="text"
            ref="input"
            value={this.state.currentText}
            onChange={e =>
              this.setState({ currentText: this.refs.input.value })
            }
            onKeyDown={e => {
              if (e.key == "Enter") {
                this.confirmEdit();
              }
              if (e.key == "Escape") {
                this.cancelEdit();
              }
            }}
            autoFocus={true}
            onBlur={() => {
              if (this.state.currentText == this.props.text) {
                this.cancelEdit();
              }
            }}
          />
          <ButtonFlat
            url={R.getSVGIcon("general/confirm")}
            onClick={this.confirmEdit}
            stopPropagation={true}
          />
        </div>
      );
    } else {
      return (
        <div className="editable-text-view" onClick={this.startEdit}>
          <span className="text">{this.props.text}</span>
        </div>
      );
    }
  }
}

/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import { Button } from "./button";

export interface InputFileProps {
  fileName?: string;
  accept: string[];
  outputType: "data-url" | "text" | "array-buffer";
  onOpenFile: (fileName: string, data: any) => void;
}

export class InputFile extends React.Component<InputFileProps, {}> {
  public inputElement: HTMLInputElement;

  constructor(props: InputFileProps) {
    super(props);
    this.doOpenFile = this.doOpenFile.bind(this);
  }

  private doOpenFile() {
    this.inputElement.value = null;
    this.inputElement.click();
  }

  private onFileSelected() {
    if (this.inputElement.files.length == 1) {
      const file = this.inputElement.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        this.props.onOpenFile(file.name, reader.result);
      };
      switch (this.props.outputType) {
        case "data-url":
          {
            reader.readAsDataURL(file);
          }
          break;
        case "text":
          {
            reader.readAsText(file);
          }
          break;
        case "array-buffer":
          {
            reader.readAsArrayBuffer(file);
          }
          break;
      }
    }
  }

  public render() {
    return (
      <span className="charticulator__widget-control-input-file">
        {this.props.fileName ? <span className="el-filename" /> : null}
        <Button
          icon={"general/open"}
          active={false}
          onClick={this.doOpenFile}
        />
        <input
          style={{ display: "none" }}
          ref={e => (this.inputElement = e)}
          type="file"
          accept={this.props.accept.join(",")}
          onChange={this.onFileSelected}
        />
      </span>
    );
  }
}

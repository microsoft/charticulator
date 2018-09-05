/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as R from "../../../../resources";
import * as globals from "../../../../globals";

import { ContextedComponent } from "../../../../context_component";
import { PopupView } from "../../../../controllers/popup_controller";

import { classNames } from "../../../../utils";
import { Button } from "./button";

export interface InputImageProps {
  value?: string;
  onChange?: (value: string) => boolean;
}

export class InputImage extends ContextedComponent<
  InputImageProps,
  { dragOver: boolean }
> {
  public state = { dragOver: false };

  public element: HTMLSpanElement;

  public resolveImage(value: string) {
    return value;
  }

  public emitOnChange(images: ImageUploaderItem[]) {
    if (images.length == 1) {
      this.props.onChange(images[0].dataURL);
    }
  }

  public startChooseImage = () => {
    globals.popupController.popupAt(
      context => {
        return (
          <PopupView context={context}>
            <ImageChooser
              value={this.props.value}
              onChoose={(image: string) => {
                context.close();
                if (this.props.onChange) {
                  this.props.onChange(image);
                }
              }}
            />
          </PopupView>
        );
      },
      { anchor: this.element }
    );
  };

  protected handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    this.setState({ dragOver: true });
  };
  protected handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    this.setState({ dragOver: false });
  };

  protected handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  protected handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    this.setState({ dragOver: false });
    if (e.dataTransfer.types.indexOf("text/uri-list") >= 0) {
      const uriList = e.dataTransfer.getData("text/uri-list") as string;
      const uris = uriList
        .replace(/\r/g, "")
        .split("\n")
        .map(x => x.trim())
        .filter(x => !x.startsWith("#"));
      ImageUploader.ParseURIs(uris)
        .then(r => {
          this.emitOnChange(r);
        })
        .catch(e => {});
    }
    if (e.dataTransfer.files.length > 0) {
      ImageUploader.ParseFiles(e.dataTransfer.files).then(r => {
        this.emitOnChange(r);
      });
    }
  };

  public render() {
    const isNone = this.props.value == "" || this.props.value == null;
    const imageURL = isNone ? null : this.resolveImage(this.props.value);
    let imageDisplayURL = imageURL;
    if (imageURL) {
      if (imageURL.startsWith("data:")) {
        imageDisplayURL = "(data url)";
      }
    }
    return (
      <span
        className={classNames(
          "charticulator__widget-control-input-image",
          ["is-none", isNone],
          ["is-drag-over", this.state.dragOver]
        )}
        ref={e => (this.element = e)}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
        onClick={this.startChooseImage}
      >
        {this.state.dragOver ? (
          <span className="el-drag-over">Drop Image Here</span>
        ) : (
          [
            <img
              key="image"
              className="el-image"
              src={isNone ? R.getSVGIcon("mark/image") : imageURL}
            />,
            <span key="text" className="el-text-wrapper">
              <span className="el-text">
                {isNone ? "(none)" : imageDisplayURL}
              </span>
            </span>
          ]
        )}
      </span>
    );
  }
}

export interface ImageChooserProps {
  value?: string;
  onChoose?: (value: string) => void;
}

export class ImageChooser extends ContextedComponent<ImageChooserProps, {}> {
  public render() {
    return (
      <div className="charticulator__image-chooser">
        <ImageUploader
          focusOnMount={true}
          onUpload={images => {
            if (images.length == 1) {
              this.props.onChoose(images[0].dataURL);
            }
          }}
        />
      </div>
    );
  }
}

export interface ImageUploaderProps {
  focusOnMount: boolean;
  onUpload?: (images: ImageUploaderItem[]) => void;
}

export interface ImageUploaderState {
  dragOver: boolean;
}

export interface ImageUploaderItem {
  name: string;
  dataURL: string;
}

export class ImageUploader extends React.Component<
  ImageUploaderProps,
  ImageUploaderState
> {
  public state: ImageUploaderState = { dragOver: false };
  protected refContainer: HTMLDivElement;
  protected refInput: HTMLInputElement;

  public componentDidMount() {
    if (this.props.focusOnMount) {
      this.refInput.focus();
    }
  }
  public componentWillUnmount() {}

  public static ParseFiles(files: FileList): Promise<ImageUploaderItem[]> {
    const result: Array<Promise<ImageUploaderItem>> = [];
    const readFile = (file: File) => {
      result.push(
        new Promise<ImageUploaderItem>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              dataURL: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        })
      );
    };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      readFile(file);
    }
    return Promise.all(result);
  }

  public static ParseURIs(uris: string[]): Promise<ImageUploaderItem[]> {
    return Promise.all(
      uris.map(uri =>
        fetch(uri)
          .then(result => result.blob())
          .then(blob => {
            return new Promise<ImageUploaderItem>((resolve, reject) => {
              if (!blob.type.startsWith("image/")) {
                reject(new Error("not an image"));
              } else {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    name: uri,
                    dataURL: reader.result as string
                  });
                };
                reader.readAsDataURL(blob);
              }
            });
          })
      )
    );
  }

  protected handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    this.setState({ dragOver: true });
  };
  protected handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    this.setState({ dragOver: false });
  };

  protected handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  protected handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    this.setState({ dragOver: false });
    if (e.dataTransfer.types.indexOf("text/uri-list") >= 0) {
      const uriList = e.dataTransfer.getData("text/uri-list") as string;
      const uris = uriList
        .replace(/\r/g, "")
        .split("\n")
        .map(x => x.trim())
        .filter(x => !x.startsWith("#"));
      ImageUploader.ParseURIs(uris)
        .then(r => {
          this.emitOnUpload(r);
        })
        .catch(e => {
          this.showError(e);
        });
    }
    if (e.dataTransfer.files.length > 0) {
      ImageUploader.ParseFiles(e.dataTransfer.files).then(r => {
        this.emitOnUpload(r);
      });
    }
  };

  protected handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      const result = ImageUploader.ParseFiles(e.clipboardData.files)
        .then(r => {
          this.emitOnUpload(r);
        })
        .catch(e => {
          this.showError(e);
        });
    }
  };

  protected handleOpenFile = () => {
    const inputFile = document.createElement("input");
    inputFile.setAttribute("type", "file");
    inputFile.onchange = () => {
      if (inputFile.files.length > 0) {
        ImageUploader.ParseFiles(inputFile.files).then(r => {
          this.emitOnUpload(r);
        });
      }
    };
    inputFile.click();
  };

  protected showError(error: any) {
    // FIXME: ignore error for now
  }

  protected emitOnUpload(result: ImageUploaderItem[]) {
    if (this.props.onUpload) {
      this.props.onUpload(result);
    }
  }

  public render() {
    return (
      <div
        className="charticulator__image-uploader"
        ref={e => (this.refContainer = e)}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
      >
        {this.state.dragOver ? (
          <span className="el-dropzone">Drop Image Here</span>
        ) : (
          <span className="el-input-wrapper">
            <input
              ref={e => (this.refInput = e)}
              className="el-input"
              onPaste={this.handlePaste}
              value=""
              onChange={() => {}}
              type="text"
              placeholder="Drop/Paste Image"
            />
            <Button icon={"toolbar/open"} onClick={this.handleOpenFile} />
          </span>
        )}
      </div>
    );
  }
}

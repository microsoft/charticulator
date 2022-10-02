// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../../../../resources";
import * as globals from "../../../../globals";

import { ContextedComponent } from "../../../../context_component";
import { PopupView } from "../../../../controllers/popup_controller";
import { classNames } from "../../../../utils";
import { strings } from "../../../../../strings";
import {
  ActionButton,
  Label,
  Image as FluentUIImage,
  DefaultButton,
  TextField,
} from "@fluentui/react";
import {
  defaultLabelStyle,
  defaultBindButtonSize,
  FluentActionButton,
  FluentButton,
} from "./fluentui_customized_components";
import {
  ImageMappingDragStateWrapper,
  ImageMappingTextFieldStyles,
} from "./styles";

export interface ImageDescription {
  src: string;
  width: number;
  height: number;
  name?: string;
}

export interface InputImageProps {
  value?: ImageDescription;
  onChange?: (value: ImageDescription) => boolean;
  label?: string;
}

export class InputImage extends ContextedComponent<
  InputImageProps,
  { dragOver: boolean }
> {
  public state = { dragOver: false };

  public element: HTMLSpanElement;

  public resolveImage(value: ImageDescription) {
    return value;
  }

  public emitOnChange(images: ImageUploaderItem[]) {
    if (images.length == 1) {
      this.props.onChange({
        src: images[0].dataURL,
        width: images[0].width,
        height: images[0].height,
      });
    }
  }

  public startChooseImage = () => {
    globals.popupController.popupAt(
      (context) => {
        return (
          <PopupView context={context}>
            <ImageChooser
              value={this.props.value}
              onChoose={(image: ImageDescription) => {
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

  protected handleDragEnter = () => {
    this.setState({ dragOver: true });
  };
  protected handleDragLeave = () => {
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
        .map((x) => x.trim())
        .filter((x) => !x.startsWith("#"));
      ImageUploader.ParseURIs(uris)
        .then((r) => {
          this.emitOnChange(r);
        })
        .catch((e) => {
          console.log(e);
        });
    }
    if (e.dataTransfer.files.length > 0) {
      ImageUploader.ParseFiles(e.dataTransfer.files).then((r) => {
        this.emitOnChange(r);
      });
    }
  };
  public render() {
    const isNone = this.props.value == null;
    const image = isNone ? null : this.resolveImage(this.props.value);
    let imageDisplayURL = image ? image.src : null;
    if (imageDisplayURL) {
      if (imageDisplayURL.startsWith("data:")) {
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
        ref={(e) => (this.element = e)}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
        onClick={this.startChooseImage}
        // style={{ marginBottom: "5px" }}
      >
        {this.state.dragOver ? (
          <div style={{ width: "100%" }}>
            {this.props.label ? (
              <Label styles={defaultLabelStyle} style={{ padding: 0 }}>
                {this.props.label}
              </Label>
            ) : null}
            <span className="el-drag-over-attributes">
              {strings.objects.image.dropImage}
            </span>
          </div>
        ) : (
          <div style={{ width: "100%" }}>
            {this.props.label ? (
              <Label styles={defaultLabelStyle} style={{ padding: 0 }}>
                {this.props.label}
              </Label>
            ) : null}
            <FluentActionButton
              style={{ width: "100%", height: defaultBindButtonSize.height }}
            >
              <ActionButton
                styles={{
                  root: {
                    height: defaultBindButtonSize.height,
                  },
                }}
                text={isNone ? strings.core.none : imageDisplayURL}
                iconProps={{
                  imageProps: {
                    src: isNone ? R.getSVGIcon("FileImage") : image.src,
                    style: {
                      height: "16px",
                      width: "16px",
                    },
                  },
                }}
              />
            </FluentActionButton>
          </div>
        )}
      </span>
    );
  }
}

export interface ImageChooserProps {
  value?: ImageDescription;
  onChoose?: (value: ImageDescription) => void;
}

export class ImageChooser extends ContextedComponent<
  ImageChooserProps,
  Record<string, unknown>
> {
  public render() {
    return (
      <div className="charticulator__image-chooser">
        <ImageUploader
          focusOnMount={true}
          onUpload={(images) => {
            if (images.length == 1) {
              this.props.onChoose({
                src: images[0].dataURL,
                width: images[0].width,
                height: images[0].height,
              });
            }
          }}
        />
      </div>
    );
  }
}

export interface ImageUploaderProps {
  placeholder?: string;
  focusOnMount: boolean;
  onUpload?: (images: ImageUploaderItem[]) => void;
  onClear?: () => void;
}

export interface ImageUploaderState {
  dragOver: boolean;
}

export interface ImageUploaderItem {
  name: string;
  width: number;
  height: number;
  dataURL: string;
}

export class ImageUploader extends React.Component<
  ImageUploaderProps,
  ImageUploaderState
> {
  public state: ImageUploaderState = { dragOver: false };
  protected refContainer: HTMLDivElement;

  public static ReadFileAsImage(
    name: string,
    file: File | Blob
  ): Promise<ImageUploaderItem> {
    return new Promise<ImageUploaderItem>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          resolve({
            name,
            width: img.width,
            height: img.height,
            dataURL: reader.result as string,
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  public static ParseFiles(files: FileList): Promise<ImageUploaderItem[]> {
    const result: Promise<ImageUploaderItem>[] = [];
    const readFile = (file: File) => {
      result.push(this.ReadFileAsImage(file.name, file));
    };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      readFile(file);
    }
    return Promise.all(result);
  }

  public static ParseURIs(uris: string[]): Promise<ImageUploaderItem[]> {
    return Promise.all(
      uris.map((uri) =>
        fetch(uri)
          .then((result) => result.blob())
          .then((blob) => {
            return new Promise<ImageUploaderItem>((resolve, reject) => {
              if (!blob.type.startsWith("image/")) {
                reject(new Error("not an image"));
              } else {
                // TODO check changes
                resolve(this.ReadFileAsImage("blob", blob));
              }
            });
          })
      )
    );
  }

  protected handleDragEnter = () => {
    this.setState({ dragOver: true });
  };
  protected handleDragLeave = () => {
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
        .map((x) => x.trim())
        .filter((x) => !x.startsWith("#"));
      ImageUploader.ParseURIs(uris)
        .then((r) => {
          this.emitOnUpload(r);
        })
        .catch((e) => {
          this.showError(e);
        });
    }
    if (e.dataTransfer.files.length > 0) {
      ImageUploader.ParseFiles(e.dataTransfer.files).then((r) => {
        this.emitOnUpload(r);
      });
    }
  };

  protected handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      ImageUploader.ParseFiles(e.clipboardData.files)
        .then((r) => {
          this.emitOnUpload(r);
        })
        .catch((e) => {
          this.showError(e);
        });
    }
  };

  protected handleOpenFile = () => {
    const inputFile = document.createElement("input");
    inputFile.setAttribute("type", "file");
    inputFile.onchange = () => {
      if (inputFile.files.length > 0) {
        ImageUploader.ParseFiles(inputFile.files).then((r) => {
          this.emitOnUpload(r);
        });
      }
    };
    inputFile.click();
  };

  protected handleClearFile = () => {
    if (this.props.onClear) {
      this.props.onClear();
    }
  };

  // eslint-disable-next-line
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
        ref={(e) => (this.refContainer = e)}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
      >
        {this.state.dragOver ? (
          <ImageMappingDragStateWrapper>
            {strings.objects.image.dropImage}
          </ImageMappingDragStateWrapper>
        ) : (
          <span className="el-input-wrapper">
            <TextField
              value={
                this.props.placeholder ||
                strings.objects.image.defaultPlaceholder
              }
              disabled
              styles={ImageMappingTextFieldStyles}
              onPaste={this.handlePaste}
            />
            <FluentButton marginTop="0px">
              <DefaultButton
                styles={{
                  root: {
                    minWidth: "unset",
                    ...defaultBindButtonSize,
                    marginLeft: 5,
                  },
                }}
                iconProps={{
                  iconName: "OpenFolderHorizontal",
                }}
                onClick={this.handleOpenFile}
              />
            </FluentButton>
          </span>
        )}
      </div>
    );
  }
}

export class InputImageProperty extends InputImage {
  public render() {
    const isNone = this.props.value == null;
    const image = isNone ? null : this.resolveImage(this.props.value);
    let imageDisplayURL = image ? image.name : null;
    if (imageDisplayURL) {
      if (imageDisplayURL.startsWith("data:")) {
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
        ref={(e) => (this.element = e)}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
      >
        {this.state.dragOver ? (
          <span className="el-drag-over">
            {strings.objects.image.dropImage}
          </span>
        ) : (
          [
            <FluentUIImage
              key="image"
              src={isNone ? R.getSVGIcon("FileImage") : image.src}
              width={30}
              height={30}
            />,
            <ImageUploader
              key={0}
              placeholder={isNone ? strings.core.none : imageDisplayURL}
              focusOnMount={true}
              onUpload={(images) => {
                if (images.length == 1) {
                  if (this.props.onChange) {
                    this.props.onChange({
                      src: images[0].dataURL,
                      width: images[0].width,
                      height: images[0].height,
                      name: images[0].name,
                    });
                  }
                }
              }}
            />,
          ]
        )}
      </span>
    );
  }
}

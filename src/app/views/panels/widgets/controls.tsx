import * as React from "react";
import * as R from "../../../resources";
import * as Hammer from "hammerjs";
import * as globals from "../../../globals";

import { classNames } from "../../../utils";
import {
  prettyNumber,
  Color,
  colorToHTMLColor,
  colorToHTMLColorHEX,
  colorFromHTMLColor,
  ColorGradient,
  Expression
} from "../../../../core";
import {
  SVGImageIcon,
  DropdownButton,
  DropdownListView,
  ColorPicker,
  GradientView,
  GradientPicker,
  ButtonFlatPanel
} from "../../../components";
import { PopupView } from "../../../controllers/popup_controller";
import { ContextedComponent } from "../../../context_component";

export interface InputTextProps {
  defaultValue?: string;
  placeholder?: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}

export class InputText extends React.Component<InputTextProps, {}> {
  public inputElement: HTMLInputElement;

  public componentWillUpdate(newProps: InputTextProps) {
    this.inputElement.value =
      newProps.defaultValue != null ? newProps.defaultValue : "";
  }

  public doEnter() {
    if (
      (this.props.defaultValue != null ? this.props.defaultValue : "") ==
      this.inputElement.value
    ) {
      return;
    }
    if (this.props.onEnter) {
      const ret = this.props.onEnter(this.inputElement.value);
      if (!ret) {
        this.inputElement.value =
          this.props.defaultValue != null ? this.props.defaultValue : "";
      }
    } else {
      this.inputElement.value =
        this.props.defaultValue != null ? this.props.defaultValue : "";
    }
  }

  public doCancel() {
    this.inputElement.value =
      this.props.defaultValue != null ? this.props.defaultValue : "";
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  public get value() {
    return this.inputElement.value;
  }

  public set value(v: string) {
    this.inputElement.value = v;
  }

  public render() {
    return (
      <input
        className="charticulator__widget-control-input-field"
        type="text"
        ref={e => (this.inputElement = e)}
        defaultValue={
          this.props.defaultValue != null ? this.props.defaultValue : ""
        }
        placeholder={this.props.placeholder}
        onKeyDown={e => {
          if (e.key == "Enter") {
            this.doEnter();
          }
          if (e.key == "Escape") {
            this.doCancel();
          }
        }}
        onFocus={e => {
          this.inputElement.select();
        }}
        onBlur={() => {
          this.doEnter();
        }}
      />
    );
  }
}

export interface InputExpressionProps {
  validate?: (value: string) => Expression.VerifyUserExpressionReport;
  defaultValue?: string;
  placeholder?: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
  textExpression?: boolean;
  allowNull?: boolean;
}

export interface InputExpressionState {
  errorMessage?: string;
  errorIndicator: boolean;
  value?: string;
}

export class InputExpression extends React.Component<
  InputExpressionProps,
  InputExpressionState
> {
  protected refInput: HTMLInputElement;
  public state: InputExpressionState = {
    errorMessage: null,
    errorIndicator: false,
    value: this.props.defaultValue || ""
  };

  public componentWillReceiveProps(newProps: InputExpressionProps) {
    this.setState({
      errorMessage: null,
      errorIndicator: false,
      value: newProps.defaultValue || ""
    });
  }

  protected doEnter() {
    if (this.props.allowNull && this.refInput.value.trim() == "") {
      this.setState({
        value: "",
        errorIndicator: false,
        errorMessage: null
      });
      this.props.onEnter(null);
    } else {
      const result = this.props.validate(this.refInput.value);
      if (result.pass) {
        this.setState({
          value: result.formatted,
          errorIndicator: false,
          errorMessage: null
        });
        this.props.onEnter(result.formatted);
      } else {
        this.setState({
          errorIndicator: true,
          errorMessage: result.error
        });
      }
    }
  }
  protected doCancel() {
    this.setState({
      value: this.props.defaultValue || "",
      errorIndicator: false,
      errorMessage: null
    });
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  public render() {
    return (
      <span className="charticulator__widget-control-input-expression">
        <input
          className={classNames(
            "charticulator__widget-control-input-expression-input",
            ["is-error", this.state.errorIndicator]
          )}
          type="text"
          ref={e => (this.refInput = e)}
          value={this.state.value}
          placeholder={this.props.placeholder}
          onKeyDown={e => {
            if (e.key == "Enter") {
              this.doEnter();
            }
            if (e.key == "Escape") {
              this.doCancel();
            }
          }}
          onFocus={e => {
            this.refInput.select();
          }}
          onBlur={() => {
            this.doEnter();
          }}
          onChange={() => {
            // Check for parse errors while input
            const newValue = this.refInput.value;
            if (this.props.allowNull && newValue.trim() == "") {
              this.setState({
                value: newValue,
                errorIndicator: false
              });
            } else {
              const result = Expression.verifyUserExpression(newValue, {
                textExpression: this.props.textExpression
              });
              this.setState({
                value: this.refInput.value,
                errorIndicator: !result.pass
              });
            }
          }}
        />
        {this.state.errorMessage != null ? (
          <span className="charticulator__widget-control-input-expression-error">
            {this.state.errorMessage}
          </span>
        ) : null}
      </span>
    );
  }
  // public render() {
  //   return (
  //     <InputText
  //       defaultValue={this.props.defaultValue}
  //       placeholder={this.props.placeholder}
  //       onCancel={this.props.onCancel}
  //       onEnter={(newValue) => {
  //         if (this.props.validate) {
  //           const result = this.props.validate(newValue);
  //           if (result.pass) {
  //             return this.props.onEnter(result.formatted);
  //           } else {
  //             console.log(result.error);
  //             return false;
  //           }
  //         } else {
  //           return this.props.onEnter(newValue);
  //         }
  //       }}
  //     />
  //   );
  // }
}

export interface InputNumberProps {
  defaultValue?: number;
  placeholder?: string;
  onEnter?: (value: number) => boolean;

  digits?: number;
  minimum?: number;
  maximum?: number;
  percentage?: boolean;

  showSlider?: boolean;
  sliderRange?: [number, number];

  showUpdown?: boolean;
  updownTick?: number;
  updownRange?: [number, number];
  updownStyle?: "normal" | "font";
}

export class InputNumber extends React.Component<InputNumberProps, {}> {
  private textInput: InputText;

  private formatNumber(value: number) {
    if (value == null) {
      return "";
    }
    if (value != value) {
      return "N/A";
    }
    if (this.props.percentage) {
      return (
        prettyNumber(
          value * 100,
          this.props.digits != null ? this.props.digits : 2
        ) + "%"
      );
    } else {
      return prettyNumber(
        value,
        this.props.digits != null ? this.props.digits : 2
      );
    }
  }

  private parseNumber(str: string) {
    str = str.trim();
    if (str == "") {
      return null;
    }
    if (this.props.percentage) {
      str = str.replace(/\%$/, "");
      return +str / 100;
    } else {
      return +str;
    }
  }

  private reportValue(value: number) {
    if (value == null) {
      return this.props.onEnter(value);
    } else {
      if (value == value) {
        if (this.props.minimum != null) {
          value = Math.max(this.props.minimum, value);
        }
        if (this.props.maximum != null) {
          value = Math.min(this.props.maximum, value);
        }
        return this.props.onEnter(value);
      } else {
        return this.props.onEnter(value);
      }
    }
  }

  public renderSlider() {
    let sliderMin = 0;
    let sliderMax = 1;
    if (this.props.minimum != null) {
      sliderMin = this.props.minimum;
    }
    if (this.props.maximum != null) {
      sliderMax = this.props.maximum;
    }
    if (this.props.sliderRange != null) {
      sliderMin = this.props.sliderRange[0];
      sliderMax = this.props.sliderRange[1];
    }
    return (
      <Slider
        width={70}
        min={sliderMin}
        max={sliderMax}
        defaultValue={this.props.defaultValue}
        onChange={(newValue, isFinished) => {
          this.textInput.value = this.formatNumber(newValue);
          if (isFinished) {
            this.reportValue(newValue);
          }
        }}
      />
    );
  }

  public renderUpdown() {
    const tick = this.props.updownTick || 0.1;
    if (this.props.updownStyle == "font") {
      return [
        <Button
          key="up"
          icon="general/text-size-up"
          onClick={() => {
            this.reportValue(this.props.defaultValue + tick);
          }}
        />,
        <Button
          key="down"
          icon="general/text-size-down"
          onClick={() => {
            this.reportValue(this.props.defaultValue - tick);
          }}
        />
      ];
    } else {
      return (
        <UpdownButton
          onClick={part => {
            if (part == "up") {
              this.reportValue(this.props.defaultValue + tick);
            } else {
              this.reportValue(this.props.defaultValue - tick);
            }
          }}
        />
      );
    }
  }

  public render() {
    return (
      <span className="charticulator__widget-control-input-number">
        <div className="charticulator__widget-control-input-number-input">
          <InputText
            ref={e => (this.textInput = e)}
            placeholder={this.props.placeholder}
            defaultValue={this.formatNumber(this.props.defaultValue)}
            onEnter={str => {
              const num = this.parseNumber(str);
              return this.reportValue(num);
            }}
          />
        </div>
        {this.props.showSlider ? this.renderSlider() : null}
        {this.props.showUpdown ? this.renderUpdown() : null}
      </span>
    );
  }
}

export interface InputColorProps {
  defaultValue: Color;
  allowNull?: boolean;
  onEnter: (value: Color) => boolean;
}

export class InputColor extends React.Component<InputColorProps, {}> {
  public render() {
    let hex: string = "";
    if (this.props.defaultValue) {
      hex = colorToHTMLColorHEX(this.props.defaultValue);
    }
    let colorButton: HTMLSpanElement;
    return (
      <span className="charticulator__widget-control-input-color">
        <span
          className="el-color-display"
          style={{ backgroundColor: hex == "" ? "transparent" : hex }}
          ref={e => (colorButton = e)}
          onClick={() => {
            globals.popupController.popupAt(
              context => {
                return (
                  <PopupView context={context}>
                    <ColorPicker
                      onPick={color => {
                        this.props.onEnter(color);
                      }}
                    />
                  </PopupView>
                );
              },
              { anchor: colorButton }
            );
          }}
        />
        <InputText
          defaultValue={hex}
          placeholder={this.props.allowNull ? "(none)" : ""}
          onEnter={newValue => {
            newValue = newValue.trim();
            if (newValue == "") {
              if (this.props.allowNull) {
                return this.props.onEnter(null);
              } else {
                return false;
              }
            }
            const color = colorFromHTMLColor(newValue);
            if (!color) {
              return false;
            }
            return this.props.onEnter(color);
          }}
        />
      </span>
    );
  }
}

export interface InputColorGradientProps {
  defaultValue: ColorGradient;
  onEnter: (value: ColorGradient) => boolean;
}

export class InputColorGradient extends React.Component<
  InputColorGradientProps,
  {}
> {
  public render() {
    let colorButton: HTMLSpanElement;
    return (
      <span className="charticulator__widget-control-input-color-gradient">
        <span
          className="el-color-gradient-display"
          ref={e => (colorButton = e)}
          onClick={() => {
            globals.popupController.popupAt(
              context => {
                return (
                  <PopupView context={context}>
                    <GradientPicker
                      defaultValue={this.props.defaultValue}
                      onPick={gradient => {
                        this.props.onEnter(gradient);
                      }}
                    />
                  </PopupView>
                );
              },
              { anchor: colorButton }
            );
          }}
        >
          <GradientView gradient={this.props.defaultValue} />
        </span>
      </span>
    );
  }
}

export interface SliderProps {
  width: number;
  defaultValue?: number;

  min: number;
  max: number;

  onChange?: (value: number, final: boolean) => void;
}

export interface SliderState {
  currentValue: number;
  dragging: boolean;
}

export class Slider extends React.Component<SliderProps, SliderState> {
  public refs: {
    svg: SVGElement;
  };
  constructor(props: SliderProps) {
    super(props);
    this.state = {
      currentValue: props.defaultValue,
      dragging: false
    };
  }

  public hammer: HammerManager;

  public componentWillReceiveProps(props: SliderProps) {
    this.setState({
      currentValue: props.defaultValue
    });
  }

  public niceValue(v: number) {
    const digits = Math.ceil(
      Math.log(this.props.max - this.props.min) / Math.log(10) + 2
    );
    v = parseFloat(v.toPrecision(digits));
    v = Math.min(this.props.max, Math.max(this.props.min, v));
    return v;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.svg);
    this.hammer.add(new Hammer.Pan({ threshold: 0 }));
    this.hammer.add(new Hammer.Tap());

    const margin = 13;

    this.hammer.on("panstart pan panend tap", e => {
      const left = this.refs.svg.getBoundingClientRect().left;
      const x = e.center.x - left;
      let pos = (x - margin) / (this.props.width - margin - margin);
      pos = Math.max(0, Math.min(1, pos));
      const value = this.niceValue(
        pos * (this.props.max - this.props.min) + this.props.min
      );
      this.setState({
        currentValue: value
      });
      if (this.props.onChange) {
        if (e.type == "panend" || e.type == "tap") {
          this.props.onChange(value, true);
        } else {
          this.props.onChange(value, false);
        }
      }
      if (e.type == "panstart") {
        this.setState({
          dragging: true
        });
      }
      if (e.type == "panend") {
        this.setState({
          dragging: false
        });
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const height = 24;
    const { min, max, width } = this.props;
    const margin = height / 2 + 1;
    const scale = (v: number) =>
      (v - min) / (max - min) * (width - margin - margin) + margin;
    const y = height / 2;
    const px = scale(
      this.state.currentValue != null
        ? this.state.currentValue
        : (min + max) / 2
    );
    return (
      <span className="charticulator__widget-control-slider">
        <svg
          width={width}
          height={height}
          ref="svg"
          className={classNames(
            ["invalid", this.state.currentValue == null],
            ["active", this.state.dragging]
          )}
        >
          <line
            className="track"
            x1={margin}
            x2={width - margin}
            y1={y}
            y2={y}
          />
          <line className="track-highlight" x1={margin} x2={px} y1={y} y2={y} />
          <circle className="indicator" cx={px} cy={y} r={height / 2 * 0.5} />
        </svg>
      </span>
    );
  }
}

export interface ButtonProps {
  icon?: string;
  text?: string;
  title?: string;
  active?: boolean;
  onClick?: () => void;
}

export class Button extends React.Component<ButtonProps, {}> {
  public render() {
    return (
      <span
        className={classNames("charticulator__widget-control-button", [
          "is-active",
          this.props.active
        ])}
        title={this.props.title}
        onClick={e => {
          e.stopPropagation();
          if (this.props.onClick) {
            this.props.onClick();
          }
        }}
      >
        {this.props.icon ? (
          <SVGImageIcon url={R.getSVGIcon(this.props.icon)} />
        ) : null}
        {this.props.text ? (
          <span className="el-text">{this.props.text}</span>
        ) : null}
      </span>
    );
  }
}

export interface SelectProps {
  icons?: string[];
  options: string[];
  labels?: string[];
  showText?: boolean;
  value: string;
  onChange: (active: string) => void;
}

export class Select extends React.Component<SelectProps, { active: boolean }> {
  constructor(props: SelectProps) {
    super(props);
    this.state = {
      active: false
    };
  }
  private startDropdown() {
    globals.popupController.popupAt(
      context => {
        context.addListener("close", () => {
          this.setState({
            active: false
          });
        });
        const list = this.props.options.map((x, i) => {
          return {
            url: this.props.icons ? R.getSVGIcon(this.props.icons[i]) : null,
            name: x,
            text: this.props.labels ? this.props.labels[i] : null
          };
        });
        return (
          <PopupView context={context}>
            <DropdownListView
              selected={this.props.value}
              list={list}
              context={context}
              onClick={value => {
                this.props.onChange(value);
              }}
            />
          </PopupView>
        );
      },
      { anchor: this.anchor }
    );
    this.setState({
      active: true
    });
  }
  private _startDropdown = this.startDropdown.bind(this);
  private anchor: HTMLSpanElement;

  public render() {
    const currentIndex = this.props.options.indexOf(this.props.value);
    const props = this.props;
    return (
      <span
        className={classNames("charticulator__widget-control-select", [
          "is-active",
          this.state.active
        ])}
        ref={e => (this.anchor = e)}
        onClick={this._startDropdown}
      >
        {props.icons != null ? (
          <SVGImageIcon url={R.getSVGIcon(props.icons[currentIndex])} />
        ) : null}
        {props.labels != null && props.showText ? (
          <span className="el-text">{props.labels[currentIndex]}</span>
        ) : null}
        <SVGImageIcon url={R.getSVGIcon("general/dropdown")} />
      </span>
    );
  }
}

export class Radio extends React.Component<SelectProps, {}> {
  public render() {
    const currentIndex = this.props.options.indexOf(this.props.value);
    return (
      <span className="charticulator__widget-control-radio">
        {this.props.options.map((value, index) => {
          return (
            <span
              key={value}
              className={classNames(
                "charticulator__widget-control-radio-item",
                ["is-active", value == this.props.value]
              )}
              title={this.props.labels ? this.props.labels[index] : null}
              onClick={() => {
                this.props.onChange(value);
              }}
            >
              {this.props.icons ? (
                <SVGImageIcon url={R.getSVGIcon(this.props.icons[index])} />
              ) : null}
              {this.props.showText ? (
                <span className="el-text">{this.props.labels[index]}</span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }
}

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

export interface UpdownButtonProps {
  onClick: (part: "up" | "down") => void;
}

export function UpdownButton(props: UpdownButtonProps) {
  return (
    <span className="charticulator__widget-control-updown-button">
      <span className="el-part" onClick={() => props.onClick("up")}>
        <SVGImageIcon url={R.getSVGIcon("general/triangle-up")} />
      </span>
      <span className="el-part" onClick={() => props.onClick("down")}>
        <SVGImageIcon url={R.getSVGIcon("general/triangle-down")} />
      </span>
    </span>
  );
}

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

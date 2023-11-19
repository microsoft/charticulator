/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  Color,
  colorFromHTMLColor,
  colorToHTMLColorHEX,
  Expression,
  parseColorOrThrowException,
  Specification,
} from "../../../../core";
import { DataMappingHints } from "../../../../core/prototypes";
import { InputNumberOptions } from "../../../../core/prototypes/controls";
import { ColorPicker } from "../../../components/fluentui_color_picker";
import { ContextedComponent } from "../../../context_component";
import { FluentComboBoxFontFamily } from "./controls";
import { FluentInputExpression } from "./controls/fluentui_input_expression";

import { strings } from "../../../../strings";
import { FluentColumnLayout } from "./controls/fluentui_customized_components";
import { InputImage } from "./controls/fluentui_image";
import { FluentInputNumber } from "./controls/fluentui_input_number";
import {
  Button,
  Dropdown,
  Input,
  Label,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Option,
} from "@fluentui/react-components";
import { IContextualMenuItem } from "../../dataset/data_field_binding_builder";
import { CheckboxChecked20Regular, CheckboxUnchecked20Filled } from "@fluentui/react-icons";

export interface ValueEditorProps {
  value: Specification.AttributeValue;
  type: Specification.AttributeType;
  label?: string;

  /** When value is null, show defaultValue in editor */
  defaultValue?: Specification.AttributeValue;
  /** When value is null, show placeholder text */
  placeholder?: string;

  onEmitValue?: (value: Specification.AttributeValue) => void;
  onClear?: () => void;

  /** In some cases the value editor can emit data mapping */
  onEmitMapping?: (mapping: Specification.Mapping) => void;
  onBeginDataFieldSelection?: (anchor?: Element) => void;
  /** The table to use for data mapping */
  getTable?: () => string;

  hints?: DataMappingHints;
  numberOptions?: InputNumberOptions;
  stopPropagation?: boolean;
  mainMenuItems?: IContextualMenuItem[];
  menuRender: React.JSX.Element;
}

interface ValueEditorState {
  value: string;
  open: boolean;
}

export class FluentValueEditor extends ContextedComponent<
  ValueEditorProps,
  ValueEditorState
> {
  public emitClearValue() {
    this.props.onClear();
  }
  public state: ValueEditorState = {
    open: false,
    value:
      this.props.type === Specification.AttributeType.Color
        ? colorToHTMLColorHEX(this.props.value as Color)
        : "",
  };

  public emitSetValue(value: Specification.AttributeValue) {
    this.props.onEmitValue(value);
  }

  public emitMapping(mapping: Specification.Mapping) {
    this.props.onEmitMapping(mapping);
  }

  public componentWillReceiveProps(nextProps: Readonly<ValueEditorProps>) {
    let hex: string = "";
    if (
      this.props.type === Specification.AttributeType.Color &&
      nextProps.value
    ) {
      hex = colorToHTMLColorHEX(nextProps.value as Color);
    }
    if (hex !== this.state.value) {
      this.setState({
        value: hex,
      });
    }
  }

  public render() {
    const value = this.props.value;
    let placeholderText = this.props.placeholder || strings.core.none;
    if (this.props.defaultValue != null) {
      placeholderText = this.props.defaultValue.toString();
    }

    switch (this.props.type) {
      case Specification.AttributeType.Number: {
        let numberOptions = this.props.numberOptions;
        if (!numberOptions) {
          numberOptions = {
            digits: 2,
          };
        }
        return (
          <FluentInputNumber
            label={this.props.label}
            stopPropagation={this.props.stopPropagation}
            placeholder={this.props.placeholder}
            defaultValue={this.props.value as number}
            onEnter={(newValue: number) => {
              if (newValue == null) {
                this.emitClearValue();
                return true;
              }
              if (newValue == newValue) {
                this.emitSetValue(newValue);
                return true;
              } else {
                return false;
              }
            }}
            {...numberOptions}
          />
        );
      }
      case Specification.AttributeType.Color: {
        const color = value as Color;
        const hex = colorToHTMLColorHEX(color);
        return (
          <span className="el-color-value">
            {/* <FluentTextField> */}
            <FluentColumnLayout>
              <Label>{this.props.label}</Label>
              <Input
                // styles={defaultStyle}
                // label={this.props.label}
                placeholder={this.props.placeholder}
                // onRenderLabel={labelRender}
                value={this.state.value}
                type="text"
                onChange={(event, { value: newValue }) => {
                  newValue = newValue.trim();
                  if (newValue == "") {
                    this.emitClearValue();
                  } else {
                    this.setState({
                      value: newValue,
                    });
                    try {
                      const color = parseColorOrThrowException(newValue);
                      if (color) {
                        this.emitSetValue(color);
                      } else {
                        return false;
                      }
                    } catch (ex) {
                      //ignore
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (this.props.stopPropagation) {
                    e.stopPropagation();
                  }
                }}
              />
            </FluentColumnLayout>
            {/* </FluentTextField> */}
            {/* {this.state.open && (
              <Callout
                target={`#color_picker`}
                onDismiss={() => this.setState({ open: !this.state.open })}
              >
                <ColorPicker
                  store={this.store}
                  allowNull={true}
                  defaultValue={colorFromHTMLColor(hex)}
                  onPick={(color) => {
                    if (color == null) {
                      this.emitClearValue();
                    } else {
                      this.emitSetValue(color);
                    }
                  }}
                  parent={this}
                  closePicker={() => {
                    this.setState({ open: !this.state.open });
                  }}
                />
              </Callout>
            )} */}
            <Popover open={this.state.open}>
              <PopoverTrigger>
                <span
                  className="el-color-item"
                  style={{ backgroundColor: hex, width: 30, height: 30 }}
                  id="color_picker"
                  onClick={() => {
                    this.setState({ open: !this.state.open });
                  }}
                />
              </PopoverTrigger>
              <PopoverSurface>
                <ColorPicker
                  store={this.store}
                  allowNull={true}
                  defaultValue={colorFromHTMLColor(hex)}
                  onPick={(color) => {
                    if (color == null) {
                      this.emitClearValue();
                    } else {
                      this.emitSetValue(color);
                    }
                  }}
                  parent={this}
                  closePicker={() => {
                    this.setState({ open: !this.state.open });
                  }}
                />
              </PopoverSurface>
            </Popover>
          </span>
        );
      }
      case Specification.AttributeType.FontFamily:
        return (
          <FluentComboBoxFontFamily
            label={this.props.label}
            defaultValue={value as string}
            onEnter={(value) => {
              this.emitSetValue(value);
              return true;
            }}
          />
        );
      case Specification.AttributeType.Text: {
        const str = value as string;
        if (this.props.onEmitMapping) {
          return (
            <FluentInputExpression
              label={this.props.label}
              textExpression={true}
              validate={(value) =>
                this.context.store.verifyUserExpressionWithTable(
                  value,
                  this.props.getTable(),
                  { textExpression: true, expectedTypes: ["string"] }
                )
              }
              defaultValue={new Expression.TextExpression([
                { string: str },
              ]).toString()}
              value={new Expression.TextExpression([
                { string: str },
              ]).toString()}
              placeholder={placeholderText}
              allowNull={true}
              onEnter={(newValue) => {
                if (newValue == null || newValue.trim() == "") {
                  this.emitClearValue();
                } else {
                  if (
                    Expression.parseTextExpression(newValue).isTrivialString()
                  ) {
                    this.emitMapping({
                      type: "value",
                      value: newValue,
                    } as Specification.ValueMapping);
                  } else {
                    this.emitMapping({
                      type: "text",
                      table: this.props.getTable(),
                      textExpression: newValue,
                    } as Specification.TextMapping);
                  }
                }
                return true;
              }}
              stopPropagation={this.props.stopPropagation}
            />
          );
        } else {
          return (
            <FluentColumnLayout>
              <Label>{this.props.label}</Label>
              <Input
                // label={this.props.label}
                value={str}
                // onRenderLabel={labelRender}
                placeholder={placeholderText}
                onChange={(event, { value }) => {
                  if (value == null) {
                    this.emitClearValue();
                  } else {
                    this.emitSetValue(value);
                  }
                  return true;
                }}
                // styles={defaultStyle}
                onKeyDown={(e) => {
                  if (this.props.stopPropagation) {
                    e.stopPropagation();
                  }
                }}
              />
            </FluentColumnLayout>
          );
        }
      }
      case Specification.AttributeType.Enum: {
        const str = value as string;
        const strings = this.props.hints.rangeEnum;
        return (
          <FluentColumnLayout>
            <Label>{this.props.label}</Label>
            <Dropdown
              value={str}
              onOptionSelect={(event, { optionValue }) => {
                if (value == null) {
                  this.emitClearValue();
                } else {
                  this.emitSetValue(optionValue);
                }
                return true;
              }}
            >
              {strings
              .map((str) => {
                return {
                  key: str,
                  text: str,
                };
              })
              .map((o) => {
                return (
                  <Option value={o.key} text={o.key}>
                    {o.text}
                  </Option>
                );
              })}
            </Dropdown>
          </FluentColumnLayout>
        );
      }
      case Specification.AttributeType.Boolean: {
        const boolean = value as boolean;
        if (this.props.onEmitMapping) {
          return (
            <FluentColumnLayout>
              <Label>{strings.objects.visibleOn.visibility}</Label>
              {this.props.menuRender}
            </FluentColumnLayout>
          );
        } else {
          return (
            <>
              <FluentColumnLayout>
                <Label>{strings.objects.visibleOn.visibility}</Label>
                <Button
                  icon={
                    boolean ? <CheckboxChecked20Regular /> : <CheckboxUnchecked20Filled />
                  }
                  onClick={() => {
                    this.emitSetValue(!boolean);
                  }}
                />
              </FluentColumnLayout>
            </>
          );
        }
      }
      case Specification.AttributeType.Image: {
        const str = value as Specification.Types.Image;
        return (
          <InputImage
            label={this.props.label}
            value={str}
            onChange={(newValue) => {
              if (newValue == null) {
                this.emitClearValue();
              } else {
                this.emitSetValue(newValue as Specification.Types.Image);
              }
              return true;
            }}
          />
        );
      }
    }
    return <span>(not implemented)</span>;
  }
}

/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Callout,
  DefaultButton,
  Dropdown,
  IContextualMenuItem,
  IContextualMenuListProps,
  IRenderFunction,
  Label,
  TextField,
} from "@fluentui/react";
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
import {
  defaultLabelStyle,
  defaultStyle,
  defaultBindButtonSize,
  defaultComponentsHeight,
  FluentTextField,
  labelRender,
} from "./controls/fluentui_customized_components";
import { InputImage } from "./controls/fluentui_image";
import { FluentInputNumber } from "./controls/fluentui_input_number";

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
  menuRender: IRenderFunction<IContextualMenuListProps>;
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
            <FluentTextField>
              <TextField
                styles={defaultStyle}
                label={this.props.label}
                placeholder={this.props.placeholder}
                onRenderLabel={labelRender}
                value={this.state.value}
                type="text"
                onChange={(event, newValue) => {
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
            </FluentTextField>
            <span
              className="el-color-item"
              style={{ backgroundColor: hex }}
              id="color_picker"
              onClick={() => {
                this.setState({ open: !this.state.open });
              }}
            />
            {this.state.open && (
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
            )}
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
            <>
              <TextField
                label={this.props.label}
                defaultValue={str}
                onRenderLabel={labelRender}
                placeholder={placeholderText}
                onChange={(event, newValue) => {
                  if (newValue == null) {
                    this.emitClearValue();
                  } else {
                    this.emitSetValue(newValue);
                  }
                  return true;
                }}
                styles={defaultStyle}
                onKeyDown={(e) => {
                  if (this.props.stopPropagation) {
                    e.stopPropagation();
                  }
                }}
              />
            </>
          );
        }
      }
      case Specification.AttributeType.Enum: {
        const str = value as string;
        const strings = this.props.hints.rangeEnum;
        return (
          <Dropdown
            styles={{
              ...(defaultStyle as any),
              title: {
                ...defaultStyle.title,
                lineHeight: defaultBindButtonSize.height,
              },
            }}
            label={this.props.label}
            onRenderLabel={labelRender}
            selectedKey={str}
            options={strings.map((str) => {
              return {
                key: str,
                text: str,
              };
            })}
            onChange={(event, value) => {
              if (value == null) {
                this.emitClearValue();
              } else {
                this.emitSetValue(value.key);
              }
              return true;
            }}
          />
        );
      }
      case Specification.AttributeType.Boolean: {
        const boolean = value as boolean;
        if (this.props.onEmitMapping) {
          return (
            <>
              <Label styles={defaultLabelStyle}>
                {strings.objects.visibleOn.visibility}
              </Label>
              <DefaultButton
                styles={{
                  root: {
                    ...defaultComponentsHeight,
                  },
                  menuIcon: { display: "none !important" },
                }}
                text={strings.attributesPanel.conditionedBy}
                menuProps={{
                  items: this.props.mainMenuItems ?? [],
                  onRenderMenuList: this.props.menuRender ?? null,
                }}
              />
            </>
          );
        } else {
          return (
            <>
              <Label styles={defaultLabelStyle}>
                {strings.objects.visibleOn.visibility}
              </Label>
              <DefaultButton
                checked={false}
                iconProps={{
                  iconName: boolean ? "CheckboxComposite" : "Checkbox",
                }}
                onClick={() => {
                  this.emitSetValue(!boolean);
                }}
              />
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

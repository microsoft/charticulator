/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DefaultButton, Dropdown, IContextualMenuItem, Label, TextField } from "@fluentui/react";
import * as React from "react";
import {
  Color,
  colorFromHTMLColor,
  colorToHTMLColorHEX,
  Expression,
  Specification,
} from "../../../../core";
import { DataMappingHints } from "../../../../core/prototypes";
import { InputNumberOptions } from "../../../../core/prototypes/controls";
import { ColorPicАker } from "../../../components";
import { ContextedComponent } from "../../../context_component";
import { getAlignment, PopupView } from "../../../controllers";
import * as globals from "../../../globals";
import { FluentComboBoxFontFamily } from "./controls";
import { FluentInputExpression } from "./controls/fluentui_input_expression";

import { strings } from "../../../../strings";
import {
  defaultLabelStyle,
  defaultStyle,
  defultComponentsHeight,
  FluentTextField,
  labelRender,
} from "./controls/fluentui_customized_components";
import { InputImage } from "./controls/fluentui_image";
import { FluentInputNumber } from "./controls/fluentui_input_number";
import { Director, MenuItemBuilder } from "../../dataset/data_field_binding_builder";

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
  mainMenuItems?: IContextualMenuItem[];
}

export class FluentValueEditor extends ContextedComponent<
  ValueEditorProps,
  Record<string, unknown>
> {
  public emitClearValue() {
    this.props.onClear();
  }

  public emitSetValue(value: Specification.AttributeValue) {
    this.props.onEmitValue(value);
  }

  public emitMapping(mapping: Specification.Mapping) {
    this.props.onEmitMapping(mapping);
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
        let colorItem: Element;
        return (
          <span className="el-color-value">
            <FluentTextField>
              <TextField
                styles={defaultStyle}
                label={this.props.label}
                placeholder={this.props.placeholder}
                defaultValue={hex}
                onRenderLabel={labelRender}
                type="text"
                onChange={(event, newValue) => {
                  newValue = newValue.trim();
                  if (newValue == "") {
                    this.emitClearValue();
                  } else {
                    const newColor = colorFromHTMLColor(newValue);
                    if (newColor) {
                      this.emitSetValue(newColor);
                      return true;
                    } else {
                      return false;
                    }
                  }
                }}
              />
            </FluentTextField>
            <span
              className="el-color-item"
              ref={(e) => (colorItem = e)}
              style={{ backgroundColor: hex }}
              onClick={() => {
                globals.popupController.popupAt(
                  (context) => (
                    <PopupView context={context}>
                      <ColorPicker
                        store={this.store}
                        defaultValue={color}
                        allowNull={true}
                        onPick={(color) => {
                          if (color == null) {
                            this.emitClearValue();
                            context.close();
                          } else {
                            this.emitSetValue(color);
                          }
                        }}
                      />
                    </PopupView>
                  ),
                  { anchor: colorItem, alignX: getAlignment(colorItem).alignX }
                );
              }}
            />
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
                    ...defultComponentsHeight,
                  },
                  menuIcon: { display: "none !important",}
                }}
                text={strings.attributesPanel.conditionedBy}
                menuProps={{
                  items: this.props.mainMenuItems ?? []
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

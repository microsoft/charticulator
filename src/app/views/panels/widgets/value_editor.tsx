// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Color,
  colorFromHTMLColor,
  colorToHTMLColorHEX,
  Expression,
  Specification,
} from "../../../../core";
import { DataMappingHints } from "../../../../core/prototypes";
import { InputNumberOptions } from "../../../../core/prototypes/controls";
import { MappingType } from "../../../../core/specification";
import { ColorPicker } from "../../../components";
import { ContextedComponent } from "../../../context_component";
import { PopupView } from "../../../controllers";
import * as globals from "../../../globals";
import {
  Button,
  ComboBox,
  ComboBoxFontFamily,
  InputExpression,
  InputImage,
  InputNumber,
  InputText,
} from "./controls";

export interface ValueEditorProps {
  value: Specification.AttributeValue;
  type: Specification.AttributeType;

  /** When value is null, show defaultValue in editor */
  defaultValue?: Specification.AttributeValue;
  /** When value is null, show placeholder text */
  placeholder?: string;

  onEmitValue?: (value: Specification.AttributeValue) => void;
  onClear?: () => void;

  /** In some cases the value editor can emit data mapping */
  onEmitMapping?: (mapping: Specification.Mapping) => void;
  onBeginDataFieldSelection?: (anchor: Element) => void;
  /** The table to use for data mapping */
  getTable?: () => string;

  hints?: DataMappingHints;
  numberOptions?: InputNumberOptions;
  anchorReference?: Element;
}

export class ValueEditor extends ContextedComponent<ValueEditorProps, {}> {
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
        const number = value as number;
        let numberOptions = this.props.numberOptions;
        if (!numberOptions) {
          numberOptions = {};
        }
        return (
          <InputNumber
            defaultValue={number}
            placeholder={placeholderText}
            {...numberOptions}
            onEnter={(newValue) => {
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
          />
        );
      }
      case Specification.AttributeType.Color: {
        const color = value as Color;
        const hex = colorToHTMLColorHEX(color);
        let colorItem: Element;
        return (
          <span className="el-color-value">
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
                  { anchor: colorItem }
                );
              }}
            />
            <InputText
              defaultValue={hex}
              onEnter={(newValue) => {
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
          </span>
        );
      }
      case Specification.AttributeType.FontFamily:
        return (
          <ComboBoxFontFamily
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
            <InputExpression
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
                      type: MappingType.value,
                      value: newValue,
                    } as Specification.ValueMapping);
                  } else {
                    this.emitMapping({
                      type: MappingType.text,
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
            <InputText
              defaultValue={str}
              placeholder={placeholderText}
              onEnter={(newValue) => {
                if (newValue == null) {
                  this.emitClearValue();
                } else {
                  this.emitSetValue(newValue);
                }
                return true;
              }}
            />
          );
        }
      }
      case Specification.AttributeType.Enum: {
        const str = value as string;
        const strings = this.props.hints.rangeEnum;
        return (
          <ComboBox
            defaultValue={str}
            onEnter={(newValue) => {
              if (newValue == null) {
                this.emitClearValue();
              } else {
                this.emitSetValue(newValue);
              }
              return true;
            }}
            options={strings || []}
          />
        );
      }
      case Specification.AttributeType.Boolean: {
        const boolean = value as boolean;
        let ref: Element;
        if (this.props.onEmitMapping) {
          return (
            <Button
              active={false}
              text="Conditioned by..."
              ref={(e) => (ref = ReactDOM.findDOMNode(e) as Element)}
              onClick={() => {
                this.props.onBeginDataFieldSelection(
                  this.props.anchorReference || ref
                );
              }}
            />
          );
        } else {
          return (
            <Button
              active={false}
              icon={boolean ? "checkbox/checked" : "checkbox/empty"}
              ref={(e) => (ref = ReactDOM.findDOMNode(e) as Element)}
              onClick={() => {
                this.emitSetValue(!boolean);
              }}
            />
          );
        }
      }
      case Specification.AttributeType.Image: {
        const str = value as Specification.Types.Image;
        return (
          <InputImage
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

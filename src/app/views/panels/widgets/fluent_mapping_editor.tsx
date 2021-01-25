// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  EventEmitter,
  EventSubscription,
  Expression,
  getById,
  Prototypes,
  Specification,
} from "../../../../core";
import { DragData } from "../../../actions";
import { ColorPicker, SVGImageIcon } from "../../../components";
import { ContextedComponent } from "../../../context_component";
import { PopupView } from "../../../controllers";
import * as globals from "../../../globals";
import * as R from "../../../resources";
import { isKindAcceptable } from "../../dataset/common";
import { DataFieldSelector } from "../../dataset/data_field_selector";
import { ScaleEditor } from "../scale_editor";
import { Button } from "./controls";
import {
  CharticulatorPropertyAccessors,
  DropZoneView,
  WidgetManager,
} from "./manager";
import { ValueEditor } from "./value_editor";
import { AppStore } from "../../../stores";
import { ScaleValueSelector } from "../scale_value_selector";
import { FunctionCall, Variable } from "../../../../core/expression";
import { getAligntment } from "../../../utils";
import { FluentValueEditor } from "./fluentui_value_editor";
import { FluentInputExpression } from "./controls/fluentui_input_expression";

import { TextField } from "@fluentui/react";

export interface MappingEditorProps {
  parent: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors;
  attribute: string;
  type: Specification.AttributeType;
  options: Prototypes.Controls.MappingEditorOptions;
  store?: AppStore;
}

export interface MappingEditorState {
  showNoneAsValue: boolean;
}

export class FluentMappingEditor extends React.Component<
  MappingEditorProps,
  MappingEditorState
> {
  public mappingButton: Element;
  public noneLabel: HTMLSpanElement;
  public scaleMappingDisplay: HTMLSpanElement;

  public updateEvents = new EventEmitter();

  public state: MappingEditorState = {
    showNoneAsValue: false,
  };

  private beginDataFieldSelection(anchor: Element = this.mappingButton) {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const mapping = parent.getAttributeMapping(attribute);

    const {
      alignLeft,
      alignX,
    }: { alignLeft: boolean; alignX: any } = getAligntment(anchor);

    globals.popupController.popupAt(
      (context) => {
        return (
          <PopupView context={context}>
            <DataMappAndScaleEditor
              attribute={attribute}
              parent={this}
              defaultMapping={mapping}
              options={options}
              alignLeft={alignLeft}
              onClose={() => context.close()}
            />
          </PopupView>
        );
      },
      { anchor, alignX }
    );
  }

  private beginDataFieldValueSelection(anchor: Element = this.mappingButton) {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const mapping = parent.getAttributeMapping(attribute);

    const { alignX }: { alignLeft: boolean; alignX: any } = getAligntment(
      anchor
    );

    globals.popupController.popupAt(
      (context) => {
        const scaleMapping = mapping as Specification.ScaleMapping;
        if (scaleMapping.scale) {
          const scaleObject = getById(
            this.props.store.chart.scales,
            scaleMapping.scale
          );

          return (
            <PopupView context={context}>
              <ScaleValueSelector
                scale={scaleObject}
                scaleMapping={mapping as any}
                store={this.props.store}
                onSelect={(index) => {
                  const paresedExpression = Expression.parse(
                    scaleMapping.expression
                  ) as FunctionCall;
                  // change the second param of get function
                  (paresedExpression.args[1] as any).value = index;
                  scaleMapping.expression = paresedExpression.toString();
                  this.props.parent.onEditMappingHandler(
                    this.props.attribute,
                    scaleMapping
                  );
                  context.close();
                }}
              />
            </PopupView>
          );
        }
      },
      { anchor, alignX }
    );
  }

  private initiateValueEditor() {
    switch (this.props.type) {
      case "number":
      case "font-family":
      case "text":
        {
          this.setState({
            showNoneAsValue: true,
          });
        }
        break;
      case "color":
        {
          if (this.noneLabel == null) {
            return;
          }
          globals.popupController.popupAt(
            (context) => (
              <PopupView context={context}>
                <ColorPicker
                  store={this.props.store}
                  defaultValue={null}
                  allowNull={true}
                  onPick={(color) => {
                    if (color == null) {
                      this.clearMapping();
                      context.close();
                    } else {
                      this.setValueMapping(color);
                    }
                  }}
                />
              </PopupView>
            ),
            { anchor: this.noneLabel }
          );
        }
        break;
    }
  }

  private setValueMapping(value: Specification.AttributeValue) {
    this.props.parent.onEditMappingHandler(this.props.attribute, {
      type: "value",
      value,
    } as Specification.ValueMapping);
  }

  public clearMapping() {
    this.props.parent.onEditMappingHandler(this.props.attribute, null);
    this.setState({
      showNoneAsValue: false,
    });
  }

  public mapData(
    data: DragData.DataExpression,
    hints: Prototypes.DataMappingHints
  ) {
    this.props.parent.onMapDataHandler(this.props.attribute, data, hints);
  }

  public componentDidUpdate() {
    this.updateEvents.emit("update");
  }

  public getTableOrDefault() {
    if (this.props.options.table) {
      return this.props.options.table;
    } else {
      return this.props.parent.store.getTables()[0].name;
    }
  }

  private renderValueEditor(value: Specification.AttributeValue) {
    let placeholderText = this.props.options.defaultAuto ? "(auto)" : "(none)";
    if (this.props.options.defaultValue != null) {
      placeholderText = this.props.options.defaultValue.toString();
    }
    return (
      <FluentValueEditor
        value={value}
        type={this.props.type}
        placeholder={placeholderText}
        onClear={() => this.clearMapping()}
        onEmitValue={(value) => this.setValueMapping(value)}
        onEmitMapping={(mapping) =>
          this.props.parent.onEditMappingHandler(this.props.attribute, mapping)
        }
        onBeginDataFieldSelection={(ref) => this.beginDataFieldSelection(ref)}
        getTable={() => this.getTableOrDefault()}
        hints={this.props.options.hints}
        numberOptions={this.props.options.numberOptions}
      />
    );
  }

  private renderCurrentAttributeMapping() {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const mapping = parent.getAttributeMapping(attribute);
    if (!mapping) {
      if (options.defaultValue != undefined) {
        return this.renderValueEditor(options.defaultValue);
      } else {
        let alwaysShowNoneAsValue = false;
        if (
          this.props.type == "number" ||
          this.props.type == "enum" ||
          this.props.type == "image"
        ) {
          alwaysShowNoneAsValue = true;
        }
        if (this.state.showNoneAsValue || alwaysShowNoneAsValue) {
          return this.renderValueEditor(null);
        } else {
          if (options.defaultAuto) {
            return (
              // <span
              //   className="el-clickable-label"
              //   ref={(e) => (this.noneLabel = e)}
              //   onClick={() => {
              //     if (
              //       !mapping ||
              //       (mapping as any).valueIndex === undefined ||
              //       (mapping as any).valueIndex === null
              //     ) {
              //       this.initiateValueEditor();
              //     }
              //   }}
              // >
              //   (auto)
              // </span>
              <TextField
                // disabled
                placeholder={"(auto)"}
                onBlur={() => {
                  debugger;
                  if (
                    !mapping ||
                    (mapping as any).valueIndex === undefined ||
                    (mapping as any).valueIndex === null
                  ) {
                    this.initiateValueEditor();
                  }
                }}
              />
            );
          } else {
            return (
              // <span
              //   className="el-clickable-label"
              //   ref={(e) => (this.noneLabel = e)}
              //   onClick={() => {
              //     if (
              //       !mapping ||
              //       (mapping as any).valueIndex === undefined ||
              //       (mapping as any).valueIndex === null
              //     ) {
              //       this.initiateValueEditor();
              //     }
              //   }}
              // >
              //   (none)
              // </span>
              <TextField
                // disabled
                placeholder={"(none)"}
                onBlur={() => {
                  if (
                    !mapping ||
                    (mapping as any).valueIndex === undefined ||
                    (mapping as any).valueIndex === null
                  ) {
                    this.initiateValueEditor();
                  }
                }}
              />
            );
          }
        }
      }
    } else {
      switch (mapping.type) {
        case "value": {
          const valueMapping = mapping as Specification.ValueMapping;
          return this.renderValueEditor(valueMapping.value);
        }
        case "text": {
          const textMapping = mapping as Specification.TextMapping;
          return (
            <FluentInputExpression
              defaultValue={textMapping.textExpression}
              textExpression={true}
              validate={(value) =>
                parent.store.verifyUserExpressionWithTable(
                  value,
                  textMapping.table,
                  { textExpression: true, expectedTypes: ["string"] }
                )
              }
              allowNull={true}
              onEnter={(newValue) => {
                if (newValue == null || newValue.trim() == "") {
                  this.clearMapping();
                } else {
                  if (
                    Expression.parseTextExpression(newValue).isTrivialString()
                  ) {
                    this.props.parent.onEditMappingHandler(
                      this.props.attribute,
                      {
                        type: "value",
                        value: newValue,
                      } as Specification.ValueMapping
                    );
                  } else {
                    this.props.parent.onEditMappingHandler(
                      this.props.attribute,
                      {
                        type: "text",
                        table: textMapping.table,
                        textExpression: newValue,
                      } as Specification.TextMapping
                    );
                  }
                }
                return true;
              }}
            />
          );
        }
        case "scale": {
          const scaleMapping = mapping as Specification.ScaleMapping;
          if (scaleMapping.scale) {
            let scaleIcon = <span>f</span>;
            if (this.props.type == "color") {
              scaleIcon = <SVGImageIcon url={R.getSVGIcon("scale/color")} />;
            }
            return (
              <span
                className="el-mapping-scale"
                ref={(e) => (this.scaleMappingDisplay = e)}
                onClick={() => {
                  if (
                    !scaleMapping ||
                    scaleMapping.valueIndex === undefined ||
                    scaleMapping.valueIndex === null
                  ) {
                    const {
                      alignLeft,
                      alignX,
                    }: { alignLeft: boolean; alignX: any } = getAligntment(
                      this.scaleMappingDisplay
                    );

                    globals.popupController.popupAt(
                      (context) => (
                        <PopupView context={context}>
                          <DataMappAndScaleEditor
                            attribute={this.props.attribute}
                            parent={this}
                            defaultMapping={mapping}
                            options={options}
                            alignLeft={alignLeft}
                            onClose={() => context.close()}
                          />
                        </PopupView>
                      ),
                      { anchor: this.scaleMappingDisplay, alignX }
                    );
                  } else {
                    this.beginDataFieldValueSelection();
                  }
                }}
              >
                <span className="el-mapping-scale-scale is-left">
                  {scaleIcon}
                </span>
                <svg width={6} height={20}>
                  <path d="M3.2514,10A17.37314,17.37314,0,0,1,6,0H0V20H6A17.37342,17.37342,0,0,1,3.2514,10Z" />
                </svg>
                <span className="el-mapping-scale-column">
                  {scaleMapping.expression}
                </span>
                <svg width={6} height={20}>
                  <path d="M2.7486,10A17.37314,17.37314,0,0,0,0,0H6V20H0A17.37342,17.37342,0,0,0,2.7486,10Z" />
                </svg>
              </span>
            );
          } else {
            return (
              <span className="el-mapping-scale">
                <span className="el-mapping-scale-scale is-left">=</span>
                <svg width={6} height={20}>
                  <path d="M3.2514,10A17.37314,17.37314,0,0,1,6,0H0V20H6A17.37342,17.37342,0,0,1,3.2514,10Z" />
                </svg>
                <span className="el-mapping-scale-column">
                  {scaleMapping.expression}
                </span>
                <svg width={6} height={20}>
                  <path d="M2.7486,10A17.37314,17.37314,0,0,0,0,0H6V20H0A17.37342,17.37342,0,0,0,2.7486,10Z" />
                </svg>
              </span>
            );
          }
        }
        default: {
          return <span>(...)</span>;
        }
      }
    }
  }

  public render() {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const currentMapping = parent.getAttributeMapping(attribute);
    // If there is a mapping, also not having default or using auto
    let shouldShowEraser =
      currentMapping != null &&
      (currentMapping.type != "value" ||
        !options.defaultValue ||
        options.defaultAuto);
    shouldShowEraser = shouldShowEraser || this.state.showNoneAsValue;
    const shouldShowBindData = parent.onMapDataHandler != null;
    const isDataMapping =
      currentMapping != null && currentMapping.type == "scale";
    shouldShowEraser = isDataMapping;
    const valueIndex = currentMapping && (currentMapping as any).valueIndex;

    if (this.props.options.openMapping) {
      setTimeout(() => {
        if (valueIndex === undefined || valueIndex === null) {
          this.beginDataFieldSelection();
        } else {
          this.beginDataFieldValueSelection();
        }
      });
    }

    return (
      <DropZoneView
        filter={(data) => {
          if (!shouldShowBindData) {
            return false;
          }
          if (data instanceof DragData.DataExpression) {
            return isKindAcceptable(data.metadata.kind, options.acceptKinds);
          } else {
            return false;
          }
        }}
        onDrop={(data: DragData.DataExpression, point, modifiers) => {
          if (!options.hints) {
            options.hints = {};
          }
          options.hints.newScale = modifiers.shiftKey;
          options.hints.scaleID = data.scaleID;

          const parsedExpression = Expression.parse(
            data.expression
          ) as FunctionCall;

          if (data.allowSelectValue && parsedExpression.name !== "get") {
            data.expression = `get(${data.expression}, 0)`;
          }
          // because original mapping allowed it
          if (parsedExpression.name === "get") {
            data.allowSelectValue = true;
          }
          this.mapData(data, {
            ...options.hints,
            allowSelectValue: data.allowSelectValue,
          });
        }}
        className="charticulator__widget-control-mapping-editor"
      >
        {parent.horizontal(
          [1, 0],
          this.renderCurrentAttributeMapping(),
          <span>
            {shouldShowEraser ? (
              <Button
                icon="general/eraser"
                active={false}
                title="Remove"
                onClick={() => {
                  if (parent.getAttributeMapping(attribute)) {
                    this.clearMapping();
                  }
                  this.setState({
                    showNoneAsValue: false,
                  });
                }}
              />
            ) : null}
            {(valueIndex === undefined || valueIndex === null) &&
            shouldShowBindData ? (
              <Button
                icon={"general/bind-data"}
                title="Bind data"
                ref={(e) =>
                  (this.mappingButton = ReactDOM.findDOMNode(e) as Element)
                }
                onClick={() => {
                  this.beginDataFieldSelection();
                }}
                active={isDataMapping}
              />
            ) : null}
            {valueIndex !== undefined && valueIndex !== null ? (
              <Button
                icon={"general/bind-data"}
                title="Bind data value"
                ref={(e) =>
                  (this.mappingButton = ReactDOM.findDOMNode(e) as Element)
                }
                onClick={() => {
                  this.beginDataFieldValueSelection();
                }}
                active={isDataMapping}
              />
            ) : null}
          </span>
        )}
      </DropZoneView>
    );
  }
}

export interface DataMappAndScaleEditorProps {
  attribute: string;
  defaultMapping: Specification.Mapping;
  options: Prototypes.Controls.MappingEditorOptions;
  parent: FluentMappingEditor;
  onClose: () => void;
  alignLeft?: boolean;
}
export interface DataMappAndScaleEditorState {
  currentMapping: Specification.Mapping;
}

export class DataMappAndScaleEditor extends ContextedComponent<
  DataMappAndScaleEditorProps,
  DataMappAndScaleEditorState
> {
  public state = {
    currentMapping: this.props.defaultMapping,
  };

  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [
      this.props.parent.updateEvents.addListener("update", () => {
        this.setState({
          currentMapping: this.props.parent.props.parent.getAttributeMapping(
            this.props.attribute
          ),
        });
      }),
    ];
  }

  public componentWillUnmount() {
    for (const t of this.tokens) {
      t.remove();
    }
  }

  public renderScaleEditor() {
    const mapping = this.state.currentMapping;
    if (mapping && mapping.type == "scale") {
      const scaleMapping = mapping as Specification.ScaleMapping;
      if (scaleMapping.scale) {
        const scaleObject = getById(
          this.store.chart.scales,
          scaleMapping.scale
        );
        return (
          <ScaleEditor
            scale={scaleObject}
            scaleMapping={scaleMapping}
            store={this.store}
          />
        );
      }
    }
    return null;
  }

  public renderDataPicker() {
    const options = this.props.options;
    let currentExpression: string = null;
    const mapping = this.state.currentMapping;

    if (mapping != null && mapping.type == "scale") {
      currentExpression = (mapping as Specification.ScaleMapping).expression;
    }

    return (
      <div>
        <DataFieldSelector
          table={mapping ? (mapping as any).table : options.table}
          datasetStore={this.store}
          kinds={options.acceptKinds}
          useAggregation={true}
          defaultValue={
            currentExpression
              ? { table: options.table, expression: currentExpression }
              : null
          }
          nullDescription={"(none)"}
          nullNotHighlightable={true}
          onChange={(value) => {
            if (value != null) {
              this.props.parent.mapData(
                new DragData.DataExpression(
                  this.store.getTable(value.table),
                  value.expression,
                  value.type,
                  value.metadata,
                  value.rawExpression
                ),
                options.hints
              );
            } else {
              this.props.parent.clearMapping();
              this.props.onClose();
            }
          }}
        />
      </div>
    );
  }

  public render() {
    const scaleElement = this.renderScaleEditor();
    if (scaleElement) {
      return (
        <div className="charticulator__data-mapping-and-scale-editor">
          <div
            className={
              this.props.alignLeft ? "el-scale-editor-left" : "el-scale-editor"
            }
          >
            {scaleElement}
          </div>
          <div className="el-data-picker">{this.renderDataPicker()}</div>
        </div>
      );
    } else {
      return (
        <div className="charticulator__data-mapping-and-scale-editor">
          <div className="el-data-picker">{this.renderDataPicker()}</div>
        </div>
      );
    }
  }
}

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../../../globals";
import * as R from "../../../resources";

import {
  Color,
  colorFromHTMLColor,
  colorToHTMLColorHEX,
  EventEmitter,
  EventSubscription,
  Expression,
  getById,
  Prototypes,
  Specification
} from "../../../../core";
import { Actions, DragData } from "../../../actions";
import {
  ColorPicker,
  DropdownListView,
  SVGImageIcon
} from "../../../components";
import { ContextedComponent } from "../../../context_component";
import { PopupView } from "../../../controllers";

import { DataFieldSelector } from "../../dataset/data_field_selector";
import { ScaleEditor } from "../scale_editor";
import {
  Button,
  InputExpression,
  InputImage,
  InputNumber,
  InputText,
  ComboBox,
  ComboBoxFontFamily
} from "./controls";
import { DropZoneView, WidgetManager } from "./manager";

export interface MappingEditorProps {
  parent: WidgetManager;
  attribute: string;
  type: string;
  options: Prototypes.Controls.MappingEditorOptions;
}

export interface MappingEditorState {
  showNoneAsValue: boolean;
}

export class MappingEditor extends React.Component<
  MappingEditorProps,
  MappingEditorState
> {
  public mappingButton: Element;
  public noneLabel: HTMLSpanElement;
  public scaleMappingDisplay: HTMLSpanElement;

  public updateEvents = new EventEmitter();

  public state: MappingEditorState = {
    showNoneAsValue: false
  };

  private beginDataFieldSelection(anchor: Element = this.mappingButton) {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const mapping = parent.getAttributeMapping(attribute);
    globals.popupController.popupAt(
      context => {
        return (
          <PopupView context={context}>
            <DataMappAndScaleEditor
              attribute={attribute}
              parent={this}
              defaultMapping={mapping}
              options={options}
              onClose={() => context.close()}
            />
          </PopupView>
        );
      },
      { anchor }
    );
  }

  private initiateValueEditor() {
    switch (this.props.type) {
      case "number":
      case "font-family":
      case "string":
        {
          this.setState({
            showNoneAsValue: true
          });
        }
        break;
      case "color":
        {
          if (this.noneLabel == null) {
            return;
          }
          globals.popupController.popupAt(
            context => (
              <PopupView context={context}>
                <ColorPicker
                  defaultValue={null}
                  onPick={color => {
                    this.setValueMapping(color);
                    context.close();
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
      value
    } as Specification.ValueMapping);
  }

  public clearMapping() {
    this.props.parent.onEditMappingHandler(this.props.attribute, null);
    this.setState({
      showNoneAsValue: false
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

  private renderValueEditor(value: Specification.AttributeValue) {
    const parent = this.props.parent;
    let placeholderText = this.props.options.defaultAuto ? "(auto)" : "(none)";
    if (this.props.options.defaultValue != null) {
      placeholderText = this.props.options.defaultValue.toString();
    }
    switch (this.props.type) {
      case "number": {
        const number = value as number;
        let numberOptions = this.props.options.numberOptions;
        if (!numberOptions) {
          numberOptions = {};
        }
        return (
          <InputNumber
            defaultValue={number}
            placeholder={placeholderText}
            {...numberOptions}
            onEnter={newValue => {
              if (newValue == null) {
                this.clearMapping();
                return true;
              }
              if (newValue == newValue) {
                this.setValueMapping(newValue);
                return true;
              } else {
                return false;
              }
            }}
          />
        );
      }
      case "color": {
        const color = value as Color;
        const hex = colorToHTMLColorHEX(color);
        let colorItem: Element;
        return (
          <span className="el-color-value">
            <span
              className="el-color-item"
              ref={e => (colorItem = e)}
              style={{ backgroundColor: hex }}
              onClick={() => {
                globals.popupController.popupAt(
                  context => (
                    <PopupView context={context}>
                      <ColorPicker
                        defaultValue={color}
                        onPick={color => {
                          this.setValueMapping(color);
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
              onEnter={newValue => {
                newValue = newValue.trim();
                if (newValue == "") {
                  this.clearMapping();
                } else {
                  const newColor = colorFromHTMLColor(newValue);
                  if (newColor) {
                    this.setValueMapping(newColor);
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
      case "font-family":
        return (
          <ComboBoxFontFamily
            defaultValue={value as string}
            onEnter={value => {
              this.setValueMapping(value);
              return true;
            }}
          />
        );
      case "string": {
        const str = value as string;
        const textInput = (
          <InputExpression
            textExpression={true}
            validate={value =>
              parent.store.verifyUserExpressionWithTable(
                value,
                this.props.options.table,
                { textExpression: true, expectedTypes: ["string"] }
              )
            }
            defaultValue={new Expression.TextExpression([
              { string: str }
            ]).toString()}
            placeholder={placeholderText}
            allowNull={true}
            onEnter={newValue => {
              if (newValue == null || newValue.trim() == "") {
                this.clearMapping();
              } else {
                this.props.parent.onEditMappingHandler(this.props.attribute, {
                  type: "text",
                  textExpression: newValue
                } as Specification.TextMapping);
              }
              return true;
            }}
          />
        );
        if (this.props.options.hints && this.props.options.hints.rangeString) {
          const strings = this.props.options.hints.rangeString;
          let anchor: HTMLSpanElement;
          return (
            <span
              style={{ display: "flex", width: "100%", flexDirection: "row" }}
              ref={e => (anchor = e)}
            >
              {textInput}
              <Button
                icon="general/more-vertical"
                onClick={() => {
                  globals.popupController.popupAt(
                    context => {
                      return (
                        <PopupView context={context}>
                          <DropdownListView
                            context={context}
                            list={strings.map(x => {
                              return {
                                text: x,
                                name: x,
                                font:
                                  this.props.type == "font-family" ? x : null
                              };
                            })}
                            onClick={item => {
                              this.setValueMapping(item);
                            }}
                          />
                        </PopupView>
                      );
                    },
                    { anchor }
                  );
                }}
              />
            </span>
          );
        } else {
          return textInput;
        }
      }
      case "boolean": {
        const boolean = value as boolean;
        let ref: Element;
        if (this.props.parent.onMapDataHandler) {
          return (
            <Button
              active={false}
              text="Conditioned by..."
              ref={e => (ref = ReactDOM.findDOMNode(e) as Element)}
              onClick={() => {
                this.beginDataFieldSelection(ref);
              }}
            />
          );
        } else {
          return (
            <Button
              active={false}
              icon={boolean ? "checkbox/checked" : "checkbox/empty"}
              ref={e => (ref = ReactDOM.findDOMNode(e) as Element)}
              onClick={() => {
                this.setValueMapping(!boolean);
              }}
            />
          );
        }
      }
      case "image": {
        const str = value as string;
        const textInput = (
          <InputImage
            value={str}
            onChange={newValue => {
              if (newValue == "") {
                this.clearMapping();
              } else {
                this.setValueMapping(newValue);
              }
              return true;
            }}
          />
        );
        return textInput;
      }
    }
    return <span>(...)</span>;
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
          this.props.type == "string" ||
          this.props.type == "image"
        ) {
          alwaysShowNoneAsValue = true;
        }
        if (this.state.showNoneAsValue || alwaysShowNoneAsValue) {
          return this.renderValueEditor(null);
        } else {
          if (options.defaultAuto) {
            return (
              <span
                className="el-clickable-label"
                ref={e => (this.noneLabel = e)}
                onClick={() => this.initiateValueEditor()}
              >
                (auto)
              </span>
            );
          } else {
            return (
              <span
                className="el-clickable-label"
                ref={e => (this.noneLabel = e)}
                onClick={() => this.initiateValueEditor()}
              >
                (none)
              </span>
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
            <InputExpression
              defaultValue={textMapping.textExpression}
              textExpression={true}
              validate={value =>
                parent.store.verifyUserExpressionWithTable(
                  value,
                  this.props.options.table,
                  { textExpression: true, expectedTypes: ["string"] }
                )
              }
              allowNull={true}
              onEnter={newValue => {
                if (newValue == null || newValue.trim() == "") {
                  this.clearMapping();
                } else {
                  this.props.parent.onEditMappingHandler(this.props.attribute, {
                    type: "text",
                    textExpression: newValue
                  } as Specification.TextMapping);
                }
                return true;
              }}
            />
          );
        }
        case "scale": {
          const scaleMapping = mapping as Specification.ScaleMapping;
          if (scaleMapping.scale) {
            const scaleObject = getById(
              parent.store.chart.scales,
              scaleMapping.scale
            );
            let scaleIcon = <span>f</span>;
            if (this.props.type == "color") {
              scaleIcon = <SVGImageIcon url={R.getSVGIcon("scale/color")} />;
            }
            return (
              <span
                className="el-mapping-scale"
                ref={e => (this.scaleMappingDisplay = e)}
                onClick={() => {
                  globals.popupController.popupAt(
                    context => (
                      <PopupView context={context}>
                        <DataMappAndScaleEditor
                          attribute={this.props.attribute}
                          parent={this}
                          defaultMapping={mapping}
                          options={options}
                          onClose={() => context.close()}
                        />
                      </PopupView>
                    ),
                    { anchor: this.scaleMappingDisplay }
                  );
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
    let shouldShowAddLegend =
      currentMapping &&
      currentMapping.type == "scale" &&
      (currentMapping as Specification.ScaleMapping).scale != null;
    const isDataMapping =
      currentMapping != null && currentMapping.type == "scale";
    shouldShowEraser = isDataMapping;
    shouldShowAddLegend = false; // we moved it to the scale panel.
    return (
      <DropZoneView
        // ref={(e) => this.mappingButton = ReactDOM.findDOMNode(e)}
        filter={data => {
          if (!shouldShowBindData) {
            return false;
          }
          if (data instanceof DragData.DataExpression) {
            if (options.acceptKinds != null) {
              if (options.acceptKinds.indexOf(data.metadata.kind) < 0) {
                return false;
              }
            }
            return true;
          } else {
            return false;
          }
        }}
        onDrop={(data: DragData.DataExpression, point, modifiers) => {
          if (!options.hints) {
            options.hints = {};
          }
          options.hints.newScale = modifiers.shiftKey;
          this.mapData(data, options.hints);
        }}
        className="charticulator__widget-control-mapping-editor"
      >
        {parent.horizontal(
          [1, 0],
          this.renderCurrentAttributeMapping(),
          <span>
            {shouldShowAddLegend ? (
              <Button
                icon="legend/legend"
                active={this.props.parent.store.isLegendExistForScale(
                  (currentMapping as Specification.ScaleMapping).scale
                )}
                title="Toggle legend for scale"
                onClick={() => {
                  new Actions.ToggleLegendForScale(
                    (currentMapping as Specification.ScaleMapping).scale
                  ).dispatch(parent.store.dispatcher);
                }}
              />
            ) : null}
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
                    showNoneAsValue: false
                  });
                }}
              />
            ) : null}
            {shouldShowBindData ? (
              <Button
                icon={"general/bind-data"}
                ref={e =>
                  (this.mappingButton = ReactDOM.findDOMNode(e) as Element)
                }
                onClick={() => {
                  this.beginDataFieldSelection();
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
  parent: MappingEditor;
  onClose: () => void;
}
export interface DataMappAndScaleEditorState {
  currentMapping: Specification.Mapping;
}

export class DataMappAndScaleEditor extends ContextedComponent<
  DataMappAndScaleEditorProps,
  DataMappAndScaleEditorState
> {
  public state = {
    currentMapping: this.props.defaultMapping
  };

  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [
      this.props.parent.updateEvents.addListener("update", () => {
        this.setState({
          currentMapping: this.props.parent.props.parent.getAttributeMapping(
            this.props.attribute
          )
        });
      })
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
          this.chartStore.chart.scales,
          scaleMapping.scale
        );
        return (
          <ScaleEditor
            scale={scaleObject}
            scaleMapping={scaleMapping}
            store={this.chartStore}
          />
        );
      }
    }
    return null;
  }

  public renderDataPicker() {
    const options = this.props.options;
    let currentExpression = null;
    const mapping = this.state.currentMapping;

    if (mapping != null && mapping.type == "scale") {
      currentExpression = (mapping as Specification.ScaleMapping).expression;
    }

    return (
      <DataFieldSelector
        datasetStore={this.datasetStore}
        kinds={options.acceptKinds}
        defaultValue={
          currentExpression
            ? { table: options.table, expression: currentExpression }
            : null
        }
        nullDescription={"(none)"}
        nullNotHighlightable={true}
        onChange={value => {
          if (value != null) {
            this.props.parent.mapData(
              new DragData.DataExpression(
                this.datasetStore.getTable(value.table),
                value.expression,
                value.lambdaExpression,
                value.type,
                value.metadata
              ),
              options.hints
            );
          } else {
            this.props.parent.clearMapping();
            this.props.onClose();
          }
        }}
      />
    );
  }

  public render() {
    const scaleElement = this.renderScaleEditor();
    if (scaleElement) {
      return (
        <div className="charticulator__data-mapping-and-scale-editor">
          <div className="el-data-picker">{this.renderDataPicker()}</div>
          <div className="el-scale-editor">{scaleElement}</div>
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

import * as React from "react";

import {
  Prototypes,
  Specification,
  Color,
  ColorGradient,
  getById,
  prettyNumber,
  deepClone
} from "../../../../core";
import {
  ColorPicker,
  GradientPicker,
  ButtonFlat,
  DropdownButton,
  SVGImageIcon,
  GradientView,
  ButtonFlatPanel
} from "../../../components";
import * as R from "../../../resources";
import * as globals from "../../../globals";
import { Droppable, DragContext, PopupView } from "../../../controllers";

import { Slider, InputText } from "./controls";

export interface ValueMappingEditorProps {
  type: string;
  description: Prototypes.AttributeDescription;
  defaultValue: Specification.AttributeValue;
  mapping: Specification.ValueMapping;
  onEdit: (newMapping: Specification.ValueMapping) => void;
}

export interface ValueMappingEditorState {
  editing: boolean;
}

export class ValueMappingEditor extends React.Component<
  ValueMappingEditorProps,
  ValueMappingEditorState
> {
  public refs: {
    content: HTMLSpanElement;
  };

  constructor(props: ValueMappingEditorProps) {
    super(props);
    this.state = {
      editing: this.props.mapping != null
    };
  }

  public componentWillReceiveProps(props: ValueMappingEditorProps) {
    this.setState({
      editing: props.mapping != null
    });
  }

  public startEditing(isFocused: boolean = false) {
    if (!isFocused) {
      switch (this.props.type) {
        case "color": {
          globals.popupController.popupAt(
            context => (
              <PopupView context={context}>
                <ColorPicker
                  defaultValue={
                    this.props.mapping
                      ? (this.props.mapping.value as Color)
                      : null
                  }
                  onPick={color => {
                    this.props.onEdit({
                      type: "value",
                      value: color
                    } as Specification.ValueMapping);
                  }}
                />
              </PopupView>
            ),
            { anchor: this.refs.content }
          );
          return;
        }
        case "color-gradient": {
          globals.popupController.popupAt(
            context => (
              <PopupView context={context}>
                <GradientPicker
                  defaultValue={
                    this.props.mapping
                      ? ((this.props.mapping.value as any) as ColorGradient)
                      : null
                  }
                  onPick={(gradient: ColorGradient) => {
                    this.props.onEdit({
                      type: "value",
                      value: gradient as Specification.Types.ColorGradient
                    } as Specification.ValueMapping);
                  }}
                />
              </PopupView>
            ),
            { anchor: this.refs.content }
          );
          return;
        }
      }
    }
    switch (this.props.type) {
      case "text-alignment":
      case "number":
      case "boolean":
      case "string":
        {
          this.setState({
            editing: true
          });
        }
        break;
    }
  }
  private _startEditing = this.startEditing.bind(this, false);
  private _startEditingFocused = this.startEditing.bind(this, true);

  public render() {
    if (!this.state.editing) {
      return (
        <span
          className="value-mapping-editor"
          ref="content"
          tabIndex={0}
          onClick={this._startEditing}
          onFocus={this._startEditingFocused}
        >
          {this.props.defaultValue != null ? (
            <ValueView type={this.props.type} value={this.props.defaultValue} />
          ) : (
            <span className="type-unknown">(none)</span>
          )}
        </span>
      );
    } else {
      return (
        <span
          className="value-mapping-editor"
          ref="content"
          onClick={this._startEditing}
        >
          <InlineEditorView
            type={this.props.type}
            value={
              this.props.mapping != null
                ? this.props.mapping.value
                : this.props.defaultValue
            }
            description={this.props.description}
            onEdit={(newValue, final) => {
              this.props.onEdit({
                type: "value",
                value: newValue
              } as Specification.ValueMapping);
            }}
            onCancel={() => {
              this.setState({
                editing: this.props.mapping != null
              });
            }}
          />
        </span>
      );
    }
  }
}

export function ValueView(props: {
  type: string;
  value: Specification.AttributeValue;
}) {
  switch (props.type) {
    case "number": {
      const value = props.value as number;
      const str = prettyNumber(value, 8);
      return <span className="type-number">{str}</span>;
    }
    case "boolean": {
      const value = props.value as boolean;
      return <span className="type-boolean">{value ? "Yes" : "No"}</span>;
    }
    case "string": {
      const value = props.value as string;
      return <span className="type-string">{props.value as string}</span>;
    }
    case "color": {
      const value = props.value as Color;
      const rgb = `rgb(${value.r.toFixed(0)},${value.g.toFixed(
        0
      )},${value.b.toFixed(0)})`;
      return <span className="type-color" style={{ backgroundColor: rgb }} />;
    }
    case "axis-data-binding": {
      const value = props.value as Specification.Types.AxisDataBinding;
      if (value.column) {
        return <span className="type-unknown">Axis: {value.column}</span>;
      } else {
        return <span className="type-unknown">Axis</span>;
      }
    }
    case "color-gradient": {
      const value = props.value as Specification.Types.ColorGradient;
      return (
        <span className="type-color-gradient">
          <GradientView gradient={value} />
        </span>
      );
    }
    case "text-alignment": {
      const value = props.value as Specification.Types.TextAlignment;
      const xIcon = R.getSVGIcon(
        { left: "align/left", middle: "align/x-middle", right: "align/right" }[
          value.x
        ]
      );
      const yIcon = R.getSVGIcon(
        { top: "align/top", middle: "align/y-middle", bottom: "align/bottom" }[
          value.y
        ]
      );
      return (
        <span className="type-text-alignment">
          <SVGImageIcon url={xIcon} /> <SVGImageIcon url={xIcon} />
        </span>
      );
    }
    default: {
      return <span className="type-unknown">(...)</span>;
    }
  }
}

export interface InlineEditorViewProps {
  type: string;
  description: Prototypes.AttributeDescription;
  value: Specification.AttributeValue;
  onEdit: (value: Specification.AttributeValue, final: boolean) => void;
  onCancel: () => void;
}

export class InlineEditorViewNumber extends React.Component<
  InlineEditorViewProps,
  {}
> {
  private inputElementRef: InputText;

  public render() {
    const props = this.props;
    const value = props.value as number;

    const inputElement = (
      <InputText
        ref={e => (this.inputElementRef = e)}
        defaultValue={value != null ? prettyNumber(value) : ""}
        onEnter={newValue => {
          const num = parseFloat(newValue);
          if (num == num && num != null) {
            props.onEdit(num, true);
            return true;
          } else {
            return false;
          }
        }}
        onCancel={() => {
          props.onCancel();
        }}
      />
    );
    if (props.description.defaultRange) {
      const range = props.description.defaultRange as [number, number];
      return (
        <span className="type-number-editor">
          {inputElement}
          <Slider
            width={100}
            min={range[0]}
            max={range[1]}
            onChange={(v, final) => {
              if (final) {
                props.onEdit(v, false);
              }
              this.inputElementRef.value = prettyNumber(v);
            }}
            defaultValue={value}
          />
        </span>
      );
    } else {
      return <span className="type-number-editor">{inputElement}</span>;
    }
  }
}

export function InlineEditorViewString(props: InlineEditorViewProps) {
  const value = props.value as string;
  return (
    <InputText
      defaultValue={value != null ? value : ""}
      onEnter={newValue => {
        props.onEdit(newValue, true);
        return true;
      }}
      onCancel={() => {
        props.onCancel();
      }}
    />
  );
}

export function InlineEditorViewBoolean(props: InlineEditorViewProps) {
  const value = props.value as boolean;
  return (
    <span className="type-boolean-editing">
      <ButtonFlatPanel
        url={R.getSVGIcon(value ? "checkbox/checked" : "checkbox/empty")}
        text={value ? "Yes" : "No"}
        onClick={() => {
          props.onEdit(!value, true);
        }}
      />
    </span>
  );
}

export function InlineEditorViewColor(props: InlineEditorViewProps) {
  const value = props.value as Color;
  const rgb = `rgb(${value.r.toFixed(0)},${value.g.toFixed(
    0
  )},${value.b.toFixed(0)})`;
  let contentView: HTMLSpanElement = null;
  return (
    <span className="type-color-editing">
      <span
        className="type-color"
        ref={v => (contentView = v)}
        style={{ backgroundColor: rgb }}
        onClick={() => {
          globals.popupController.popupAt(
            context => (
              <PopupView context={context}>
                <ColorPicker
                  defaultValue={value || null}
                  onPick={color => {
                    props.onEdit(color, false);
                  }}
                />
              </PopupView>
            ),
            { anchor: contentView }
          );
        }}
      />
    </span>
  );
}

export function InlineEditorViewTextAlignment(props: InlineEditorViewProps) {
  const value = props.value as Specification.Types.TextAlignment;
  const valueClone = deepClone(value);
  return (
    <span className="type-text-alignment-editor">
      <span className="editor-row">
        <DropdownButton
          list={[
            { name: "left", text: "Left", url: R.getSVGIcon("align/left") },
            {
              name: "middle",
              text: "Middle",
              url: R.getSVGIcon("align/x-middle")
            },
            { name: "right", text: "Right", url: R.getSVGIcon("align/right") }
          ]}
          url={R.getSVGIcon(
            {
              left: "align/left",
              middle: "align/x-middle",
              right: "align/right"
            }[valueClone.x]
          )}
          onSelect={name => {
            valueClone.x = name as any;
            props.onEdit(valueClone, true);
          }}
        />{" "}
        <DropdownButton
          list={[
            { name: "top", text: "Top", url: R.getSVGIcon("align/top") },
            {
              name: "middle",
              text: "Middle",
              url: R.getSVGIcon("align/y-middle")
            },
            {
              name: "bottom",
              text: "Bottom",
              url: R.getSVGIcon("align/bottom")
            }
          ]}
          url={R.getSVGIcon(
            {
              top: "align/top",
              middle: "align/y-middle",
              bottom: "align/bottom"
            }[valueClone.y]
          )}
          onSelect={name => {
            valueClone.y = name as any;
            props.onEdit(valueClone, true);
          }}
        />
      </span>
      {valueClone.x != "middle" ? (
        <span className="editor-row">
          x:{" "}
          <InputText
            defaultValue={prettyNumber(valueClone.xMargin)}
            onEnter={newValue => {
              const num = parseFloat(newValue);
              if (num == num && num != null) {
                valueClone.xMargin = num;
                props.onEdit(valueClone, true);
                return true;
              } else {
                return false;
              }
            }}
          />
        </span>
      ) : null}
      {valueClone.y != "middle" ? (
        <span className="editor-row">
          y:{" "}
          <InputText
            defaultValue={prettyNumber(valueClone.yMargin)}
            onEnter={newValue => {
              const num = parseFloat(newValue);
              if (num == num && num != null) {
                valueClone.yMargin = num;
                props.onEdit(valueClone, true);
                return true;
              } else {
                return false;
              }
            }}
          />
        </span>
      ) : null}
    </span>
  );
}

function getObjectKeys(object: Object): string[] {
  const r: string[] = [];
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      r.push(key);
    }
  }
  return r;
}

export function InlineEditorViewMapFactory(targetType: string) {
  return function InlineEditorViewMapType(
    props: InlineEditorViewProps
  ): JSX.Element {
    const value = props.value as {
      [name: string]: Specification.AttributeValue;
    };
    const valueClone = deepClone(value);
    const keys = getObjectKeys(value);
    return (
      <span className="type-map-editor">
        {keys.map((key, idx) => (
          <span className="editor-row" key={`m${idx}`}>
            <label title={key}>{key}</label>
            <InlineEditorView
              value={valueClone[key]}
              type={targetType}
              description={{ name: key, type: targetType }}
              onEdit={value => {
                valueClone[key] = value;
                props.onEdit(valueClone, false);
              }}
              onCancel={() => {}}
            />
          </span>
        ))}
      </span>
    );
  };
}

export let InlineEditorViewMapNumber = InlineEditorViewMapFactory("number");
export let InlineEditorViewMapColor = InlineEditorViewMapFactory("color");
export let InlineEditorViewMapBoolean = InlineEditorViewMapFactory("boolean");

export class InlineEditorView extends React.Component<
  InlineEditorViewProps,
  {}
> {
  public render() {
    const props = this.props;
    switch (props.type) {
      case "number":
        return <InlineEditorViewNumber {...props} />;
      case "string":
        return <InlineEditorViewString {...props} />;
      case "boolean":
        return <InlineEditorViewBoolean {...props} />;
      case "color":
        return <InlineEditorViewColor {...props} />;
      case "text-alignment":
        return <InlineEditorViewTextAlignment {...props} />;
      case "map<string,number>":
        return <InlineEditorViewMapNumber {...props} />;
      case "map<string,color>":
        return <InlineEditorViewMapColor {...props} />;
      case "map<string,boolean>":
        return <InlineEditorViewMapBoolean {...props} />;
      default: {
        if (this.props.value == null) {
          return <span className="type-unknown">(none)</span>;
        } else {
          return <ValueView type={this.props.type} value={this.props.value} />;
        }
      }
    }
  }
}

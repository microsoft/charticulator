import * as React from "react";

import { Actions, DragData } from "../../actions";
import { ChartStore } from "../../stores";
import {
  Droppable,
  DragContext,
  PopupView,
  DragModifiers
} from "../../controllers";
import {
  Prototypes,
  Specification,
  Color,
  getById,
  Point
} from "../../../core";
import * as globals from "../../globals";
import { classNames } from "../../utils";

import * as R from "../../resources";
import { SVGImageIcon } from "../../components";

import { ColorPicker } from "../../components";

import { ValueMappingEditor } from "./attribute_views";

import { ScaleEditor } from "./scale_editor";

export interface AttributeEditorProps {
  chart: Specification.Chart;
  attributeNames: string[];
  attributeDescriptions: { [name: string]: Prototypes.AttributeDescription };

  attributes: Specification.Mappings;

  constraints: Specification.Constraint[];

  onEdit: (name: string, newMapping: Specification.Mapping) => void;
  onMapData: (
    name: string,
    data: DragData.DataExpression,
    newScale: boolean
  ) => void;

  store: ChartStore;
}

export interface AttributeEditorState {}

export class AttributeEditor extends React.Component<
  AttributeEditorProps,
  AttributeEditorState
> {
  public renderItems(names: string[]) {
    return (
      <ul className="attribute-list">
        {names.map(name => (
          <AttributeEditorItem
            key={name}
            chart={this.props.chart}
            attributeName={name}
            attributeDescription={this.props.attributeDescriptions[name]}
            mapping={this.props.attributes[name]}
            onEdit={newMapping => this.props.onEdit(name, newMapping)}
            onMapData={(data, newScale) =>
              this.props.onMapData(name, data, newScale)
            }
            store={this.props.store}
          />
        ))}
      </ul>
    );
  }

  public render() {
    const attrs = this.props.attributeNames.filter(
      x => this.props.attributeDescriptions[x].mode != "positional"
    );
    const categories = new Set();
    for (const attr of attrs) {
      const category = this.props.attributeDescriptions[attr].category;
      if (category) {
        categories.add(category);
      } else {
        categories.add("undefined");
      }
    }
    let categoryOrder = [
      ["scaffold", "Scaffolds"],
      ["gaps", "Gap Ratios"],
      ["dimensions", "Dimensions"],
      ["margins", "Margins"],
      ["map", "Map"],
      ["text", "Text"],
      ["style", "Style"],
      ["scale-domain", "Domain"],
      ["scale-range", "Range"]
    ];
    categoryOrder = categoryOrder.filter(c => categories.has(c[0]));
    return (
      <ul className="attribute-list">
        {categoryOrder.map(c => {
          return (
            <section key={c[0]}>
              <label className="category">{c[1]}</label>
              {this.renderItems(
                attrs.filter(
                  x => this.props.attributeDescriptions[x].category == c[0]
                )
              )}
            </section>
          );
        })}
      </ul>
    );
  }
}

export interface AttributeEditorItemProps {
  chart: Specification.Chart;
  attributeName: string;
  attributeDescription: Prototypes.AttributeDescription;

  mapping: Specification.Mapping;

  onEdit: (newMapping: Specification.Mapping) => void;
  onMapData: (data: DragData.DataExpression, newScale: boolean) => void;

  store: ChartStore;
}

export interface AttributeEditorItemState {
  draggingOver: DragData.DataExpression;
}

export class AttributeEditorItem
  extends React.Component<AttributeEditorItemProps, AttributeEditorItemState>
  implements Droppable {
  public refs: {
    container: HTMLDivElement;
    content: HTMLSpanElement;
  };
  constructor(props: AttributeEditorItemProps) {
    super(props);
    this.state = {
      draggingOver: null
    };
  }

  public componentDidMount() {
    globals.dragController.registerDroppable(this, this.refs.container);
  }

  public componentWillUnmount() {
    globals.dragController.unregisterDroppable(this);
  }

  public renderMapping(item: Specification.Mapping) {
    if (item == null || item.type == "value") {
      const value = item as Specification.ValueMapping;
      return (
        <ValueMappingEditor
          type={this.props.attributeDescription.type}
          description={this.props.attributeDescription}
          defaultValue={this.props.attributeDescription.defaultValue}
          mapping={value}
          onEdit={this.props.onEdit}
        />
      );
    }
    switch (item.type) {
      case "parent": {
        return (
          <span className="mapping-parent">
            glyph.{(item as Specification.ParentMapping).parentAttribute}
          </span>
        );
      }
      case "scale": {
        const scale = item as Specification.ScaleMapping;
        if (scale.scale) {
          const scaleObject = getById(this.props.chart.scales, scale.scale);
          if (scaleObject) {
            return (
              <span
                className="mapping-scale"
                onClick={() => {
                  globals.popupController.popupAt(
                    context => (
                      <PopupView context={context}>
                        <ScaleEditor
                          scale={scaleObject}
                          scaleMapping={scale}
                          store={this.props.store}
                        />
                      </PopupView>
                    ),
                    { anchor: this.refs.content }
                  );
                }}
              >
                <span className="mapping-scale-scale left">
                  {scaleObject.properties.name}
                </span>
                <svg width={6} height={20}>
                  <path d="M3.2514,10A17.37314,17.37314,0,0,1,6,0H0V20H6A17.37342,17.37342,0,0,1,3.2514,10Z" />
                </svg>
                <span className="mapping-scale-column">{scale.expression}</span>
                <svg width={6} height={20}>
                  <path d="M2.7486,10A17.37314,17.37314,0,0,0,0,0H6V20H0A17.37342,17.37342,0,0,0,2.7486,10Z" />
                </svg>
              </span>
            );
          } else {
            console.warn("Scale undefined: " + scale.scale);
            return null;
          }
        } else {
          return (
            <span className="mapping-scale">
              <span className="mapping-scale-column">{scale.expression}</span>
            </span>
          );
        }
      }
    }
    return <code>{JSON.stringify(this.props.mapping)}</code>;
  }

  public onDragEnter(ctx: DragContext) {
    const data = ctx.data;
    if (data instanceof DragData.DataExpression) {
      this.setState({
        draggingOver: data
      });
      ctx.onLeave(() => {
        this.setState({
          draggingOver: null
        });
      });
      ctx.onDrop((point: Point, modifiers: DragModifiers) => {
        this.props.onMapData(data, modifiers.shiftKey);
      });
      return true;
    }
  }

  public render() {
    return (
      <li
        className={classNames("attribute-item", [
          "active",
          this.state.draggingOver != null
        ])}
        ref="container"
      >
        <label>
          {this.props.attributeDescription.displayName ||
            this.props.attributeName}
        </label>
        <span className="content" ref="content">
          {this.renderMapping(this.props.mapping)}
        </span>
        <span className="buttons">
          {this.props.mapping &&
          this.props.mapping.type == "scale" &&
          (this.props.mapping as Specification.ScaleMapping).scale ? (
            <span
              className="button"
              title="Add legend for this scale"
              onClick={() => {
                new Actions.ToggleLegendForScale(
                  (this.props.mapping as Specification.ScaleMapping).scale
                ).dispatch(this.props.store.dispatcher);
              }}
            >
              <SVGImageIcon url={R.getSVGIcon("legend/legend")} />
            </span>
          ) : null}
          {this.props.mapping ? (
            <span
              className="button"
              title="Remove"
              onClick={() => this.props.onEdit(null)}
            >
              <SVGImageIcon url={R.getSVGIcon("general/eraser")} />
            </span>
          ) : null}
        </span>
      </li>
    );
  }
}

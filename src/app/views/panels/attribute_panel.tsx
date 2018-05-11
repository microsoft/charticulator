import * as React from "react";
import { EventEmitter, EventSubscription } from "../../../core";

import {
  Specification,
  Prototypes,
  zipArray,
  zip,
  Solver,
  Point,
  Geometry,
  ZoomInfo,
  indexOf
} from "../../../core";

import { Actions } from "../../actions";
import {
  ChartStore,
  GlyphStore,
  Selection,
  MarkSelection,
  GlyphSelection,
  ChartElementSelection
} from "../../stores";
import { SVGImageIcon } from "../../components";
import * as R from "../../resources";

import { AttributeEditor } from "./attribute_editor";

import { WidgetManager } from "./widgets/manager";
import { EditableTextView } from "../../components";

function getObjectIcon(classID: string) {
  return R.getSVGIcon(
    Prototypes.ObjectClasses.GetMetadata(classID).iconPath || "object"
  );
}

export class AttributePanel extends React.Component<
  {
    store: ChartStore;
  },
  {}
> {
  public tokens: EventSubscription[] = [];

  public componentDidMount() {
    this.tokens.push(
      this.props.store.addListener(ChartStore.EVENT_GRAPHICS, () => {
        this.forceUpdate();
      })
    );
    this.tokens.push(
      this.props.store.addListener(ChartStore.EVENT_SELECTION, () => {
        this.forceUpdate();
      })
    );
  }

  public componentWillUnmount() {
    this.tokens.forEach(token => token.remove());
    this.tokens = [];
  }

  public render() {
    const selection = this.props.store.currentSelection;
    let object: Specification.Object;
    let objectClass: Prototypes.ObjectClass;
    let manager: WidgetManager;
    if (selection) {
      if (selection instanceof GlyphSelection) {
        const glyph = selection.glyph;
        object = glyph;
        objectClass = Prototypes.ObjectClasses.Create(null, object, null);
        manager = new WidgetManager(this.props.store, objectClass);
        manager.onEditMappingHandler = (attribute, mapping) => {
          new Actions.SetGlyphAttribute(glyph, attribute, mapping).dispatch(
            this.props.store.dispatcher
          );
        };
      }
      if (selection instanceof MarkSelection) {
        const glyph = selection.glyph;
        const mark = selection.mark;
        object = mark;
        objectClass = Prototypes.ObjectClasses.Create(null, mark, null);
        manager = new WidgetManager(this.props.store, objectClass);
        manager.onEditMappingHandler = (attribute, mapping) => {
          new Actions.SetMarkAttribute(
            glyph,
            mark,
            attribute,
            mapping
          ).dispatch(this.props.store.dispatcher);
        };
        manager.onMapDataHandler = (attribute, data, hints) => {
          new Actions.MapDataToMarkAttribute(
            glyph,
            mark,
            attribute,
            objectClass.attributes[attribute].type,
            data.expression,
            data.valueType,
            hints
          ).dispatch(this.props.store.dispatcher);
        };
      }
      if (selection instanceof ChartElementSelection) {
        const markLayout = selection.chartElement as Specification.PlotSegment;
        const layoutClass = this.props.store.chartManager.getClassById(
          markLayout._id
        );
        object = markLayout;
        objectClass = layoutClass;
        manager = new WidgetManager(this.props.store, objectClass);
        manager.onEditMappingHandler = (attribute, mapping) => {
          new Actions.SetChartElementMapping(
            markLayout,
            attribute,
            mapping
          ).dispatch(this.props.store.dispatcher);
        };
        if (Prototypes.isType(layoutClass.object.classID, "links")) {
          manager.onMapDataHandler = (attribute, data, hints) => {
            new Actions.MapDataToChartElementAttribute(
              markLayout,
              attribute,
              objectClass.attributes[attribute].type,
              data.table.name,
              data.expression,
              data.valueType,
              hints
            ).dispatch(this.props.store.dispatcher);
          };
        }
      }
    } else {
      const chart = this.props.store.chart;
      const boundClass = Prototypes.ObjectClasses.Create(
        null,
        chart,
        this.props.store.chartState
      );
      object = chart;
      objectClass = boundClass;
      manager = new WidgetManager(this.props.store, objectClass);
      manager.onEditMappingHandler = (attribute, mapping) => {
        new Actions.SetChartAttribute(attribute, mapping).dispatch(
          this.props.store.dispatcher
        );
      };
    }
    if (manager) {
      return (
        <div className="attribute-editor charticulator__widget-container">
          <section className="attribute-editor-element" key={object._id}>
            <div className="header">
              <SVGImageIcon url={getObjectIcon(object.classID)} />
              <EditableTextView
                text={object.properties.name}
                onEdit={newValue => {
                  new Actions.SetObjectProperty(
                    object,
                    "name",
                    null,
                    newValue,
                    true
                  ).dispatch(this.props.store.dispatcher);
                }}
              />
            </div>
            {manager.vertical(...objectClass.getAttributePanelWidgets(manager))}
          </section>
        </div>
      );
    }
  }
}

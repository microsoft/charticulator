// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Prototypes, Specification } from "../../../core";
import { Actions } from "../../actions";
import { EditableTextView, SVGImageIcon } from "../../components";

import {
  ChartElementSelection,
  AppStore,
  GlyphSelection,
  MarkSelection,
} from "../../stores";
import { FluentUIWidgetManager } from "./widgets/fluentui_manager";
import { strings } from "../../../strings";

function getObjectIcon(classID: string) {
  return R.getSVGIcon(
    Prototypes.ObjectClasses.GetMetadata(classID).iconPath || "object"
  );
}

export class AttributePanel extends React.Component<
  {
    store: AppStore;
  },
  {}
> {
  public tokens: EventSubscription[] = [];

  public componentDidMount() {
    this.tokens.push(
      this.props.store.addListener(AppStore.EVENT_GRAPHICS, () => {
        this.forceUpdate();
      })
    );
    this.tokens.push(
      this.props.store.addListener(AppStore.EVENT_SELECTION, () => {
        this.forceUpdate();
      })
    );
  }

  public componentWillUnmount() {
    this.tokens.forEach((token) => token.remove());
    this.tokens = [];
  }

  public renderUnexpectedState(message: string) {
    return (
      <div className="attribute-editor charticulator__widget-container">
        <div className="attribute-editor-unexpected">{message}</div>
      </div>
    );
  }

  // eslint-disable-next-line
  public render() {
    const selection = this.props.store.currentSelection;
    let object: Specification.Object;
    let objectClass: Prototypes.ObjectClass;
    let manager: FluentUIWidgetManager;
    if (selection) {
      if (selection instanceof GlyphSelection) {
        if (!selection.plotSegment) {
          return this.renderUnexpectedState(strings.canvas.markContainer);
        }
        const glyph = selection.glyph;
        object = glyph;
        objectClass = this.props.store.chartManager.getGlyphClass(
          this.props.store.chartManager.findGlyphState(
            selection.plotSegment,
            selection.glyph,
            this.props.store.getSelectedGlyphIndex(selection.plotSegment._id)
          )
        );
        manager = new FluentUIWidgetManager(this.props.store, objectClass);
        manager.onEditMappingHandler = (attribute, mapping) => {
          new Actions.SetGlyphAttribute(glyph, attribute, mapping).dispatch(
            this.props.store.dispatcher
          );
        };
      }
      if (selection instanceof MarkSelection) {
        if (!selection.plotSegment) {
          return this.renderUnexpectedState(strings.canvas.markContainer);
        }
        const glyph = selection.glyph;
        const mark = selection.mark;
        object = mark;
        objectClass = this.props.store.chartManager.getMarkClass(
          this.props.store.chartManager.findMarkState(
            selection.plotSegment,
            selection.glyph,
            selection.mark,
            this.props.store.getSelectedGlyphIndex(selection.plotSegment._id)
          )
        );
        manager = new FluentUIWidgetManager(this.props.store, objectClass);
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
            data.metadata,
            hints,
            data.table.name
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
        manager = new FluentUIWidgetManager(this.props.store, objectClass);
        manager.onEditMappingHandler = (attribute, mapping) => {
          new Actions.SetChartElementMapping(
            markLayout,
            attribute,
            mapping
          ).dispatch(this.props.store.dispatcher);
        };
        manager.onMapDataHandler = (attribute, data, hints) => {
          new Actions.MapDataToChartElementAttribute(
            markLayout,
            attribute,
            objectClass.attributes[attribute].type,
            data.table.name,
            data.expression,
            data.valueType,
            data.metadata,
            hints
          ).dispatch(this.props.store.dispatcher);
        };
      }
    } else {
      const chart = this.props.store.chart;
      const boundClass = this.props.store.chartManager.getChartClass(
        this.props.store.chartState
      );
      object = chart;
      objectClass = boundClass;
      manager = new FluentUIWidgetManager(this.props.store, objectClass);
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
              <SVGImageIcon
                url={getObjectIcon(object.classID)}
                height={32}
                width={32}
              />
              <EditableTextView
                text={object.properties.name}
                onEdit={(newValue) => {
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

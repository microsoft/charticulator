// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types */

import * as React from "react";

import * as globals from "../../../globals";

import {
  EventSubscription,
  Point,
  Prototypes,
  Specification,
} from "../../../../core";
import { DragData } from "../../../actions";
import {
  DragContext,
  DragModifiers,
  Droppable,
} from "../../../controllers/drag_controller";

import { AppStore } from "../../../stores";
import { classNames } from "../../../utils/index";

export type OnEditMappingHandler = (
  attribute: string,
  mapping: Specification.Mapping
) => void;
export type OnMapDataHandler = (
  attribute: string,
  data: DragData.DataExpression,
  hints: Prototypes.DataMappingHints
) => void;
export type OnSetPropertyHandler = (
  property: string,
  field: string,
  value: Specification.AttributeValue
) => void;

export interface CharticulatorPropertyAccessors {
  emitSetProperty?: (
    property: Prototypes.Controls.Property,
    value: Specification.AttributeValue
  ) => void;
  store: AppStore;

  getAttributeMapping?: (attribute: string) => Specification.Mapping;
  onEditMappingHandler?: OnEditMappingHandler;
  onMapDataHandler?: OnMapDataHandler;
}

export interface DropZoneViewProps {
  /** Determine whether the data is acceptable */
  filter: (x: any) => boolean;
  /** The user dropped the thing */
  onDrop: (data: any, point: Point, modifiers: DragModifiers) => void;
  /** className of the root div element */
  className: string;
  onClick?: () => void;
  /** Display this instead when dragging (normally we show what's in this view) */
  draggingHint?: () => JSX.Element;
}

export interface DropZoneViewState {
  isInSession: boolean;
  isDraggingOver: boolean;
  data: any;
}

export class DropZoneView
  extends React.Component<DropZoneViewProps, DropZoneViewState>
  implements Droppable {
  public dropContainer: HTMLDivElement;
  public tokens: EventSubscription[];

  constructor(props: DropZoneViewProps) {
    super(props);
    this.state = {
      isInSession: false,
      isDraggingOver: false,
      data: null,
    };
  }

  public componentDidMount() {
    globals.dragController.registerDroppable(this, this.dropContainer);
    this.tokens = [
      globals.dragController.addListener("sessionstart", () => {
        const session = globals.dragController.getSession();
        if (this.props.filter(session.data)) {
          this.setState({
            isInSession: true,
          });
        }
      }),
      globals.dragController.addListener("sessionend", () => {
        this.setState({
          isInSession: false,
        });
      }),
    ];
  }

  public componentWillUnmount() {
    globals.dragController.unregisterDroppable(this);
    this.tokens.forEach((x) => x.remove());
  }

  public onDragEnter(ctx: DragContext) {
    const data = ctx.data;
    const judge = this.props.filter(data);
    if (judge) {
      this.setState({
        isDraggingOver: true,
        data,
      });
      ctx.onLeave(() => {
        this.setState({
          isDraggingOver: false,
          data: null,
        });
      });
      ctx.onDrop((point: Point, modifiers: DragModifiers) => {
        this.props.onDrop(data, point, modifiers);
      });
      return true;
    }
  }

  public render() {
    return (
      <div
        className={classNames(
          this.props.className,
          ["is-in-session", this.state.isInSession],
          ["is-dragging-over", this.state.isDraggingOver]
        )}
        onClick={this.props.onClick}
        ref={(e) => (this.dropContainer = e)}
      >
        {this.props.draggingHint == null
          ? this.props.children
          : this.state.isInSession
          ? this.props.draggingHint()
          : this.props.children}
      </div>
    );
  }
}

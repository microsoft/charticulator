// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ContextedComponent } from "../../context_component";
import { EventSubscription } from "../../../core";
import { AppStore } from "../../stores";
import { DraggableElement, SVGImageIcon } from "../../components";
import { Actions, DragData } from "../../actions";
import { getSVGIcon } from "../../resources";
import {
  DefaultButton,
  IconButton,
} from "@fluentui/react";
import * as React from "react";
import { ObjectButtonProps } from "../fluentui_tool_bar";


export class ObjectTextButton extends ContextedComponent<ObjectButtonProps,
  Record<string, unknown>> {
  public token: EventSubscription;

  public getIsActive() {
    return (
      this.store.currentTool == this.props.classID &&
      this.store.currentToolOptions == this.props.options
    );
  }

  public componentDidMount() {
    this.token = this.context.store.addListener(
      AppStore.EVENT_CURRENT_TOOL,
      () => {
        this.forceUpdate();
      }
    );
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    return (
      <>
        <DraggableElement
          styles={{
            width: "100%",
          }}
          dragData={
            this.props.noDragging
              ? null
              : this.props.onDrag
                ? this.props.onDrag
                : () => {
                  return new DragData.ObjectType(
                    this.props.classID,
                    this.props.options
                  );
                }
          }
          onDragStart={() => this.setState({dragging: true})}
          onDragEnd={() => this.setState({dragging: false})}
          renderDragElement={() => {
            return [
              <SVGImageIcon
                url={getSVGIcon(this.props.icon)}
                width={32}
                height={32}
              />,
              {x: -16, y: -16},
            ];
          }}
        >
          <DefaultButton
            iconProps={{
              iconName: this.props.icon,
            }}
            title={this.props.title}
            text={this.props.text}
            checked={this.getIsActive()}
            onClick={() => {
              this.dispatch(
                new Actions.SetCurrentTool(
                  this.props.classID,
                  this.props.options
                )
              );
              if (this.props.onClick) {
                this.props.onClick();
              }
            }}
            styles={{
              root: {
                border: "none",
                paddingLeft: 3,
                paddingRight: 3,
                width: "100%",
              },
              label: {
                fontWeight: "400",
                textAlign: "left",
              },
              icon: {
                color: "rgb(0, 120, 212)",
              },
            }}
          />
        </DraggableElement>
      </>
    );
  }
}

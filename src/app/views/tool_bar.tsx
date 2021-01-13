// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../globals";
import * as R from "../resources";

import { EventSubscription } from "../../core";
import { Actions, DragData } from "../actions";
import { MenuButton, SVGImageIcon, ToolButton } from "../components";
import { ContextedComponent } from "../context_component";
import { PopupView } from "../controllers";

import { classNames } from "../utils";
import { LinkCreationPanel } from "./panels/link_creator";
import { LegendCreationPanel } from "./panels/legend_creator";
import { AppStore } from "../stores";
import { strings } from "../../strings";
import { LayoutDirection, UndoRedoLocation } from "../main_view";

export class Toolbar extends ContextedComponent<
  {
    layout: LayoutDirection;
    undoRedoLocation: UndoRedoLocation;
    toolbarLabels: boolean;
  },
  {}
> {
  public token: EventSubscription;

  public componentDidMount() {
    this.token = this.store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
      this.forceUpdate();
    });
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  private getGlyphToolItems(labels: boolean = true) {
    return [
      <>
        <>
          <span className={"chartaccent__toolbar-horizontal-separator"} />
          {labels && (
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "chartaccent__toolbar-vertical-label"
                  : "chartaccent__toolbar-label"
              }
            >
              {strings.toolbar.marks}
            </span>
          )}
          <MultiObjectButton
            compact={this.props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.rect",
                title: strings.toolbar.rectangle,
                icon: "mark/rect",
                options: '{"shape":"rectangle"}',
              },
              {
                classID: "mark.rect",
                title: strings.toolbar.ellipse,
                icon: "mark/ellipse",
                options: '{"shape":"ellipse"}',
              },
              {
                classID: "mark.rect",
                title: strings.toolbar.triangle,
                icon: "mark/triangle",
                options: '{"shape":"triangle"}',
              },
            ]}
          />
          <ObjectButton
            classID="mark.symbol"
            title={strings.toolbar.symbol}
            icon="mark/symbol"
          />
          <ObjectButton
            classID="mark.line"
            title={strings.toolbar.line}
            icon="mark/line"
          />
          <MultiObjectButton
            compact={this.props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.text",
                title: strings.toolbar.text,
                icon: "mark/text",
              },
              {
                classID: "mark.textbox",
                title: strings.toolbar.textbox,
                icon: "mark/textbox",
              },
            ]}
          />
          <MultiObjectButton
            compact={this.props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.icon",
                title: strings.toolbar.icon,
                icon: "mark/icon",
              },
              {
                classID: "mark.image",
                title: strings.toolbar.image,
                icon: "mark/image",
              },
            ]}
          />
          <ObjectButton
            classID="mark.data-axis"
            title={strings.toolbar.dataAxis}
            icon="mark/data-axis"
          />
          {/* Nested chart doesn't supported */}
          {/* <ObjectButton
            classID="mark.nested-chart"
            title="Nested Chart"
            icon="mark/nested-chart"
          /> */}
          {this.props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
            <>
              <span className={"chartaccent__toolbar-horizontal-separator"} />
              <ToolButton
                title={strings.menuBar.undo}
                icon={R.getSVGIcon("toolbar/undo")}
                onClick={() =>
                  new Actions.Undo().dispatch(this.context.store.dispatcher)
                }
              />
              <ToolButton
                title={strings.menuBar.redo}
                icon={R.getSVGIcon("toolbar/redo")}
                onClick={() =>
                  new Actions.Redo().dispatch(this.context.store.dispatcher)
                }
              />
            </>
          ) : null}
        </>
      </>,
    ];
  }

  private getChartToolItems(labels: boolean = true) {
    return [
      <>
        <LinkButton label={true} />
        <LegendButton />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "chartaccent__toolbar-vertical-label"
                : "chartaccent__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        <MultiObjectButton
          compact={this.props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "guide-y",
              title: strings.toolbar.guideY,
              icon: "guide/x",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "guide-x",
              title: strings.toolbar.guideX,
              icon: "guide/y",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "guide-coordinator-x",
              title: strings.toolbar.guideX,
              icon: "guide/coordinator-x",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-y",
              title: strings.toolbar.guideY,
              icon: "guide/coordinator-y",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-polar",
              title: strings.toolbar.guidePolar,
              icon: "plot-segment/polar",
              options: '{"shape":"triangle"}',
            },
          ]}
        />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "chartaccent__toolbar-vertical-label"
                  : "chartaccent__toolbar-label"
              }
            >
              {this.props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        <MultiObjectButton
          compact={this.props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "plot-segment.cartesian",
              title: strings.toolbar.region2D,
              icon: "plot/region",
              noDragging: true
            },
            {
              classID:"plot-segment.line",
              title: strings.toolbar.line,
              icon:"plot/line",
              noDragging: true
            },
          ]}
        />
        <>
          <span className={"chartaccent__toolbar-horizontal-separator"} />
          {labels && (
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "chartaccent__toolbar-vertical-label"
                  : "chartaccent__toolbar-label"
              }
            >
              {strings.toolbar.scaffolds}
            </span>
          )}
          <MultiObjectButton
            compact={this.props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "",
                title: strings.toolbar.lineH,
                icon: "scaffold/cartesian-x",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("cartesian-x")
              },
              {
                classID: "",
                title: strings.toolbar.lineV,
                icon: "scaffold/cartesian-y",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("cartesian-y")
              },
              {
                classID: "",
                title: strings.toolbar.polar,
                icon: "scaffold/circle",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("polar")
              },
              {
                classID: "",
                title: strings.toolbar.curve,
                icon: "scaffold/curve",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("curve")
              },
            ]}
          />
        </>
      </>,
    ];
  }

  private getToolItems(labels: boolean = true) {
    return (
      <>
        {this.props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
          <>
            <ToolButton
              title={strings.menuBar.undo}
              icon={R.getSVGIcon("toolbar/undo")}
              onClick={() =>
                new Actions.Undo().dispatch(this.context.store.dispatcher)
              }
            />
            <ToolButton
              title={strings.menuBar.redo}
              icon={R.getSVGIcon("toolbar/redo")}
              onClick={() =>
                new Actions.Redo().dispatch(this.context.store.dispatcher)
              }
            />
            <span className={"chartaccent__toolbar-horizontal-separator"} />
          </>
        ) : null}
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "chartaccent__toolbar-vertical-label"
                : "chartaccent__toolbar-label"
            }
          >
            {strings.toolbar.marks}
          </span>
        )}
        <MultiObjectButton
          compact={this.props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.rect",
              title: strings.toolbar.rectangle,
              icon: "mark/rect",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.ellipse,
              icon: "mark/ellipse",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.triangle,
              icon: "mark/triangle",
              options: '{"shape":"triangle"}',
            },
          ]}
        />
        <ObjectButton classID="mark.symbol" title="Symbol" icon="mark/symbol" />
        <ObjectButton classID="mark.line" title="Line" icon="mark/line" />
        <MultiObjectButton
          compact={this.props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.text",
              title: strings.toolbar.text,
              icon: "mark/text",
            },
            {
              classID: "mark.textbox",
              title: strings.toolbar.textbox,
              icon: "mark/textbox",
            },
          ]}
        />
        <MultiObjectButton
          compact={this.props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.icon",
              title: strings.toolbar.icon,
              icon: "mark/icon",
            },
            {
              classID: "mark.image",
              title: strings.toolbar.image,
              icon: "mark/image",
            },
          ]}
        />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        <ObjectButton
          classID="mark.data-axis"
          title={strings.toolbar.dataAxis}
          icon="mark/data-axis"
        />
        <ObjectButton
          classID="mark.nested-chart"
          title={strings.toolbar.nestedChart}
          icon="mark/nested-chart"
        />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        <LinkButton label={labels} />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "chartaccent__toolbar-vertical-label"
                : "chartaccent__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        <MultiObjectButton
          compact={this.props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "guide-y",
              title: strings.toolbar.guideY,
              icon: "guide/x",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "guide-x",
              title: strings.toolbar.guideX,
              icon: "guide/y",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "guide-coordinator-x",
              title: strings.toolbar.guideX,
              icon: "guide/coordinator-x",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-y",
              title: strings.toolbar.guideY,
              icon: "guide/coordinator-y",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-polar",
              title: strings.toolbar.guidePolar,
              icon: "plot-segment/polar",
              options: '{"shape":"triangle"}',
            },
          ]}
        />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "chartaccent__toolbar-vertical-label"
                  : "chartaccent__toolbar-label"
              }
            >
              {this.props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        <ObjectButton
          classID="plot-segment.cartesian"
          title={strings.toolbar.region2D}
          icon="plot/region"
          noDragging={true}
        />
        <ObjectButton
          classID="plot-segment.line"
          title={strings.toolbar.line}
          icon="plot/line"
          noDragging={true}
        />
        <span className={"chartaccent__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "chartaccent__toolbar-vertical-label"
                : "chartaccent__toolbar-label"
            }
          >
            {strings.toolbar.scaffolds}
          </span>
        )}
        <ScaffoldButton
          type="cartesian-x"
          title={strings.toolbar.lineH}
          icon="scaffold/cartesian-x"
          currentTool={this.store.currentTool}
        />
        <ScaffoldButton
          type="cartesian-y"
          title={strings.toolbar.lineV}
          icon="scaffold/cartesian-y"
          currentTool={this.store.currentTool}
        />
        <ScaffoldButton
          type="polar"
          title={strings.toolbar.polar}
          icon="scaffold/circle"
          currentTool={this.store.currentTool}
        />
        <ScaffoldButton
          type="curve"
          title={strings.toolbar.curve}
          icon="scaffold/curve"
          currentTool={this.store.currentTool}
        />
      </>
    );
  }

  public render() {
    let tooltipsItems = [];
    if (this.context.store.editorType === "embedded") {
      const chartToolItems = this.getChartToolItems(this.props.toolbarLabels);
      const glyphToolItems = this.getGlyphToolItems(this.props.toolbarLabels);
      tooltipsItems = [...chartToolItems, ...glyphToolItems];
    } else {
      tooltipsItems = [this.getToolItems(this.props.toolbarLabels)];
    }
    return (
      <>
        <div
          className={
            this.props.layout === LayoutDirection.Vertical
              ? "chartaccent__toolbar-vertical"
              : "chartaccent__toolbar-horizontal"
          }
        >
          <div className="charticulator__toolbar-buttons-align-left">
            {tooltipsItems.map((item, index) => {
              return (
                <React.Fragment key={index}>
                  <div
                    key={index}
                    className={
                      this.props.layout === LayoutDirection.Vertical
                        ? "chartaccent__toolbar-vertical-group"
                        : "chartaccent__toolbar-horizontal-group"
                    }
                  >
                    {item}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </>
    );
  }
}

export interface ObjectButtonProps {
  title: string;
  text?: string;
  classID: string;
  icon: string;
  options?: string;
  noDragging?: boolean;
  onClick?: () => void;
  onDrag?: () => any;
  compact?: boolean;
}

export class ObjectButton extends ContextedComponent<ObjectButtonProps, {}> {
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
      <ToolButton
        icon={R.getSVGIcon(this.props.icon)}
        active={this.getIsActive()}
        title={this.props.title}
        text={this.props.text}
        compact={this.props.compact}
        onClick={() => {
          this.dispatch(
            new Actions.SetCurrentTool(this.props.classID, this.props.options)
          );
          if (this.props.onClick) {
            this.props.onClick();
          }
        }}
        dragData={
          this.props.noDragging
            ? null
            : this.props.onDrag ? this.props.onDrag : () => {
                return new DragData.ObjectType(
                  this.props.classID,
                  this.props.options
                );
              }
        }
      />
    );
  }
}

export class MultiObjectButton extends ContextedComponent<
  {
    compact?: boolean;
    tools: ObjectButtonProps[];
  },
  {
    currentSelection: {
      classID: string;
      options: string;
    };
  }
> {
  public state = {
    currentSelection: {
      classID: this.props.tools[0].classID,
      options: this.props.tools[0].options,
    },
  };
  private refButton: ObjectButton;
  public token: EventSubscription;

  public isActive() {
    const store = this.store;
    for (const item of this.props.tools) {
      if (
        item.classID == store.currentTool &&
        item.options == store.currentToolOptions
      ) {
        return true;
      }
    }
    return false;
  }
  public getSelectedTool() {
    for (const item of this.props.tools) {
      if (
        item.classID == this.state.currentSelection.classID &&
        item.options == this.state.currentSelection.options
      ) {
        return item;
      }
    }
    return this.props.tools[0];
  }

  public componentDidMount() {
    this.token = this.store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
      for (const item of this.props.tools) {
        // If the tool is within the tools defined here, we update the current selection
        if (
          this.store.currentTool == item.classID &&
          this.store.currentToolOptions == item.options
        ) {
          this.setState({
            currentSelection: {
              classID: item.classID,
              options: item.options,
            },
          });
          break;
        }
      }
      this.forceUpdate();
    });
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    const openContextMenu = () => {
      globals.popupController.popupAt(
        (context) => {
          return (
            <PopupView context={context}>
              {this.props.tools.map((tool, index) => (
                <div
                  key={index}
                  className="charticulator__button-multi-tool-dropdown"
                >
                  <ObjectButton
                    {...tool}
                    noDragging={tool.noDragging !== undefined ? tool.noDragging : true}
                    onClick={() => context.close()}
                  />
                </div>
              ))}
            </PopupView>
          );
        },
        {
          anchor: ReactDOM.findDOMNode(this.refButton) as Element,
          alignX: "end-outer",
          alignY: "start-inner",
        }
      );
    };

    const onClick = () => {
      if (this.props.compact) {
        openContextMenu();
      }
    };

    const onClickContextMenu = () => {
      if (!this.props.compact) {
        openContextMenu();
      }
    };

    return (
      <div
        className={classNames("charticulator__button-multi-tool", [
          "is-active",
          this.isActive(),
        ])}
      >
        <ObjectButton
          ref={(e) => (this.refButton = e)}
          {...this.getSelectedTool()}
          onClick={onClick}
          compact={this.props.compact}
        />
        <span
          className="el-dropdown"
          ref={(e) => {
            if (this.props.compact) {
              return;
            }
            this.refButton = e as any;
          }}
          onClick={onClickContextMenu}
        >
          {this.props.compact ? null : (
            <SVGImageIcon url={R.getSVGIcon("general/chevron-down")} />
          )}
        </span>
      </div>
    );
  }
}

export class ScaffoldButton extends ContextedComponent<
  {
    currentTool: string;
    title: string;
    type: string;
    icon: string;
  },
  {}
> {
  public render() {
    return (
      <ToolButton
        icon={R.getSVGIcon(this.props.icon)}
        active={this.props.currentTool == this.props.type}
        title={this.props.title}
        onClick={() => {
          // this.dispatch(new Actions.SetCurrentTool(this.props.type));
        }}
        dragData={() => {
          return new DragData.ScaffoldType(this.props.type);
        }}
      />
    );
  }
}

export class LinkButton extends ContextedComponent<
  {
    label: boolean;
  },
  {}
> {
  public container: HTMLSpanElement;

  public render() {
    return (
      <span ref={(e) => (this.container = e)}>
        <ToolButton
          title={strings.toolbar.link}
          text={this.props.label ? strings.toolbar.link : ""}
          icon={R.getSVGIcon("link/tool")}
          active={this.store.currentTool == "link"}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => (
                <PopupView context={context}>
                  <LinkCreationPanel onFinish={() => context.close()} />
                </PopupView>
              ),
              { anchor: this.container }
            );
          }}
        />
      </span>
    );
  }
}

export class LegendButton extends ContextedComponent<{}, {}> {
  public container: HTMLSpanElement;

  public render() {
    return (
      <span ref={(e) => (this.container = e)}>
        <ToolButton
          title={strings.toolbar.legend}
          icon={R.getSVGIcon("legend/legend")}
          active={this.store.currentTool == "legend"}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => (
                <PopupView context={context}>
                  <LegendCreationPanel onFinish={() => context.close()} />
                </PopupView>
              ),
              { anchor: this.container }
            );
          }}
        />
      </span>
    );
  }
}

export class CheckboxButton extends React.Component<
  {
    value: boolean;
    text?: string;
    onChange?: (v: boolean) => void;
  },
  {}
> {
  public render() {
    return (
      <span
        className="chartaccent__toolbar-checkbox"
        onClick={() => {
          const nv = !this.props.value;
          if (this.props.onChange) {
            this.props.onChange(nv);
          }
        }}
      >
        <SVGImageIcon
          url={R.getSVGIcon(
            this.props.value ? "checkbox/checked" : "checkbox/empty"
          )}
        />
        <span className="el-label">{this.props.text}</span>
      </span>
    );
  }
}

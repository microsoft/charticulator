// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../globals";
import * as R from "../resources";

import { EventSubscription } from "../../core";
import { Actions, DragData } from "../actions";
import { SVGImageIcon, ToolButton } from "../components";
import { ContextedComponent } from "../context_component";
import { PopupAlignment, PopupView } from "../controllers";

import { classNames } from "../utils";
import { LinkCreationPanel } from "./panels/link_creator";
import { LegendCreationPanel } from "./panels/legend_creator";
import { AppStore } from "../stores";
import { strings } from "../../strings";
import { LayoutDirection, UndoRedoLocation } from "../main_view";
import { EditorType } from "../stores/app_store";

const minWidthToCollapseButtons = Object.freeze({
  guides: 1090,
  plotSegments: 1120,
  scaffolds: 1211,
});

export class Toolbar extends ContextedComponent<
  {
    layout: LayoutDirection;
    undoRedoLocation: UndoRedoLocation;
    toolbarLabels: boolean;
  },
  {
    innerWidth: number;
  }
> {
  public token: EventSubscription;

  public state = {
    innerWidth: window.innerWidth,
  };

  private resizeListener: (this: Window, ev: UIEvent) => any;

  public componentDidMount() {
    this.token = this.store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
      this.forceUpdate();
    });

    this.resizeListener = () => {
      this.setState({
        innerWidth: window.innerWidth,
      });
    };

    window.addEventListener("resize", this.resizeListener);
  }

  public componentWillUnmount() {
    this.token.remove();
    window.removeEventListener("resize", this.resizeListener);
  }

  private renderGuidesButton() {
    return (
      <MultiObjectButton
        compact={this.props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "guide-y",
            title: strings.toolbar.guideY,
            icon: "guide/x",
          },
          {
            classID: "guide-x",
            title: strings.toolbar.guideX,
            icon: "guide/y",
          },
          {
            classID: "guide-coordinator-x",
            title: strings.toolbar.guideX,
            icon: "guide/coordinator-x",
          },
          {
            classID: "guide-coordinator-y",
            title: strings.toolbar.guideY,
            icon: "guide/coordinator-y",
          },
          {
            classID: "guide-coordinator-polar",
            title: strings.toolbar.guidePolar,
            icon: "plot-segment/polar",
          },
        ]}
      />
    );
  }

  private renderPlotSegmentsButton() {
    return (
      <MultiObjectButton
        compact={this.props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "plot-segment.cartesian",
            title: strings.toolbar.region2D,
            icon: "plot/region",
            noDragging: true,
          },
          {
            classID: "plot-segment.line",
            title: strings.toolbar.line,
            icon: "plot/line",
            noDragging: true,
          },
        ]}
      />
    );
  }

  private renderMarksButton() {
    return (
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
    );
  }

  private renderSymbolButton() {
    return (
      <ObjectButton classID="mark.symbol" title="Symbol" icon="mark/symbol" />
    );
  }

  private renderLineButton() {
    return <ObjectButton classID="mark.line" title="Line" icon="mark/line" />;
  }

  private renderTextButton() {
    return (
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
    );
  }

  private renderIconButton() {
    return (
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
            icon: "FileImage",
          },
        ]}
      />
    );
  }

  private renderDataAxisButton() {
    return (
      <ObjectButton
        classID="mark.data-axis"
        title={strings.toolbar.dataAxis}
        icon="mark/data-axis"
      />
    );
  }

  private renderScaffoldButton() {
    return (
      <MultiObjectButton
        compact={this.props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "scaffold/cartesian-x",
            title: strings.toolbar.lineH,
            icon: "scaffold/cartesian-x",
            noDragging: false,
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("cartesian-x"),
          },
          {
            classID: "scaffold/cartesian-y",
            title: strings.toolbar.lineV,
            icon: "scaffold/cartesian-y",
            noDragging: false,
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("cartesian-y"),
          },
          {
            classID: "scaffold/circle",
            title: strings.toolbar.polar,
            icon: "scaffold/circle",
            noDragging: false,
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("polar"),
          },
          {
            classID: "scaffold/curve",
            title: strings.toolbar.curve,
            icon: "scaffold/curve",
            noDragging: false,
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("curve"),
          },
        ]}
      />
    );
  }

  private getGlyphToolItems(labels: boolean = true) {
    return [
      <>
        <>
          <span className={"charticulator__toolbar-horizontal-separator"} />
          {labels && (
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {strings.toolbar.marks}
            </span>
          )}
          {this.renderMarksButton()}
          {this.renderSymbolButton()}
          {this.renderLineButton()}
          {this.renderTextButton()}
          {this.renderIconButton()}
          <span className={"charticulator__toolbar-horizontal-separator"} />
          {this.renderDataAxisButton()}
          {this.context.store.editorType === EditorType.Embedded ? (
            <ObjectButton
              classID="mark.nested-chart"
              title={strings.toolbar.nestedChart}
              icon="mark/nested-chart"
            />
          ) : null}
          {this.props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
            <>
              <span className={"charticulator__toolbar-horizontal-separator"} />
              <ToolButton
                title={strings.menuBar.undo}
                icon={R.getSVGIcon("Undo")}
                disabled={
                  this.context.store.historyManager.statesBefore.length === 0
                }
                onClick={() =>
                  new Actions.Undo().dispatch(this.context.store.dispatcher)
                }
              />
              <ToolButton
                title={strings.menuBar.redo}
                icon={R.getSVGIcon("Redo")}
                disabled={
                  this.context.store.historyManager.statesAfter.length === 0
                }
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
        {this.props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
          <>
            <ToolButton
              title={strings.menuBar.undo}
              icon={R.getSVGIcon("toolbar/undo")}
              disabled={
                this.context.store.historyManager.statesBefore.length === 0
              }
              onClick={() =>
                new Actions.Undo().dispatch(this.context.store.dispatcher)
              }
            />
            <ToolButton
              title={strings.menuBar.redo}
              icon={R.getSVGIcon("toolbar/redo")}
              disabled={
                this.context.store.historyManager.statesAfter.length === 0
              }
              onClick={() =>
                new Actions.Redo().dispatch(this.context.store.dispatcher)
              }
            />
            <span className={"charticulator__toolbar-horizontal-separator"} />
          </>
        ) : null}
        <LinkButton label={true} />
        <LegendButton />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        {this.renderGuidesButton()}
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {this.props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        {this.renderPlotSegmentsButton()}
        <>
          <span className={"charticulator__toolbar-horizontal-separator"} />
          {labels && (
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {strings.toolbar.scaffolds}
            </span>
          )}
          {this.renderScaffoldButton()}
        </>
      </>,
    ];
  }

  // eslint-disable-next-line
  private getToolItems(
    labels: boolean = true,
    innerWidth: number = window.innerWidth
  ) {
    return (
      <>
        {this.props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
          <>
            <ToolButton
              title={strings.menuBar.undo}
              icon={R.getSVGIcon("Undo")}
              disabled={
                this.context.store.historyManager.statesBefore.length === 0
              }
              onClick={() =>
                new Actions.Undo().dispatch(this.context.store.dispatcher)
              }
            />
            <ToolButton
              title={strings.menuBar.redo}
              icon={R.getSVGIcon("Redo")}
              disabled={
                this.context.store.historyManager.statesAfter.length === 0
              }
              onClick={() =>
                new Actions.Redo().dispatch(this.context.store.dispatcher)
              }
            />
            <span className={"charticulator__toolbar-horizontal-separator"} />
          </>
        ) : null}
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.marks}
          </span>
        )}
        {this.renderMarksButton()}
        {this.renderSymbolButton()}
        {this.renderLineButton()}
        {this.renderTextButton()}
        {this.renderIconButton()}
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {this.renderDataAxisButton()}
        <ObjectButton
          classID="mark.nested-chart"
          title={strings.toolbar.nestedChart}
          icon="BarChartVerticalFilter"
        />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        <LinkButton label={labels} />
        <LegendButton />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        {innerWidth > minWidthToCollapseButtons.guides ? (
          <>
            <ObjectButton
              classID="guide-y"
              title={strings.toolbar.guideY}
              icon="guide/x"
            />
            <ObjectButton
              classID="guide-x"
              title={strings.toolbar.guideX}
              icon="guide/y"
            />
            <ObjectButton
              classID="guide-coordinator-x"
              title={strings.toolbar.guideX}
              icon="guide/coordinator-x"
            />
            <ObjectButton
              classID="guide-coordinator-y"
              title={strings.toolbar.guideY}
              icon="guide/coordinator-y"
            />
            <ObjectButton
              classID="guide-coordinator-polar"
              title={strings.toolbar.guidePolar}
              icon="plot-segment/polar"
            />
          </>
        ) : (
          this.renderGuidesButton()
        )}
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              className={
                this.props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {this.props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        {innerWidth > minWidthToCollapseButtons.plotSegments ? (
          <>
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
          </>
        ) : (
          this.renderPlotSegmentsButton()
        )}
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              this.props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.scaffolds}
          </span>
        )}
        {innerWidth > minWidthToCollapseButtons.scaffolds ? (
          <>
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
        ) : (
          this.renderScaffoldButton()
        )}
      </>
    );
  }

  public render() {
    let tooltipsItems = [];
    if (
      this.context.store.editorType === EditorType.Embedded ||
      this.context.store.editorType === EditorType.NestedEmbedded
    ) {
      const chartToolItems = this.getChartToolItems(this.props.toolbarLabels);
      const glyphToolItems = this.getGlyphToolItems(this.props.toolbarLabels);
      tooltipsItems = [...chartToolItems, ...glyphToolItems];
    } else {
      tooltipsItems = [
        this.getToolItems(this.props.toolbarLabels, this.state?.innerWidth),
      ];
    }
    return (
      <>
        <div
          className={
            this.props.layout === LayoutDirection.Vertical
              ? "charticulator__toolbar-vertical"
              : "charticulator__toolbar-horizontal"
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
                        ? "charticulator__toolbar-vertical-group"
                        : "charticulator__toolbar-horizontal-group"
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

export class ObjectButton extends ContextedComponent<
  ObjectButtonProps,
  Record<string, unknown>
> {
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
            : this.props.onDrag
            ? this.props.onDrag
            : () => {
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
                    noDragging={
                      tool.noDragging !== undefined ? tool.noDragging : true
                    }
                    onClick={() => context.close()}
                  />
                </div>
              ))}
            </PopupView>
          );
        },
        {
          anchor: ReactDOM.findDOMNode(this.refButton) as Element,
          alignX: PopupAlignment.EndOuter,
          alignY: PopupAlignment.StartInner,
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
            <SVGImageIcon url={R.getSVGIcon("ChevronDown")} />
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
  Record<string, unknown>
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
  Record<string, unknown>
> {
  public container: HTMLSpanElement;

  public render() {
    return (
      <span ref={(e) => (this.container = e)}>
        <ToolButton
          title={strings.toolbar.links}
          text={this.props.label ? strings.toolbar.links : ""}
          icon={R.getSVGIcon("CharticulatorLine")}
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

export class LegendButton extends ContextedComponent<
  Record<string, unknown>,
  Record<string, unknown>
> {
  public container: HTMLSpanElement;

  public render() {
    return (
      <span ref={(e) => (this.container = e)}>
        <ToolButton
          title={strings.toolbar.legend}
          icon={R.getSVGIcon("CharticulatorLegend")}
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
  Record<string, unknown>
> {
  public render() {
    return (
      <span
        className="charticulator__toolbar-checkbox"
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

/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { useContext, useEffect, useState } from "react";
import * as R from "../resources";
import { getSVGIcon } from "../resources";

import { EventSubscription } from "../../core";
import { Actions, DragData } from "../actions";
import {
  DraggableElement,
  FluentToolButton,
  SVGImageIcon,
} from "../components";
import { ContextedComponent, MainReactContext } from "../context_component";

import { LinkCreationPanel } from "./panels/link_creator";
import { LegendCreationPanel } from "./panels/legend_creator";
import { AppStore } from "../stores";
import { strings } from "../../strings";
import { LayoutDirection, UndoRedoLocation } from "../main_view";
import {
  Callout,
  CommandBar,
  ContextualMenuItemType,
  DefaultButton,
  DirectionalHint,
  IconButton,
  VerticalDivider,
} from "@fluentui/react";
import { EditorType } from "../stores/app_store";
import { ObjectTextButton } from "./toolbar/fluentui_tools_buttons";
import { getCommandBarHistoryButtons, HistoryButtons, HistoryButtonsType } from "./toolbar/history_buttons";
import { getCommandBarDivider } from "./toolbar/divider";

const minWidthToColapseButtons = Object.freeze({
  guides: 1090,
  plotSegments: 1120,
  scaffolds: 1211,
});

export const FluentUIToolbarV2: React.FC<{
  layout: LayoutDirection;
  undoRedoLocation: UndoRedoLocation;
  toolbarLabels: boolean;
}> = (props) => {
  const {store} = useContext(MainReactContext);
  const [innerWidth, setInnerWidth] = useState(window.innerWidth);

  const resizeListener = () => {
    setInnerWidth(window.innerWidth);
  };

  // useEffect(() => {
  //   setInnerWidth(window.innerWidth);
  //   window.addEventListener("resize", resizeListener);
  //   return () => {
  //     window.removeEventListener("resize", resizeListener);
  //   };
  // }, [setInnerWidth]);

  const getGlyphToolItems = (labels: boolean = true) => {
    return [
      <>
        <>
          <span className={"charticulator__toolbar-horizontal-separator"}/>
          {labels && (
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {strings.toolbar.marks}
            </span>
          )}
          <MultiObjectButton
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.rect",
                title: strings.toolbar.rectangle,
                icon: "RectangleShape",
                options: '{"shape":"rectangle"}',
              },
              {
                classID: "mark.rect",
                title: strings.toolbar.ellipse,
                icon: "Ellipse",
                options: '{"shape":"ellipse"}',
              },
              {
                classID: "mark.rect",
                title: strings.toolbar.triangle,
                icon: "TriangleShape",
                options: '{"shape":"triangle"}',
              },
            ]}
          />
          <ObjectButton
            classID="mark.symbol"
            title={strings.toolbar.symbol}
            icon="Shapes"
          />
          <ObjectButton
            classID="mark.line"
            title={strings.toolbar.line}
            icon="Line"
          />
          <MultiObjectButton
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.text",
                title: strings.toolbar.text,
                icon: "FontColorA",
              },
              {
                classID: "mark.textbox",
                title: strings.toolbar.textbox,
                icon: "TextField",
              },
            ]}
          />
          <MultiObjectButton
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.icon",
                title: strings.toolbar.icon,
                icon: "ImagePixel",
              },
              {
                classID: "mark.image",
                title: strings.toolbar.image,
                icon: "FileImage",
              },
            ]}
          />
          <ObjectButton
            classID="mark.data-axis"
            title={strings.toolbar.dataAxis}
            icon="mark/data-axis"
          />
          {store.editorType === EditorType.Embedded ? (
            <ObjectButton
              classID="mark.nested-chart"
              title={strings.toolbar.nestedChart}
              icon="BarChartVerticalFilter"
            />
          ) : null}
          {props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
            <>
              <span className={"charticulator__toolbar-horizontal-separator"}/>
              <FluentToolButton
                title={strings.menuBar.undo}
                disabled={store.historyManager.statesBefore.length === 0}
                icon={"Undo"}
                onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
              />
              <FluentToolButton
                title={strings.menuBar.redo}
                disabled={store.historyManager.statesAfter.length === 0}
                icon={"Redo"}
                onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
              />
            </>
          ) : null}
        </>
      </>,
    ];
  };

  // eslint-disable-next-line max-lines-per-function
  const getChartToolItems = (labels: boolean = true) => {
    return [
      <>
        <LinkButton label={true}/>
        <LegendButton/>
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        {labels && (
          <span
            className={
              props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        <MultiObjectButton
          compact={props.layout === LayoutDirection.Vertical}
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
              icon: "CharticulatorGuideX",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-y",
              title: strings.toolbar.guideY,
              icon: "CharticulatorGuideY",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-polar",
              title: strings.toolbar.guidePolar,
              icon: "CharticulatorGuideCoordinator",
              options: "",
            },
          ]}
        />
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        {labels && (
          <>
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        <MultiObjectButton
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "plot-segment.cartesian",
              title: strings.toolbar.region2D,
              icon: "BorderDot",
              noDragging: true,
            },
            {
              classID: "plot-segment.line",
              title: strings.toolbar.line,
              icon: "Line",
              noDragging: true,
            },
          ]}
        />
        <>
          <span className={"charticulator__toolbar-horizontal-separator"}/>
          {labels && (
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {strings.toolbar.scaffolds}
            </span>
          )}
          <MultiObjectButton
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "scaffold/cartesian-x",
                title: strings.toolbar.lineH,
                icon: "scaffold/cartesian-x",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("cartesian-x"),
              },
              {
                classID: "scaffold/cartesian-y",
                title: strings.toolbar.lineV,
                icon: "scaffold/cartesian-y",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("cartesian-y"),
              },
              {
                classID: "scaffold/circle",
                title: strings.toolbar.polar,
                icon: "scaffold/circle",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("polar"),
              },
              {
                classID: "scaffold/curve",
                title: strings.toolbar.curve,
                icon: "scaffold/curve",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("curve"),
              },
            ]}
          />
        </>
      </>,
    ];
  };

  const renderScaffoldButton = () => {
    return (
      <MultiObjectButton
        compact={props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "scaffold/cartesian-x",
            title: strings.toolbar.lineH,
            icon: "scaffold/cartesian-x",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("cartesian-x"),
          },
          {
            classID: "scaffold/cartesian-y",
            title: strings.toolbar.lineV,
            icon: "scaffold/cartesian-y",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("cartesian-y"),
          },
          {
            classID: "scaffold/circle",
            title: strings.toolbar.polar,
            icon: "scaffold/circle",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("polar"),
          },
          {
            classID: "scaffold/curve",
            title: strings.toolbar.curve,
            icon: "scaffold/curve",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("curve"),
          },
        ]}
      />
    );
  };

  const renderGuidesButton = () => {
    return (
      <MultiObjectButton
        compact={props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "guide-y",
            title: strings.toolbar.guideY,
            icon: "guide/x",
            options: "",
          },
          {
            classID: "guide-x",
            title: strings.toolbar.guideX,
            icon: "guide/y",
            options: "",
          },
          {
            classID: "guide-coordinator-x",
            title: strings.toolbar.guideX,
            icon: "CharticulatorGuideX",
            options: "",
          },
          {
            classID: "guide-coordinator-y",
            title: strings.toolbar.guideY,
            icon: "CharticulatorGuideY",
            options: "",
          },
          {
            classID: "guide-coordinator-polar",
            title: strings.toolbar.guidePolar,
            icon: "CharticulatorGuideCoordinator",
            options: "",
          },
        ]}
      />
    );
  };

  const getRedoUndoButtons =
    props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
      <>
        <FluentToolButton
          title={strings.menuBar.undo}
          disabled={store.historyManager.statesBefore.length === 0}
          icon={"Undo"}
          onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
        />
        <FluentToolButton
          title={strings.menuBar.redo}
          disabled={store.historyManager.statesAfter.length === 0}
          icon={"Redo"}
          onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
        />
        <span className={"charticulator__toolbar-horizontal-separator"}/>
      </>
    ) : null;

  // eslint-disable-next-line max-lines-per-function
  const getToolItems = (
    labels: boolean = true,
    innerWidth: number = window.innerWidth
  ) => {
    return (
      <>
        {props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
          <>
            <FluentToolButton
              title={strings.menuBar.undo}
              disabled={store.historyManager.statesBefore.length === 0}
              icon={"Undo"}
              onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
            />
            <FluentToolButton
              title={strings.menuBar.redo}
              disabled={store.historyManager.statesAfter.length === 0}
              icon={"Redo"}
              onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
            />
            <span className={"charticulator__toolbar-horizontal-separator"}/>
          </>
        ) : null}
        {labels && (
          <span
            className={
              props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.marks}
          </span>
        )}
        <MultiObjectButton
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.rect",
              title: strings.toolbar.rectangle,
              icon: "RectangleShape",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.ellipse,
              icon: "Ellipse",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.triangle,
              icon: "TriangleShape",
              options: '{"shape":"triangle"}',
            },
          ]}
        />
        <ObjectButton classID="mark.symbol" title="Symbol" icon="Shapes"/>
        <ObjectButton classID="mark.line" title="Line" icon="Line"/>
        <MultiObjectButton
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.text",
              title: strings.toolbar.text,
              icon: "FontColorA",
            },
            {
              classID: "mark.textbox",
              title: strings.toolbar.textbox,
              icon: "TextField",
            },
          ]}
        />
        <MultiObjectButton
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.icon",
              title: strings.toolbar.icon,
              icon: "ImagePixel",
            },
            {
              classID: "mark.image",
              title: strings.toolbar.image,
              icon: "FileImage",
            },
          ]}
        />
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        <ObjectButton
          classID="mark.data-axis"
          title={strings.toolbar.dataAxis}
          icon="mark/data-axis"
        />
        <ObjectButton
          classID="mark.nested-chart"
          title={strings.toolbar.nestedChart}
          icon="BarChartVerticalFilter"
        />
        <LegendButton/>
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        <LinkButton label={labels}/>
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        {/*{labels && (*/}
        {/*  <span*/}
        {/*    className={*/}
        {/*      props.layout === LayoutDirection.Vertical*/}
        {/*        ? "charticulator__toolbar-vertical-label"*/}
        {/*        : "charticulator__toolbar-label"*/}
        {/*    }*/}
        {/*  >*/}
        {/*    {strings.toolbar.guides}*/}
        {/*  </span>*/}
        {/*)}*/}
        {renderGuidesButton()}
        {/*{innerWidth > minWidthToColapseButtons.guides ? (*/}
        {/*  <>*/}
        {/*    {renderGuidesButton()}*/}
        {/*    <ObjectButton*/}
        {/*      classID="guide-y"*/}
        {/*      title={strings.toolbar.guideY}*/}
        {/*      icon="guide/x"*/}
        {/*    />*/}
        {/*    <ObjectButton*/}
        {/*      classID="guide-x"*/}
        {/*      title={strings.toolbar.guideX}*/}
        {/*      icon="guide/y"*/}
        {/*    />*/}
        {/*    <ObjectButton*/}
        {/*      classID="guide-coordinator-x"*/}
        {/*      title={strings.toolbar.guideX}*/}
        {/*      icon="CharticulatorGuideX"*/}
        {/*    />*/}
        {/*    <ObjectButton*/}
        {/*      classID="guide-coordinator-y"*/}
        {/*      title={strings.toolbar.guideY}*/}
        {/*      icon="CharticulatorGuideY"*/}
        {/*    />*/}
        {/*    <ObjectButton*/}
        {/*      classID="guide-coordinator-polar"*/}
        {/*      title={strings.toolbar.guidePolar}*/}
        {/*      icon="CharticulatorGuideCoordinator"*/}
        {/*    />*/}
        {/*  </>*/}
        {/*) : (*/}
        {/*  renderGuidesButton()*/}
        {/*)}*/}
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        {labels && (
          <>
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        <ObjectButton
          classID="plot-segment.cartesian"
          title={strings.toolbar.region2D}
          icon="BorderDot"
          noDragging={true}
        />
        <ObjectButton
          classID="plot-segment.line"
          title={strings.toolbar.line}
          icon="Line"
          noDragging={true}
        />
        <span className={"charticulator__toolbar-horizontal-separator"}/>
        {/*{labels && (*/}
        {/*  <span*/}
        {/*    className={*/}
        {/*      props.layout === LayoutDirection.Vertical*/}
        {/*        ? "charticulator__toolbar-vertical-label"*/}
        {/*        : "charticulator__toolbar-label"*/}
        {/*    }*/}
        {/*  >*/}
        {/*    {strings.toolbar.scaffolds}*/}
        {/*  </span>*/}
        {/*)}*/}
        {/*{innerWidth > minWidthToColapseButtons.scaffolds ? (*/}
        {/*  <>*/}
        {/*    <ScaffoldButton*/}
        {/*      type="cartesian-x"*/}
        {/*      title={strings.toolbar.lineH}*/}
        {/*      icon="scaffold/cartesian-x"*/}
        {/*      currentTool={store.currentTool}*/}
        {/*    />*/}
        {/*    <ScaffoldButton*/}
        {/*      type="cartesian-y"*/}
        {/*      title={strings.toolbar.lineV}*/}
        {/*      icon="scaffold/cartesian-y"*/}
        {/*      currentTool={store.currentTool}*/}
        {/*    />*/}
        {/*    <ScaffoldButton*/}
        {/*      type="polar"*/}
        {/*      title={strings.toolbar.polar}*/}
        {/*      icon="scaffold/circle"*/}
        {/*      currentTool={store.currentTool}*/}
        {/*    />*/}
        {/*    <ScaffoldButton*/}
        {/*      type="curve"*/}
        {/*      title={strings.toolbar.curve}*/}
        {/*      icon="scaffold/curve"*/}
        {/*      currentTool={store.currentTool}*/}
        {/*    />*/}
        {/*  </>*/}
        {/*) : (*/}
        {/*  renderScaffoldButton()*/}
        {/*)}*/}

        {renderScaffoldButton()}
      </>
    );
  };

  let tooltipsItems = [];
  //todo: nested embedded and remove nested
  if (store.editorType === "embedded") {
    const chartToolItems = getChartToolItems(props.toolbarLabels);
    const glyphToolItems = getGlyphToolItems(props.toolbarLabels);
    tooltipsItems = [...chartToolItems, ...glyphToolItems];
  } else {
    tooltipsItems = [getToolItems(props.toolbarLabels, innerWidth)];
  }
  return (
    <>
      <div style={{width: "100%"}}>
        <CommandBar
          items={[
            ...getCommandBarHistoryButtons(store),
            getCommandBarDivider("divider_1"),
            {
              key: "marks_label",
              itemType: ContextualMenuItemType.Header,
              text: strings.toolbar.marks,
              commandBarButtonAs: () => {
                return (
                  <span style={{margin: "auto", paddingRight: 5}}>
                    {strings.toolbar.marks}
                  </span>
                );
              },
            },
            {
              key: "marks",
              iconProps: {
                iconName: "RectangleShape",
              },
              commandBarButtonAs: () => {
                return (
                  <MultiObjectButton
                    compact={props.layout === LayoutDirection.Vertical}
                    tools={[
                      {
                        classID: "mark.rect",
                        title: strings.toolbar.rectangle,
                        icon: "RectangleShape",
                        options: '{"shape":"rectangle"}',
                      },
                      {
                        classID: "mark.rect",
                        title: strings.toolbar.ellipse,
                        icon: "Ellipse",
                        options: '{"shape":"ellipse"}',
                      },
                      {
                        classID: "mark.rect",
                        title: strings.toolbar.triangle,
                        icon: "TriangleShape",
                        options: '{"shape":"triangle"}',
                      },
                    ]}
                  />
                );
              },
              text: strings.toolbar.rectangle,
              subMenuProps: {
                items: [
                  {
                    key: "marks.rect",
                    iconProps: {
                      iconName: "RectangleShape",
                    },
                    text: strings.toolbar.rectangle,
                  },
                  {
                    key: "marks.rect",
                    iconProps: {
                      iconName: "Ellipse",
                    },
                    text: strings.toolbar.ellipse,
                  },
                  {
                    key: "marks.rect",
                    iconProps: {
                      iconName: "TriangleShape",
                    },
                    text: strings.toolbar.triangle,
                  },
                ],
              },
            },
            {
              key: "mark.symbol",
              text: strings.toolbar.symbol,
              iconProps: {
                iconName: "Shapes",
              },
              commandBarButtonAs: () => {
                return (
                  <ObjectButton
                    classID="mark.symbol"
                    title="Symbol"
                    icon="Shapes"
                  />
                );
              },
            },
            {
              key: "mark.line",
              text: strings.toolbar.line,
              iconProps: {
                iconName: "Line",
              },
              commandBarButtonAs: () => {
                return (
                  <ObjectButton classID="mark.line" title="Line" icon="Line"/>
                );
              },
            },
            {
              key: "Text",
              text: strings.toolbar.text,
              iconProps: {
                iconName: "FontColorA",
              },
              subMenuProps: {
                items: [
                  {
                    key: "mark.text",
                    text: strings.toolbar.text,
                    iconProps: {
                      iconName: "FontColorA",
                    },
                  },
                  {
                    key: "mark.textbox",
                    text: strings.toolbar.textbox,
                    iconProps: {
                      iconName: "TextField",
                    },
                  },
                ],
              },
            },
            {
              key: "Icon",
              text: strings.toolbar.icon,
              iconProps: {
                iconName: "ImagePixel",
              },
              subMenuProps: {
                items: [
                  {
                    key: "mark.icon",
                    text: strings.toolbar.icon,
                    iconProps: {
                      iconName: "ImagePixel",
                    },
                  },
                  {
                    key: "mark.image",
                    text: strings.toolbar.image,
                    iconProps: {
                      iconName: "FileImage",
                    },
                  },
                ],
              },
            },
            {
              key: "mark.data-axis",
              text: strings.toolbar.dataAxis,
              iconProps: {
                iconName: "mark/data-axis",
              },
              commandBarButtonAs: () => {
                return (
                  <ObjectButton
                    classID="mark.data-axis"
                    title={strings.toolbar.dataAxis}
                    icon="mark/data-axis"
                  />
                );
              },
            },
            //todo: {store.editorType === EditorType.Embedded ? (
            //             <ObjectButton
            //               classID="mark.nested-chart"
            //               title={strings.toolbar.nestedChart}
            //               icon="BarChartVerticalFilter"
            //             />
            //           ) : null}
            {
              key: "mark.nestedChart",
              text: strings.toolbar.nestedChart,
              iconProps: {
                iconName: "BarChartVerticalFilter",
              },
              commandBarButtonAs: () => {
                return (
                  <ObjectButton
                    classID="mark.nested-chart"
                    title={strings.toolbar.nestedChart}
                    icon="BarChartVerticalFilter"
                  />
                );
              },
            },

            {
              key: "divider2",
              itemType: ContextualMenuItemType.Divider,
              onRender: () => (
                <span style={{margin: " 0 5px"}}>
                  <VerticalDivider/>
                </span>
              ),
            },

            {
              key: "mark.legend",
              text: strings.toolbar.legend,
              iconProps: {
                iconName: "CharticulatorLegend",
              },
              commandBarButtonAs: () => {
                return <LegendButton/>;
              },
            },
            {
              key: "mark.link",
              text: strings.toolbar.link,
              iconProps: {
                iconName: "CharticulatorLine",
              },
              commandBarButtonAs: () => {
                return <LinkButton label={props.toolbarLabels}/>;
              },
            },
            {
              key: "divider4",
              itemType: ContextualMenuItemType.Divider,
              onRender: () => (
                <span style={{margin: " 0 5px"}}>
                  <VerticalDivider/>
                </span>
              ),
            },

            {
              key: "guides_label",
              itemType: ContextualMenuItemType.Header,
              text: strings.toolbar.guides,
              commandBarButtonAs: () => {
                return (
                  <span style={{margin: "auto", paddingRight: 5}}>
                    {strings.toolbar.guides}
                  </span>
                );
              },
            },
            {
              key: "guides",
              iconProps: {
                iconName: "guide/x",
              },
              text: strings.toolbar.guideX,
              subMenuProps: {
                items: [
                  {
                    key: "guide-x",
                    iconProps: {
                      iconName: "guide/x",
                    },
                    text: strings.toolbar.guideX,
                  },
                  {
                    key: "guide-y",
                    iconProps: {
                      iconName: "guide/y",
                    },
                    text: strings.toolbar.guideY,
                  },
                  {
                    key: "guide-coordinator-x",
                    iconProps: {
                      iconName: "CharticulatorGuideX",
                    },
                    text: strings.toolbar.guideX,
                  },
                  {
                    key: "guide-coordinator-y",
                    iconProps: {
                      iconName: "CharticulatorGuideY",
                    },
                    text: strings.toolbar.guideY,
                  },
                  {
                    key: "guide-coordinator-polar",
                    iconProps: {
                      iconName: "CharticulatorGuideCoordinator",
                    },
                    text: strings.toolbar.guidePolar,
                  },
                ],
              },
            },
            {
              key: "divider5",
              itemType: ContextualMenuItemType.Divider,
              onRender: () => (
                <span style={{margin: " 0 5px"}}>
                  <VerticalDivider/>
                </span>
              ),
            },

            {
              key: "plot_label",
              itemType: ContextualMenuItemType.Header,
              text: strings.toolbar.plotSegments,
              commandBarButtonAs: () => {
                return (
                  <span style={{margin: "auto", paddingRight: 5}}>
                    {strings.toolbar.plotSegments}
                  </span>
                );
              },
            },
            {
              key: "plot-segment.cartesian",
              iconProps: {
                iconName: "BorderDot",
              },
              text: strings.toolbar.region2D,
              subMenuProps: {
                items: [
                  {
                    key: "plot-segment",
                    iconProps: {
                      iconName: "BorderDot",
                    },
                    text: strings.toolbar.region2D,
                  },
                  {
                    key: "plot-segment.line",
                    iconProps: {
                      iconName: "Line",
                    },
                    text: strings.toolbar.line,
                  },
                ],
              },
            },
            {
              key: "divider6",
              itemType: ContextualMenuItemType.Divider,
              onRender: () => (
                <span style={{margin: " 0 5px"}}>
                  <VerticalDivider/>
                </span>
              ),
            },
            {
              key: "scaffold_label",
              text: strings.toolbar.scaffolds,
              itemType: ContextualMenuItemType.Header,
              commandBarButtonAs: () => {
                return (
                  <span style={{margin: "auto", paddingRight: 5}}>
                    {strings.toolbar.scaffolds}
                  </span>
                );
              },
            },
            {
              key: "scaffold.guide-x",
              iconProps: {
                iconName: "scaffold/cartesian-x",
              },
              text: strings.toolbar.lineH,
              commandBarButtonAs: () => {
                return (
                  <MultiObjectButton
                    compact={props.layout === LayoutDirection.Vertical}
                    tools={[
                      {
                        classID: "scaffold/cartesian-x",
                        title: strings.toolbar.lineH,
                        icon: "scaffold/cartesian-x",
                        onClick: () => null,
                        onDrag: () => new DragData.ScaffoldType("cartesian-x"),
                      },
                      {
                        classID: "scaffold/cartesian-y",
                        title: strings.toolbar.lineV,
                        icon: "scaffold/cartesian-y",
                        onClick: () => null,
                        onDrag: () => new DragData.ScaffoldType("cartesian-y"),
                      },
                      {
                        classID: "scaffold/circle",
                        title: strings.toolbar.polar,
                        icon: "scaffold/circle",
                        onClick: () => null,
                        onDrag: () => new DragData.ScaffoldType("polar"),
                      },
                      {
                        classID: "scaffold/curve",
                        title: strings.toolbar.curve,
                        icon: "scaffold/curve",
                        onClick: () => null,
                        onDrag: () => new DragData.ScaffoldType("curve"),
                      },
                    ]}
                  />
                );
              },
              subMenuProps: {
                items: [
                  {
                    key: "guide-x",
                    iconProps: {
                      iconName: "scaffold/cartesian-x",
                    },
                    text: strings.toolbar.lineH,
                    onRender: (item) => {
                      return (
                        <ObjectTextButton
                          classID="scaffold/cartesian-x"
                          title={strings.toolbar.lineH}
                          icon="scaffold/cartesian-x"
                          text={strings.toolbar.lineH}
                          onDrag={() =>
                            new DragData.ScaffoldType("cartesian-x")
                          }
                        />
                      );
                    },
                  },
                  {
                    key: "guide-y",
                    iconProps: {
                      iconName: "scaffold/cartesian-y",
                    },
                    text: strings.toolbar.lineV,
                    onRender: (item) => {
                      return (
                        <ObjectTextButton
                          classID="scaffold/cartesian-y"
                          title={strings.toolbar.lineV}
                          icon="scaffold/cartesian-y"
                          text={strings.toolbar.lineV}
                          onDrag={() =>
                            new DragData.ScaffoldType("cartesian-y")
                          }
                        />
                      );
                    },
                  },
                  {
                    key: "scaffold/circle",
                    iconProps: {
                      iconName: "scaffold/circle",
                    },
                    text: strings.toolbar.guideX,
                  },
                  {
                    key: "scaffold/curve",
                    iconProps: {
                      iconName: "scaffold/curve",
                    },
                    text: strings.toolbar.curve,
                  },
                ],
              },
            },
          ]}
          styles={{
            root: {
              height: 32,
              padding: 0,
              width: "100%",
            },
          }}
        />
      </div>
    </>
  );
};

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

export class ObjectButton extends ContextedComponent<ObjectButtonProps,
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
        //this.forceUpdate();
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
          <IconButton
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
          />
        </DraggableElement>
      </>
    );
  }
}

interface MultiObjectButtonProps {
  compact?: boolean;
  tools: ObjectButtonProps[];
}

interface MultiObjectButtonState {
  currentSelection: {
    classID: string;
    options: string;
  };
  dragging: boolean;
}

export class MultiObjectButton extends ContextedComponent<MultiObjectButtonProps,
  MultiObjectButtonState> {
  public state: MultiObjectButtonState = null;

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
        item.classID == this.state?.currentSelection?.classID &&
        item.options == this.state?.currentSelection?.options
      ) {
        return item;
      }
    }
    return this.props.tools[0];
  }

  public componentDidMount() {
    //set menu item state
    this.setState({
      currentSelection: {
        classID: this.props.tools[0].classID,
        options: this.props.tools[0].options,
      },
      dragging: false,
    });

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
      //this.forceUpdate();
    });
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    const currentTool = this.getSelectedTool();

    return (
      <DraggableElement
        dragData={() => {
          if (currentTool?.onDrag) {
            return currentTool?.onDrag();
          }
          return new DragData.ObjectType(
            currentTool?.classID,
            currentTool?.options
          );
        }}
        onDragStart={() => this.setState({dragging: true})}
        onDragEnd={() => this.setState({dragging: false})}
        renderDragElement={() => {
          return [
            <SVGImageIcon
              url={getSVGIcon(currentTool?.icon)}
              width={24}
              height={24}
            />,
            {x: 16, y: 16},
          ];
        }}
      >
        <DefaultButton
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
          split={true}
          text={currentTool?.title}
          title={currentTool?.title}
          menuProps={{
            items: this.props.tools.map((tool, index) => {
              return {
                key: tool.classID + index,
                data: {
                  classID: tool.classID,
                  options: tool.options,
                },
                text: tool.title,
                iconProps: {iconName: tool.icon},
              };
            }),
            onItemClick: (ev: any, item: any) => {
              if (item.data) {
                this.dispatch(
                  new Actions.SetCurrentTool(
                    item.data.classID,
                    item.data.options
                  )
                );
              }
            },
          }}
          iconProps={{
            iconName: currentTool?.icon,
          }}
          onMenuClick={() => {
            if (currentTool) {
              this.dispatch(
                new Actions.SetCurrentTool(
                  currentTool.classID,
                  currentTool.options
                )
              );
            }
          }}
        />
      </DraggableElement>
    );
  }
}

export const ScaffoldButton: React.FC<{
  currentTool: string;
  title: string;
  type: string;
  icon: string;
}> = (props) => {
  return (
    <FluentToolButton
      icon={props.icon}
      active={props.currentTool == props.type}
      title={props.title}
      onClick={() => {
        // this.dispatch(new Actions.SetCurrentTool(this.props.type));
      }}
      dragData={() => {
        return new DragData.ScaffoldType(props.type);
      }}
    />
  );
};

export const LinkButton: React.FC<{
  label: boolean;
}> = (props) => {
  const {store} = React.useContext(MainReactContext);
  const [isOpen, openDialog] = React.useState(false);

  return (
    <span id="linkCreator">
      <IconButton
        title={strings.toolbar.link}
        text={props.label ? strings.toolbar.link : ""}
        iconProps={{
          iconName: "CharticulatorLine",
        }}
        checked={store.currentTool == "link"}
        onClick={() => {
          openDialog(true);
        }}
      />
      {isOpen ? (
        <Callout
          target={"#linkCreator"}
          hidden={!isOpen}
          onDismiss={() => openDialog(false)}
        >
          <LinkCreationPanel onFinish={() => openDialog(false)}/>
        </Callout>
      ) : null}
    </span>
  );
};


//todo: update Callout id
export const LegendButton: React.FC = () => {
  const {store} = React.useContext(MainReactContext);
  const [isOpen, setOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      setOpen(false);
    };
  }, [setOpen]);

  return (
    <span id="createLegend">
      <IconButton
        title={strings.toolbar.legend}
        iconProps={{
          iconName: "CharticulatorLegend",
        }}
        checked={store.currentTool == "legend"}
        onClick={() => {
          setOpen(!isOpen);
        }}
      />
      {isOpen ? (
        <Callout
          onDismiss={() => setOpen(false)}
          target="#createLegend"
          directionalHint={DirectionalHint.bottomLeftEdge}
        >
          <LegendCreationPanel onFinish={() => setOpen(false)}/>
        </Callout>
      ) : null}
    </span>
  );
};


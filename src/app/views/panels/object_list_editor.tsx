// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Prototypes, Specification } from "../../../core";
import { Actions } from "../../actions";
import { SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";

import {
  ChartElementSelection,
  AppStore,
  GlyphSelection,
  MarkSelection
} from "../../stores";
import { classNames } from "../../utils";
import { Button } from "./widgets/controls";

export class ObjectListEditor extends ContextedComponent<{}, {}> {
  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [];
    this.tokens.push(
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate())
    );
    this.tokens.push(
      this.store.addListener(AppStore.EVENT_SELECTION, () => this.forceUpdate())
    );
  }

  public componentWillUnmount() {
    for (const token of this.tokens) {
      token.remove();
    }
  }

  public renderChart() {
    const chart = this.store.chart;
    const sel = this.store.currentSelection;
    return (
      <div>
        <div
          className={classNames("el-object-item", ["is-active", sel == null])}
          onClick={() => {
            this.dispatch(new Actions.ClearSelection());
          }}
        >
          <SVGImageIcon
            url={R.getSVGIcon(
              Prototypes.ObjectClasses.GetMetadata(chart.classID).iconPath
            )}
          />
          <span className="el-text">{chart.properties.name}</span>
        </div>
        <ReorderListView
          enabled={true}
          onReorder={(a, b) => {
            this.dispatch(new Actions.ReorderChartElement(a, b));
          }}
        >
          {chart.elements.map(element => {
            return (
              <div
                className={classNames("el-object-item", [
                  "is-active",
                  sel instanceof ChartElementSelection &&
                    sel.chartElement == element
                ])}
                onClick={() => {
                  this.dispatch(new Actions.SelectChartElement(element));
                }}
                key={element._id}
              >
                <SVGImageIcon
                  url={R.getSVGIcon(
                    Prototypes.ObjectClasses.GetMetadata(element.classID)
                      .iconPath
                  )}
                />
                <span className="el-text">{element.properties.name}</span>
                <Button
                  icon={
                    element.properties.visible
                      ? "general/eye"
                      : "general/eye-faded"
                  }
                  title="Toggle visibility"
                  active={false}
                  onClick={() => {
                    this.dispatch(
                      new Actions.SetObjectProperty(
                        element,
                        "visible",
                        null,
                        !element.properties.visible,
                        true
                      )
                    );
                  }}
                />
                <Button
                  icon="general/eraser"
                  title="Remove"
                  active={false}
                  onClick={() => {
                    this.dispatch(new Actions.DeleteChartElement(element));
                  }}
                />
              </div>
            );
          })}
        </ReorderListView>
      </div>
    );
  }

  public renderGlyph(glyph: Specification.Glyph) {
    const sel = this.store.currentSelection;
    return (
      <div key={glyph._id}>
        <div
          className={classNames("el-object-item", [
            "is-active",
            sel instanceof GlyphSelection && sel.glyph == glyph
          ])}
          onClick={() => {
            this.dispatch(new Actions.SelectGlyph(null, glyph));
          }}
        >
          <SVGImageIcon
            url={R.getSVGIcon(
              Prototypes.ObjectClasses.GetMetadata(glyph.classID).iconPath
            )}
          />
          <span className="el-text">{glyph.properties.name}</span>
        </div>
        <ReorderListView
          enabled={true}
          onReorder={(a, b) => {
            this.dispatch(new Actions.ReorderGlyphMark(glyph, a + 1, b + 1));
          }}
        >
          {glyph.marks
            .filter(x => x.classID != "mark.anchor")
            .map(mark => {
              return (
                <div
                  className={classNames("el-object-item", [
                    "is-active",
                    sel instanceof MarkSelection &&
                      sel.glyph == glyph &&
                      sel.mark == mark
                  ])}
                  key={mark._id}
                  onClick={() => {
                    this.dispatch(new Actions.SelectMark(null, glyph, mark));
                  }}
                >
                  <SVGImageIcon
                    url={R.getSVGIcon(
                      Prototypes.ObjectClasses.GetMetadata(mark.classID)
                        .iconPath
                    )}
                  />
                  <span className="el-text">{mark.properties.name}</span>
                  <Button
                    icon={
                      mark.properties.visible
                        ? "general/eye"
                        : "general/eye-faded"
                    }
                    title="Toggle visibility"
                    active={false}
                    onClick={() => {
                      this.dispatch(
                        new Actions.SetObjectProperty(
                          mark,
                          "visible",
                          null,
                          !mark.properties.visible,
                          true
                        )
                      );
                    }}
                  />
                  <Button
                    icon="general/eraser"
                    active={false}
                    title="Remove"
                    onClick={() => {
                      this.dispatch(
                        new Actions.RemoveMarkFromGlyph(glyph, mark)
                      );
                    }}
                  />
                </div>
              );
            })}
        </ReorderListView>
      </div>
    );
  }

  public render() {
    const chart = this.store.chart;
    return (
      <div className="charticulator__object-list-editor">
        {this.renderChart()}
        {chart.glyphs.map(glyph => this.renderGlyph(glyph))}
      </div>
    );
  }
}

export interface ReorderListViewProps {
  enabled: boolean;
  onReorder: (dragIndex: number, dropIndex: number) => void;
}

export interface ReorderListViewState {
  reordering: boolean;
  dragIndex: number;
  dropIndex: [number, number];
}

export class ReorderListView extends React.Component<
  ReorderListViewProps,
  ReorderListViewState
> {
  private container: HTMLDivElement;
  private container2Index = new WeakMap<Element, number>();
  private index2Container = new Map<number, Element>();
  private hammer: HammerManager;

  constructor(props: ReorderListViewProps) {
    super(props);
    this.state = {
      reordering: false,
      dragIndex: null,
      dropIndex: null
    };
  }

  public getItemAtPoint(x: number, y: number): [number, number] {
    let el = document.elementFromPoint(x, y);
    while (el) {
      if (this.container2Index.has(el)) {
        const bbox = el.getBoundingClientRect();
        const ratio = (y - bbox.top) / bbox.height;
        return [this.container2Index.get(el), ratio];
      }
      el = el.parentElement;
    }
    // Couldn't find
    let minY = null,
      maxY = null,
      minIndex = null,
      maxIndex = null;
    for (const [index, element] of this.index2Container.entries()) {
      const bbox = element.getBoundingClientRect();
      if (minY == null || minY > bbox.top) {
        minY = bbox.top;
        minIndex = index;
      }
      if (maxY == null || maxY < bbox.top + bbox.height) {
        maxY = bbox.top + bbox.height;
        maxIndex = index;
      }
    }
    if (y < minY) {
      return [minIndex, 0];
    }
    if (y > maxY) {
      return [maxIndex, 1];
    }
    return null;
  }

  public componentDidMount() {
    if (!this.props.enabled) {
      return;
    }
    const hammer = new Hammer(this.container);
    this.hammer = hammer;
    hammer.add(new Hammer.Pan());
    hammer.on("panstart", e => {
      const cx = e.center.x - e.deltaX;
      const cy = e.center.y - e.deltaY;
      const item = this.getItemAtPoint(cx, cy);
      if (item != null) {
        this.setState({
          reordering: true,
          dragIndex: item[0],
          dropIndex: item
        });
      }
    });
    hammer.on("pan", e => {
      const cx = e.center.x;
      const cy = e.center.y;
      const item = this.getItemAtPoint(cx, cy);
      this.setState({
        reordering: true,
        dropIndex: item
      });
    });
    hammer.on("panend", e => {
      if (!this.state.reordering || !this.state.dropIndex) {
        return;
      }
      const from = this.state.dragIndex;
      const to =
        this.state.dropIndex[0] + (this.state.dropIndex[1] > 0.5 ? 1 : 0);
      this.setState({
        reordering: false,
        dragIndex: null,
        dropIndex: null
      });
      this.props.onReorder(from, to);
    });
  }

  public componentWillUnmount() {
    if (this.hammer) {
      this.hammer.destroy();
    }
  }

  public render() {
    return (
      <div
        className="charticulator__reorder-list-view"
        ref={e => (this.container = e)}
      >
        {React.Children.map(this.props.children, (item, index) => {
          return (
            <div
              className="charticulator__reorder-list-view-item"
              ref={e => {
                if (e) {
                  this.container2Index.set(e, index);
                  this.index2Container.set(index, e);
                } else {
                  this.index2Container.delete(index);
                }
              }}
            >
              {item}
              {this.state.reordering &&
              this.state.dropIndex &&
              this.state.dropIndex[0] == index ? (
                <div
                  className={classNames(
                    "charticulator__reorder-list-view-item-hint",
                    ["is-top", this.state.dropIndex[1] < 0.5]
                  )}
                />
              ) : null}
              {this.state.reordering && this.state.dragIndex == index ? (
                <div className="charticulator__reorder-list-view-item-drag-hint" />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  public static ReorderArray<T>(
    array: T[],
    dragIndex: number,
    dropIndex: number
  ) {
    const x = array.splice(dragIndex, 1)[0];
    if (dragIndex < dropIndex) {
      array.splice(dropIndex - 1, 0, x);
    } else {
      array.splice(dropIndex, 0, x);
    }
  }
}

import * as React from "react";
import * as R from "../../resources";

import {
  argMax,
  argMin,
  Geometry,
  getById,
  Graphics,
  Point,
  Prototypes,
  Specification,
  uniqueID
} from "../../../core";
import { Actions } from "../../actions";
import { ButtonRaised, SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";

import { classNames } from "../../utils";
import { DataFieldSelector } from "../dataset/data_field_selector";
import { ReorderListView } from "./object_list_editor";

export interface LinkCreationPanelProps {
  onFinish?: () => void;
}

export interface LinkCreationPanelState {
  linkType: "line" | "band";
  linkMode: string;
  plotSegments: Specification.PlotSegment[];
  selectedPlotSegments: string[];
  errorReport: string;
}

export class LinkCreationPanel extends ContextedComponent<
  LinkCreationPanelProps,
  LinkCreationPanelState
> {
  public state: LinkCreationPanelState = this.getDefaultState();

  private groupBySelector: DataFieldSelector;

  private getDefaultState(): LinkCreationPanelState {
    let plotSegments = this.context.store.chartStore.chart
      .elements as Specification.PlotSegment[];
    plotSegments = plotSegments.filter(x =>
      Prototypes.isType(x.classID, "plot-segment")
    );
    const selectedPlotSegments = plotSegments.map(x => x._id);
    let linkMode = "link-through";
    if (selectedPlotSegments.length == 1) {
      linkMode = this.isLinkDataPresent() ? "link-table" : "link-through";
    } else {
      linkMode = "link-between";
    }
    return {
      linkType: "line",
      linkMode,
      plotSegments,
      selectedPlotSegments,
      errorReport: null
    };
  }

  private isLinkDataPresent() {
    return this.context.store.datasetStore.dataset.tables.length > 1;
  }

  public render() {
    return (
      <div className="charticulator__link-type-table">
        <div className="el-row">
          <h2>Link using:</h2>
          <PanelRadioControl
            options={["line", "band"]}
            icons={["link/line", "link/band"]}
            labels={["Line", "Band"]}
            value={this.state.linkType}
            onChange={(newValue: "line" | "band") =>
              this.setState({ linkType: newValue })
            }
            showText={true}
          />
        </div>
        {this.state.plotSegments.length > 1 ? (
          <div className="el-row">
            <h2>Plot Segment(s):</h2>
            <PlotSegmentSelector
              items={this.state.plotSegments}
              defaultSelection={this.state.selectedPlotSegments}
              onChange={newSelection => {
                let linkMode = this.state.linkMode;
                if (newSelection.length == 1) {
                  linkMode = this.isLinkDataPresent()
                    ? "link-table"
                    : "link-through";
                } else {
                  linkMode = "link-between";
                }
                this.setState({
                  linkMode,
                  selectedPlotSegments: newSelection
                });
              }}
            />
          </div>
        ) : null}
        {this.state.selectedPlotSegments.length == 1 &&
        this.isLinkDataPresent() ? (
          <div className="el-row">
            <h2>Link Mode:</h2>
            <PanelRadioControl
              options={["link-through", "link-table"]}
              icons={["link/through", "link/table"]}
              labels={["Sequentially", "By Link Data"]}
              value={this.state.linkMode}
              onChange={newValue => this.setState({ linkMode: newValue })}
              showText={true}
              asList={true}
            />
          </div>
        ) : null}
        {this.state.linkMode == "link-through" ? (
          <div>
            <h2>Connect by:</h2>
            <div className="el-row">
              <DataFieldSelector
                ref={e => (this.groupBySelector = e)}
                kinds={["categorical"]}
                datasetStore={this.context.store.datasetStore}
                nullDescription="(link all items)"
              />
            </div>
          </div>
        ) : null}
        <div className="el-row">
          <ButtonRaised
            text="Create Links"
            onClick={() => {
              const links = this.getLinkObject();
              if (links != null) {
                this.dispatch(new Actions.AddLinks(links));
                if (this.props.onFinish) {
                  this.props.onFinish();
                }
              } else {
                this.setState({
                  errorReport: "Cannot Create Link!"
                });
              }
            }}
          />
          {this.state.errorReport ? (
            <span>{this.state.errorReport}</span>
          ) : null}
        </div>
      </div>
    );
  }

  private getDefaultAnchor(
    manager: Prototypes.ChartStateManager,
    linkMode: string,
    cs: Graphics.CoordinateSystem,
    glyph1: Specification.Glyph,
    glyphState1: Specification.GlyphState,
    glyph2: Specification.Glyph,
    glyphState2: Specification.GlyphState
  ): {
    linkType: Prototypes.Links.LinkType;
    interpolationType: Prototypes.Links.InterpolationType;
    anchor1: Specification.Types.LinkAnchorPoint[];
    anchor2: Specification.Types.LinkAnchorPoint[];
    color: Specification.Mapping;
    opacity: Specification.Mapping;
  } {
    // Default color and opacity
    let color: Specification.Mapping;
    let opacity: Specification.Mapping;
    switch (this.state.linkType) {
      case "line":
        {
          color = {
            type: "value",
            value: { r: 0, g: 0, b: 0 }
          } as Specification.ValueMapping;
          opacity = { type: "value", value: 1 } as Specification.ValueMapping;
        }
        break;
      case "band":
        {
          color = {
            type: "value",
            value: { r: 0, g: 0, b: 0 }
          } as Specification.ValueMapping;
          opacity = { type: "value", value: 0.5 } as Specification.ValueMapping;
        }
        break;
    }

    // Get anchor candidates
    let candidates1: Prototypes.LinkAnchor.Description[] = [];
    let candidates2: Prototypes.LinkAnchor.Description[] = [];
    for (const mark of glyphState1.marks) {
      const c = manager.getMarkClass(mark);
      candidates1 = candidates1.concat(c.getLinkAnchors("begin"));
    }
    for (const mark of glyphState2.marks) {
      const c = manager.getMarkClass(mark);
      candidates2 = candidates2.concat(c.getLinkAnchors("end"));
    }
    // Filter based on link type
    switch (this.state.linkType) {
      case "line":
        {
          candidates1 = candidates1.filter(x => x.points.length == 1);
          candidates2 = candidates2.filter(x => x.points.length == 1);
        }
        break;
      case "band": {
        candidates1 = candidates1.filter(x => x.points.length == 2);
        candidates2 = candidates2.filter(x => x.points.length == 2);
      }
    }

    const glyphAttributes1 = glyphState1.attributes as Prototypes.Glyphs.RectangleGlyphAttributes;
    const glyphAttributes2 = glyphState2.attributes as Prototypes.Glyphs.RectangleGlyphAttributes;

    const determineRelationship = (
      a1: number,
      a2: number,
      b1: number,
      b2: number
    ): "before" | "overlap" | "after" => {
      // Make sure order is correct
      [a1, a2] = [Math.min(a1, a2), Math.max(a1, a2)];
      [b1, b2] = [Math.min(b1, b2), Math.max(b1, b2)];
      if (a2 <= b1) {
        return "after";
      } else if (a1 >= b2) {
        return "before";
      } else {
        return "overlap";
      }
    };
    // Determine relative position
    const xRelationship = determineRelationship(
      glyphAttributes1.x1,
      glyphAttributes1.x2,
      glyphAttributes2.x1,
      glyphAttributes2.x2
    );
    const yRelationship = determineRelationship(
      glyphAttributes1.y1,
      glyphAttributes1.y2,
      glyphAttributes2.y1,
      glyphAttributes2.y2
    );

    const meanPoint = (points: Point[]): Point => {
      let x = 0,
        y = 0;
      for (const pt of points) {
        x += pt.x;
        y += pt.y;
      }
      return {
        x: x / points.length,
        y: y / points.length
      };
    };

    let c1: Prototypes.LinkAnchor.Description = null,
      c2: Prototypes.LinkAnchor.Description = null;
    if (xRelationship == "after") {
      if (linkMode == "link-table") {
        c1 = candidates1[argMin(candidates1, c => meanPoint(c.points).y)];
        c2 = candidates2[argMin(candidates2, c => meanPoint(c.points).y)];
      } else {
        c1 = candidates1[argMax(candidates1, c => meanPoint(c.points).x)];
        c2 = candidates2[argMin(candidates2, c => meanPoint(c.points).x)];
      }
    } else if (xRelationship == "before") {
      if (linkMode == "link-table") {
        c1 = candidates1[argMin(candidates1, c => meanPoint(c.points).y)];
        c2 = candidates2[argMin(candidates2, c => meanPoint(c.points).y)];
      } else {
        c1 = candidates1[argMin(candidates1, c => meanPoint(c.points).x)];
        c2 = candidates2[argMax(candidates2, c => meanPoint(c.points).x)];
      }
    } else {
      if (yRelationship == "after") {
        if (linkMode == "link-table") {
          c1 = candidates1[argMin(candidates1, c => meanPoint(c.points).x)];
          c2 = candidates2[argMin(candidates2, c => meanPoint(c.points).x)];
        } else {
          c1 = candidates1[argMax(candidates1, c => meanPoint(c.points).y)];
          c2 = candidates2[argMin(candidates2, c => meanPoint(c.points).y)];
        }
      } else if (yRelationship == "before") {
        if (linkMode == "link-table") {
          c1 = candidates1[argMin(candidates1, c => meanPoint(c.points).x)];
          c2 = candidates2[argMin(candidates2, c => meanPoint(c.points).x)];
        } else {
          c1 = candidates1[argMin(candidates1, c => meanPoint(c.points).y)];
          c2 = candidates2[argMax(candidates2, c => meanPoint(c.points).y)];
        }
      } else {
        c1 =
          candidates1[
            argMin(candidates1, c => Math.abs(meanPoint(c.points).y))
          ];
        c2 =
          candidates2[
            argMin(candidates2, c => Math.abs(meanPoint(c.points).y))
          ];
      }
    }

    switch (this.state.linkType) {
      case "line":
        {
          if (c1 == null) {
            c1 = {
              element: null,
              points: [
                {
                  xAttribute: "icx",
                  yAttribute: "icy",
                  x: 0,
                  y: 0,
                  direction: { x: 0, y: 0 }
                }
              ]
            };
          }
          if (c2 == null) {
            c2 = {
              element: null,
              points: [
                {
                  xAttribute: "icx",
                  yAttribute: "icy",
                  x: 0,
                  y: 0,
                  direction: { x: 0, y: 0 }
                }
              ]
            };
          }
        }
        break;
      case "band":
        {
          if (c1 == null) {
            c1 = {
              element: null,
              points: [
                {
                  xAttribute: "icx",
                  yAttribute: "iy1",
                  x: 0,
                  y: 0,
                  direction: { x: 1, y: 0 }
                },
                {
                  xAttribute: "icx",
                  yAttribute: "iy2",
                  x: 0,
                  y: 0,
                  direction: { x: 1, y: 0 }
                }
              ]
            };
          }
          if (c2 == null) {
            c2 = {
              element: null,
              points: [
                {
                  xAttribute: "icx",
                  yAttribute: "iy1",
                  x: 0,
                  y: 0,
                  direction: { x: -1, y: 0 }
                },
                {
                  xAttribute: "icx",
                  yAttribute: "iy2",
                  x: 0,
                  y: 0,
                  direction: { x: -1, y: 0 }
                }
              ]
            };
          }
        }
        break;
    }

    const anchor1 = c1.points.map(pt => {
      return {
        x: { element: c1.element, attribute: pt.xAttribute },
        y: { element: c1.element, attribute: pt.yAttribute },
        direction: pt.direction
      } as Specification.Types.LinkAnchorPoint;
    });

    const anchor2 = c2.points.map(pt => {
      return {
        x: { element: c2.element, attribute: pt.xAttribute },
        y: { element: c2.element, attribute: pt.yAttribute },
        direction: pt.direction
      } as Specification.Types.LinkAnchorPoint;
    });

    if (linkMode != "link-table") {
      if (c1.element != null) {
        const element1 = getById(glyph1.marks, c1.element);
        switch (element1.classID) {
          case "mark.symbol":
            {
              if (element1.mappings.fill != null) {
                color = element1.mappings.fill;
              }
            }
            break;
          case "mark.rect":
            {
              if (element1.mappings.fill != null) {
                color = element1.mappings.fill;
              }
            }
            break;
        }
      }
    }

    let interpolationType: Prototypes.Links.InterpolationType = "line";
    if (cs instanceof Graphics.PolarCoordinates) {
      interpolationType = "bezier";
    } else {
      interpolationType = "line";
    }
    // If directions are the same direction, switch line to circle.
    if (Geometry.vectorDot(anchor1[0].direction, anchor2[0].direction) > 0) {
      if (interpolationType == "line") {
        interpolationType = "circle";
      }
    }

    return {
      linkType: this.state.linkType,
      interpolationType,
      anchor1,
      anchor2,
      color,
      opacity
    };
  }

  public getLinkObject() {
    const manager = this.context.store.chartStore.chartManager;
    let defaultColor: Specification.ValueMapping;
    let defaultOpacity: Specification.ValueMapping;
    switch (this.state.linkType) {
      case "line":
        {
          defaultColor = { type: "value", value: { r: 0, g: 0, b: 0 } };
          defaultOpacity = { type: "value", value: 0.5 };
        }
        break;
      case "band":
        {
          defaultColor = { type: "value", value: { r: 0, g: 0, b: 0 } };
          defaultOpacity = { type: "value", value: 0.5 };
        }
        break;
    }
    const plotSegmentIDs = this.state.selectedPlotSegments;
    const plotSegmentClasses = plotSegmentIDs.map(
      x => manager.getClassById(x) as Prototypes.PlotSegments.PlotSegmentClass
    );
    const glyphs = plotSegmentClasses.map(
      c => manager.getObjectById(c.object.glyph) as Specification.Glyph
    );

    switch (this.state.linkMode) {
      case "link-through": {
        // Find the first pair of glyphs
        const plotSegmentClass = plotSegmentClasses[0];
        const glyph = glyphs[0];

        const facetBy = this.groupBySelector
          ? this.groupBySelector.value
            ? [this.groupBySelector.value.expression]
            : []
          : [];

        const facets = Prototypes.Links.facetRows(
          manager.dataflow.getTable(plotSegmentClass.object.table),
          plotSegmentClass.state.dataRowIndices,
          facetBy.map(x => manager.dataflow.cache.parse(x))
        );

        const layoutState = plotSegmentClass.state;
        const rowToMarkState = new Map<string, Specification.GlyphState>();
        for (let i = 0; i < layoutState.dataRowIndices.length; i++) {
          rowToMarkState.set(
            layoutState.dataRowIndices[i].join(","),
            layoutState.glyphs[i]
          );
        }

        const {
          linkType,
          interpolationType,
          anchor1,
          anchor2,
          color,
          opacity
        } = this.getDefaultAnchor(
          manager,
          "link-through",
          plotSegmentClass.getCoordinateSystem(),
          glyph,
          rowToMarkState.get(facets[0][0].join(",")),
          glyph,
          rowToMarkState.get(facets[0][1].join(","))
        );

        const links: Specification.Links = {
          _id: uniqueID(),
          classID: "links.through",
          mappings: {
            color,
            opacity
          },
          properties: {
            name: "Link",
            visible: true,
            linkType,
            interpolationType,
            anchor1,
            anchor2,
            linkThrough: {
              plotSegment: this.state.selectedPlotSegments[0],
              facetExpressions: facetBy
            },
            curveness: 30
          } as Prototypes.Links.LinksProperties
        };

        return links;
      }
      case "link-between": {
        // Find the first pair of glyphs
        const firstGlyphs = plotSegmentClasses.map(x => x.state.glyphs[0]);
        const {
          linkType,
          interpolationType,
          anchor1,
          anchor2,
          color,
          opacity
        } = this.getDefaultAnchor(
          manager,
          "link-between",
          new Graphics.CartesianCoordinates(),
          glyphs[0],
          firstGlyphs[0],
          glyphs[1],
          firstGlyphs[1]
        );

        const links: Specification.Links = {
          _id: uniqueID(),
          classID: "links.between",
          mappings: {
            color,
            opacity
          },
          properties: {
            name: "Link",
            visible: true,
            linkType,
            interpolationType,
            anchor1,
            anchor2,
            linkBetween: {
              plotSegments: plotSegmentIDs
            },
            curveness: 30
          } as Prototypes.Links.LinksProperties
        };

        return links;
      }
      case "link-table": {
        // Find the first pair of glyphs
        const firstGlyphs = plotSegmentClasses[0].state.glyphs;
        const {
          linkType,
          interpolationType,
          anchor1,
          anchor2,
          color,
          opacity
        } = this.getDefaultAnchor(
          manager,
          "link-table",
          plotSegmentClasses[0].getCoordinateSystem(),
          glyphs[0],
          firstGlyphs[0],
          glyphs[0],
          firstGlyphs[1]
        );

        const links: Specification.Links = {
          _id: uniqueID(),
          classID: "links.table",
          mappings: {
            color,
            opacity
          },
          properties: {
            name: "Link",
            visible: true,
            linkType,
            interpolationType,
            anchor1,
            anchor2,
            linkTable: {
              table: this.context.store.datasetStore.dataset.tables[1].name,
              plotSegments: [
                plotSegmentClasses[0].object._id,
                plotSegmentClasses[0].object._id
              ]
            },
            curveness: 30
          } as Prototypes.Links.LinksProperties
        };

        return links;
      }
    }
  }
}

export interface PlotSegmentSelectorProps {
  items: Specification.PlotSegment[];
  defaultSelection?: string[];
  onChange?: (newSelection: string[]) => void;
}

export interface PlotSegmentSelectorState {
  order: string[];
  selection: string[];
}

export class PlotSegmentSelector extends ContextedComponent<
  PlotSegmentSelectorProps,
  PlotSegmentSelectorState
> {
  public state: PlotSegmentSelectorState = this.getInitialState();

  private getInitialState(): PlotSegmentSelectorState {
    const plotSegments = this.props.items;
    return {
      order: plotSegments.map(x => x._id),
      selection: this.props.defaultSelection || plotSegments.map(x => x._id)
    };
  }

  private notify() {
    if (this.props.onChange) {
      this.props.onChange(this.state.selection);
    }
  }

  public render() {
    return (
      <div className="charticulator__plot-segment-selector charticulator-panel-list-view is-list">
        <ReorderListView
          enabled={true}
          onReorder={(a, b) => {
            const newOrder = this.state.order.slice();
            ReorderListView.ReorderArray(newOrder, a, b);
            const newSelection = this.state.order.filter(
              x => this.state.selection.indexOf(x) >= 0
            );
            this.setState(
              {
                order: newOrder,
                selection: newSelection
              },
              () => this.notify()
            );
          }}
        >
          {this.state.order.map(id => {
            const item = getById(this.props.items, id);
            return (
              <div
                key={id}
                className={classNames("el-item", [
                  "is-active",
                  this.state.selection.indexOf(id) >= 0
                ])}
                onClick={e => {
                  if (e.shiftKey) {
                    const newSelection = this.state.order.filter(
                      x => x == id || this.state.selection.indexOf(x) >= 0
                    );
                    this.setState(
                      {
                        selection: newSelection
                      },
                      () => this.notify()
                    );
                  } else {
                    this.setState(
                      {
                        selection: [id]
                      },
                      () => this.notify()
                    );
                  }
                }}
              >
                <SVGImageIcon
                  url={R.getSVGIcon(
                    Prototypes.ObjectClasses.GetMetadata(item.classID).iconPath
                  )}
                />
                <span className="el-text">{item.properties.name}</span>
              </div>
            );
          })}
        </ReorderListView>
      </div>
    );
  }
}

export interface PanelRadioControlProps {
  options: string[];
  icons?: string[];
  labels?: string[];
  showText?: boolean;
  asList?: boolean;
  value?: string;
  onChange?: (newValue: string) => void;
}

export class PanelRadioControl extends React.Component<
  PanelRadioControlProps,
  {}
> {
  public render() {
    const mainClass = this.props.asList
      ? "charticulator-panel-list-view"
      : "charticulator-panel-list-view is-inline";
    return (
      <span className={mainClass}>
        {this.props.options.map((option, index) => {
          return (
            <span
              className={classNames("el-item", [
                "is-active",
                this.props.value == option
              ])}
              key={option}
              onClick={() => {
                if (this.props) {
                  this.props.onChange(option);
                }
              }}
            >
              {this.props.icons ? (
                <SVGImageIcon url={R.getSVGIcon(this.props.icons[index])} />
              ) : null}
              {this.props.labels && this.props.showText ? (
                <span className="el-text">{this.props.labels[index]}</span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }
}

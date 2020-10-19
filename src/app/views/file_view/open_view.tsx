// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import * as React from "react";
import * as R from "../../resources";

import { ItemDescription } from "../../backend/abstract";
import {
  ButtonFlat,
  EditableTextView,
  SVGImageIcon,
  ButtonRaised
} from "../../components";
import { ContextedComponent } from "../../context_component";
import { Actions } from "../../actions";
import { showOpenFileDialog, readFileAsString } from "../../utils";

export interface FileViewOpenState {
  chartList: ItemDescription[];
  chartCount: number;
}

export class FileViewOpen extends ContextedComponent<
  {
    onClose: () => void;
  },
  FileViewOpenState
> {
  public state: FileViewOpenState = {
    chartList: [],
    chartCount: 0
  };

  public componentDidMount() {
    this.updateChartList();
  }

  public updateChartList() {
    const store = this.store;
    store.backend.list("chart", "timeCreated", 0, 1000).then(result => {
      this.setState({
        chartList: result.items,
        chartCount: result.totalCount
      });
    });
  }

  public renderChartList() {
    const store = this.store;
    const backend = store.backend;

    if (this.state.chartList == null) {
      return (
        <p className="loading-indicator">
          <SVGImageIcon url={R.getSVGIcon("loading")} /> loading...
        </p>
      );
    } else {
      if (this.state.chartCount == 0) {
        return <p>(no chart to show)</p>;
      } else {
        return (
          <ul className="chart-list">
            {this.state.chartList.map(chart => {
              return (
                <li
                  key={chart.id}
                  onClick={() => {
                    this.dispatch(
                      new Actions.Open(chart.id, error => {
                        if (error) {
                          // TODO: add error reporting
                        } else {
                          this.props.onClose();
                        }
                      })
                    );
                  }}
                >
                  <div className="thumbnail">
                    <img src={chart.metadata.thumbnail as string} />
                  </div>
                  <div className="description">
                    <div className="name" onClick={e => e.stopPropagation()}>
                      <EditableTextView
                        text={chart.metadata.name}
                        onEdit={newText => {
                          backend.get(chart.id).then(chart => {
                            chart.metadata.name = newText;
                            backend
                              .put(chart.id, chart.data, chart.metadata)
                              .then(() => {
                                this.updateChartList();
                              });
                          });
                        }}
                      />
                    </div>
                    <div className="metadata">{chart.metadata.dataset}</div>
                    <div className="footer">
                      <div className="metadata">
                        {new Date(chart.metadata.timeCreated).toLocaleString()}
                      </div>
                      <div className="actions">
                        <ButtonFlat
                          url={R.getSVGIcon("toolbar/trash")}
                          title="Delete this chart"
                          stopPropagation={true}
                          onClick={() => {
                            if (
                              confirm(
                                `Do you want to delete the chart "${
                                  chart.metadata.name
                                }"?`
                              )
                            ) {
                              backend.delete(chart.id).then(() => {
                                this.updateChartList();
                              });
                            }
                          }}
                        />
                        <ButtonFlat
                          url={R.getSVGIcon("toolbar/copy")}
                          title="Copy this chart"
                          stopPropagation={true}
                          onClick={() => {
                            backend.get(chart.id).then(chart => {
                              backend
                                .create("chart", chart.data, chart.metadata)
                                .then(() => {
                                  this.updateChartList();
                                });
                            });
                          }}
                        />
                        <ButtonFlat
                          url={R.getSVGIcon("toolbar/download")}
                          title="Download this chart"
                          stopPropagation={true}
                          onClick={() => {
                            backend.get(chart.id).then(chart => {
                              const blob = new Blob([
                                JSON.stringify(chart.data, null, 2)
                              ]);
                              FileSaver.saveAs(
                                blob,
                                chart.metadata.name.replace(
                                  /[^0-9a-zA-Z\ \.\-\_]+/g,
                                  "_"
                                ) + ".chart"
                              );
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }
    }
  }

  public render() {
    return (
      <section className="charticulator__file-view-content is-fix-width">
        <h1>Open</h1>
        <div style={{ marginBottom: "12px" }}>
          <ButtonRaised
            url={R.getSVGIcon("toolbar/open")}
            text="Open Chart"
            onClick={async () => {
              const file = await showOpenFileDialog(["chart"]);
              const str = await readFileAsString(file);
              const data = JSON.parse(str);
              this.dispatch(new Actions.Load(data.state));
              this.props.onClose();
            }}
          />
        </div>

        {this.renderChartList()}
      </section>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import * as React from "react";
import * as R from "../../resources";

import { ItemDescription } from "../../backend/abstract";
import { ButtonFlat, EditableTextView, SVGImageIcon } from "../../components";
import { Actions } from "../../actions";
import { showOpenFileDialog, readFileAsString } from "../../utils";
import { strings } from "../../../strings";
import { AppStore } from "../../stores";
// import { DefaultButton } from "@fluentui/react";
import { primaryButtonStyles } from "../../../core";
import { Button } from "@fluentui/react-components";

export interface FileViewOpenState {
  chartList: ItemDescription[];
  chartCount: number;
}

export class FileViewOpen extends React.Component<
  React.PropsWithChildren<{
    onClose: () => void;
    store: AppStore;
  }>,
  FileViewOpenState
> {
  public state: FileViewOpenState = {
    chartList: [],
    chartCount: 0,
  };

  public componentDidMount() {
    this.updateChartList();
  }

  public updateChartList() {
    const store = this.props.store;
    store.backend.list("chart", "timeCreated", 0, 1000).then((result) => {
      this.setState({
        chartList: result.items,
        chartCount: result.totalCount,
      });
    });
  }

  // eslint-disable-next-line
  public renderChartList() {
    const store = this.props.store;
    const backend = store.backend;

    if (this.state.chartList == null) {
      return (
        <p className="loading-indicator">
          <SVGImageIcon url={R.getSVGIcon("loading")} /> {strings.app.loading}
        </p>
      );
    } else {
      if (this.state.chartCount == 0) {
        return <p>{strings.fileOpen.noChart}</p>;
      } else {
        return (
          <ul className="chart-list">
            {/* eslint-disable-next-line */}
            {this.state.chartList.map((chart) => {
              return (
                <li
                  key={chart.id}
                  tabIndex={0}
                  onClick={() => {
                    this.props.store.dispatcher.dispatch(
                      new Actions.Open(chart.id, (error) => {
                        if (error) {
                          // TODO: add error reporting
                        } else {
                          this.props.onClose();
                        }
                      })
                    );
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      this.props.store.dispatcher.dispatch(
                        new Actions.Open(chart.id, (error) => {
                          if (error) {
                            // TODO: add error reporting
                          } else {
                            this.props.onClose();
                          }
                        })
                      );
                    }
                  }}
                >
                  <div className="thumbnail">
                    <img src={chart.metadata.thumbnail as string} />
                  </div>
                  <div className="description">
                    <div className="name" onClick={(e) => e.stopPropagation()}>
                      <EditableTextView
                        text={chart.metadata.name}
                        onEdit={(newText) => {
                          backend.get(chart.id).then((chart) => {
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
                          title={strings.fileOpen.delete}
                          stopPropagation={true}
                          onClick={() => {
                            if (
                              confirm(
                                strings.fileOpen.deleteConfirmation(
                                  chart.metadata.name
                                )
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
                          title={strings.fileOpen.copy}
                          stopPropagation={true}
                          onClick={() => {
                            backend.get(chart.id).then((chart) => {
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
                          title={strings.fileOpen.download}
                          stopPropagation={true}
                          onClick={() => {
                            backend.get(chart.id).then((chart) => {
                              const blob = new Blob([
                                JSON.stringify(chart.data, null, 2),
                              ]);
                              FileSaver.saveAs(
                                blob,
                                chart.metadata.name.replace(
                                  // eslint-disable-next-line
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
        <h1>{strings.mainTabs.open}</h1>
        <div style={{ marginBottom: "12px" }}>
          <Button
            // iconProps={{
            //   iconName: "OpenFolderHorizontal",
            // }}
            icon={<SVGImageIcon url={R.getSVGIcon('OpenFolderHorizontal')}/>}
            // styles={primaryButtonStyles}
            title={strings.fileOpen.open}
            onClick={async () => {
              const file = await showOpenFileDialog(["chart"]);
              const str = await readFileAsString(file);
              const data = JSON.parse(str);
              this.props.store.dispatcher.dispatch(
                new Actions.Load(data.state)
              );
              this.props.onClose();
            }}
          >{strings.fileOpen.open}</Button>
        </div>

        {this.renderChartList()}
      </section>
    );
  }
}

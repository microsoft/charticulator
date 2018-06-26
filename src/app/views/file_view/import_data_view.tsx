import * as React from "react";
import * as R from "../../resources";
import * as globals from "../../globals";
import { getConfig } from "../../config";
import { Dataset } from "../../../core";
import { classNames } from "../../utils";
import { ButtonRaised } from "../../components/index";
import { SVGImageIcon } from "../../components/icons";
import { TableView } from "../dataset/table_view";
import { PopupView } from "../../controllers";

function readFileAsString(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error(`unable to read file ${file.name}`));
    };
    reader.readAsText(file, "utf-8");
  });
}

function getExtension(filename: string) {
  const m = filename.match(/\.([^\.]+)$/);
  if (m) {
    return m[1].toLowerCase();
  } else {
    return null;
  }
}

function getFileNameWithoutExtension(filename: string) {
  return filename.replace(/\.([^\.]+)$/, "");
}

export interface FileUploaderProps {
  onChange: (file: File) => void;
  extensions: string[];
}

export interface FileUploaderState {
  filename: string;
  draggingOver: boolean;
}

export class FileUploader extends React.Component<
  FileUploaderProps,
  FileUploaderState
> {
  private inputElement: HTMLInputElement;

  constructor(props: FileUploaderProps) {
    super(props);
    this.state = {
      draggingOver: false,
      filename: null
    };
  }

  public reset() {
    this.inputElement.value = null;
    this.setState({
      filename: null
    });
  }

  private onInputChange() {
    if (this.inputElement.files.length == 1) {
      this.setState({
        filename: this.inputElement.files[0].name
      });
      if (this.props.onChange) {
        this.props.onChange(this.inputElement.files[0]);
      }
    }
  }

  private showOpenFile() {
    this.reset();
    this.inputElement.click();
  }

  private isDataTransferValid(dt: DataTransfer) {
    if (dt && dt.items.length == 1) {
      if (dt.items[0].kind == "file") {
        return true;
      }
    }
    return false;
  }
  private getFileFromDataTransfer(dt: DataTransfer) {
    if (dt && dt.items.length == 1) {
      if (dt.items[0].kind == "file") {
        const file = dt.items[0].getAsFile();
        const ext = getExtension(file.name);
        if (this.props.extensions.indexOf(ext) >= 0) {
          return file;
        } else {
          return null;
        }
      }
    }
    if (dt && dt.files.length == 1) {
      return dt.files[0];
    }
    return null;
  }

  public render() {
    return (
      <div
        className={classNames(
          "charticulator__file-uploader",
          ["is-dragging-over", this.state.draggingOver],
          ["is-active", this.state.filename != null]
        )}
        onClick={() => this.showOpenFile()}
        onDragOver={e => {
          e.preventDefault();
          if (this.isDataTransferValid(e.dataTransfer)) {
            this.setState({
              draggingOver: true
            });
          }
        }}
        onDragLeave={e => {
          this.setState({
            draggingOver: false
          });
        }}
        onDragExit={e => {
          this.setState({
            draggingOver: false
          });
        }}
        onDrop={e => {
          e.preventDefault();
          this.setState({
            draggingOver: false
          });
          const file = this.getFileFromDataTransfer(e.dataTransfer);
          if (file != null) {
            this.setState({
              filename: file.name
            });
            if (this.props.onChange) {
              this.props.onChange(file);
            }
          }
        }}
      >
        <input
          style={{ display: "none" }}
          accept={this.props.extensions.map(x => "." + x).join(",")}
          ref={e => (this.inputElement = e)}
          type="file"
          onChange={() => this.onInputChange()}
        />
        {this.state.filename == null ? (
          <span className="charticulator__file-uploader-prompt">
            <SVGImageIcon url={R.getSVGIcon("toolbar/import")} />Open or Drop
            File
          </span>
        ) : (
          <span className="charticulator__file-uploader-filename">
            {this.state.filename}
          </span>
        )}
      </div>
    );
  }
}

export interface ImportDataViewProps {
  onConfirmImport?: (dataset: Dataset.Dataset) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export interface ImportDataViewState {
  dataTable: Dataset.Table;
  linkTable: Dataset.Table;
}

export class ImportDataView extends React.Component<
  ImportDataViewProps,
  ImportDataViewState
> {
  constructor(props: ImportDataViewProps) {
    super(props);
    this.state = {
      dataTable: null,
      linkTable: null
    };
  }
  private loadFileAsTable(file: File): Promise<Dataset.Table> {
    return readFileAsString(file).then(contents => {
      const ext = getExtension(file.name);
      const filename = getFileNameWithoutExtension(file.name);
      const loader = new Dataset.DatasetLoader();
      switch (ext) {
        case "csv": {
          return loader.loadCSVFromContents(filename, contents);
        }
        case "tsv": {
          return loader.loadTSVFromContents(filename, contents);
        }
      }
    });
  }

  public renderTable(table: Dataset.Table) {
    return <TableView table={table} maxRows={5} />;
  }

  public render() {
    let sampleDatasetDiv: HTMLDivElement;
    const sampleDatasets = getConfig().SampleDatasets;
    return (
      <div className="charticulator__import-data-view">
        {sampleDatasets != null ? (
          <div ref={e => (sampleDatasetDiv = e)}>
            <ButtonRaised
              text="Load Sample Dataset..."
              onClick={() => {
                globals.popupController.popupAt(
                  context => {
                    return (
                      <PopupView context={context}>
                        <div className="charticulator__sample-dataset-list">
                          {sampleDatasets.map(dataset => {
                            return (
                              <div
                                className="charticulator__sample-dataset-list-item"
                                key={dataset.name}
                                onClick={() => {
                                  Promise.all(
                                    dataset.tables.map(table => {
                                      const loader = new Dataset.DatasetLoader();
                                      return loader
                                        .loadCSVFromURL(table.url)
                                        .then(r => {
                                          r.name = table.name;
                                          return r;
                                        });
                                    })
                                  ).then(tables => {
                                    context.close();
                                    const ds: Dataset.Dataset = {
                                      name: dataset.name,
                                      tables
                                    };
                                    this.props.onConfirmImport(ds);
                                  });
                                }}
                              >
                                <div className="el-title">{dataset.name}</div>
                                <div className="el-description">
                                  {dataset.description}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </PopupView>
                    );
                  },
                  { anchor: sampleDatasetDiv }
                );
              }}
            />
          </div>
        ) : null}
        <h2>
          Data{this.state.dataTable ? ": " + this.state.dataTable.name : null}
        </h2>
        {this.state.dataTable ? (
          <div className="charticulator__import-data-view-table">
            {this.renderTable(this.state.dataTable)}
            <ButtonRaised
              text="Remove"
              url={R.getSVGIcon("general/cross")}
              title="Remove this table"
              onClick={() => {
                this.setState({
                  dataTable: null
                });
              }}
            />
          </div>
        ) : (
          <FileUploader
            extensions={["csv", "tsv"]}
            onChange={file => {
              this.loadFileAsTable(file).then(table => {
                this.setState({
                  dataTable: table
                });
              });
            }}
          />
        )}
        <h2>
          Links{this.state.linkTable ? ": " + this.state.linkTable.name : null}
        </h2>
        {this.state.linkTable ? (
          <div className="charticulator__import-data-view-table">
            {this.renderTable(this.state.linkTable)}
            <ButtonRaised
              text="Remove"
              url={R.getSVGIcon("general/cross")}
              title="Remove this table"
              onClick={() => {
                this.setState({
                  linkTable: null
                });
              }}
            />
          </div>
        ) : (
          <FileUploader
            extensions={["csv", "tsv"]}
            onChange={file => {
              this.loadFileAsTable(file).then(table => {
                this.setState({
                  linkTable: table
                });
              });
            }}
          />
        )}
        <div className="el-actions">
          <ButtonRaised
            text="Done"
            url={R.getSVGIcon("general/confirm")}
            title="Finish importing data"
            disabled={this.state.dataTable == null}
            onClick={() => {
              if (this.state.dataTable != null) {
                const dataset: Dataset.Dataset = {
                  name: this.state.dataTable.name,
                  tables: [this.state.dataTable]
                };
                if (this.state.linkTable != null) {
                  dataset.tables.push(this.state.linkTable);
                }
                this.props.onConfirmImport(dataset);
              }
            }}
          />
        </div>
        <div className="charticulator__credits">
          <p
            dangerouslySetInnerHTML={{
              __html: getConfig().LegalNotices.privacyStatementHTML
            }}
          />
        </div>
      </div>
    );
  }
}

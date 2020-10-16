// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../globals";
import * as R from "../resources";

import { deepClone, EventSubscription } from "../../core";
import { Actions } from "../actions";
import { AppButton, MenuButton } from "../components";
import { ContextedComponent } from "../context_component";
import { ModalView, PopupView } from "../controllers";

import { FileView } from "./file_view";
import { AppStore } from "../stores";
import { Button } from "./panels/widgets/controls";
import { isInIFrame, readFileAsString, showOpenFileDialog } from "../utils";
import { ChartTemplate } from "../../container";

export class HelpButton extends React.Component<{}, {}> {
  public render() {
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/help")}
        title="Help"
        ref="helpButton"
        onClick={() => {
          globals.popupController.popupAt(
            (context) => {
              return (
                <PopupView
                  context={context}
                  className="charticulator__menu-popup"
                >
                  <div
                    className="charticulator__menu-dropdown"
                    onClick={() => context.close()}
                  >
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://charticulator.com/docs/getting-started.html"
                      >
                        Getting Started
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://charticulator.com/gallery/index.html"
                      >
                        Example Gallery
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://github.com/Microsoft/charticulator/issues/new"
                      >
                        Report an Issue
                      </a>
                    </div>
                    <div className="el-item">
                      <a target="_blank" href="https://charticulator.com/">
                        Charticulator Home
                      </a>
                    </div>
                    <div className="el-item">
                      <a href="mailto:charticulator@microsoft.com">
                        Contact Us
                      </a>
                    </div>
                    <div className="el-item-version">
                      Version: {CHARTICULATOR_PACKAGE.version}
                    </div>
                  </div>
                </PopupView>
              );
            },
            {
              anchor: ReactDOM.findDOMNode(this.refs.helpButton) as Element,
              alignX: "end-inner",
            }
          );
        }}
      />
    );
  }
}

export class MenuBar extends ContextedComponent<
  {
    name?: string;
  },
  {}
> {
  protected subs: EventSubscription;

  public componentDidMount() {
    window.addEventListener("keydown", this.onKeyDown);
    this.subs = this.context.store.addListener(
      AppStore.EVENT_IS_NESTED_EDITOR,
      () => this.forceUpdate()
    );
  }

  public componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
    this.subs.remove();
  }

  public keyboardMap: { [name: string]: string } = {
    "ctrl-z": "undo",
    "ctrl-y": "redo",
    "ctrl-s": "save",
    "ctrl-shift-s": "export",
    "ctrl-n": "new",
    "ctrl-o": "open",
    backspace: "delete",
    delete: "delete",
    escape: "escape",
  };

  public onKeyDown = (e: KeyboardEvent) => {
    if (e.target == document.body) {
      let prefix = "";
      if (e.shiftKey) {
        prefix = "shift-" + prefix;
      }
      if (e.ctrlKey || e.metaKey) {
        prefix = "ctrl-" + prefix;
      }
      const name = `${prefix}${e.key}`.toLowerCase();
      if (this.keyboardMap[name]) {
        const command = this.keyboardMap[name];
        switch (command) {
          case "new":
            {
              this.showFileModalWindow("open");
            }
            break;
          case "open":
            {
              this.showFileModalWindow("open");
            }
            break;
          case "save":
            {
              if (
                this.context.store.editorType == "nested" ||
                this.context.store.editorType == "embedded"
              ) {
                this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
              } else {
                if (this.context.store.currentChartID) {
                  this.dispatch(new Actions.Save());
                } else {
                  this.showFileModalWindow("save");
                }
              }
            }
            break;
          case "export":
            {
              this.showFileModalWindow("export");
            }
            break;
          case "undo":
            {
              new Actions.Undo().dispatch(this.context.store.dispatcher);
            }
            break;
          case "redo":
            {
              new Actions.Redo().dispatch(this.context.store.dispatcher);
            }
            break;
          case "delete":
            {
              this.store.deleteSelection();
            }
            break;
          case "escape":
            {
              this.store.handleEscapeKey();
            }
            break;
        }
        e.preventDefault();
      }
    }
  };
  public hideFileModalWindow(defaultTab: string = "open") {
    globals.popupController.reset();
  }

  public showFileModalWindow(defaultTab: string = "open") {
    if (this.context.store.disableFileView) {
      return;
    }
    globals.popupController.showModal(
      (context) => {
        return (
          <ModalView context={context}>
            <FileView
              backend={this.context.store.backend}
              defaultTab={defaultTab}
              store={this.context.store}
              onClose={() => context.close()}
            />
          </ModalView>
        );
      },
      { anchor: null }
    );
  }

  public renderSaveNested() {
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/save")}
        text="Save Nested Chart"
        title="Save (Ctrl-S)"
        onClick={() => {
          this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
        }}
      />
    );
  }

  public renderExportImportButtons() {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/import")}
          text=""
          title="Import template"
          onClick={async () => {
            const file = await showOpenFileDialog(["tmplt"]);
            const str = await readFileAsString(file);
            const data = JSON.parse(str);
            const template = new ChartTemplate(data);
            for (const table of this.store.dataset.tables) {
              const tTable = template.getDatasetSchema()[0];
              template.assignTable(tTable.name, table.name);
              for (const column of tTable.columns) {
                template.assignColumn(tTable.name, column.name, column.name);
              }
            }
            const instance = template.instantiate(
              this.store.dataset,
              false // no scale inference
            );

            this.store.dispatcher.dispatch(
              new Actions.ImportChartAndDataset(
                instance.chart,
                this.store.dataset,
                {}
              )
            );
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/export")}
          text=""
          title="Export template"
          onClick={() => {
            const template = deepClone(this.store.buildChartTemplate());
            const target = this.store.createExportTemplateTarget(
              "Charticulator Template",
              template
            );
            const targetProperties: { [name: string]: string } = {};
            for (const property of target.getProperties()) {
              targetProperties[property.name] =
                this.store.getPropertyExportName(property.name) ||
                property.default;
            }

            this.dispatch(
              new Actions.ExportTemplate("", target, targetProperties)
            );
          }}
        />
      </>
    );
  }

  public renderSaveEmbedded() {
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/save")}
        text=""
        title="Save (Ctrl-S)"
        onClick={() => {
          this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
        }}
      />
    );
  }

  public renderNewOpenSave() {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/new")}
          title="New (Ctrl-N)"
          onClick={() => {
            this.showFileModalWindow("new");
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/open")}
          title="Open (Ctrl-O)"
          onClick={() => {
            this.showFileModalWindow("open");
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/save")}
          title="Save (Ctrl-S)"
          onClick={() => {
            if (this.context.store.currentChartID) {
              this.dispatch(new Actions.Save());
            } else {
              this.showFileModalWindow("save");
            }
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/export")}
          title="Export"
          onClick={() => {
            this.showFileModalWindow("export");
          }}
        />
      </>
    );
  }

  public render() {
    return (
      <section className="charticulator__menu-bar">
        <div className="charticulator__menu-bar-left">
          <AppButton
            name={this.props.name}
            onClick={() => this.showFileModalWindow("open")}
          />
          <span className="charticulator__menu-bar-separator" />
          {this.context.store.editorType === "nested"
            ? this.renderSaveNested()
            : null}
          {this.context.store.editorType === "chart"
            ? this.renderNewOpenSave()
            : null}
          {this.context.store.editorType === "embedded"
            ? this.renderSaveEmbedded()
            : null}
          <span className="charticulator__menu-bar-separator" />
          {this.context.store.editorType === "embedded"
            ? this.renderExportImportButtons()
            : null}
          <span className="charticulator__menu-bar-separator" />
          <MenuButton
            url={R.getSVGIcon("toolbar/undo")}
            title="Undo (Ctrl-Z)"
            onClick={() =>
              new Actions.Undo().dispatch(this.context.store.dispatcher)
            }
          />
          <MenuButton
            url={R.getSVGIcon("toolbar/redo")}
            title="Redo (Ctrl-Y)"
            onClick={() =>
              new Actions.Redo().dispatch(this.context.store.dispatcher)
            }
          />
          <span className="charticulator__menu-bar-separator" />
          <MenuButton
            url={R.getSVGIcon("toolbar/trash")}
            title="Reset"
            onClick={() => {
              if (isInIFrame()) {
                globals.popupController.showModal(
                  (context) => {
                    return (
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        className={"charticulator__reset_chart_dialog"}
                      >
                        <div
                          className={"charticulator__reset_chart_dialog-inner"}
                        >
                          {/* <ModalView context={context}> */}
                          <>
                            <p>Are you really willing to reset the chart?</p>
                            <div
                              className={
                                "charticulator__reset_chart_dialog-buttons"
                              }
                            >
                              <Button
                                text="Yes"
                                onClick={() => {
                                  this.context.store.dispatcher.dispatch(
                                    new Actions.Reset()
                                  );
                                  context.close();
                                }}
                              />
                              <Button
                                text="No"
                                onClick={() => {
                                  context.close();
                                }}
                              />
                            </div>
                          </>
                          {/* </ModalView> */}
                        </div>
                      </div>
                    );
                  },
                  { anchor: null }
                );
              } else {
                if (confirm("Are you really willing to reset the chart?")) {
                  new Actions.Reset().dispatch(this.context.store.dispatcher);
                }
              }
            }}
          />
        </div>
        <div className="charticulator__menu-bar-right">
          <HelpButton />
        </div>
      </section>
    );
  }
}

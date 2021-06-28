// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../globals";
import * as R from "../resources";

import { deepClone, EventSubscription } from "../../core";
import { Actions } from "../actions";
import { AppButton, MenuButton } from "../components";
import { ContextedComponent } from "../context_component";
import {
  ModalView,
  PopupAlignment,
  PopupContainer,
  PopupController,
  PopupView,
} from "../controllers";

import { FileView, MainTabs } from "./file_view";
import { AppStore } from "../stores";
import { Button } from "./panels/widgets/controls";
import { isInIFrame, readFileAsString } from "../utils";
import { ChartTemplate, Specification } from "../../container";
import { TableType } from "../../core/dataset";
import { FileViewImport, MappingMode } from "./file_view/import_view";
import { strings } from "../../strings";
import { PositionsLeftRight, UndoRedoLocation } from "../main_view";
import { getConfig } from "../config";

export class HelpButton extends React.Component<
  {
    hideReportIssues: boolean;
    handlers: MenuBarHandlers;
  },
  {}
> {
  public render() {
    const contactUsLinkProps: React.AnchorHTMLAttributes<HTMLAnchorElement> = {
      onClick: this.props.handlers?.onContactUsLink,
    };
    if (!contactUsLinkProps.onClick) {
      contactUsLinkProps.href =
        getConfig().ContactUsHref || "mailto:charticulator@microsoft.com";
    }
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/help")}
        title={strings.menuBar.help}
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
                        {strings.help.gettingStarted}
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://charticulator.com/gallery/index.html"
                      >
                        {strings.help.gallery}
                      </a>
                    </div>
                    {this.props.hideReportIssues ? null : (
                      <div className="el-item">
                        <a
                          target="_blank"
                          href="https://github.com/Microsoft/charticulator/issues/new"
                        >
                          {strings.help.issues}
                        </a>
                      </div>
                    )}
                    <div className="el-item">
                      <a target="_blank" href="https://charticulator.com/">
                        {strings.help.home}
                      </a>
                    </div>
                    <div className="el-item">
                      <a {...contactUsLinkProps}>{strings.help.contact}</a>
                    </div>
                    <div className="el-item-version">
                      {strings.help.version(CHARTICULATOR_PACKAGE.version)}
                    </div>
                  </div>
                </PopupView>
              );
            },
            {
              anchor: ReactDOM.findDOMNode(this.refs.helpButton) as Element,
              alignX: PopupAlignment.EndInner,
            }
          );
        }}
      />
    );
  }
}

export interface MenuBarHandlers {
  onContactUsLink?: () => void;
  onImportTemplateClick?: () => void;
  onExportTemplateClick?: () => void;
}

export interface MenuBarProps {
  undoRedoLocation: UndoRedoLocation;
  alignButtons: PositionsLeftRight;
  alignSaveButton: PositionsLeftRight;
  name?: string;
  handlers: MenuBarHandlers;
}

export class MenuBar extends ContextedComponent<MenuBarProps, {}> {
  protected editor: EventSubscription;
  protected graphics: EventSubscription;
  private popupController: PopupController = new PopupController();
  public componentDidMount() {
    window.addEventListener("keydown", this.onKeyDown);
    this.editor = this.context.store.addListener(
      AppStore.EVENT_IS_NESTED_EDITOR,
      () => this.forceUpdate()
    );
    this.graphics = this.context.store.addListener(
      AppStore.EVENT_GRAPHICS,
      () => this.forceUpdate()
    );
  }

  public componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
    this.editor.remove();
    this.graphics.remove();
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
              this.showFileModalWindow(MainTabs.open);
            }
            break;
          case "open":
            {
              this.showFileModalWindow(MainTabs.open);
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
                  this.showFileModalWindow(MainTabs.save);
                }
              }
            }
            break;
          case "export":
            {
              this.showFileModalWindow(MainTabs.export);
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
  public hideFileModalWindow() {
    globals.popupController.reset();
  }

  public showFileModalWindow(defaultTab: MainTabs = MainTabs.open) {
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
        text={strings.menuBar.saveNested}
        title={strings.menuBar.save}
        onClick={() => {
          this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
        }}
      />
    );
  }

  // eslint-disable-next-line
  public renderImportButton(props: MenuBarProps) {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/import-template")}
          text=""
          title={strings.menuBar.importTemplate}
          onClick={
            props.handlers?.onImportTemplateClick ||
            // eslint-disable-next-line
            (() => {
              const inputElement = document.createElement("input");
              inputElement.type = "file";
              let file = null;
              inputElement.accept = ["tmplt"].map((x) => "." + x).join(",");
              // eslint-disable-next-line
              inputElement.onchange = () => {
                if (inputElement.files.length == 1) {
                  file = inputElement.files[0];
                  if (file) {
                    // eslint-disable-next-line
                    readFileAsString(file).then((str) => {
                      const data = JSON.parse(
                        str
                      ) as Specification.Template.ChartTemplate;

                      let unmappedColumns: Specification.Template.Column[] = [];
                      data.tables[0].columns.forEach((column) => {
                        unmappedColumns = unmappedColumns.concat(
                          this.store.checkColumnsMapping(
                            column,
                            TableType.Main,
                            this.store.dataset
                          )
                        );
                      });
                      if (data.tables[1]) {
                        data.tables[1].columns.forEach((column) => {
                          unmappedColumns = unmappedColumns.concat(
                            this.store.checkColumnsMapping(
                              column,
                              TableType.Links,
                              this.store.dataset
                            )
                          );
                        });
                      }

                      const tableMapping = new Map<string, string>();
                      tableMapping.set(
                        data.tables[0].name,
                        this.store.dataset.tables[0].name
                      );
                      if (data.tables[1] && this.store.dataset.tables[1]) {
                        tableMapping.set(
                          data.tables[1].name,
                          this.store.dataset.tables[1].name
                        );
                      }

                      const loadTemplateIntoState = (
                        tableMapping: Map<string, string>,
                        columnMapping: Map<string, string>
                      ) => {
                        const template = new ChartTemplate(data);

                        for (const table of template.getDatasetSchema()) {
                          template.assignTable(
                            table.name,
                            tableMapping.get(table.name) || table.name
                          );
                          for (const column of table.columns) {
                            template.assignColumn(
                              table.name,
                              column.name,
                              columnMapping.get(column.name) || column.name
                            );
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
                        this.store.dispatcher.dispatch(
                          new Actions.ReplaceDataset(this.store.dataset)
                        );
                      };

                      if (unmappedColumns.length > 0) {
                        // mapping show dialog then call loadTemplateIntoState
                        this.popupController.showModal(
                          (context) => {
                            return (
                              <ModalView context={context}>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <FileViewImport
                                    mode={MappingMode.ImportTemplate}
                                    tables={data.tables}
                                    datasetTables={this.store.dataset.tables}
                                    tableMapping={tableMapping}
                                    unmappedColumns={unmappedColumns}
                                    onSave={(mapping) => {
                                      loadTemplateIntoState(
                                        tableMapping,
                                        mapping
                                      );
                                      context.close();
                                    }}
                                    onClose={() => {
                                      context.close();
                                    }}
                                  />
                                </div>
                              </ModalView>
                            );
                          },
                          { anchor: null }
                        );
                      } else {
                        loadTemplateIntoState(tableMapping, new Map());
                      }
                    });
                  }
                }
              };
              inputElement.click();
            })
          }
        />
      </>
    );
  }

  public renderExportButton(props: MenuBarProps) {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/export-template")}
          text=""
          title={strings.menuBar.exportTemplate}
          onClick={
            props.handlers?.onExportTemplateClick ||
            (() => {
              const template = deepClone(this.store.buildChartTemplate());
              const target = this.store.createExportTemplateTarget(
                strings.menuBar.defaultTemplateName,
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
            })
          }
        />
      </>
    );
  }

  public renderSaveEmbedded() {
    const hasUnsavedChanges = this.store.chartManager.hasUnsavedChanges();

    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/save")}
        text={strings.menuBar.saveButton}
        disabled={!hasUnsavedChanges}
        title={strings.menuBar.save}
        onClick={() => {
          this.context.store.dispatcher.dispatch(
            new Actions.UpdatePlotSegments()
          );
          this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
        }}
      />
    );
  }

  public renderDelete() {
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/trash")}
        title={strings.menuBar.reset}
        text={strings.menuBar.reset}
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
                    <div className={"charticulator__reset_chart_dialog-inner"}>
                      <>
                        <p>{strings.dialog.resetConfirm}</p>
                        <div
                          className={
                            "charticulator__reset_chart_dialog-buttons"
                          }
                        >
                          <Button
                            text={strings.button.yes}
                            onClick={() => {
                              this.context.store.dispatcher.dispatch(
                                new Actions.Reset()
                              );
                              context.close();
                            }}
                          />
                          <Button
                            text={strings.button.no}
                            onClick={() => {
                              context.close();
                            }}
                          />
                        </div>
                      </>
                    </div>
                  </div>
                );
              },
              { anchor: null }
            );
          } else {
            if (confirm(strings.dialog.resetConfirm)) {
              new Actions.Reset().dispatch(this.context.store.dispatcher);
            }
          }
        }}
      />
    );
  }

  public renderNewOpenSave() {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/new")}
          title={strings.menuBar.new}
          onClick={() => {
            this.showFileModalWindow(MainTabs.new);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/open")}
          title={strings.menuBar.open}
          onClick={() => {
            this.showFileModalWindow(MainTabs.open);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/save")}
          title={strings.menuBar.save}
          text={strings.menuBar.saveButton}
          onClick={() => {
            if (this.context.store.currentChartID) {
              this.dispatch(new Actions.Save());
            } else {
              this.showFileModalWindow(MainTabs.save);
            }
          }}
        />
        {this.renderImportButton(this.props)}
        <MenuButton
          url={R.getSVGIcon("toolbar/export")}
          title={strings.menuBar.export}
          onClick={() => {
            this.showFileModalWindow(MainTabs.export);
          }}
        />
      </>
    );
  }

  public toolbarButtons(props: MenuBarProps) {
    return (
      <>
        {this.context.store.editorType === "nested"
          ? this.renderSaveNested()
          : null}
        {this.context.store.editorType === "chart"
          ? this.renderNewOpenSave()
          : null}
        {this.context.store.editorType === "embedded" &&
        props.alignSaveButton === props.alignButtons
          ? this.renderSaveEmbedded()
          : null}
        {this.context.store.editorType === "embedded" ? (
          <>
            <span className="charticulator__menu-bar-separator" />
            {this.renderImportButton(props)}
            {this.renderExportButton(props)}
          </>
        ) : null}
        <span className="charticulator__menu-bar-separator" />
        {this.props.undoRedoLocation === "menubar" ? (
          <>
            <MenuButton
              url={R.getSVGIcon("Undo")}
              title={strings.menuBar.undo}
              disabled={
                this.context.store.historyManager.statesBefore.length === 0
              }
              onClick={() =>
                new Actions.Undo().dispatch(this.context.store.dispatcher)
              }
            />
            <MenuButton
              url={R.getSVGIcon("Redo")}
              title={strings.menuBar.redo}
              disabled={
                this.context.store.historyManager.statesAfter.length === 0
              }
              onClick={() =>
                new Actions.Redo().dispatch(this.context.store.dispatcher)
              }
            />
          </>
        ) : null}
        <span className="charticulator__menu-bar-separator" />
        {this.renderDelete()}
      </>
    );
  }

  public render() {
    return (
      <>
        <PopupContainer controller={this.popupController} />
        <section className="charticulator__menu-bar">
          <div className="charticulator__menu-bar-left">
            {this.context.store.editorType === "embedded" ? null : (
              <AppButton
                name={this.props.name}
                title={strings.menuBar.home}
                onClick={() => this.showFileModalWindow(MainTabs.open)}
              />
            )}
            {this.props.alignButtons === PositionsLeftRight.Left ? (
              <>
                <span className="charticulator__menu-bar-separator" />
                {this.toolbarButtons(this.props)}
              </>
            ) : null}
            {this.context.store.editorType === "embedded" &&
            this.props.alignSaveButton == PositionsLeftRight.Left &&
            this.props.alignSaveButton !== this.props.alignButtons
              ? this.renderSaveEmbedded()
              : null}
          </div>
          <div className="charticulator__menu-bar-center el-text">
            <p>
              {`${this.context.store.chart?.properties.name}${
                this.context.store.editorType === "embedded"
                  ? " - " + this.props.name || strings.app.name
                  : ""
              }`}
            </p>
          </div>
          <div className="charticulator__menu-bar-right">
            {this.props.alignButtons === PositionsLeftRight.Right ? (
              <>
                {this.toolbarButtons(this.props)}
                <span className="charticulator__menu-bar-separator" />
              </>
            ) : null}
            {this.context.store.editorType === "embedded" &&
            this.props.alignSaveButton == PositionsLeftRight.Right &&
            this.props.alignSaveButton !== this.props.alignButtons
              ? this.renderSaveEmbedded()
              : null}
            <HelpButton
              handlers={this.props.handlers}
              hideReportIssues={false}
            />
          </div>
        </section>
      </>
    );
  }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../globals";
import * as R from "../resources";

import { EventSubscription } from "../../core";
import { Actions } from "../actions";
import { AppButton, MenuButton } from "../components";
import { ContextedComponent } from "../context_component";
import { ModalView, PopupView } from "../controllers";

import { FileView } from "./file_view";
import { AppStore } from "../stores";

export class HelpButton extends React.Component<{}, {}> {
  public render() {
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/help")}
        title="Help"
        ref="helpButton"
        onClick={() => {
          globals.popupController.popupAt(
            context => {
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
              alignX: "end-inner"
            }
          );
        }}
      />
    );
  }
}

export class MenuBar extends ContextedComponent<{}, {}> {
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
    escape: "escape"
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
              if (this.context.store.isNestedEditor) {
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
      context => {
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
          <AppButton onClick={() => this.showFileModalWindow("open")} />
          <span className="charticulator__menu-bar-separator" />
          {this.context.store.isNestedEditor
            ? this.renderSaveNested()
            : this.renderNewOpenSave()}
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
              if (confirm("Are you really willing to reset the chart?")) {
                new Actions.Reset().dispatch(this.context.store.dispatcher);
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

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { EventEmitter, EventSubscription } from "../../core";
import { classNames } from "../utils";
import { ErrorBoundary, TelemetryContext } from "../components";

export enum PopupAlignment {
  Inner = "inner",
  Outer = "outer",
  StartInner = "start-inner",
  StartOuter = "start-outer",
  EndInner = "end-inner",
  EndOuter = "end-outer",
}

export interface PopupOptions {
  parent?: PopupContext;
  anchor: Element;
  alignX?: PopupAlignment;
  alignY?: PopupAlignment;
}

export function getAlignment(anchor: Element) {
  let alignX: PopupAlignment;
  const avgPopupWindowWidth = 500;
  const anchorCloseToWindowBorder =
    window.innerWidth - anchor.getBoundingClientRect().right <
    avgPopupWindowWidth;
  let alignLeft: boolean = false;
  if (anchorCloseToWindowBorder) {
    alignX = PopupAlignment.StartOuter;
    alignLeft = true;
  }
  return { alignLeft, alignX };
}

const popupViewMapping = new WeakMap<HTMLDivElement, PopupContext>();
let newlyCreatedContexts = new WeakSet<PopupContext>();

function findParentPopup(anchor: Element) {
  while (anchor) {
    if (anchor instanceof HTMLDivElement && popupViewMapping.has(anchor)) {
      return popupViewMapping.get(anchor);
    }
    anchor = anchor.parentElement;
  }
}

export class PopupContext extends EventEmitter {
  public readonly id: string;
  public element: JSX.Element;
  public readonly options: PopupOptions;

  public isClosed: boolean = false;
  public parent: PopupContext;
  public children: PopupContext[] = [];

  constructor(
    id: string,
    renderElement: (context: PopupContext) => JSX.Element,
    options: PopupOptions
  ) {
    super();
    this.id = id;
    this.options = options;
    if (options.parent) {
      this.parent = options.parent;
      options.parent.children.push(this);
    } else {
      this.parent = null;
    }
    this.element = renderElement(this);
    newlyCreatedContexts.add(this);
  }

  public close() {
    for (const child of this.children) {
      child.close();
    }
    this.isClosed = true;
    if (this.parent) {
      const idx = this.parent.children.indexOf(this);
      if (idx >= 0) {
        this.parent.children.splice(idx, 1);
      }
    }
    this.emit("close");
  }

  public traverse(visitor: (p: PopupContext) => void) {
    visitor(this);
    for (const child of this.children) {
      child.traverse(visitor);
    }
  }
}

export class PopupController extends EventEmitter {
  private currentID: number = 0;

  public rootPopup: PopupContext = null;
  public currentModal: PopupContext = null;

  public traverse(visitor: (p: PopupContext) => void) {
    if (this.rootPopup) {
      this.rootPopup.traverse(visitor);
    }
  }

  public popupAt(
    renderElement: (context: PopupContext) => JSX.Element,
    options: PopupOptions
  ) {
    if (options.alignX == undefined) {
      options.alignX = PopupAlignment.StartInner;
    }
    if (options.alignY == undefined) {
      options.alignY = PopupAlignment.Outer;
    }
    if (!options.parent && options.anchor) {
      options.parent = findParentPopup(options.anchor);
    }
    const context = new PopupContext(
      "#" + (this.currentID++).toString(),
      renderElement,
      options
    );
    if (!options.parent) {
      this.rootPopup = context;
    }
    context.addListener("close", () => {
      if (this.rootPopup == context) {
        this.rootPopup = null;
      }
      this.emit("changed");
    });
    this.emit("changed");
  }

  public showModal(
    renderElement: (context: PopupContext) => JSX.Element,
    options: PopupOptions
  ) {
    const context = new PopupContext(
      "#" + (this.currentID++).toString(),
      renderElement,
      options
    );
    this.reset();
    this.currentModal = context;
    context.addListener("close", () => {
      this.currentModal = null;
      this.emit("changed");
    });
    this.emit("changed");
  }

  public reset() {
    if (this.rootPopup) {
      this.rootPopup.close();
      this.rootPopup = null;
    }
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
    }
  }
  public resetPopups() {
    if (this.rootPopup) {
      this.rootPopup.close();
      this.rootPopup = null;
    }
  }
}

export interface PopupViewProps {
  controller: PopupController;
}

export class PopupContainer extends React.Component<
  PopupViewProps,
  Record<string, unknown>
> {
  public token: EventSubscription;
  private popupContainer: HTMLDivElement;
  constructor(props: PopupViewProps) {
    super(props);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  public onKeyDown(e: KeyboardEvent) {
    if (e.target == document.body) {
      let prefix = "";
      if (e.shiftKey) {
        prefix = "shift-" + prefix;
      }
      if (e.ctrlKey) {
        prefix = "ctrl-" + prefix;
      }
      const name = `${prefix}${e.key}`.toLowerCase();
      if (name == "escape") {
        if (this.props.controller.rootPopup) {
          this.props.controller.resetPopups();
        } else {
          this.props.controller.reset();
        }
      }
    }
  }
  public componentDidMount() {
    this.token = this.props.controller.addListener("changed", () => {
      this.forceUpdate();
    });
    window.addEventListener("keydown", this.onKeyDown);
    setTimeout(() => {
      if (this.popupContainer) {
        this.popupContainer.focus();
      }
    }, 100);
  }
  public componentWillUnmount() {
    this.token.remove();
    window.removeEventListener("keydown", this.onKeyDown);
  }
  public render() {
    if (this.props.controller.currentModal) {
      const modal = this.props.controller.currentModal;
      return (
        <div
          tabIndex={0}
          className="popup-container popup-container-modal"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: "all",
          }}
          onMouseDown={() => {
            this.props.controller.reset();
          }}
          ref={(r) => (this.popupContainer = r)}
        >
          {modal.element}
          {this.renderPopups()}
        </div>
      );
    } else {
      return this.renderPopups();
    }
  }

  public renderPopups() {
    const popups: PopupContext[] = [];
    this.props.controller.traverse((p) => {
      if (!p.isClosed) {
        popups.push(p);
      }
    });
    if (popups.length == 0) {
      return <div />;
    } else {
      return (
        <div
          tabIndex={0}
          className="popup-container"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: "all",
          }}
          ref={(r) => (this.popupContainer = r)}
          onMouseDown={() => {
            this.props.controller.resetPopups();
          }}
        >
          {popups.map((popup) => {
            return (
              <div
                key={popup.id}
                ref={(ref) => {
                  if (ref) {
                    popupViewMapping.set(ref, popup);
                  }
                }}
              >
                {popup.element}
              </div>
            );
          })}
        </div>
      );
    }
  }
}

interface PopupViewComponentProps {
  context: PopupContext;
  className?: string;
  width?: number;
}

export class PopupView extends React.Component<
  PopupViewComponentProps,
  Record<string, unknown>
> {
  private popupContainer: HTMLDivElement;

  public componentDidMount() {
    setTimeout(() => {
      if (this.popupContainer) {
        this.popupContainer.focus();
      }
    }, 100);
  }

  // eslint-disable-next-line
  public render() {
    const popup = this.props.context;
    const position = popup.options.anchor.getBoundingClientRect();
    const style: React.CSSProperties = { position: "absolute" };
    const marginX = 0;
    const marginY = 0;
    let alignX = popup.options.alignX;
    let alignY = popup.options.alignY;
    switch (popup.options.alignX) {
      case "inner":
        {
          if ((position.left + position.right) / 2 < window.innerWidth / 2) {
            style.left = position.left + "px";
            alignX = PopupAlignment.StartInner;
          } else {
            style.right =
              window.innerWidth - (position.left + position.width) + "px";
            alignX = PopupAlignment.EndInner;
          }
        }
        break;
      case "outer":
        {
          if ((position.left + position.right) / 2 > window.innerWidth / 2) {
            style.right = window.innerWidth - position.left + marginX + "px";
            alignX = PopupAlignment.StartOuter;
          } else {
            style.left = position.left + position.width + marginX + "px";
            alignX = PopupAlignment.EndOuter;
          }
        }
        break;
      case "start-inner":
        {
          style.left = position.left + "px";
        }
        break;
      case "end-inner":
        {
          style.right =
            window.innerWidth - (position.left + position.width) + "px";
        }
        break;
      case "start-outer":
        {
          style.right = window.innerWidth - position.left + marginX + "px";
        }
        break;
      case "end-outer":
        {
          style.left = position.left + position.width + marginX + "px";
        }
        break;
    }
    switch (popup.options.alignY) {
      case "inner":
        {
          if ((position.top + position.bottom) / 2 < window.innerHeight / 2) {
            style.top = position.top + "px";
            alignY = PopupAlignment.StartInner;
          } else {
            style.bottom =
              window.innerHeight - (position.top + position.height) + "px";
            alignY = PopupAlignment.EndInner;
          }
        }
        break;
      case "outer":
        {
          if ((position.top + position.bottom) / 2 > window.innerHeight / 2) {
            style.bottom = window.innerHeight - position.top + marginY + "px";
            alignY = PopupAlignment.StartOuter;
          } else {
            style.top = position.top + position.height + marginY + "px";
            alignY = PopupAlignment.EndOuter;
          }
        }
        break;
      case "start-inner":
        {
          style.top = position.top + "px";
        }
        break;
      case "end-inner":
        {
          style.bottom =
            window.innerHeight - (position.top + position.height) + "px";
        }
        break;
      case "start-outer":
        {
          style.bottom = window.innerHeight - position.top + marginY + "px";
        }
        break;
      case "end-outer":
        {
          style.top = position.top + position.height + marginY + "px";
        }
        break;
    }
    if (this.props.width != null) {
      style.width = this.props.width + "px";
    }
    return (
      <div
        tabIndex={0}
        ref={(r) => (this.popupContainer = r)}
        className={
          this.props.className
            ? this.props.className + " popup-view-container"
            : "popup-view-container"
        }
        style={style}
        onMouseDownCapture={() => {
          newlyCreatedContexts = new WeakSet<PopupContext>();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          for (const child of this.props.context.children) {
            if (!newlyCreatedContexts.has(child)) {
              child.close();
            }
          }
        }}
      >
        <div
          className={classNames(
            "popup-view",
            [
              "popup-x-top-left",
              alignX == "start-inner" && alignY == "end-outer",
            ],
            [
              "popup-x-bottom-left",
              alignX == "start-inner" && alignY == "start-outer",
            ],
            [
              "popup-x-top-right",
              alignX == "end-inner" && alignY == "end-outer",
            ],
            [
              "popup-x-bottom-right",
              alignX == "end-inner" && alignY == "start-outer",
            ],
            [
              "popup-y-top-left",
              alignX == "start-outer" && alignY == "start-inner",
            ],
            [
              "popup-y-top-right",
              alignX == "end-outer" && alignY == "start-inner",
            ],
            [
              "popup-y-bottom-left",
              alignX == "start-outer" && alignY == "end-inner",
            ],
            [
              "popup-y-bottom-right",
              alignX == "end-outer" && alignY == "end-inner",
            ]
          )}
        >
          <TelemetryContext.Consumer>
            {(telemetryRecorder) => {
              return (
                <ErrorBoundary telemetryRecorder={telemetryRecorder}>
                  {this.props.children}
                </ErrorBoundary>
              );
            }}
          </TelemetryContext.Consumer>
        </div>
      </div>
    );
  }
}

export class ModalView extends React.Component<
  {
    context: PopupContext;
    type?: string;
  },
  Record<string, unknown>
> {
  public render() {
    const type = this.props.type || "default";
    return (
      <div
        className={`charticulator__modal-${type}`}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className={`charticulator__modal-${type}-container`}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

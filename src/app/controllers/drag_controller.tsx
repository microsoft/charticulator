import * as React from "react";
import * as Hammer from "hammerjs";

import { EventEmitter, EventSubscription } from "../../core";

export interface Point {
  x: number;
  y: number;
}

export interface DragModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface Draggable {
  onDragStart(): any;
  onDragEnd?(): void;
  renderDragElement(): [JSX.Element, Point];
}

export interface Droppable {
  onDragEnter?(context: DragContext): boolean;
  onDragStart?(context: DragContext): boolean;
}

export class DragContext {
  public draggable: Draggable;
  public data: any;

  // Set drag event handlers
  public onLeave(f: () => void) {
    this._onleave = f;
  }
  public onOver(f: (point: Point, modifiers: DragModifiers) => void) {
    this._onover = f;
  }
  public onDrop(f: (point: Point, modifiers: DragModifiers) => void) {
    this._ondrop = f;
  }

  public _onleave: () => void = null;
  public _onover: (point: Point, modifiers: DragModifiers) => void = null;
  public _ondrop: (point: Point, modifiers: DragModifiers) => void = null;
  public _state: number;
}

export class DragSession {
  public parent: DragController;
  public obj: Draggable;
  public startPoint: Point;
  public point: Point;
  public data: any;
  public candidates: Array<[Droppable, () => void]> = [];

  public states = new Map<Droppable, DragContext>();

  constructor(parent: DragController, draggable: Draggable, startPoint: Point) {
    this.parent = parent;
    this.obj = draggable;
    this.startPoint = startPoint;
    this.point = startPoint;
    this.data = draggable.onDragStart();
  }

  public handlePan(point: Point, modifiers: DragModifiers) {
    this.point = point;

    let element = document.elementFromPoint(point.x, point.y);

    const withins = new Set<Droppable>();

    while (element != null) {
      const droppable = this.parent.getDroppableFromElement(element);
      if (droppable) {
        withins.add(droppable);
      }
      element = element.parentElement;
    }

    // states:
    // 0: undefined
    // -1: ignored (onDragEnter returned false)
    // 1: drag entered
    withins.forEach(droppable => {
      let ctx = this.states.get(droppable);
      if (!ctx) {
        ctx = new DragContext();
        ctx.draggable = this.obj;
        ctx.data = this.data;
        ctx._state = 0;
        this.states.set(droppable, ctx);
      }
      if (ctx._state == 0) {
        let r = false;
        try {
          r = droppable.onDragEnter ? droppable.onDragEnter(ctx) : false;
        } catch (e) {
          console.trace(e);
        }
        if (r) {
          ctx._state = 1;
        } else {
          ctx._state = -1;
        }
      } else if (ctx._state == 1) {
        if (ctx._onover) {
          ctx._onover(point, modifiers);
        }
      }
    });

    this.states.forEach((context, droppable) => {
      if (!withins.has(droppable)) {
        if (context._state == 1) {
          if (context._onleave) {
            context._onleave();
          }
          context._state = 0;
          context._onover = null;
          context._onleave = null;
          context._ondrop = null;
        }
      }
    });

    this.parent.emit("session");
  }

  public handleEnd(point: Point, modifiers: DragModifiers) {
    this.states.forEach((context, droppable) => {
      if (context._state == 1) {
        if (context._ondrop) {
          try {
            context._ondrop(point, modifiers);
          } catch (e) {
            console.trace(e);
          }
        }
      }
    });
    this.states.forEach((context, droppable) => {
      if (context._state == 1) {
        if (context._onleave) {
          try {
            context._onleave();
          } catch (e) {
            console.trace(e);
          }
        }
      }
    });
    this.states.clear();
    if (this.obj.onDragEnd) {
      try {
        this.obj.onDragEnd();
      } catch (e) {
        console.trace(e);
      }
    }
  }

  public pushCandidate(droppable: Droppable, remove: () => void) {
    this.candidates.push([droppable, remove]);
  }

  public popCandidate(droppable: Droppable) {
    this.candidates = this.candidates.filter(([obj, remove]) => {
      if (obj === droppable) {
        remove();
        return false;
      } else {
        return true;
      }
    });
  }

  public removeCandidate(droppable: Droppable) {
    this.states.delete(droppable);
  }
}

export interface DraggableInfo {
  hammer: HammerManager;
}

export interface DroppableInfo {
  remove: () => void;
}

export class DragController extends EventEmitter {
  private _draggables = new WeakMap<Draggable, DraggableInfo>();
  private _droppables = new WeakMap<Droppable, DroppableInfo>();

  private _element2Droppable = new WeakMap<Element, Droppable>();

  private _dragSession: DragSession = null;

  public getDroppableFromElement(element: Element) {
    return this._element2Droppable.get(element);
  }

  public registerDroppable(obj: Droppable, rootElement: Element) {
    // Remove any existing stuff
    this.unregisterDroppable(obj);

    this._element2Droppable.set(rootElement, obj);

    this._droppables.set(obj, {
      remove: () => {
        this._element2Droppable.delete(rootElement);
      }
    });
  }

  public unregisterDroppable(obj: Droppable) {
    if (this._droppables.has(obj)) {
      this._droppables.get(obj).remove();
      this._droppables.delete(obj);
    }
    if (this._dragSession) {
      this._dragSession.removeCandidate(obj);
    }
  }

  public registerDraggable(
    obj: Draggable,
    rootElement: Element,
    onTap?: () => void
  ) {
    // Remove any existing stuff
    this.unregisterDraggable(obj);

    // Create hammer object and setup handlers
    const hammer = new Hammer.Manager(rootElement);
    hammer.add(new Hammer.Pan());

    hammer.on("panstart", e => {
      try {
        this._dragSession = new DragSession(this, obj, {
          x: e.center.x,
          y: e.center.y
        });
      } catch (e) {
        console.trace(e);
        return;
      }
      this.emit("sessionstart");
      this.emit("session");
    });

    hammer.on("pan", e => {
      if (this._dragSession != null) {
        const modifiers: DragModifiers = {
          shiftKey: e.srcEvent.shiftKey,
          ctrlKey: e.srcEvent.ctrlKey
        };
        this._dragSession.handlePan(
          { x: e.center.x, y: e.center.y },
          modifiers
        );
      }
    });

    hammer.on("panend", e => {
      if (this._dragSession != null) {
        const modifiers: DragModifiers = {
          shiftKey: e.srcEvent.shiftKey,
          ctrlKey: e.srcEvent.ctrlKey
        };
        this._dragSession.handleEnd(
          { x: e.center.x, y: e.center.y },
          modifiers
        );
        this._dragSession = null;
        this.emit("session");
        this.emit("sessionend");
      }
    });

    if (onTap) {
      hammer.add(new Hammer.Tap());
      hammer.on("tap", onTap);
    }

    this._draggables.set(obj, {
      hammer
    });
  }

  public unregisterDraggable(obj: Draggable) {
    if (this._draggables.has(obj)) {
      const info = this._draggables.get(obj);
      info.hammer.destroy();
      this._draggables.delete(obj);
    }
  }

  public getSession() {
    return this._dragSession;
  }
}

export class DragStateView extends React.Component<
  { controller: DragController },
  {}
> {
  private token: EventSubscription;

  public onSession() {
    this.forceUpdate();
  }

  public componentDidMount() {
    this.token = this.props.controller.addListener(
      "session",
      this.onSession.bind(this)
    );
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    const session = this.props.controller.getSession();
    if (!session) {
      return <div />;
    }
    const [element, offset] = session.obj.renderDragElement();
    return (
      <div
        className="drag-state-view"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          pointerEvents: "none"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: session.point.x + offset.x + "px",
            top: session.point.y + offset.y + "px"
          }}
        >
          {element}
        </div>
      </div>
    );
  }
}

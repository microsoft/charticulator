// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { default as Hammer } from "hammerjs";
import { Specification, Prototypes, Point, Geometry } from "../../../../core";
import * as globals from "../../../globals";
import { classNames } from "../../../utils";
import { PopupView } from "../../../controllers";
import { EditableTextView } from "../../../components";
import { HandlesDragContext, HandleViewProps } from "./common";
import {
  TextAlignmentHorizontal,
  TextAlignmentVertical,
} from "../../../../core/specification/types";

export interface TextAlignmentHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.TextAlignment;
}

export interface TextAlignmentHandleViewState {
  dragging: boolean;
  newAlignment: Specification.Types.TextAlignment;
  newRotation: number;
}

export class TextAlignmentHandleView extends React.Component<
  TextAlignmentHandleViewProps,
  TextAlignmentHandleViewState
> {
  private container: SVGGElement;
  private anchorCircle: SVGCircleElement;
  private rotationCircle: SVGCircleElement;
  private hammer: HammerManager;

  constructor(props: TextAlignmentHandleViewProps) {
    super(props);
    this.handleClick = this.handleClick.bind(this);

    this.state = {
      dragging: false,
      newAlignment: props.handle.alignment,
      newRotation: props.handle.rotation,
    };
  }

  public getRelativePoint(px: number, py: number) {
    const anchorBounds = this.anchorCircle.getBoundingClientRect();
    const x = px - (anchorBounds.left + anchorBounds.width / 2);
    const y = py - (anchorBounds.top + anchorBounds.height / 2);
    return { x: x / this.props.zoom.scale, y: -y / this.props.zoom.scale };
  }

  // eslint-disable-next-line
  public componentDidMount() {
    this.hammer = new Hammer(this.container);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));
    this.hammer.add(new Hammer.Tap());

    let mode: "rotation" | "alignment" = null;
    let startX: number = 0;
    let startY: number = 0;
    let sumDeltaX: number = 0,
      dXLast = 0;
    let sumDeltaY: number = 0,
      dYLast = 0;
    let p0: Point;
    let previousAlignment: Specification.Types.TextAlignment;
    let previousRotation: number;

    let context: HandlesDragContext = null;

    const newStateFromMoveAndRotate = (
      dx: number,
      dy: number,
      newRotation: number,
      snapping: boolean
    ): [Specification.Types.TextAlignment, number] => {
      const rect = this.getRectFromAlignment(
        previousAlignment,
        previousRotation
      );
      const acx = rect.cx - this.props.handle.anchorX;
      const acy = rect.cy - this.props.handle.anchorY;

      const newAlignment: Specification.Types.TextAlignment = {
        x: previousAlignment.x,
        y: previousAlignment.y,
        xMargin: previousAlignment.xMargin,
        yMargin: previousAlignment.yMargin,
      };

      const cos = Math.cos(Geometry.degreesToRadians(newRotation));
      const sin = Math.sin(Geometry.degreesToRadians(newRotation));

      const pdx = dx * cos + dy * sin;
      const pdy = -dx * sin + dy * cos;
      const pcx = acx * cos + acy * sin;
      const pcy = -acx * sin + acy * cos;

      const npcx = pcx + pdx;
      const npcy = pcy + pdy;
      if (snapping && Math.abs(npcy) < 5 / this.props.zoom.scale) {
        newAlignment.y = TextAlignmentVertical.Middle;
      } else if (npcy < 0) {
        newAlignment.y = TextAlignmentVertical.Top;
        newAlignment.yMargin = -npcy - this.props.handle.textHeight / 2;
        if (Math.abs(newAlignment.yMargin) < 5 / this.props.zoom.scale) {
          newAlignment.yMargin = 0;
        }
      } else {
        newAlignment.y = TextAlignmentVertical.Bottom;
        newAlignment.yMargin = npcy - this.props.handle.textHeight / 2;
        if (Math.abs(newAlignment.yMargin) < 5 / this.props.zoom.scale) {
          newAlignment.yMargin = 0;
        }
      }
      if (snapping && Math.abs(npcx) < 5 / this.props.zoom.scale) {
        newAlignment.x = TextAlignmentHorizontal.Middle;
      } else if (npcx < 0) {
        newAlignment.x = TextAlignmentHorizontal.Right;
        newAlignment.xMargin = -npcx - this.props.handle.textWidth / 2;
        if (Math.abs(newAlignment.xMargin) < 5 / this.props.zoom.scale) {
          newAlignment.xMargin = 0;
        }
      } else {
        newAlignment.x = TextAlignmentHorizontal.Left;
        newAlignment.xMargin = npcx - this.props.handle.textWidth / 2;
        if (Math.abs(newAlignment.xMargin) < 5 / this.props.zoom.scale) {
          newAlignment.xMargin = 0;
        }
      }
      return [newAlignment, newRotation];
    };

    const handleRotation = (p1: Point, commit: boolean = false) => {
      const rect = this.getRectFromAlignment(
        previousAlignment,
        previousRotation
      );
      const ox = rect.cx - this.props.handle.anchorX;
      const oy = rect.cy - this.props.handle.anchorY;
      let newRotation =
        (Math.atan2(p1.y - oy, p1.x - ox) / Math.PI) * 180 + 180;
      newRotation = Math.round(newRotation / 15) * 15;

      const newAlignment = newStateFromMoveAndRotate(
        0,
        0,
        newRotation,
        false
      )[0];

      if (commit) {
        this.setState({
          dragging: false,
        });
        context.emit("end", { alignment: newAlignment, rotation: newRotation });
      } else {
        this.setState({
          newAlignment,
          newRotation,
        });
        context.emit("drag", {
          alignment: newAlignment,
          rotation: newRotation,
        });
      }
    };

    const handleAlignment = (p1: Point, commit: boolean = false) => {
      const [newAlignment] = newStateFromMoveAndRotate(
        p1.x - p0.x,
        p1.y - p0.y,
        previousRotation,
        true
      );
      if (commit) {
        this.setState({
          dragging: false,
        });
        context.emit("end", {
          alignment: newAlignment,
          rotation: previousRotation,
        });
      } else {
        this.setState({
          newAlignment,
        });
        context.emit("drag", {
          alignment: newAlignment,
          rotation: previousRotation,
        });
      }
    };

    this.hammer.on("panstart", (e) => {
      const cx = e.center.x - e.deltaX;
      const cy = e.center.y - e.deltaY;
      startX = cx;
      startY = cy;
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      sumDeltaX = e.deltaX;
      sumDeltaY = e.deltaY;
      const el = document.elementFromPoint(cx, cy);
      context = new HandlesDragContext();
      this.props.onDragStart(this.props.handle, context);
      p0 = this.getRelativePoint(cx, cy);
      const p1 = this.getRelativePoint(cx + e.deltaX, cy + e.deltaY);
      previousAlignment = this.props.handle.alignment;
      previousRotation = this.props.handle.rotation;
      if (el == this.rotationCircle) {
        mode = "rotation";
        handleRotation(p1);
      } else {
        mode = "alignment";
        handleAlignment(p1);
      }
      this.setState({
        dragging: true,
        newAlignment: previousAlignment,
        newRotation: previousRotation,
      });
    });
    this.hammer.on("pan", (e) => {
      sumDeltaX += e.deltaX - dXLast;
      sumDeltaY += e.deltaY - dYLast;
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      const cx = startX + sumDeltaX;
      const cy = startY + sumDeltaY;
      // cx = e.center.x;
      // cy = e.center.y;
      const p1 = this.getRelativePoint(cx, cy);
      if (mode == "rotation") {
        handleRotation(p1);
      } else {
        handleAlignment(p1);
      }
    });
    this.hammer.on("panend", (e) => {
      sumDeltaX += e.deltaX - dXLast;
      sumDeltaY += e.deltaY - dYLast;
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      const cx = startX + sumDeltaX;
      const cy = startY + sumDeltaY;
      // cx = e.center.x;
      // cy = e.center.y;
      const p1 = this.getRelativePoint(cx, cy);
      if (mode == "rotation") {
        handleRotation(p1, true);
      } else {
        handleAlignment(p1, true);
      }
      context = null;
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public handleClick() {
    if (this.props.handle.text == null) {
      return;
    }
    globals.popupController.popupAt(
      (context) => {
        return (
          <PopupView context={context}>
            <div className="handle-text-view-popup">
              <EditableTextView
                text={this.props.handle.text}
                autofocus={true}
                onEdit={(newText) => {
                  const dragContext = new HandlesDragContext();
                  this.props.onDragStart(this.props.handle, dragContext);
                  dragContext.emit("end", { text: newText });
                  context.close();
                }}
              />
            </div>
          </PopupView>
        );
      },
      {
        anchor: this.container,
      }
    );
  }

  public getRectFromAlignment(
    alignment: Specification.Types.TextAlignment,
    rotation: number
  ) {
    const cos = Math.cos(Geometry.degreesToRadians(rotation));
    const sin = Math.sin(Geometry.degreesToRadians(rotation));
    let dx = 0,
      dy = 0;
    if (alignment.x == "left") {
      dx = this.props.handle.textWidth / 2 + alignment.xMargin;
    }
    if (alignment.x == "right") {
      dx = -this.props.handle.textWidth / 2 - alignment.xMargin;
    }
    const fx =
      dx - this.props.handle.textWidth / 2 - 10 / this.props.zoom.scale;
    if (alignment.y == "top") {
      dy = -this.props.handle.textHeight / 2 - alignment.yMargin;
    }
    if (alignment.y == "bottom") {
      dy = +this.props.handle.textHeight / 2 + alignment.yMargin;
    }
    return {
      cx: this.props.handle.anchorX + dx * cos - dy * sin,
      cy: this.props.handle.anchorY + dx * sin + dy * cos,
      fx: this.props.handle.anchorX + fx * cos - dy * sin,
      fy: this.props.handle.anchorY + fx * sin + dy * cos,
      width: this.props.handle.textWidth,
      height: this.props.handle.textHeight,
      rotation,
    };
  }

  public renderDragging() {
    if (this.state.dragging) {
      const zoom = this.props.zoom;
      const rect = this.getRectFromAlignment(
        this.state.newAlignment,
        this.state.newRotation
      );
      const p = Geometry.applyZoom(zoom, { x: rect.cx, y: -rect.cy });
      const margin = 0;
      return (
        <g>
          <rect
            className="element-shape handle-hint"
            transform={`translate(${p.x.toFixed(6)},${p.y.toFixed(
              6
            )})rotate(${-rect.rotation})`}
            x={(-rect.width / 2) * zoom.scale - margin}
            y={(-rect.height / 2) * zoom.scale - margin}
            width={rect.width * zoom.scale + margin * 2}
            height={rect.height * zoom.scale + margin * 2}
          />
        </g>
      );
    } else {
      return null;
    }
  }

  public render() {
    const handle = this.props.handle;
    const zoom = this.props.zoom;
    const margin = 0;
    const rect = this.getRectFromAlignment(handle.alignment, handle.rotation);
    const p = Geometry.applyZoom(zoom, { x: rect.cx, y: -rect.cy });
    const anchor = Geometry.applyZoom(zoom, {
      x: handle.anchorX,
      y: -handle.anchorY,
    });
    const fp = Geometry.applyZoom(zoom, { x: rect.fx, y: -rect.fy });
    return (
      <g
        className={classNames(
          "handle",
          "handle-text-input",
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
        onClick={this.handleClick}
        ref={(e) => (this.container = e)}
      >
        <circle
          className="element-shape handle-ghost"
          cx={anchor.x}
          cy={anchor.y}
          r={0}
          ref={(e) => (this.anchorCircle = e)}
        />
        <g transform={`translate(${fp.x - 16},${fp.y - 16})`}>
          <path
            className="element-solid handle-highlight"
            d="M22.05664,15a.99974.99974,0,0,0-1,1,5.05689,5.05689,0,1,1-6.07794-4.95319v2.38654l6.04468-3.49042L14.9787,6.45245V9.02539A7.05306,7.05306,0,1,0,23.05664,16,.99973.99973,0,0,0,22.05664,15Z"
          />
        </g>
        <line
          className="element-line handle-dashed-highlight"
          x1={anchor.x}
          y1={anchor.y}
          x2={p.x}
          y2={p.y}
        />
        <rect
          className="element-shape handle-ghost element-text-rect"
          transform={`translate(${p.x.toFixed(6)},${p.y.toFixed(
            6
          )})rotate(${-rect.rotation})`}
          x={(-rect.width / 2) * zoom.scale - margin}
          y={(-rect.height / 2) * zoom.scale - margin}
          width={rect.width * zoom.scale + margin * 2}
          height={rect.height * zoom.scale + margin * 2}
        />
        <circle
          className="element-shape handle-ghost element-rotation"
          ref={(e) => (this.rotationCircle = e)}
          cx={fp.x}
          cy={fp.y}
          r={8}
        />
        {this.renderDragging()}
      </g>
    );
  }
}

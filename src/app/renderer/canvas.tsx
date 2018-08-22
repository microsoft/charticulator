import { Graphics, Rect, Color, Point, prettyNumber } from "../../core";
import { MarkElement } from "../../core/graphics";

// adapted from https://stackoverflow.com/a/20820649
function desaturate(color: Color, amount: number) {
  const { r, g, b } = color;
  const l = 0.3 * r + 0.6 * g + 0.1 * b;
  return {
    r: Math.min(r + amount * (l - r), 255),
    g: Math.min(g + amount * (l - g), 255),
    b: Math.min(b + amount * (l - b), 255)
  };
}

function renderColor(
  color: Color,
  opacity?: number,
  applyDesaturation = false
): string {
  if (applyDesaturation) {
    color = desaturate(color, 0.7);
  }
  return `rgba(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(
    0
  )},${opacity != undefined ? prettyNumber(opacity) : 1})`;
}

export interface CanvasRenderOptions {
  width: number;
  height: number;
  hitTest: boolean;
  selectedIndexes: number[];
}

interface RenderState {
  options: CanvasRenderOptions;
  hit?: {
    colorToElement: Map<string, Graphics.Element>;
    elementToColor: Map<Graphics.Element, string>;
  };
}

/**
 * Returns a unique color for the given element to be used when rendering the hit target canvas
 * @param renderState The current render state
 * @param element The element to get the hit testing color for
 */
function getHitColor(
  renderState: RenderState,
  element: Graphics.Element
): string {
  const { elementToColor, colorToElement } = renderState.hit;
  let color = elementToColor.get(element);
  if (!color) {
    // Preferring random here, cause it helps a lot with the false positives from anti-aliasing
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    color = `rgb(${r},${g},${b})`;

    // If we already have this color, try again
    if (colorToElement.has(color)) {
      return getHitColor(renderState, element);
    }
    elementToColor.set(element, color);
    colorToElement.set(color, element);
  }
  return color;
}

function renderWithStyle(
  context: CanvasRenderingContext2D,
  element: Graphics.Element,
  renderState: RenderState
) {
  const { style = {} } = element;
  const { options } = renderState;
  let applyDesaturation = true;
  const me = element as MarkElement;

  // We apply desaturation to all elements except for the selected ones
  // or if there are no selected elements, we don't apply desaturation to any elements
  if (
    !options.hitTest &&
    (options.selectedIndexes.length === 0 ||
      options.selectedIndexes.indexOf(me.dataRowIndex) >= 0)
  ) {
    applyDesaturation = false;
  }

  context.globalAlpha = style.opacity != undefined ? style.opacity : 1;
  if (style.fillColor) {
    context.fillStyle = renderState.hit
      ? getHitColor(renderState, element)
      : renderColor(style.fillColor, style.fillOpacity, applyDesaturation);

    context.fill();
  }
  if (style.strokeColor) {
    context.strokeStyle = renderState.hit
      ? getHitColor(renderState, element)
      : renderColor(style.strokeColor, style.strokeOpacity, applyDesaturation);
    context.lineWidth = style.strokeWidth != undefined ? style.strokeWidth : 1;
    context.lineCap =
      style.strokeLinecap != undefined ? style.strokeLinecap : "round";
    context.lineJoin =
      style.strokeLinejoin != undefined ? style.strokeLinejoin : "round";
    context.stroke();
  }
}

// This function is borrowed and modified from the canvg library: https://github.com/canvg/canvg
// See THIRD_PARTY.yml for its license information.
function drawSVGarcOnCanvas(
  ctx: CanvasRenderingContext2D,
  lastX: number,
  lastY: number,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: number,
  sweepFlag: number,
  x: number,
  y: number
) {
  // --------------------
  // rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y
  // are the 6 data items in the SVG path declaration following the A
  //
  // lastX and lastY are the previous point on the path before the arc
  // --------------------
  // useful functions
  const m = (v: number[]) => {
    return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
  };
  const r = (u: number[], v: number[]) => {
    return (u[0] * v[0] + u[1] * v[1]) / (m(u) * m(v));
  };
  const ang = (u: number[], v: number[]) => {
    return (u[0] * v[1] < u[1] * v[0] ? -1 : 1) * Math.acos(r(u, v));
  };
  // --------------------

  const currpX =
    Math.cos(xAxisRotation) * (lastX - x) / 2.0 +
    Math.sin(xAxisRotation) * (lastY - y) / 2.0;
  const currpY =
    -Math.sin(xAxisRotation) * (lastX - x) / 2.0 +
    Math.cos(xAxisRotation) * (lastY - y) / 2.0;

  const l =
    Math.pow(currpX, 2) / Math.pow(rx, 2) +
    Math.pow(currpY, 2) / Math.pow(ry, 2);
  if (l > 1) {
    rx *= Math.sqrt(l);
    ry *= Math.sqrt(l);
  }
  let s =
    (largeArcFlag == sweepFlag ? -1 : 1) *
    Math.sqrt(
      (Math.pow(rx, 2) * Math.pow(ry, 2) -
        Math.pow(rx, 2) * Math.pow(currpY, 2) -
        Math.pow(ry, 2) * Math.pow(currpX, 2)) /
        (Math.pow(rx, 2) * Math.pow(currpY, 2) +
          Math.pow(ry, 2) * Math.pow(currpX, 2))
    );
  if (isNaN(s)) {
    s = 0;
  }

  const cppX = s * rx * currpY / ry;
  const cppY = s * -ry * currpX / rx;
  const centpX =
    (lastX + x) / 2.0 +
    Math.cos(xAxisRotation) * cppX -
    Math.sin(xAxisRotation) * cppY;
  const centpY =
    (lastY + y) / 2.0 +
    Math.sin(xAxisRotation) * cppX +
    Math.cos(xAxisRotation) * cppY;

  const ang1 = ang([1, 0], [(currpX - cppX) / rx, (currpY - cppY) / ry]);
  const a = [(currpX - cppX) / rx, (currpY - cppY) / ry];
  const b = [(-currpX - cppX) / rx, (-currpY - cppY) / ry];
  let angd = ang(a, b);
  if (r(a, b) <= -1) {
    angd = Math.PI;
  }
  if (r(a, b) >= 1) {
    angd = 0;
  }

  const rad = rx > ry ? rx : ry;
  const sx = rx > ry ? 1 : rx / ry;
  const sy = rx > ry ? ry / rx : 1;

  ctx.translate(centpX, centpY);
  ctx.rotate(xAxisRotation);
  ctx.scale(sx, sy);
  ctx.arc(0, 0, rad, ang1, ang1 + angd, !sweepFlag);
  ctx.scale(1 / sx, 1 / sy);
  ctx.rotate(-xAxisRotation);
  ctx.translate(-centpX, -centpY);
}

function renderElement(
  context: CanvasRenderingContext2D,
  element: Graphics.Element,
  renderState: RenderState
) {
  switch (element.type) {
    case "rect":
      {
        const rect = element as Graphics.Rect;
        context.beginPath();
        context.rect(
          Math.min(rect.x1, rect.x2),
          -Math.max(rect.y1, rect.y2),
          Math.abs(rect.x1 - rect.x2),
          Math.abs(rect.y1 - rect.y2)
        );
        renderWithStyle(context, element, renderState);
      }
      break;
    case "circle":
      {
        const circle = element as Graphics.Circle;
        context.beginPath();
        context.arc(circle.cx, -circle.cy, circle.r, 0, Math.PI * 2);
        renderWithStyle(context, element, renderState);
      }
      break;
    case "ellipse":
      {
        const ellipse = element as Graphics.Ellipse;
        context.beginPath();
        context.ellipse(
          (ellipse.x1 + ellipse.x2) / 2,
          -(ellipse.y1 + ellipse.y2) / 2,
          Math.abs(ellipse.x1 - ellipse.x2) / 2,
          Math.abs(ellipse.y1 - ellipse.y2) / 2,
          0,
          0,
          Math.PI * 2
        );
        renderWithStyle(context, element, renderState);
      }
      break;
    case "line":
      {
        const line = element as Graphics.Line;
        context.beginPath();
        context.moveTo(line.x1, -line.y1);
        context.lineTo(line.x2, -line.y2);
        renderWithStyle(context, element, renderState);
      }
      break;
    case "polygon":
      {
        const polygon = element as Graphics.Polygon;
        context.beginPath();
        for (let i = 0; i < polygon.points.length; i++) {
          const p = polygon.points[i];
          if (i == 0) {
            context.moveTo(p.x, -p.y);
          } else {
            context.lineTo(p.x, -p.y);
          }
        }
        context.closePath();
        renderWithStyle(context, element, renderState);
      }
      break;
    case "path":
      {
        const path = element as Graphics.Path;
        context.beginPath();
        let x: number = 0;
        let y: number = 0;
        for (const cmd of path.cmds) {
          const args = cmd.args;
          switch (cmd.cmd) {
            // "M": (args: number[]) => `M ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
            // "L": (args: number[]) => `L ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
            // "C": (args: number[]) => `C ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(args[2])},${toSVGNumber(-args[3])},${toSVGNumber(args[4])},${toSVGNumber(-args[5])}`,
            // "Q": (args: number[]) => `Q ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(args[2])},${toSVGNumber(-args[3])}`,
            // "A": (args: number[]) => `A ${toSVGNumber(args[0])},${toSVGNumber(args[1])},${toSVGNumber(args[2])},${toSVGNumber(args[3])},${toSVGNumber(args[4])},${toSVGNumber(args[5])},${toSVGNumber(-args[6])}`,
            // "Z": () => `Z`
            case "M":
              {
                context.moveTo(args[0], -args[1]);
                x = args[0];
                y = args[1];
              }
              break;
            case "L":
              {
                context.lineTo(args[0], -args[1]);
                x = args[0];
                y = args[1];
              }
              break;
            case "C":
              {
                context.bezierCurveTo(
                  args[0],
                  -args[1],
                  args[2],
                  -args[3],
                  args[4],
                  -args[5]
                );
                x = args[4];
                y = args[5];
              }
              break;
            case "Q":
              {
                context.quadraticCurveTo(args[0], -args[1], args[2], -args[3]);
                x = args[2];
                y = args[3];
              }
              break;
            case "Z":
              {
                context.closePath();
              }
              break;
            case "A":
              {
                drawSVGarcOnCanvas(
                  context,
                  x,
                  -y,
                  args[0],
                  args[1],
                  args[2],
                  args[3],
                  args[4],
                  args[5],
                  -args[6]
                );
                x = args[5];
                y = args[6];
              }
              break;
          }
        }
        renderWithStyle(context, element, renderState);
      }
      break;
    case "text":
      {
        const text = element as Graphics.Text;
        const fontFamily = text.fontFamily || "Arial";
        const fontSize = text.fontSize != undefined ? text.fontSize : 12;
        context.font = `${fontSize}px '${fontFamily}'`;
        // context.textAlign = element.style.textAnchor;
        const style = text.style;
        if (style.strokeColor) {
          context.strokeStyle = renderColor(
            style.strokeColor,
            style.strokeOpacity
          );
          context.lineWidth =
            style.strokeWidth != undefined ? style.strokeWidth : 1;
          context.lineCap =
            style.strokeLinecap != undefined ? style.strokeLinecap : "round";
          context.lineJoin =
            style.strokeLinejoin != undefined ? style.strokeLinejoin : "round";
          context.strokeText(text.text, text.cx, -text.cy);
        }
        context.globalAlpha = style.opacity != undefined ? style.opacity : 1;
        if (style.fillColor) {
          context.fillStyle = renderColor(style.fillColor, style.fillOpacity);
          context.fillText(text.text, text.cx, -text.cy);
        }
      }
      break;
    case "image":
      {
        const image = element as Graphics.Image;
      }
      break;
    case "group": {
      const group = element as Graphics.Group;
      context.save();
      if (group.transform) {
        context.translate(group.transform.x, -group.transform.y);
        context.rotate(-group.transform.angle / 180 * Math.PI);
      }
      for (const e of group.elements) {
        renderElement(context, e, renderState);
      }
      context.restore();
    }
  }
}

const hitCanvases = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>();
export function renderGraphicalElementCanvas(
  context: CanvasRenderingContext2D,
  element: Graphics.Element,
  options = {
    width: 500,
    height: 500,
    hitTest: false,
    selectedIndexes: [] as number[]
  } as CanvasRenderOptions
) {
  // Save the transformation matrix
  context.save();

  // Translate to be center based drawing
  context.translate(
    (options.width as number) / 2,
    (options.height as number) / 2
  );

  // Render the actual canvas
  renderElement(context, element, {
    options: {
      ...options,
      hitTest: false
    }
  });

  // Restore the original matrix
  // TODO: Noticed some oddity, if context.restore was at the bottom of the function
  // it would not restore properly, presumably because of the cloneNode below.
  context.restore();

  // User wants hit testing
  if (options.hitTest) {
    // Attempt to reuse existing hit canvases
    let hitCanvas = hitCanvases.get(context);
    if (!hitCanvas) {
      // Clone the current canvas
      hitCanvas = context.canvas.cloneNode() as HTMLCanvasElement;
      hitCanvases.set(context, hitCanvas);
    }
    const hitContext = hitCanvas.getContext("2d");

    // Adjust the width and translation of the canvas
    hitCanvas.width = context.canvas.width;
    hitCanvas.height = context.canvas.height;
    hitContext.translate(
      (options.width as number) / 2,
      (options.height as number) / 2
    );

    const colorToElement = new Map<string, Graphics.Element>();
    const elementToColor = new Map<Graphics.Element, string>();

    // Render everything to a hit map
    renderElement(hitContext, element, {
      hit: {
        elementToColor,
        colorToElement
      },
      options
    });

    /**
     * Return a hit testing function that will return any graphical elements that exist at the given point
     * @param x The x coordinate
     * @param y The y coordinate
     */
    return (x: number, y: number) => {
      const sampleSize = 4;
      const { data, width, height } = hitContext.getImageData(
        Math.min(Math.max(x - sampleSize / 2, 0), options.width),
        Math.min(Math.max(y - sampleSize / 2, 0), options.height),
        sampleSize,
        sampleSize
      );
      const counts = new Map<Graphics.Element, number>();
      let offset = 0;
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          const color = `rgb(${data[offset]},${data[offset + 1]},${
            data[offset + 2]
          })`;
          const ele = colorToElement.get(color);
          if (ele) {
            counts.set(ele, (counts.get(ele) || 0) + 1);
          }
          // + 4 because r, g, b, a
          offset += 4;
        }
      }

      if (counts.size > 0) {
        const [ele, count] = Array.from(counts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0];
        // if (count > sampleSize / 2) {
        //   return ele;
        // }
        return ele;
      }
    };
  }
}

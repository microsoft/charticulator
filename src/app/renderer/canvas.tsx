import { Graphics, Rect, Color, Point, prettyNumber } from "../../core";

function renderColor(color: Color, opacity?: number): string {
    return `rgba(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(0)},${opacity != undefined ? prettyNumber(opacity) : 1})`;
}

function renderWithStyle(context: CanvasRenderingContext2D, style: Graphics.Style = {}) {
    context.globalAlpha = style.opacity != undefined ? style.opacity : 1;
    if (style.fillColor) {
        context.fillStyle = renderColor(style.fillColor, style.fillOpacity);
        context.fill();
    }
    if (style.strokeColor) {
        context.strokeStyle = renderColor(style.strokeColor, style.strokeOpacity);
        context.lineWidth = style.strokeWidth != undefined ? style.strokeWidth : 1;
        context.lineCap = style.strokeLinecap != undefined ? style.strokeLinecap : "round";
        context.lineJoin = style.strokeLinejoin != undefined ? style.strokeLinejoin : "round";
        context.stroke();
    }
}

// This function is borrowed and modified from the canvg library: https://github.com/canvg/canvg
// See THIRD_PARTY.yml for its license information.
function drawSVGarcOnCanvas(ctx: CanvasRenderingContext2D, lastX: number, lastY: number, rx: number, ry: number, xAxisRotation: number, largeArcFlag: number, sweepFlag: number, x: number, y: number) {
    //--------------------
    // rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y
    // are the 6 data items in the SVG path declaration following the A
    //
    // lastX and lastY are the previous point on the path before the arc
    //--------------------
    // useful functions
    var m = function (v: number[]) { return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2)) };
    var r = function (u: number[], v: number[]) { return (u[0] * v[0] + u[1] * v[1]) / (m(u) * m(v)) };
    var ang = function (u: number[], v: number[]) { return ((u[0] * v[1] < u[1] * v[0]) ? -1 : 1) * Math.acos(r(u, v)) };
    //--------------------

    var currpX = Math.cos(xAxisRotation) * (lastX - x) / 2.0 + Math.sin(xAxisRotation) * (lastY - y) / 2.0;
    var currpY = -Math.sin(xAxisRotation) * (lastX - x) / 2.0 + Math.cos(xAxisRotation) * (lastY - y) / 2.0;

    var l = Math.pow(currpX, 2) / Math.pow(rx, 2) + Math.pow(currpY, 2) / Math.pow(ry, 2);
    if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l) };
    var s = ((largeArcFlag == sweepFlag) ? -1 : 1) * Math.sqrt
        (((Math.pow(rx, 2) * Math.pow(ry, 2)) - (Math.pow(rx, 2) * Math.pow(currpY, 2)) - (Math.pow(ry, 2) * Math.pow(currpX, 2)))
        / (Math.pow(rx, 2) * Math.pow(currpY, 2) + Math.pow(ry, 2) * Math.pow(currpX, 2)));
    if (isNaN(s)) s = 0;

    var cppX = s * rx * currpY / ry;
    var cppY = s * -ry * currpX / rx;
    var centpX = (lastX + x) / 2.0 + Math.cos(xAxisRotation) * cppX - Math.sin(xAxisRotation) * cppY;
    var centpY = (lastY + y) / 2.0 + Math.sin(xAxisRotation) * cppX + Math.cos(xAxisRotation) * cppY;

    var ang1 = ang([1, 0], [(currpX - cppX) / rx, (currpY - cppY) / ry]);
    var a = [(currpX - cppX) / rx, (currpY - cppY) / ry];
    var b = [(-currpX - cppX) / rx, (-currpY - cppY) / ry];
    var angd = ang(a, b);
    if (r(a, b) <= -1) angd = Math.PI;
    if (r(a, b) >= 1) angd = 0;

    var rad = (rx > ry) ? rx : ry;
    var sx = (rx > ry) ? 1 : rx / ry;
    var sy = (rx > ry) ? ry / rx : 1;

    ctx.translate(centpX, centpY);
    ctx.rotate(xAxisRotation);
    ctx.scale(sx, sy);
    ctx.arc(0, 0, rad, ang1, ang1 + angd, !sweepFlag);
    ctx.scale(1 / sx, 1 / sy);
    ctx.rotate(-xAxisRotation);
    ctx.translate(-centpX, -centpY);
};

export function renderGraphicalElementCanvas(context: CanvasRenderingContext2D, element: Graphics.Element) {
    switch (element.type) {
        case "rect": {
            let rect = element as Graphics.Rect;
            context.beginPath();
            context.rect(Math.min(rect.x1, rect.x2), -Math.max(rect.y1, rect.y2), Math.abs(rect.x1 - rect.x2), Math.abs(rect.y1 - rect.y2));
            renderWithStyle(context, element.style);
        } break;
        case "circle": {
            let circle = element as Graphics.Circle;
            context.beginPath();
            context.arc(circle.cx, -circle.cy, circle.r, 0, Math.PI * 2);
            renderWithStyle(context, element.style);
        } break;
        case "ellipse": {
            let ellipse = element as Graphics.Ellipse;
            context.beginPath();
            context.ellipse((ellipse.x1 + ellipse.x2) / 2, -(ellipse.y1 + ellipse.y2) / 2, Math.abs(ellipse.x1 - ellipse.x2) / 2, Math.abs(ellipse.y1 - ellipse.y2) / 2, 0, 0, Math.PI * 2);
            renderWithStyle(context, element.style);
        } break;
        case "line": {
            let line = element as Graphics.Line;
            context.beginPath();
            context.moveTo(line.x1, -line.y1);
            context.lineTo(line.x2, -line.y2);
            renderWithStyle(context, element.style);
        } break;
        case "polygon": {
            let polygon = element as Graphics.Polygon;
            context.beginPath();
            for (let i = 0; i < polygon.points.length; i++) {
                let p = polygon.points[i];
                if (i == 0) {
                    context.moveTo(p.x, -p.y);
                } else {
                    context.lineTo(p.x, -p.y);
                }
            }
            context.closePath();
            renderWithStyle(context, element.style);
        } break;
        case "path": {
            let path = element as Graphics.Path;
            context.beginPath();
            let x: number = 0;
            let y: number = 0;
            for (let cmd of path.cmds) {
                let args = cmd.args;
                switch (cmd.cmd) {
                    // "M": (args: number[]) => `M ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
                    // "L": (args: number[]) => `L ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
                    // "C": (args: number[]) => `C ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(args[2])},${toSVGNumber(-args[3])},${toSVGNumber(args[4])},${toSVGNumber(-args[5])}`,
                    // "Q": (args: number[]) => `Q ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(args[2])},${toSVGNumber(-args[3])}`,
                    // "A": (args: number[]) => `A ${toSVGNumber(args[0])},${toSVGNumber(args[1])},${toSVGNumber(args[2])},${toSVGNumber(args[3])},${toSVGNumber(args[4])},${toSVGNumber(args[5])},${toSVGNumber(-args[6])}`,
                    // "Z": () => `Z`
                    case "M": {
                        context.moveTo(args[0], -args[1]);
                        x = args[0]; y = args[1];
                    } break;
                    case "L": {
                        context.lineTo(args[0], -args[1]);
                        x = args[0]; y = args[1];
                    } break;
                    case "C": {
                        context.bezierCurveTo(args[0], -args[1], args[2], -args[3], args[4], -args[5]);
                        x = args[4]; y = args[5];
                    } break;
                    case "Q": {
                        context.quadraticCurveTo(args[0], -args[1], args[2], -args[3]);
                        x = args[2]; y = args[3];
                    } break;
                    case "Z": {
                        context.closePath();
                    } break;
                    case "A": {
                        drawSVGarcOnCanvas(context, x, -y, args[0], args[1], args[2], args[3], args[4], args[5], -args[6]);
                        x = args[5]; y = args[6];
                    } break;
                }
            }
            renderWithStyle(context, element.style);
        } break;
        case "text": {
            let text = element as Graphics.Text;
            let fontFamily = text.fontFamily || "Arial";
            let fontSize = text.fontSize != undefined ? text.fontSize : 12;
            context.font = `${fontSize}px '${fontFamily}'`;
            // context.textAlign = element.style.textAnchor;
            let style = text.style;
            if (style.strokeColor) {
                context.strokeStyle = renderColor(style.strokeColor, style.strokeOpacity);
                context.lineWidth = style.strokeWidth != undefined ? style.strokeWidth : 1;
                context.lineCap = style.strokeLinecap != undefined ? style.strokeLinecap : "round";
                context.lineJoin = style.strokeLinejoin != undefined ? style.strokeLinejoin : "round";
                context.strokeText(text.text, text.cx, -text.cy);
            }
            context.globalAlpha = style.opacity != undefined ? style.opacity : 1;
            if (style.fillColor) {
                context.fillStyle = renderColor(style.fillColor, style.fillOpacity);
                context.fillText(text.text, text.cx, -text.cy);
            }
        } break;
        case "image": {
            let image = element as Graphics.Image;
        } break;
        case "group": {
            let group = element as Graphics.Group;
            context.save();
            if (group.transform) {
                context.translate(group.transform.x, -group.transform.y);
                context.rotate(-group.transform.angle / 180 * Math.PI);
            }
            for (let e of group.elements) {
                renderGraphicalElementCanvas(context, e);
            }
            context.restore();
        }
    }
}
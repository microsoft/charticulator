import { ZoomInfo, prettyNumber } from "../../core";

export function classNames(...args: (string | [string, boolean])[]) {
    return args.filter(x => x != null && (typeof (x) == "string" || x[1] == true))
        .map(x => typeof (x) == "string" ? x : x[0]).join(" ");
}

export function toSVGNumber(x: number) {
    return prettyNumber(x, 8);
}

export function toSVGZoom(zoom: ZoomInfo) {
    return `translate(${prettyNumber(zoom.centerX)},${prettyNumber(zoom.centerY)}) scale(${prettyNumber(zoom.scale)})`;
}

export interface RenderDataURLToPNGOptions {
    mode: "scale" | "thumbnail";
    scale?: number;
    thumbnail?: [number, number];
    background?: string;
}

export function renderDataURLToPNG(dataurl: string, options: RenderDataURLToPNGOptions): Promise<HTMLCanvasElement> {
    return new Promise<HTMLCanvasElement>((resolve, reject) => {
        let img = new Image();
        img.src = dataurl;
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            switch (options.mode) {
                case "scale": {
                    canvas.width = width * options.scale;
                    canvas.height = height * options.scale;
                    if (options.background) {
                        ctx.fillStyle = options.background;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    ctx.scale(options.scale, options.scale);
                    ctx.drawImage(img, 0, 0);
                } break;
                case "thumbnail": {
                    canvas.width = options.thumbnail[0];
                    canvas.height = options.thumbnail[1];
                    if (options.background) {
                        ctx.fillStyle = options.background;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    let maxScale = Math.max(canvas.width / width, canvas.height / height);
                    ctx.scale(maxScale, maxScale);
                    ctx.drawImage(img, 0, 0);
                } break;
            }
            resolve(canvas);
        }
        img.onerror = () => {
            reject(new Error("failed to load image"));
        }
    })
}
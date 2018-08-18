import { prettyNumber, ZoomInfo } from "../../core";

export function classNames(...args: Array<string | [string, boolean]>) {
  return args
    .filter(x => x != null && (typeof x == "string" || x[1] == true))
    .map(x => (typeof x == "string" ? x : x[0]))
    .join(" ");
}

export function toSVGNumber(x: number) {
  return prettyNumber(x, 8);
}

export function toSVGZoom(zoom: ZoomInfo) {
  return `translate(${prettyNumber(zoom.centerX)},${prettyNumber(
    zoom.centerY
  )}) scale(${prettyNumber(zoom.scale)})`;
}

export function parseHashString(value: string) {
  // Make sure value doesn't start with "#" or "#!"
  if (value[0] == "#") {
    value = value.substr(1);
  }
  if (value[0] == "!") {
    value = value.substr(1);
  }

  // Split by & and parse each key=value pair
  return value.split("&").reduce(
    (prev, str) => {
      const pair = str.split("=");
      prev[decodeURIComponent(pair[0])] =
        pair.length == 2 ? decodeURIComponent(pair[1]) : "";
      return prev;
    },
    {} as { [key: string]: string }
  );
}

export interface RenderDataURLToPNGOptions {
  mode: "scale" | "thumbnail";
  scale?: number;
  thumbnail?: [number, number];
  background?: string;
}

export function renderDataURLToPNG(
  dataurl: string,
  options: RenderDataURLToPNGOptions
): Promise<HTMLCanvasElement> {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.src = dataurl;
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      switch (options.mode) {
        case "scale":
          {
            canvas.width = width * options.scale;
            canvas.height = height * options.scale;
            if (options.background) {
              ctx.fillStyle = options.background;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.scale(options.scale, options.scale);
            ctx.drawImage(img, 0, 0);
          }
          break;
        case "thumbnail":
          {
            canvas.width = options.thumbnail[0];
            canvas.height = options.thumbnail[1];
            if (options.background) {
              ctx.fillStyle = options.background;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            const maxScale = Math.max(
              canvas.width / width,
              canvas.height / height
            );
            ctx.scale(maxScale, maxScale);
            ctx.drawImage(img, 0, 0);
          }
          break;
      }
      resolve(canvas);
    };
    img.onerror = () => {
      reject(new Error("failed to load image"));
    };
  });
}

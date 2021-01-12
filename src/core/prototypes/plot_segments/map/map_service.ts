// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { strings } from "../../../../strings";
import { getConfig } from "../../../config";

export interface Location {
  longitude: number;
  latitude: number;
}

export interface GetImageryAtPointOptions {
  width: number;
  height: number;

  center: Location;
  zoom: number;

  type: "roadmap" | "satellite" | "hybrid" | "terrain";

  resolution?: "high" | "low";
}

export abstract class StaticMapService {
  /** Get the map imagery at a given point with zooming */
  public abstract getImageryURLAtPoint(
    options: GetImageryAtPointOptions
  ): string;

  public getImageryAtPoint(options: GetImageryAtPointOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = this.getImageryURLAtPoint(options);
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        reject(new Error(strings.error.imageLoad(url)));
      };
      img.src = url;
    });
  }

  private static cachedService: StaticMapService = null;
  public static GetService() {
    if (StaticMapService.cachedService == null) {
      const config = getConfig();
      if (config.MapService) {
        switch (config.MapService.provider) {
          case "Google":
            {
              StaticMapService.cachedService = new GoogleMapService(
                config.MapService.apiKey
              );
            }
            break;
          case "Bing":
            {
              StaticMapService.cachedService = new BingMapService(
                config.MapService.apiKey
              );
            }
            break;
        }
      }
    }
    return StaticMapService.cachedService;
  }
}

function buildQueryParameters(options: { [name: string]: string }) {
  const r: string[] = [];
  for (const p in options) {
    if (options.hasOwnProperty(p)) {
      r.push(encodeURIComponent(p) + "=" + encodeURIComponent(options[p]));
    }
  }
  return r.join("&");
}

export class GoogleMapService extends StaticMapService {
  constructor(public apiKey: string) {
    super();
  }

  public getImageryURLAtPoint(options: GetImageryAtPointOptions): string {
    const params: { [name: string]: string } = {
      center: `${options.center.latitude},${options.center.longitude}`,
      zoom: `${options.zoom}`,
      size: `${options.width}x${options.height}`,
      key: this.apiKey,
      format: "png",
    };
    if (options.resolution == "high") {
      params.scale = "2";
    }
    if (options.type == "satellite") {
      params.maptype = "satellite";
    }
    if (options.type == "hybrid") {
      params.maptype = "hybrid";
    }
    if (options.type == "terrain") {
      params.maptype = "terrain";
    }
    let url = "https://maps.googleapis.com/maps/api/staticmap";
    url += "?" + buildQueryParameters(params);
    return url;
  }
}

export class BingMapService extends StaticMapService {
  constructor(public apiKey: string) {
    super();
  }

  public getImageryURLAtPoint(options: GetImageryAtPointOptions): string {
    const params: { [name: string]: string } = {
      mapSize: `${options.width},${options.height}`,
      key: this.apiKey,
      format: "png",
    };
    if (options.resolution == "high") {
      params.dpi = "Large";
      params.mapSize = `${options.width * 2},${options.height * 2}`;
    }
    let type = "Road";
    if (options.type == "satellite") {
      type = "Aerial";
    }
    if (options.type == "hybrid") {
      type = "AerialWithLabels";
    }
    let url = `https://dev.virtualearth.net/REST/v1/Imagery/Map/${type}/`;
    url += `${options.center.latitude},${options.center.longitude}/${
      options.zoom + 1
    }`;
    url += "?" + buildQueryParameters(params);
    return url;
  }
}

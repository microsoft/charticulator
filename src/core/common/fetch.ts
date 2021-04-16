// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
export function loadDataFromURL(
  url: string,
  contentType: "text",
  timeout?: number
): Promise<string>;
export function loadDataFromURL(
  url: string,
  contentType: "json",
  timeout?: number
): Promise<Record<string, unknown>>;
export function loadDataFromURL(
  url: string,
  contentType: "arraybuffer",
  timeout?: number
): Promise<ArrayBuffer>;
export function loadDataFromURL(
  url: string,
  contentType: "blob",
  timeout?: number
): Promise<Blob>;
export function loadDataFromURL(
  url: string,
  contentType: string = "text",
  // eslint-disable-next-line
  timeout: number = 10
): Promise<any> {
  return fetch(url).then((response) => {
    if (response.ok && response.status == 200) {
      if (contentType == "text") {
        return response.text();
      }
      if (contentType == "json") {
        return response.json();
      }
      if (contentType == "arraybuffer") {
        return response.arrayBuffer();
      }
      if (contentType == "blob") {
        return response.blob();
      }
      return response.text();
    } else {
      throw new Error("failed to fetch url");
    }
  });
}

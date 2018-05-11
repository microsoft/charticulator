import { Table } from "./dataset";
import { parseDataset } from "./dsv_parser";

import * as d3 from "d3";

export class DatasetLoader {
  public loadTextData(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      d3
        .request(url)
        .responseType("text")
        .get((err: string, data: XMLHttpRequest) => {
          if (!err) {
            resolve(data.responseText);
          } else {
            reject(err);
          }
        });
    });
  }

  public loadCSVFromURL(url: string): Promise<Table> {
    return this.loadTextData(url).then(data => {
      return parseDataset(url, data, "csv");
    });
  }

  public loadTSVFromURL(url: string): Promise<Table> {
    return this.loadTextData(url).then(data => {
      return parseDataset(url, data, "tsv");
    });
  }

  public loadCSVFromContents(filename: string, contents: string): Table {
    return parseDataset(filename, contents, "csv");
  }

  public loadTSVFromContents(filename: string, contents: string): Table {
    return parseDataset(filename, contents, "csv");
  }
}

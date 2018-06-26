import { Table } from "./dataset";
import { parseDataset } from "./dsv_parser";

export class DatasetLoader {
  public loadTextData(url: string): Promise<string> {
    return fetch(url).then(resp => resp.text());
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

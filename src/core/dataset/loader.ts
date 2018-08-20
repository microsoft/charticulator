import { Table, Dataset } from "./dataset";
import { parseDataset } from "./dsv_parser";

export interface TableSourceSpecification {
  /** Name of the table, if empty, use the basename of the url without extension */
  name?: string;
  /** Table format, if empty, infer from the url's extension */
  format?: "csv" | "tsv";
  /** Option 1: Specify the url to load the table from */
  url?: string;
  /** Option 2: Specify the table content, in this case format and name must be specified */
  content?: string;
}

export interface DatasetSourceSpecification {
  name?: string;
  tables: TableSourceSpecification[];
}

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

  public async loadTableFromSourceSpecification(
    spec: TableSourceSpecification
  ) {
    if (spec.url) {
      const tableContent = await this.loadTextData(spec.url);
      let format: "csv" | "tsv" = "csv";
      if (spec.url.toLowerCase().endsWith(".tsv")) {
        format = "tsv";
      }
      const table = parseDataset(
        spec.url.split("/").pop(),
        tableContent,
        format
      );
      if (spec.name) {
        table.name = spec.name;
      }
      return table;
    } else if (spec.content) {
      const table = parseDataset(spec.name, spec.content, spec.format);
      table.name = spec.name;
      return table;
    } else {
      throw new Error(
        "invalid table specification, url or content must be specified"
      );
    }
  }

  public async loadDatasetFromSourceSpecification(
    spec: DatasetSourceSpecification
  ) {
    // Load all tables
    const tables = await Promise.all(
      spec.tables.map(table => this.loadTableFromSourceSpecification(table))
    );
    // Make dataset struct
    const dataset: Dataset = { name: spec.name, tables };
    if (!spec.name && tables.length > 0) {
      dataset.name = tables[0].name;
    }
    return dataset;
  }
}

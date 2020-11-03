// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Table, Dataset, TableType } from "./dataset";
import { parseDataset, LocaleFileFormat } from "./dsv_parser";

export interface TableSourceSpecification {
  /** Name of the table, if empty, use the basename of the url without extension */
  name?: string;
  /** Locale-based delimiter and number format */
  localeFileFormat: LocaleFileFormat;
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
    return fetch(url).then((resp) => resp.text());
  }

  public loadDSVFromURL(
    url: string,
    localeFileFormat: LocaleFileFormat
  ): Promise<Table> {
    return this.loadTextData(url).then((data) => {
      return parseDataset(url, data, localeFileFormat);
    });
  }

  public loadDSVFromContents(
    filename: string,
    contents: string,
    localeFileFormat: LocaleFileFormat
  ): Table {
    return parseDataset(filename, contents, localeFileFormat);
  }

  public async loadTableFromSourceSpecification(
    spec: TableSourceSpecification
  ) {
    if (spec.url) {
      const tableContent = await this.loadTextData(spec.url);
      if (spec.url.toLowerCase().endsWith(".tsv")) {
        spec.localeFileFormat.delimiter = "\t";
      }
      const table = parseDataset(
        spec.url.split("/").pop(),
        tableContent,
        spec.localeFileFormat
      );
      if (spec.name) {
        table.name = spec.name;
      }
      return table;
    } else if (spec.content) {
      const table = parseDataset(
        spec.name,
        spec.content,
        spec.localeFileFormat
      );
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
      spec.tables.map((table) => this.loadTableFromSourceSpecification(table))
    );
    tables[0].type = TableType.Main;
    if (tables[1]) {
      tables[1].type = TableType.Links;
    }
    // Make dataset struct
    const dataset: Dataset = { name: spec.name, tables };
    if (!spec.name && tables.length > 0) {
      dataset.name = tables[0].name;
    }
    return dataset;
  }
}

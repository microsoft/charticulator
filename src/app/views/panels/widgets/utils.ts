// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { FluentUIWidgetManager } from "../../../../app/views/panels/widgets/fluentui_manager";
import { Dataset } from "../../../../core";
import { TableType } from "../../../../core/dataset";

export function getDropzoneAcceptTables(
  manager: FluentUIWidgetManager,
  acceptLinksTable: boolean
): string[] {
  let acceptTables: string[] = [];
  try {
    const tables = manager.store.getTables();
    if (acceptLinksTable) {
      const linksTables = filterTablesByType(tables, [
        TableType.Links,
        TableType.ParentLinks,
      ]);
      acceptTables = transformTablesToAcceptTables(linksTables);
    } else {
      const mainTables = filterTablesByType(tables, [
        TableType.Main,
        TableType.Image,
        TableType.ParentMain,
      ]);
      acceptTables = transformTablesToAcceptTables(mainTables);
    }
    return acceptTables;
  } catch (ex) {
    console.log(ex);
  }
  return acceptTables;
}

function filterTablesByType(
  tables: Dataset.Table[],
  types: TableType[]
): Dataset.Table[] {
  return tables.filter((table) => types.includes(table.type));
}

function transformTablesToAcceptTables(tables: Dataset.Table[]): string[] {
  return tables.map((table) => table.name);
}

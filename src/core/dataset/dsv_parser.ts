import * as d3 from "d3";

import { ValueType, Dataset, Column, Row, Table } from "./dataset";
import { inferColumnType, convertColumn, inferColumnMetadata } from "./data_types";

export function parseHints(hints: string) {
    let items = hints.match(/ *\*(.*)/);
    if (items) {
        let entries = items[1].trim().split(";").map(x => x.trim()).filter(x => x != "");
        let result: { [name: string]: string } = {};
        for (let entry of entries) {
            let items = entry.split(":").map(x => x.trim());
            if (items.length == 2) {
                result[items[0]] = items[1];
            } else if (items.length == 1) {
                result[items[0]] = "true";
            }
        }
        return result;
    } else {
        return {};
    }
}

export function parseDataset(fileName: string, content: string, type: "csv" | "tsv"): Table {
    let rows: string[][];
    switch (type) {
        case "csv": {
            rows = d3.csvParseRows(content)

        } break;
        case "tsv": {
            rows = d3.tsvParseRows(content);
        } break;
        default: {
            rows = [[]];
        } break;
    }

    // Remove empty rows if any
    rows = rows.filter((row) => row.length > 0);

    if (rows.length > 0) {
        let header = rows[0];
        let columnHints: { [name: string]: string }[];
        let data = rows.slice(1);
        if (data.length > 0 && data[0].every(x => /^ *\*/.test(x))) {
            columnHints = data[0].map(parseHints);
            data = data.slice(1);
        } else {
            columnHints = header.map(x => { return {} });
        }

        let columns = header.map((name, index) => {
            let hints = columnHints[index] || {};
            console.log(hints);
            // Infer column type
            let values = data.map((row) => row[index]);
            let inferredType = hints.type || inferColumnType(values);
            let [type, metadata] = inferColumnMetadata(inferredType, values, hints);
            let column = {
                name: name,
                type: type,
                metadata: metadata
            } as Column;
            return column;
        });

        let columnValues = columns.map((c, index) => {
            let values = data.map((row) => row[index]);
            return convertColumn(c.type, values);
        });

        let outRows = data.map((row, rindex) => {
            let out: Row = { _id: rindex.toString() };
            columns.forEach((column, cindex) => {
                out[column.name] = columnValues[cindex][rindex];
            });
            return out;
        });

        return {
            name: fileName,
            columns: columns,
            rows: outRows,
        };
    } else {
        return null;
    }
}

// export function getColumnsSummary(dataset: Dataset) {
//     return dataset.columns.map((column) => {
//         let values = dataset.rows.filter(row => row[column.name] != null).map(row => row[column.name].toString());
//         let uniqueValues = getUniqueValues(values);
//         return {
//             name: column.name,
//             type: column.type,
//             format: column.format,
//             values: values,
//             uniqueValues: uniqueValues,
//             isDistinctValues: isDistinctValues(values)
//         }
//     });
// }

// export function getColumnsForDistinctAxis(dataset: Dataset, maxUniqueValues: number = 1e10) {
//     let summary = getColumnsSummary(dataset);
//     let candidates = summary.filter(c => c.isDistinctValues && c.type == "string" && c.uniqueValues.length <= maxUniqueValues);
//     return candidates.map(c => c.name);
// }

// export function getColumnsForContinuousAxis(dataset: Dataset) {
//     let candidates = dataset.columns.filter(d => d.type == "integer" || d.type == "number");
//     return candidates.map(c => c.name);
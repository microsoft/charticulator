// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fs from "fs";
import * as Dataset from "../../core/dataset";

const args = process.argv.slice(2);
if (args.length == 0) {
  console.log("Charticulator Commandline Test: parse_csv");
  console.log("This utility parses a CSV file and print out the result");
  console.log("Usage: node path/to/parse_csv.js csv1.csv csv2.csv ...");
  process.exit(0);
}

for (const path of args) {
  console.log(
    "================================================================================"
  );
  console.log("FILE: " + path);
  const contents = fs.readFileSync(path, "utf-8");
  const loader = new Dataset.DatasetLoader();
  const result = loader.loadDSVFromContents(path, contents, {
    delimiter: ", ",
    numberFormat: {
      remove: ",",
      decimal: "."
    }
  });
  console.log(JSON.stringify(result.columns, null, 2));
  console.log(JSON.stringify(result.rows.slice(0, 2), null, 2));
}

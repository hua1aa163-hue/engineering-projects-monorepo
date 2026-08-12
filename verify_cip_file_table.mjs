import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "D:/CHATGPT_file/else thing/outputs/cip_file_table/测试专题提升_文件表_20260723.xlsx";
const outputDir = "D:/CHATGPT_file/else thing/outputs/cip_file_table";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 5000,
  tableMaxRows: 8,
  tableMaxCols: 7,
  tableMaxCellChars: 160,
});
console.log("SUMMARY");
console.log(summary.ndjson);

const tail = await workbook.inspect({
  kind: "table",
  sheetId: "Sheet1",
  range: "B1261:G1267",
  include: "values,formulas",
  tableMaxRows: 7,
  tableMaxCols: 6,
  maxChars: 5000,
});
console.log("TAIL");
console.log(tail.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "reimported workbook error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: "Sheet1", range: "A1:G18", scale: 1.25, format: "png" });
await fs.writeFile(`${outputDir}/final_reimport_preview.png`, new Uint8Array(await preview.arrayBuffer()));

import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "D:/1.历史文档整理/20260601测试文档备注.xlsx";
const outDir = "D:/CHATGPT_file/else thing/outputs/cip_file_table";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 20,
  tableMaxCols: 20,
  tableMaxCellChars: 200,
});
console.log("SUMMARY");
console.log(summary.ndjson);

const styles = await workbook.inspect({
  kind: "computedStyle",
  sheetId: "Sheet1",
  range: "A1:Z25",
  maxChars: 12000,
});
console.log("STYLES");
console.log(styles.ndjson);

const preview = await workbook.render({
  sheetName: "Sheet1",
  autoCrop: "all",
  scale: 1.5,
  format: "png",
});
await fs.writeFile(`${outDir}/reference_sheet1.png`, new Uint8Array(await preview.arrayBuffer()));

import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inventoryPath = "D:/CHATGPT_file/else thing/outputs/cip_file_table/inventory.json";
const outputDir = "D:/CHATGPT_file/else thing/outputs/cip_file_table";
const outputPath = `${outputDir}/测试专题提升_文件表_20260723.xlsx`;
const sourceRoot = "\\\\192.168.1.92\\310_共享\\999_Process_Control_Board\\99_Continous_Improving_Program(CIP)\\02_测试专题提升";

const payload = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const records = payload.records;

function xmlSafe(value) {
  return String(value ?? "")
    .toWellFormed()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function finalDescription(record) {
  const ext = String(record.extension || "").toLowerCase();
  const status = record.extraction?.status || "";
  if (record.full_name === "Thumbs.db") {
    return "Windows 缩略图缓存文件；由资源管理器自动生成，非业务文档";
  }
  if (status === "temporary_lock_file") {
    return "Office 临时锁定文件；由对应工作文件打开时自动生成，不属于正式文档内容";
  }
  if (record.size_bytes === 0) {
    return `0 字节占位文件，无可读取内容；所在板块：${record.topic}`;
  }
  if (status === "encrypted_or_protected") {
    return `受保护的 ${record.file_type} 文件，自动解析失败；已尝试本机加密软件补读但电脑操作授权超时，内容依据目录和文件名判断为：${record.topic}相关资料`;
  }
  if (status === "needs_local_app") {
    return `旧版 Excel 文件，自动解析失败；已尝试本机 Excel 补读但电脑操作授权超时，内容依据目录和文件名判断为：${record.topic}相关资料`;
  }
  if (status === "error") {
    return `受本机加密软件/虚拟文件系统保护，自动解析失败；内容依据目录和文件名判断为：${record.topic}相关资料`;
  }
  return record.description;
}

function groupCode(group) {
  const match = String(group).match(/^(\d{2})_/);
  return match ? match[1] : group === "测试规范" ? "10" : String(group).slice(0, 2);
}

const rows = [];
const groupStarts = [];
let previousGroup = null;
for (const record of records) {
  const isStart = record.group !== previousGroup;
  if (isStart) {
    groupStarts.push({ row: rows.length + 5, group: record.group });
    previousGroup = record.group;
  }
  rows.push([
    null,
    isStart ? groupCode(record.group) : null,
    xmlSafe(record.directory),
    xmlSafe(record.file_name),
    xmlSafe(record.file_type),
    xmlSafe(record.topic),
    xmlSafe(finalDescription(record)),
  ]);
}

await fs.mkdir(outputDir, { recursive: true });
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Sheet1");
sheet.showGridLines = true;

sheet.getRange("B2").values = [["内容"]];
sheet.getRange("C2").values = [["公盘--测试专项提升"]];
sheet.mergeCells("D2:G2");
sheet.getRange("D2").values = [[sourceRoot]];
sheet.getRange("C4:G4").values = [["目录", "文件名", "文件类型", "板块", "内容描述"]];

const endRow = rows.length + 4;
sheet.getRangeByIndexes(4, 0, rows.length, 7).values = rows;

const titleRange = sheet.getRange("B2:G2");
titleRange.format = {
  fill: "#E2F0D9",
  font: { name: "等线", fontSize: 11, color: "#1F1F1F" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#D9E2D0" },
};
sheet.getRange("B2:C2").format.font = { name: "等线", fontSize: 11, bold: true, color: "#1F1F1F" };
sheet.getRange("D2:G2").format.font = { name: "等线", fontSize: 10, color: "#0563C1", underline: true };
sheet.getRange("B2:G2").format.rowHeight = 42;

const headerRange = sheet.getRange("C4:G4");
headerRange.format = {
  fill: "#E2F0D9",
  font: { name: "等线", fontSize: 11, bold: true, color: "#1F1F1F" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#D9E2D0" },
};
sheet.getRange("B4:G4").format.rowHeight = 24;

const dataRange = sheet.getRange(`B5:G${endRow}`);
dataRange.format = {
  font: { name: "等线", fontSize: 10, color: "#1F1F1F" },
  verticalAlignment: "center",
  wrapText: true,
  borders: {
    insideHorizontal: { style: "thin", color: "#E7E6E6" },
    insideVertical: { style: "thin", color: "#E7E6E6" },
    bottom: { style: "thin", color: "#D9D9D9" },
  },
};
dataRange.format.rowHeight = 45;
sheet.getRange(`B5:B${endRow}`).format.horizontalAlignment = "center";
sheet.getRange(`C5:D${endRow}`).format.horizontalAlignment = "left";
sheet.getRange(`E5:E${endRow}`).format.horizontalAlignment = "center";
sheet.getRange(`F5:G${endRow}`).format.horizontalAlignment = "left";

const groupColors = ["#DDEBF7", "#FCE4D6", "#E2F0D9", "#FFF2CC", "#E4DFEC"];
groupStarts.forEach((item, index) => {
  const row = item.row;
  sheet.getRange(`B${row}`).format = {
    fill: groupColors[index % groupColors.length],
    font: { name: "等线", fontSize: 11, bold: true, color: "#1F1F1F" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };
  sheet.getRange(`B${row}:G${row}`).format.borders = {
    top: { style: "medium", color: "#BFBFBF" },
    bottom: { style: "thin", color: "#E7E6E6" },
  };
});

sheet.getRange(`A1:A${endRow}`).format.columnWidth = 2.5;
sheet.getRange(`B1:B${endRow}`).format.columnWidth = 6;
sheet.getRange(`C1:C${endRow}`).format.columnWidth = 58;
sheet.getRange(`D1:D${endRow}`).format.columnWidth = 34;
sheet.getRange(`E1:E${endRow}`).format.columnWidth = 13;
sheet.getRange(`F1:F${endRow}`).format.columnWidth = 18;
sheet.getRange(`G1:G${endRow}`).format.columnWidth = 55;

sheet.freezePanes.freezeRows(4);
sheet.freezePanes.freezeColumns(2);

const descriptions = sheet.getRange(`G5:G${endRow}`);
descriptions.conditionalFormats.add("containsText", {
  text: "受保护",
  format: { fill: "#FFF2CC", font: { color: "#7F6000" } },
});
descriptions.conditionalFormats.add("containsText", {
  text: "未提取到可搜索文字",
  format: { fill: "#FFF2CC", font: { color: "#7F6000" } },
});
descriptions.conditionalFormats.add("containsText", {
  text: "0 字节",
  format: { fill: "#F4CCCC", font: { color: "#9C0006" } },
});
descriptions.conditionalFormats.add("containsText", {
  text: "临时锁定文件",
  format: { fill: "#F2F2F2", font: { color: "#7F7F7F", italic: true } },
});

const topCheck = await workbook.inspect({
  kind: "table",
  sheetId: "Sheet1",
  range: "B2:G12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 6,
  maxChars: 6000,
});
console.log("TOP_CHECK");
console.log(topCheck.ndjson);

const midStart = Math.floor(endRow / 2);
const midCheck = await workbook.inspect({
  kind: "table",
  sheetId: "Sheet1",
  range: `B${midStart}:G${midStart + 6}`,
  include: "values,formulas",
  tableMaxRows: 7,
  tableMaxCols: 6,
  maxChars: 4000,
});
console.log("MID_CHECK");
console.log(midCheck.ndjson);

const bottomCheck = await workbook.inspect({
  kind: "table",
  sheetId: "Sheet1",
  range: `B${endRow - 6}:G${endRow}`,
  include: "values,formulas",
  tableMaxRows: 7,
  tableMaxCols: 6,
  maxChars: 4000,
});
console.log("BOTTOM_CHECK");
console.log(bottomCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log("ERROR_SCAN");
console.log(errors.ndjson);

for (const [name, range] of [
  ["preview_top.png", "A1:G25"],
  ["preview_middle.png", `A${midStart}:G${midStart + 20}`],
  ["preview_bottom.png", `A${Math.max(1, endRow - 20)}:G${endRow}`],
]) {
  const preview = await workbook.render({ sheetName: "Sheet1", range, scale: 1.25, format: "png" });
  await fs.writeFile(`${outputDir}/${name}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, rows: rows.length, endRow, groups: groupStarts.length }));

import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280, H = 720;
const ROOT = "D:/CHATGPT_file/else thing";
const OUT = path.resolve(ROOT, "tmp/hud_axis_v2/HUD_testbench_axis_deep_research_v2_2026-07-26.pptx");
const RENDER_DIR = path.resolve(ROOT, "tmp/hud_axis_v2/rendered");
const ASSET_DIR = path.resolve(ROOT, "tmp/hud_research");

const C = {
  ink: "#111318", muted: "#5D6573", panel: "#F1F3F5", panel2: "#E7EAEE",
  rule: "#B8BCC4", accent: "#00A7C4", accent2: "#2F74FF", accentPale: "#DFF6FA",
  green: "#2B8A6E", greenPale: "#E6F5F0", amber: "#C47A12", amberPale: "#FFF4DE",
  red: "#C54B4B", redPale: "#FBEAEA", white: "#FFFFFF",
};
const FONT = "Microsoft YaHei", FONT_EN = "Arial";

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}
function box(slide, name, left, top, width, height, fill = C.panel, lineFill = fill, radius = 0) {
  return slide.shapes.add({ geometry: radius ? "roundRect" : "rect", name,
    position: { left, top, width, height }, fill,
    line: { style: "solid", fill: lineFill, width: lineFill === fill ? 0 : 1 },
    borderRadius: radius || undefined });
}
function textBox(slide, name, text, left, top, width, height, opts = {}) {
  const sh = slide.shapes.add({ geometry: "textbox", name, position: { left, top, width, height },
    fill: "none", line: { style: "solid", fill: "none", width: 0 } });
  sh.text = text;
  sh.text.style = { fontSize: opts.fontSize ?? 20, bold: opts.bold ?? false,
    color: opts.color ?? C.ink, alignment: opts.alignment ?? "left",
    verticalAlignment: opts.verticalAlignment ?? "top", autoFit: opts.autoFit ?? "shrinkText",
    wrap: opts.wrap ?? "square", typeface: opts.typeface ?? FONT, lineSpacing: opts.lineSpacing,
    insets: opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 } };
  return sh;
}
function addRule(slide, left, top, width, color = C.rule, weight = 1) {
  slide.shapes.add({ geometry: "line", position: { left, top, width, height: 0 }, fill: "none",
    line: { style: "solid", fill: color, width: weight } });
}
function addHeader(slide, title, slideNo) {
  textBox(slide, `eyebrow-${slideNo}`, "HUD TEST BENCH / AXIS DEEP RESEARCH", 42, 30, 800, 26,
    { fontSize: 14, bold: true, color: C.accent, typeface: FONT_EN });
  textBox(slide, `title-${slideNo}`, title, 42, 62, 1150, 74,
    { fontSize: 38, bold: true, autoFit: "shrinkText" });
  addRule(slide, 42, 143, 1196, C.rule, 1);
  textBox(slide, `page-${slideNo}`, String(slideNo).padStart(2, "0"), 1183, 675, 55, 18,
    { fontSize: 12, alignment: "right", color: C.muted, typeface: FONT_EN });
}
function addNotes(slide, urls, method = "") {
  const lines = ["[Sources]", ...urls.map((u) => `- ${u}`), "[/Sources]"];
  if (method) lines.push("", `[Method] ${method}`);
  slide.speakerNotes.textFrame.setText(lines.join("\n"));
  slide.speakerNotes.setVisible(true);
}
async function addImage(slide, fileName, contentType, name, pos, fit = "contain") {
  const bytes = await fs.readFile(path.join(ASSET_DIR, fileName));
  slide.images.add({ blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType, name, alt: name, fit, position: pos });
}
function styleTable(table, headerRows = 1, bodyFont = 14) {
  table.borders.assign({ style: "solid", fill: C.rule, width: 1 });
  const rows = table.rows.length, cols = table.columns.length;
  table.cells.block({ row: 0, column: 0, rowCount: headerRows, columnCount: cols }).assign({
    fill: C.ink, textStyle: { fontSize: bodyFont, bold: true, color: C.white, typeface: FONT },
    margins: { top: 6, bottom: 6, left: 7, right: 7 }, anchor: "middle" });
  if (rows > headerRows) table.cells.block({ row: headerRows, column: 0, rowCount: rows - headerRows, columnCount: cols }).assign({
    textStyle: { fontSize: bodyFont, color: C.ink, typeface: FONT },
    margins: { top: 5, bottom: 5, left: 7, right: 7 }, anchor: "middle" });
  for (let r = headerRows; r < rows; r += 2) table.cells.block({ row: r, column: 0, rowCount: 1, columnCount: cols }).fill = "#F7F8F9";
}
function markCell(table, row, col, fill, color = C.ink, bold = true, fontSize = 14) {
  const cell = table.getCell(row, col); cell.fill = fill;
  cell.text.style = { fontSize, bold, color, typeface: FONT };
}
function statCard(s, x, y, w, h, value, label, foot, emphasis = false) {
  box(s, `card-${x}-${y}`, x, y, w, h, emphasis ? C.accentPale : C.panel, emphasis ? C.accent : C.panel, 8);
  textBox(s, `value-${x}-${y}`, value, x + 26, y + 24, w - 52, 72,
    { fontSize: 46, bold: true, color: emphasis ? C.accent2 : C.ink, typeface: FONT_EN });
  textBox(s, `label-${x}-${y}`, label, x + 26, y + 108, w - 52, 58, { fontSize: 22, bold: true });
  textBox(s, `foot-${x}-${y}`, foot, x + 26, y + 184, w - 52, 52, { fontSize: 15, color: C.muted });
}

async function main() {
  await fs.mkdir(RENDER_DIR, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 01 Cover
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    textBox(s, "cover-kicker", "第一部分｜竞品调研·深度检索版", 42, 36, 600, 44, { fontSize: 22, bold: true, color: C.accent });
    textBox(s, "cover-date", "2026.07.26", 963, 36, 275, 44, { fontSize: 22, alignment: "right", color: C.muted, typeface: FONT_EN });
    box(s, "cover-accent", 42, 136, 112, 7, C.accent, C.accent);
    textBox(s, "cover-title", "HUD测试台架\n轴系竞品调研", 42, 177, 920, 270,
      { fontSize: 72, bold: true, autoFit: "none", lineSpacing: 0.94 });
    textBox(s, "cover-subtitle", "远方光电 HUD-3000 与国内外同类方案\n重点：X / Y / Z 与 Pitch / Yaw / Roll 的行程、精度、重复性", 42, 500, 940, 110,
      { fontSize: 24, color: C.muted, lineSpacing: 1.15 });
    textBox(s, "cover-scope", "全网公开资料 / 一手证据优先", 920, 575, 318, 52, { fontSize: 17, alignment: "right", bold: true });
    addNotes(s, [], "封面；无外部事实性主张。");
  }

  // 02 Answer-first
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "结论先行：行程与精度仍分散在不同证据源", 2);
    textBox(s, "lede", "没有一家现售直接HUD台架公开了“逐轴行程 + 绝对精度 + 重复性 + 分辨率 + 负载条件”的完整闭环。", 42, 165, 1196, 58, { fontSize: 24, color: C.muted });
    statCard(s, 42, 257, 376, 286, "1 / 6", "完整公开 XYZ + 3R 行程", "研鼎 RT-HUD V3：XYZ 与 Pitch/Yaw/Roll 均有数值");
    statCard(s, 452, 257, 376, 286, "2 / 6", "直接HUD设备披露数值精度", "远方：系统级；鑫信腾：机构/检测级，口径不同");
    statCard(s, 862, 257, 376, 286, "0 / 6", "公开完整逐轴验收闭环", "重复性、负载、温度、校准基准仍需RFI", true);
    textBox(s, "bottom", "建议：以 RT-HUD V3 定行程包络，以 HUD-3000 / 鑫信腾定精度下限，再用相邻平台补齐重复性指标。", 42, 596, 1196, 46, { fontSize: 21, bold: true });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960",
      "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf",
      "https://www.fulllightcn.com/product-item-102.html", "https://www.colorspace.com.cn/cs/en/product/hud-display-solution.html",
      "https://www.radiantvisionsystems.com/products/application-software/tt-hud-head-display-test-module"
    ], "统计对象为6个直接HUD产品/设备方案；专利与相邻平台不计入6个现售直接方案。");
  }

  // 03 Definitions
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "先统一“精度”口径，才可以比较轴系", 3);
    const rows = [
      ["01", "绝对定位精度", "指令位置与实测位置的偏差；应覆盖全行程、多点、双向与额定负载。"],
      ["02", "重复定位精度", "同一目标点多次到位的离散性；不能用分辨率代替，建议双向各≥7次。"],
      ["03", "分辨率", "最小指令或反馈增量；0.01 mm 分辨率不等于 ±0.01 mm 定位精度。"],
      ["04", "检测 / 测量精度", "图像检测、角度检测或系统测量误差；不必然等于机械轴定位精度。"],
    ];
    rows.forEach((d, i) => { const y = 174 + i * 104;
      textBox(s, `num-${i}`, d[0], 42, y, 72, 48, { fontSize: 27, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `term-${i}`, d[1], 132, y, 230, 48, { fontSize: 24, bold: true });
      textBox(s, `def-${i}`, d[2], 386, y, 852, 60, { fontSize: 19, color: C.muted });
      if (i < 3) addRule(s, 42, y + 75, 1196, C.panel2, 1);
    });
    box(s, "tier", 42, 603, 1196, 58, C.accentPale, C.accentPale, 5);
    textBox(s, "tier-text", "证据等级：A＝现售官网/官方数据表/监管披露；B＝采购要求、论文或相邻产品；C＝专利实施例/二手页面。", 62, 620, 1156, 30, { fontSize: 18, bold: true });
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf"], "定义为本报告的工程归一化口径；证据等级用于防止把系统、机构、检测和专利数值混排。");
  }

  // 04 Everfine
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "HUD-3000：公开了系统级精度，但没有逐轴行程", 4);
    textBox(s, "name", "远方光电\nHUD-3000", 42, 176, 430, 86, { fontSize: 35, bold: true, lineSpacing: 0.95 });
    textBox(s, "desc", "官网将成像亮度计、多维运动平台、HUD治具、风挡支架与分析软件集成于同一系统，面向研发、质检与生产。", 42, 280, 520, 95, { fontSize: 19, color: C.muted, lineSpacing: 1.12 });
    const specs = [["0.01 mm", "系统移动分辨率"], ["±0.1 mm", "系统移动精度"], ["0.01°", "系统旋转分辨率"], ["±0.1°", "系统旋转精度"]];
    specs.forEach((sp, i) => { const x = 42 + (i % 2) * 270, y = 405 + Math.floor(i / 2) * 106;
      textBox(s, `v-${i}`, sp[0], x, y, 240, 42, { fontSize: 29, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `l-${i}`, sp[1], x, y + 45, 240, 27, { fontSize: 15, color: C.muted });
    });
    box(s, "image-bg", 655, 176, 583, 433, C.panel, C.panel, 7);
    await addImage(s, "everfine_hud3000.png", "image/png", "EVERFINE HUD-3000 official product image", { left: 685, top: 205, width: 525, height: 335 }, "contain");
    textBox(s, "gap", "未公开：X/Y/Z行程、逐轴归属、重复性、正交度、负载/速度/温度、旋转角范围。", 685, 551, 525, 45, { fontSize: 16, bold: true, color: C.red });
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://www.everfine.cn/pro_desc_32.html"], "按官网原文保留“系统移动/旋转”口径，不擅自分配到X/Y/Z或某个旋转轴。");
  }

  // 05 Yanding
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "RT-HUD V3：公开行程最完整，精度仍是空白", 5);
    textBox(s, "name", "研鼎\nRT-HUD V3", 42, 176, 390, 86, { fontSize: 35, bold: true, lineSpacing: 0.95 });
    textBox(s, "desc", "官方数据表披露三直线轴、三旋转轴、旋转速度、载荷与机械臂工作范围，是当前公开资料中轴包络最完整的直接HUD方案。", 42, 280, 520, 94, { fontSize: 19, color: C.muted });
    const specs = [["±250 mm", "X"], ["±750 mm", "Y"], ["±80 mm", "Z"], ["±5°", "Pitch / Yaw / Roll"]];
    specs.forEach((sp, i) => { const x = 42 + (i % 2) * 270, y = 400 + Math.floor(i / 2) * 105;
      textBox(s, `v-${i}`, sp[0], x, y, 240, 42, { fontSize: 28, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `l-${i}`, sp[1], x, y + 44, 240, 26, { fontSize: 15, color: C.muted, typeface: FONT_EN });
    });
    box(s, "image-bg", 655, 176, 583, 433, C.panel, C.panel, 7);
    await addImage(s, "yanding_rt_hud_v3_2.png", "image/png", "YANDING RT-HUD V3 official product image", { left: 675, top: 192, width: 543, height: 340 }, "cover");
    textBox(s, "extra", "补充：旋转速度1–5°/s；最大负载10 kg；机械臂工作范围1350 mm。官网简表“25–70°”与技术表/数据表“20–70°”存在冲突。", 675, 546, 543, 58, { fontSize: 15, bold: true, color: C.red });
    addNotes(s, ["https://yanding.com/product/detail?id=1960", "https://yanding.com/upload/products/downloads/2025/09/f_68b9782ede8e81.20112038.pdf"], "行程按官方±值原样呈现；风挡角下限以技术表/数据表20°为高优先级，但列入RFI核实。");
  }

  // 06 Landscape
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "直接竞品：有的给行程，有的给精度，很少同时给", 6);
    const cards = [
      ["远方 HUD-3000", "系统精度/分辨率有数值", "XYZ与3R行程未公开", C.accentPale],
      ["研鼎 RT-HUD V3", "XYZ + Pitch/Yaw/Roll行程完整", "定位精度/重复性未公开", "#E8F1FF"],
      ["鑫信腾 HUD检测设备", "机构定位±0.02 mm", "行程/分辨率/重复性未公开", C.greenPale],
      ["复瞻 FLTS-HUD", "现售页称高精度伺服+反馈", "数值只见于同公司专利实施例", C.amberPale],
      ["ColorSpace HUD", "公开6轴运动平台", "轴行程与精度均无数值", C.panel],
      ["Radiant TT-HUD", "相机+软件测量栈", "不是一体化XYZ机械台架", C.panel],
    ];
    cards.forEach((d, i) => { const col = i % 3, row = Math.floor(i / 3), x = 42 + col * 410, y = 176 + row * 214;
      box(s, `c-${i}`, x, y, 376, 182, d[3], d[3], 7);
      textBox(s, `ct-${i}`, d[0], x + 22, y + 20, 332, 38, { fontSize: 21, bold: true });
      textBox(s, `cb-${i}`, d[1], x + 22, y + 74, 332, 42, { fontSize: 17, bold: true, color: i < 4 ? C.accent2 : C.ink });
      textBox(s, `cf-${i}`, d[2], x + 22, y + 128, 332, 38, { fontSize: 15, color: C.muted });
    });
    textBox(s, "foot", "样本口径：当前在售/官网直接HUD测试方案；鑫信腾数据来自深交所监管披露。", 42, 624, 1196, 30, { fontSize: 16, color: C.muted });
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf", "https://www.fulllightcn.com/product-item-102.html", "https://www.colorspace.com.cn/cs/en/product/hud-display-solution.html", "https://www.radiantvisionsystems.com/products/application-software/tt-hud-head-display-test-module"], "只比较公开证据完整度，不等同于产品实际能力排名。");
  }

  // 07 Travel chart
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "XYZ总行程：现售直接方案仅RT-HUD V3可完整作图", 7);
    textBox(s, "unit", "官方±行程换算为总行程（mm）", 42, 158, 510, 28, { fontSize: 17, color: C.muted });
    s.charts.add("bar", { position: { left: 42, top: 191, width: 704, height: 408 }, categories: ["X", "Y", "Z"],
      series: [{ name: "RT-HUD V3", values: [500, 1500, 160], fill: C.accent2 }],
      barOptions: { direction: "bar", grouping: "clustered", gapWidth: 55 }, hasLegend: false,
      dataLabels: { showValue: true, position: "outEnd", textStyle: { fill: C.ink, fontSize: 16, bold: true } },
      xAxis: { visible: true, min: 0, max: 1600, majorUnit: 400, majorGridlines: { style: "solid", fill: C.panel2, width: 1 }, textStyle: { fill: C.muted, fontSize: 13 } },
      yAxis: { visible: true, line: { style: "solid", fill: C.rule, width: 1 }, textStyle: { fill: C.ink, fontSize: 18, bold: true } },
      chartFill: C.white, chartLine: { style: "solid", fill: C.white, width: 0 }, plotAreaFill: { type: "none" }, plotAreaLine: { style: "solid", fill: C.white, width: 0 } });
    const notes = [["X", "500 mm", "±250 mm"], ["Y", "1500 mm", "±750 mm"], ["Z", "160 mm", "±80 mm"]];
    notes.forEach((d, i) => { const y = 196 + i * 136;
      box(s, `n-${i}`, 796, y, 442, 111, i === 1 ? C.accentPale : C.panel, i === 1 ? C.accent : C.panel, 6);
      textBox(s, `nt-${i}`, d[0], 818, y + 16, 80, 30, { fontSize: 22, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `nv-${i}`, d[1], 900, y + 14, 180, 32, { fontSize: 25, bold: true, typeface: FONT_EN });
      textBox(s, `nb-${i}`, `官方单边范围 ${d[2]}`, 818, y + 61, 360, 30, { fontSize: 15, color: C.muted });
    });
    textBox(s, "foot", "HUD-3000、鑫信腾、FLTS-HUD、ColorSpace未披露可用于同图比较的XYZ行程。", 42, 620, 1196, 28, { fontSize: 15, color: C.muted });
    addNotes(s, ["https://yanding.com/product/detail?id=1960", "https://yanding.com/upload/products/downloads/2025/09/f_68b9782ede8e81.20112038.pdf"], "总行程=2×官方±行程；未把其他厂商图片尺寸或专利尺寸当作现售产品行程。");
  }

  // 08 Direct travel matrix
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "逐轴行程：现售规格与专利实施例必须分开", 8);
    textBox(s, "lede", "“—”表示公开资料未给数值；“5°*”按专利原文保留，未擅自解释为±5°。", 42, 158, 1196, 34, { fontSize: 17, color: C.muted });
    const v = [
      ["方案 / 证据", "X", "Y", "Z", "Pitch", "Yaw", "Roll", "等级"],
      ["HUD-3000 现售", "—", "—", "—", "—", "—", "—", "A"],
      ["RT-HUD V3 现售", "±250 mm", "±750 mm", "±80 mm", "±5°", "±5°", "±5°", "A"],
      ["鑫信腾 HUD设备", "—", "—", "—", "—", "—", "—", "A"],
      ["FLTS-HUD 现售", "—", "—", "—", "—", "—", "—", "A"],
      ["复瞻专利实施例", "200 mm", "400 mm", "400 mm", "5°*", "5°*", "—", "C"],
      ["ColorSpace HUD", "无数值", "无数值", "无数值", "无数值", "无数值", "无数值", "A"],
      ["Radiant TT-HUD", "外配", "外配", "外配", "外配", "外配", "外配", "A"],
    ];
    const t = s.tables.add({ rows: v.length, columns: v[0].length, left: 42, top: 205, width: 1196, height: 398,
      columnWidths: [214, 150, 150, 150, 150, 150, 150, 82], values: v });
    styleTable(t, 1, 12);
    [1,2,3].forEach(c => markCell(t, 2, c, "#E8F1FF", C.accent2, true, 13));
    [4,5,6].forEach(c => markCell(t, 2, c, C.accentPale, C.accent2, true, 13));
    for (let c=1;c<=6;c++) markCell(t, 5, c, C.amberPale, C.amber, true, 13);
    textBox(s, "foot", "唯一完整现售包络：X 500 / Y 1500 / Z 160 mm（总行程）+ Pitch/Yaw/Roll ±5°。", 42, 624, 1196, 28, { fontSize: 16, bold: true });
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf", "https://www.fulllightcn.com/product-item-102.html", "https://patents.google.com/patent/CN208239091U/zh", "https://www.colorspace.com.cn/cs/en/product/hud-display-solution.html", "https://www.radiantvisionsystems.com/products/application-software/tt-hud-head-display-test-module"], "专利实施例不等同于FLTS-HUD现售规格；合并单元格以逻辑空白表达无逐轴数值。");
  }

  // 09 Precision matrix
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "精度对比：数值看似接近，定义却不相同", 9);
    const v = [
      ["方案 / 证据", "绝对定位 / 机构", "重复性", "分辨率", "检测 / 测量", "解释"],
      ["HUD-3000", "移动±0.1 mm\n旋转±0.1°", "—", "0.01 mm\n0.01°", "系统级", "未分轴"],
      ["RT-HUD V3", "—", "—", "—", "—", "只给行程"],
      ["鑫信腾 HUD设备", "机构±0.02 mm", "—", "—", "图像±0.05 mm\n旋转±0.1°", "监管披露"],
      ["FLTS-HUD 现售", "—", "—", "—", "—", "定性描述"],
      ["复瞻专利实施例", "X 1 mm\nY/Z 0.5 mm", "—", "—", "对准0.1°", "非产品规格"],
      ["TechnoTeam LMK", "—", "±0.03 mm", "—", "扫描0.1–0.2°", "相邻平台"],
      ["远方 DMS-1500H", "0.2 mm\n旋转0.1°", "≤0.05 mm\n旋转0.05°", "0.01 mm", "—", "相邻产品"],
    ];
    const t = s.tables.add({ rows: v.length, columns: v[0].length, left: 42, top: 176, width: 1196, height: 444,
      columnWidths: [210, 230, 190, 175, 215, 176], values: v });
    styleTable(t, 1, 13);
    markCell(t, 1, 1, C.accentPale, C.accent2, true, 13); markCell(t, 1, 3, C.accentPale, C.accent2, true, 13);
    markCell(t, 3, 1, C.greenPale, C.green, true, 13); markCell(t, 3, 4, C.greenPale, C.green, true, 13);
    [1,4].forEach(c => markCell(t, 5, c, C.amberPale, C.amber, true, 13));
    textBox(s, "foot", "不能把“图像检测±0.05 mm”当作机械轴定位±0.05 mm，也不能把0.01 mm分辨率当成定位精度。", 42, 634, 1196, 28, { fontSize: 16, bold: true, color: C.red });
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf", "https://patents.google.com/patent/CN208239091U/zh", "https://www.technoteam.de/products/display_metrology/lmk_position/index_eng.html", "https://www.everfine.cn/pro_desc_354.html"], "表内保留各来源原始定义，并在解释列标明口径/层级。");
  }

  // 10 Xinxinteng
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "鑫信腾：直接HUD设备中最强的机构精度披露", 10);
    textBox(s, "lede", "深交所监管披露对其汽车HUD检测设备给出了三个可核验数值，但仍没有XYZ行程、分辨率和重复性。", 42, 160, 1196, 54, { fontSize: 23, color: C.muted });
    statCard(s, 42, 257, 376, 286, "±0.02 mm", "机构定位精度", "直接描述机械机构定位，适合作为精度目标参考", true);
    statCard(s, 452, 257, 376, 286, "±0.05 mm", "图像检测精度", "检测算法/测量链指标，不能替代轴定位精度");
    statCard(s, 862, 257, 376, 286, "±0.1°", "旋转检测精度", "是检测精度；未说明旋转轴定位精度与范围");
    box(s, "callout", 42, 596, 1196, 55, C.greenPale, C.greenPale, 5);
    textBox(s, "callout-text", "设计含义：±0.02 mm可作为“目标档”参考，但必须在RFI中追问轴别、全行程、负载、速度、温度与校准基准。", 62, 613, 1156, 28, { fontSize: 18, bold: true });
    addNotes(s, ["https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf", "https://patents.google.com/patent/CN215178522U/zh"], "数值来自监管披露PDF；专利只用于确认设备架构背景，不补推行程或精度。");
  }

  // 11 FullLight patent
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "复瞻：现售页无数值；同公司专利给出一个实施例", 11);
    textBox(s, "lede", "以下为上海复展智能科技的2018年专利实施例，不是FLTS-HUD现售产品数据表。", 42, 158, 1196, 36, { fontSize: 18, bold: true, color: C.red });
    const v = [
      ["轴 / 项目", "行程", "精度", "证据解释"],
      ["X", "20 cm（200 mm）", "1 mm", "专利实施例"],
      ["Y", "40 cm（400 mm）", "0.5 mm", "专利实施例"],
      ["Z", "40 cm（400 mm）", "0.5 mm", "专利实施例"],
      ["水平 / 俯仰旋转", "5°（原文未写±）", "对准0.1°", "未披露重复性与分辨率"],
    ];
    const t = s.tables.add({ rows: v.length, columns: 4, left: 42, top: 222, width: 1196, height: 320,
      columnWidths: [210, 280, 230, 476], values: v }); styleTable(t, 1, 16);
    for (let r=1;r<=4;r++) { markCell(t, r, 1, C.amberPale, C.amber, true, 16); markCell(t, r, 2, C.amberPale, C.amber, true, 16); }
    box(s, "now", 42, 573, 1196, 76, C.panel, C.panel, 5);
    textBox(s, "now-text", "现售FLTS-HUD官网只披露“高精度伺服控制与实时反馈”，未披露XYZ/旋转轴数值。因此专利只能用于架构参考和RFI追问，不能参与现售产品硬排名。", 62, 592, 1156, 42, { fontSize: 17, bold: true });
    addNotes(s, ["https://www.fulllightcn.com/product-item-102.html", "https://patents.google.com/patent/CN208239091U/zh"], "现售官网=A级；专利实施例=C级。二者在页内明确隔离。");
  }

  // 12 Adjacent benchmarks
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "相邻平台补充重复性基准，但不能冒充HUD-3000规格", 12);
    const v = [
      ["来源 / 属性", "线性行程 / 到达", "线性精度", "重复性", "旋转能力 / 精度", "用途"],
      ["TechnoTeam LMK Position\n官方相邻平台", "最大到达：875 mm", "—", "±0.03 mm\n相机安装端", "6关节；扫描典型0.1–0.2°\n最大0.28°@θ60°", "显示计量"],
      ["远方 DMS-1500H\n同厂相邻产品", "左右200 / 前后180 mm", "定位0.2 mm\n可定制", "≤0.05 mm", "样品0–360°；仪器±90°\n精度0.1° / 重复0.05°", "显示测量"],
      ["上海大学采购要求\n买方指标", "未给", "≤±0.1 mm", "—", "分辨率≤0.02°\n精度≤±0.1°", "HUD采购"],
      ["吉利EOL论文\n质量场景", "未给", "机构定位要求±0.2 mm", "—", "—", "产线EOL"],
    ];
    const t = s.tables.add({ rows: v.length, columns: 6, left: 42, top: 176, width: 1196, height: 420,
      columnWidths: [235, 215, 190, 170, 250, 136], values: v }); styleTable(t, 1, 13);
    [2,3,4].forEach(c => markCell(t, 1, c, C.greenPale, C.green, true, 13));
    [2,3,4].forEach(c => markCell(t, 2, c, C.accentPale, C.accent2, true, 13));
    textBox(s, "foot", "可提炼：重复定位≤0.05 mm是可落地基线，±0.03 mm可作为高配目标；但应以本台架载荷和全行程FAT验证。", 42, 620, 1196, 38, { fontSize: 17, bold: true });
    addNotes(s, ["https://www.technoteam.de/products/display_metrology/lmk_position/index_eng.html", "https://www.everfine.cn/pro_desc_354.html", "https://bidding.shu.edu.cn/sy/zbkscg_detail_phone.jsp?fl=A&gglx=KCGG&lx=KCGG&wid=202211050023837056", "https://journals.indexcopernicus.com/api/file/viewByFileId/1826973"], "本页全部为B级相邻/要求证据，明确不回填为HUD-3000或RT-HUD V3产品规格。");
  }

  // 13 Completeness matrix
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "公开证据完整度：缺口集中在重复性与验收条件", 13);
    const v = [
      ["方案", "XYZ行程", "3R行程", "线性精度", "旋转精度", "重复性", "证据"],
      ["HUD-3000", "—", "—", "● 系统级", "● 系统级", "—", "A"],
      ["RT-HUD V3", "● 完整", "● 完整", "—", "—", "—", "A"],
      ["鑫信腾 HUD设备", "—", "—", "● 机构级", "● 检测级", "—", "A"],
      ["FLTS-HUD 现售", "—", "—", "△ 定性", "—", "—", "A"],
      ["复瞻专利实施例", "● 完整", "△ 两轴", "● 实施例", "● 对准", "—", "C"],
      ["ColorSpace HUD", "△ 仅称6轴", "△ 仅称6轴", "—", "—", "—", "A"],
      ["Radiant TT-HUD", "外配", "外配", "外配", "外配", "外配", "A"],
    ];
    const t = s.tables.add({ rows: v.length, columns: 7, left: 42, top: 176, width: 1196, height: 438,
      columnWidths: [235, 170, 160, 185, 180, 150, 116], values: v }); styleTable(t, 1, 14);
    for (let r=1;r<v.length;r++) for (let c=1;c<=5;c++) {
      const val = String(v[r][c]);
      if (val.startsWith("●")) markCell(t, r, c, C.greenPale, C.green, true, 13);
      else if (val.startsWith("△")) markCell(t, r, c, C.amberPale, C.amber, true, 13);
      else if (val === "—" || val === "外配") markCell(t, r, c, C.panel, C.muted, false, 13);
    }
    textBox(s, "legend", "● 有数值或明确披露　△ 定性/局部披露　— 未公开　A/C为证据等级，不是性能等级", 42, 632, 1196, 28, { fontSize: 15, color: C.muted });
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf", "https://www.fulllightcn.com/product-item-102.html", "https://patents.google.com/patent/CN208239091U/zh", "https://www.colorspace.com.cn/cs/en/product/hud-display-solution.html", "https://www.radiantvisionsystems.com/products/application-software/tt-hud-head-display-test-module"], "完整度表示公开可核验程度；不表示厂商未公开的实际能力。");
  }

  // 14 Architecture
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "推荐架构：长行程粗定位 + 光学端精调 + 独立风挡轴", 14);
    textBox(s, "lede", "不要让单一机构同时承担1500 mm长行程、10 kg载荷与高精度3R微调；分层更利于误差预算和校准。", 42, 160, 1196, 46, { fontSize: 22, color: C.muted });
    const cols = [
      ["01", "粗定位 XYZ", "X≥500 / Y≥1500 / Z≥160 mm\n承担大包络与车型切换\n双向全行程补偿"],
      ["02", "光学端 3R 精调", "Pitch/Yaw/Roll≥±5°\n旋转中心靠近光瞳/相机\n减少阿贝误差"],
      ["03", "独立风挡轴", "覆盖20–70°\n与相机姿态解耦\n夹具刚度与角度基准独立"],
      ["04", "计量与追溯", "激光干涉仪/标尺校准\n电子水平仪/自准直仪\n坐标、载荷、温度随报告留档"],
    ];
    cols.forEach((d, i) => { const x = 42 + i * 299;
      box(s, `col-${i}`, x, 254, 270, 312, i < 2 ? (i===0?C.accentPale:"#E8F1FF") : C.panel, i===0?C.accent:C.panel, 7);
      textBox(s, `num-${i}`, d[0], x+22, 278, 70, 32, { fontSize: 19, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `title-${i}`, d[1], x+22, 334, 226, 45, { fontSize: 23, bold: true }); addRule(s, x+22, 395, 226, C.rule, 1);
      textBox(s, `body-${i}`, d[2], x+22, 420, 226, 122, { fontSize: 17, color: C.muted, lineSpacing: 1.17 });
    });
    textBox(s, "bottom", "误差预算必须区分：轴定位误差、轴间正交度、夹具挠度、旋转中心偏置、光学标定误差。", 42, 604, 1196, 43, { fontSize: 19, bold: true });
    addNotes(s, ["https://yanding.com/product/detail?id=1960", "https://www.everfine.cn/pro_desc_440.html", "https://www.technoteam.de/products/display_metrology/lmk_position/index_eng.html"], "架构为基于竞品包络与计量原则的本报告建议，不是任何厂商原文。");
  }

  // 15 Targets
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "一期建议：用“验收底线 + 目标档”写入技术规格", 15);
    textBox(s, "lede", "底线确保覆盖公开竞品；目标档用于控制系统误差预算。最终数值需结合最大风挡/HUD包络与额定载荷冻结。", 42, 158, 1196, 38, { fontSize: 17, color: C.muted });
    const v = [
      ["项目", "验收底线", "目标档", "主要依据", "FAT关注点"],
      ["XYZ总行程", "X≥500 / Y≥1500 / Z≥160 mm", "同底线；保留软限位裕量", "RT-HUD V3", "机械限位+有效测量区"],
      ["直线绝对定位", "≤±0.10 mm", "≤±0.05 mm", "HUD-3000 / 鑫信腾", "全行程多点双向"],
      ["直线重复定位", "≤0.05 mm", "≤0.03 mm", "DMS / LMK相邻平台", "双向各≥7次/点"],
      ["直线分辨率", "≤0.01 mm", "≤0.01 mm", "HUD-3000", "指令与反馈分别验证"],
      ["Pitch/Yaw/Roll", "各≥±5°", "各≥±5°", "RT-HUD V3", "旋转中心漂移"],
      ["旋转精度 / 重复", "≤±0.10° / ≤0.05°", "≤±0.05° / ≤0.03°", "HUD-3000 / DMS", "正反向、回差、负载"],
      ["负载 / 风挡", "≥10 kg；20–70°", "按最大工装+30%裕量", "RT-HUD V3", "挠度、角度基准、夹紧重复"],
    ];
    const t = s.tables.add({ rows:v.length, columns:5, left:42, top:208, width:1196, height:420,
      columnWidths:[190,280,260,200,266], values:v }); styleTable(t,1,13);
    for(let r=1;r<v.length;r++) { markCell(t,r,1,"#E8F1FF",C.accent2,true,13); markCell(t,r,2,C.accentPale,C.accent2,true,13); }
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf", "https://www.technoteam.de/products/display_metrology/lmk_position/index_eng.html", "https://www.everfine.cn/pro_desc_354.html"], "目标值为综合证据后的工程建议；不是单一厂商完整公开规格。");
  }

  // 16 RFI/FAT
  {
    const s = deck.slides.add(); s.background.fill = C.white;
    addHeader(s, "下一步：用RFI + FAT把轴系风险前置", 16);
    textBox(s, "lede", "采购前要求供应商以机械图、校准证书和实测数据补齐“每一根轴”的证据。", 42, 158, 1196, 54, { fontSize: 27, bold: true });
    addRule(s, 86, 344, 1088, C.ink, 2);
    const steps = [
      ["1", "坐标与边界冻结", "X/Y/Z与3R正方向\n最大风挡/HUD包络\n载荷、线缆与安全区"],
      ["2", "供应商RFI", "逐轴行程/速度/加速度\n绝对精度/重复性/分辨率\n正交度、回差、校准条件"],
      ["3", "FAT + 整机MSA", "全行程多点双向验证\n空载/额载/温漂/跨日复现\n光学标准件交叉验证"],
    ];
    steps.forEach((d,i)=>{ const x=86+i*398;
      box(s,`dot-${i}`,x,333,22,22,i===1?C.accent2:C.ink,i===1?C.accent2:C.ink,11);
      textBox(s,`step-${i}`,d[0],x-4,278,44,34,{fontSize:21,bold:true,color:C.accent2,typeface:FONT_EN});
      textBox(s,`st-${i}`,d[1],x,392,328,42,{fontSize:23,bold:true});
      textBox(s,`sb-${i}`,d[2],x,450,328,112,{fontSize:17,color:C.muted,lineSpacing:1.18});
    });
    box(s,"callout",42,606,1196,54,C.accentPale,C.accentPale,5);
    textBox(s,"callout-text","定点门槛：行程、绝对精度、重复性、分辨率、负载与校准方法六项均有逐轴证据，且完成额载FAT。",62,619,1156,30,{fontSize:18,bold:true});
    addNotes(s, ["https://www.everfine.cn/pro_desc_440.html", "https://yanding.com/product/detail?id=1960", "https://reportdocs.static.szse.cn/UpFiles/rasinfodisc1/202309/RAS_202309_376DA7AF628D429D904AC1051DACB21C.pdf"], "RFI/FAT流程为本报告建议；测试点数量、速度与环境条件需在项目边界冻结后细化。");
  }

  for (const [i, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    await writeBlob(path.join(RENDER_DIR, `${stem}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(RENDER_DIR, `${stem}.layout.json`), await layout.text());
  }
  await writeBlob(path.join(RENDER_DIR, "montage.webp"), await deck.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(deck); await pptx.save(OUT);
  console.log(OUT);
}
main().catch((error)=>{ console.error(error); process.exitCode=1; });

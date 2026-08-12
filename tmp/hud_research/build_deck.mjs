import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const OUT = path.resolve("D:/CHATGPT_file/else thing/tmp/hud_research/HUD_testbench_competitive_research_2026-07-26.pptx");
const RENDER_DIR = path.resolve("D:/CHATGPT_file/else thing/tmp/hud_research/rendered");
const ASSET_DIR = path.resolve("D:/CHATGPT_file/else thing/tmp/hud_research");

const C = {
  ink: "#111318",
  muted: "#5D6573",
  panel: "#F1F3F5",
  panel2: "#E7EAEE",
  rule: "#B8BCC4",
  accent: "#00A7C4",
  accent2: "#2F74FF",
  accentPale: "#DFF6FA",
  green: "#2B8A6E",
  amber: "#C47A12",
  red: "#C54B4B",
  white: "#FFFFFF",
};

const FONT = "Microsoft YaHei";
const FONT_EN = "Arial";

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function box(slide, name, left, top, width, height, fill = C.panel, lineFill = fill, radius = 0) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name,
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: lineFill, width: lineFill === fill ? 0 : 1 },
    borderRadius: radius || undefined,
  });
}

function textBox(slide, name, text, left, top, width, height, opts = {}) {
  const sh = slide.shapes.add({
    geometry: "textbox",
    name,
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  sh.text = text;
  sh.text.style = {
    fontSize: opts.fontSize ?? 20,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.alignment ?? "left",
    verticalAlignment: opts.verticalAlignment ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
    wrap: opts.wrap ?? "square",
    typeface: opts.typeface ?? FONT,
    lineSpacing: opts.lineSpacing,
    insets: opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return sh;
}

function addRule(slide, left, top, width, color = C.rule, weight = 1) {
  slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function addHeader(slide, title, slideNo, eyebrow = "HUD TEST BENCH / COMPETITIVE RESEARCH") {
  textBox(slide, `eyebrow-${slideNo}`, eyebrow, 42, 30, 760, 26, {
    fontSize: 14,
    bold: true,
    color: C.accent,
    typeface: FONT_EN,
  });
  textBox(slide, `title-${slideNo}`, title, 42, 62, 1150, 74, {
    fontSize: 38,
    bold: true,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addRule(slide, 42, 143, 1196, C.rule, 1);
  textBox(slide, `page-${slideNo}`, String(slideNo).padStart(2, "0"), 1183, 675, 55, 18, {
    fontSize: 12,
    alignment: "right",
    color: C.muted,
    typeface: FONT_EN,
  });
}

function addNotes(slide, urls, method = "") {
  const lines = ["[Sources]", ...urls.map((u) => `- ${u}`)];
  if (method) lines.push("", `[Method] ${method}`);
  slide.speakerNotes.textFrame.setText(lines.join("\n"));
  slide.speakerNotes.setVisible(true);
}

async function addImage(slide, fileName, contentType, name, pos, fit = "contain") {
  const p = path.join(ASSET_DIR, fileName);
  const bytes = await fs.readFile(p);
  slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType,
    name,
    alt: name,
    fit,
    position: pos,
  });
}

function styleTable(table, headerRows = 1, bodyFont = 15) {
  table.borders.assign({ style: "solid", fill: C.rule, width: 1 });
  const rows = table.rows.length;
  const cols = table.columns.length;
  table.cells.block({ row: 0, column: 0, rowCount: headerRows, columnCount: cols }).assign({
    fill: C.ink,
    textStyle: { fontSize: bodyFont, bold: true, color: C.white, typeface: FONT },
    margins: { top: 7, bottom: 7, left: 8, right: 8 },
    anchor: "middle",
  });
  if (rows > headerRows) {
    table.cells.block({ row: headerRows, column: 0, rowCount: rows - headerRows, columnCount: cols }).assign({
      textStyle: { fontSize: bodyFont, color: C.ink, typeface: FONT },
      margins: { top: 6, bottom: 6, left: 8, right: 8 },
      anchor: "middle",
    });
  }
  for (let r = headerRows; r < rows; r += 2) {
    table.cells.block({ row: r, column: 0, rowCount: 1, columnCount: cols }).fill = "#F7F8F9";
  }
}

function markCell(table, row, col, fill, color = C.ink, bold = true) {
  const cell = table.getCell(row, col);
  cell.fill = fill;
  cell.text.style = { fontSize: 15, bold, color, typeface: FONT };
}

async function main() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(RENDER_DIR, { recursive: true });

  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 01 — cover, adapted from Codex Grid slide 02.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    textBox(s, "cover-kicker", "第一部分｜竞品调研", 42, 36, 520, 44, {
      fontSize: 22,
      bold: true,
      color: C.accent,
    });
    textBox(s, "cover-date", "2026.07.26", 963, 36, 275, 44, {
      fontSize: 22,
      alignment: "right",
      color: C.muted,
      typeface: FONT_EN,
    });
    box(s, "cover-accent", 42, 136, 112, 7, C.accent, C.accent);
    textBox(s, "cover-title", "HUD测试台架\n策划报告", 42, 177, 920, 270, {
      fontSize: 76,
      bold: true,
      color: C.ink,
      autoFit: "none",
      lineSpacing: 0.94,
    });
    textBox(s, "cover-subtitle", "远方光电 HUD-3000 与同类方案对比\n重点：XYZ及转动轴的行程、精度与参数公开度", 42, 500, 850, 106, {
      fontSize: 25,
      color: C.muted,
      lineSpacing: 1.15,
    });
    textBox(s, "cover-scope", "研发验证 / 质量实验室 / 台架立项", 920, 565, 318, 62, {
      fontSize: 18,
      alignment: "right",
      color: C.ink,
      bold: true,
    });
    addNotes(s, [], "封面不包含外部事实性主张。");
  }

  // 02 — executive summary.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "核心结论：公开参数不足以直接完成选型", 2);
    textBox(s, "s2-lede", "五个同类方案均覆盖HUD核心光学测试，但运动平台披露口径明显不一致。", 42, 165, 1196, 54, {
      fontSize: 24,
      color: C.muted,
    });
    const xs = [42, 452, 862];
    const stats = [
      ["1 / 5", "完整公开XYZ行程", "研鼎 RT-HUD V3"],
      ["1 / 5", "公开直线移动数值精度", "远方 HUD-3000（系统级）"],
      ["0 / 5", "同时公开逐轴行程与逐轴精度", "当前公开资料无法闭环"],
    ];
    stats.forEach((d, i) => {
      box(s, `s2-panel-${i}`, xs[i], 257, 376, 286, i === 2 ? C.accentPale : C.panel, i === 2 ? C.accent : C.panel, 8);
      textBox(s, `s2-stat-${i}`, d[0], xs[i] + 28, 285, 320, 92, {
        fontSize: 54,
        bold: true,
        color: i === 2 ? C.accent2 : C.ink,
        typeface: FONT_EN,
      });
      textBox(s, `s2-head-${i}`, d[1], xs[i] + 28, 396, 320, 58, {
        fontSize: 23,
        bold: true,
        color: C.ink,
      });
      textBox(s, `s2-foot-${i}`, d[2], xs[i] + 28, 476, 320, 44, {
        fontSize: 16,
        color: C.muted,
      });
    });
    textBox(s, "s2-bottom", "选型建议：把“绝对定位精度、双向重复定位精度、轴间正交度、负载下精度”写入RFI与验收条款。", 42, 596, 1196, 46, {
      fontSize: 21,
      bold: true,
      color: C.ink,
    });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://www.radiantvisionsystems.com/zh-hans/node/174",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
    ], "统计按2026-07-26可访问的公开厂商页面；未公开不等于不具备能力。");
  }

  // 03 — framework.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "对比口径先统一，否则XYZ数字会误导", 3);
    const items = [
      ["01", "运动平台", "XYZ直线轴、旋转轴、挡风玻璃调节；区分行程、分辨率、精度与重复性。"],
      ["02", "光学测量", "FOV、VID、Eye-box、亮度/色度、对比度、MTF、畸变与重影。"],
      ["03", "自动化软件", "运动控制、测试序列、自动分析、判定、报告与历史数据管理。"],
      ["04", "系统集成", "风挡/HUD夹具、左/右驾兼容、太阳光模拟、电气与CAN测试、仪器开放性。"],
    ];
    const ys = [176, 286, 396, 506];
    items.forEach((it, i) => {
      textBox(s, `s3-num-${i}`, it[0], 42, ys[i], 72, 54, { fontSize: 28, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `s3-title-${i}`, it[1], 132, ys[i], 218, 54, { fontSize: 25, bold: true });
      textBox(s, `s3-body-${i}`, it[2], 386, ys[i], 852, 62, { fontSize: 19, color: C.muted });
      if (i < items.length - 1) addRule(s, 42, ys[i] + 78, 1196, C.panel2, 1);
    });
    box(s, "s3-caveat", 386, 620, 852, 36, C.accentPale, C.accentPale, 3);
    textBox(s, "s3-caveat-text", "轴命名保留厂商原文；采购前必须用机械图确认X/Y/Z实际方向及零点。", 402, 626, 820, 26, { fontSize: 16, bold: true, color: C.ink });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
    ], "比较维度由各厂商公开功能与运动平台参数归一化形成。");
  }

  // 04 — HUD-3000 profile, half text/half image.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "HUD-3000优势在测量闭环，短板在轴参数披露", 4);
    textBox(s, "s4-name", "远方光电\nHUD-3000", 42, 176, 430, 86, { fontSize: 35, bold: true, lineSpacing: 0.95 });
    textBox(s, "s4-desc", "集成成像彩色亮度计、多维运动平台、HUD治具、风挡支架与专业分析软件，面向研发、质检与生产。", 42, 280, 520, 100, { fontSize: 19, color: C.muted, lineSpacing: 1.12 });
    const specs = [
      ["2–15 m", "虚像测量距离"],
      ["22°×16°", "测量视场角"],
      ["0.01 mm", "移动分辨率"],
      ["±0.1 mm", "移动精度（系统级）"],
    ];
    specs.forEach((sp, i) => {
      const x = 42 + (i % 2) * 270;
      const y = 408 + Math.floor(i / 2) * 108;
      textBox(s, `s4-v-${i}`, sp[0], x, y, 240, 44, { fontSize: 29, bold: true, color: i >= 2 ? C.accent2 : C.ink, typeface: FONT_EN });
      textBox(s, `s4-l-${i}`, sp[1], x, y + 47, 240, 28, { fontSize: 15, color: C.muted });
    });
    box(s, "s4-image-bg", 655, 176, 583, 433, C.panel, C.panel, 7);
    await addImage(s, "everfine_hud3000.png", "image/png", "EVERFINE HUD-3000 official product image", { left: 685, top: 205, width: 525, height: 335 }, "contain");
    textBox(s, "s4-gap", "公开缺口：X/Y/Z各轴行程、逐轴精度、重复定位精度、轴间正交度与负载条件。", 685, 551, 525, 45, { fontSize: 16, bold: true, color: C.red });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://bidding.shu.edu.cn/sy/zbkscg_detail_phone.jsp?fl=A&gglx=KCGG&lx=KCGG&wid=202211050023837056",
    ], "产品图来自远方光电官网。上海大学采购页用于交叉核对±0.1 mm系统移动精度口径，不作为逐轴行程证据。");
  }

  // 05 — competitor landscape.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "竞品分成“整机台架”与“测量栈”两类", 5);
    // Left half: product images.
    box(s, "s5-y-bg", 42, 176, 382, 280, C.panel, C.panel, 6);
    await addImage(s, "yanding_rt_hud_v3_2.png", "image/png", "YANDING RT-HUD V3 official product image", { left: 60, top: 190, width: 346, height: 220 }, "cover");
    textBox(s, "s5-y-title", "研鼎 RT-HUD V3", 60, 420, 346, 30, { fontSize: 19, bold: true });
    box(s, "s5-f-bg", 442, 176, 382, 280, C.panel, C.panel, 6);
    await addImage(s, "fulllight_hud.jpg", "image/jpeg", "FullLight FLTS-HUD official product image", { left: 460, top: 190, width: 346, height: 220 }, "cover");
    textBox(s, "s5-f-title", "复瞻 FLTS-HUD", 460, 420, 346, 30, { fontSize: 19, bold: true });
    // Right rail: software/solution vendors.
    textBox(s, "s5-right-title", "方案型竞品", 862, 176, 376, 38, { fontSize: 24, bold: true });
    addRule(s, 862, 227, 376, C.ink, 2);
    textBox(s, "s5-radiant", "Radiant TT-HUD\n16MP+成像亮/色度计与软件测试栈；公开页未定义XYZ台架。", 862, 252, 376, 102, { fontSize: 19, bold: true });
    textBox(s, "s5-color", "ColorSpace HUD方案\n6轴移动平台 + 风挡调节 + 太阳光模拟；轴数值未公开。", 862, 386, 376, 102, { fontSize: 19, bold: true });
    addRule(s, 42, 488, 782, C.rule, 1);
    textBox(s, "s5-y-body", "公开行程最完整：X ±250 / Y ±750 / Z ±80 mm；挡风玻璃25°–70°。", 42, 506, 382, 91, { fontSize: 17, color: C.muted });
    textBox(s, "s5-f-body", "强调高精度伺服与实时反馈，同时覆盖光学和电气测试；未公开行程与精度数值。", 442, 506, 382, 91, { fontSize: 17, color: C.muted });
    box(s, "s5-bottom", 862, 526, 376, 82, C.accentPale, C.accentPale, 5);
    textBox(s, "s5-bottom-text", "选型含义：不能把软件模块的能力，直接等同于整机台架的运动能力。", 882, 545, 336, 48, { fontSize: 17, bold: true });
    addNotes(s, [
      "https://yanding.com/product/detail?id=1960",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://www.radiantvisionsystems.com/zh-hans/node/174",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
    ], "研鼎与复瞻图片来自各自官网；研鼎图片保留官方原图的透明/抠图边缘。");
  }

  // 06 — XYZ travel chart.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "XYZ行程：只有RT-HUD V3公开了完整数值", 6);
    textBox(s, "s6-unit", "公开总行程（mm）", 42, 158, 510, 28, { fontSize: 17, color: C.muted });
    s.charts.add("bar", {
      position: { left: 42, top: 191, width: 704, height: 408 },
      categories: ["X", "Y", "Z"],
      series: [{ name: "RT-HUD V3", values: [500, 1500, 160], fill: C.accent2 }],
      barOptions: { direction: "bar", grouping: "clustered", gapWidth: 55 },
      hasLegend: false,
      dataLabels: { showValue: true, position: "outEnd", textStyle: { fill: C.ink, fontSize: 16, bold: true } },
      xAxis: { visible: true, min: 0, max: 1600, majorUnit: 400, majorGridlines: { style: "solid", fill: C.panel2, width: 1 }, textStyle: { fill: C.muted, fontSize: 13 } },
      yAxis: { visible: true, line: { style: "solid", fill: C.rule, width: 1 }, textStyle: { fill: C.ink, fontSize: 18, bold: true } },
      chartFill: C.white,
      chartLine: { style: "solid", fill: C.white, width: 0 },
      plotAreaFill: { type: "none" },
      plotAreaLine: { style: "solid", fill: C.white, width: 0 },
    });
    const notes = [
      ["HUD-3000", "行程未公开", "精度±0.1 mm、分辨率0.01 mm为系统级"],
      ["FLTS-HUD / ColorSpace", "行程未公开", "分别披露伺服控制 / 6轴能力，无数值"],
      ["Radiant TT-HUD", "不适用", "公开产品定位为相机+软件测量栈"],
    ];
    notes.forEach((d, i) => {
      const y = 196 + i * 136;
      box(s, `s6-n-${i}`, 796, y, 442, 111, i === 0 ? C.accentPale : C.panel, i === 0 ? C.accent : C.panel, 6);
      textBox(s, `s6-n-title-${i}`, d[0], 818, y + 16, 395, 28, { fontSize: 20, bold: true });
      textBox(s, `s6-n-val-${i}`, d[1], 818, y + 49, 164, 28, { fontSize: 18, bold: true, color: i === 0 ? C.red : C.muted });
      textBox(s, `s6-n-body-${i}`, d[2], 984, y + 47, 228, 50, { fontSize: 14, color: C.muted });
    });
    textBox(s, "s6-foot", "注：RT-HUD原文为±行程；图中换算为总行程。", 42, 620, 704, 28, { fontSize: 14, color: C.muted });
    addNotes(s, [
      "https://yanding.com/product/detail?id=1960",
      "https://www.everfine.cn/pro_desc_440.html",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
      "https://www.radiantvisionsystems.com/zh-hans/node/174",
    ], "RT-HUD V3总行程按2×±行程换算：X 500、Y 1500、Z 160 mm。");
  }

  // 07 — detailed axis matrix.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "逐轴对比：公开资料仍缺少精度闭环", 7);
    textBox(s, "s7-lede", "数值均按厂商公开页面；“未公开”不是能力判定，而是RFI必须补齐的证据项。", 42, 158, 1196, 36, { fontSize: 18, color: C.muted });
    const values = [
      ["产品 / 方案", "X行程", "Y行程", "Z行程", "直线精度 / 分辨率", "转动轴"],
      ["HUD-3000", "未公开", "未公开", "未公开", "±0.1 mm / 0.01 mm\n（系统级，不分轴）", "±0.1° / 0.01°\n（系统级）"],
      ["RT-HUD V3", "±250 mm", "±750 mm", "±80 mm", "未公开", "玻璃25°–70°\n精度未公开"],
      ["FLTS-HUD", "未公开", "未公开", "未公开", "高精度伺服\n数值未公开", "未公开"],
      ["ColorSpace HUD", "未公开", "未公开", "未公开", "未公开", "6轴平台\n数值未公开"],
      ["Radiant TT-HUD", "不适用", "不适用", "不适用", "需外配运动台", "需外配运动台"],
    ];
    const table = s.tables.add({
      rows: values.length,
      columns: values[0].length,
      left: 42,
      top: 210,
      width: 1196,
      height: 394,
      columnWidths: [205, 135, 135, 135, 300, 286],
      values,
    });
    styleTable(table, 1, 15);
    markCell(table, 1, 4, C.accentPale, C.accent2, true);
    markCell(table, 1, 5, C.accentPale, C.accent2, true);
    markCell(table, 2, 1, "#E8F1FF", C.accent2, true);
    markCell(table, 2, 2, "#E8F1FF", C.accent2, true);
    markCell(table, 2, 3, "#E8F1FF", C.accent2, true);
    textBox(s, "s7-foot", "采购判断：HUD-3000与RT-HUD V3呈“精度有数、行程无数”与“行程有数、精度无数”的互补缺口。", 42, 624, 1196, 34, { fontSize: 18, bold: true, color: C.ink });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
      "https://www.radiantvisionsystems.com/zh-hans/node/174",
    ], "矩阵只列出厂商公开数值；不从图片尺寸、专利结构或第三方转述反推轴参数。");
  }

  // 08 — capability matrix.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "功能覆盖相近，差异集中在平台与集成边界", 8);
    const values = [
      ["公开能力", "HUD-3000", "RT-HUD V3", "FLTS-HUD", "ColorSpace", "TT-HUD"],
      ["亮度 / 色度 / 均匀性", "●", "●", "●", "●", "●"],
      ["VID / FOV / 虚像尺寸", "●", "●", "●", "●", "●"],
      ["Eye-box", "●", "●", "● 自动标定", "○", "○"],
      ["MTF / 畸变 / 重影", "●", "●", "●", "●", "●"],
      ["风挡角度调节", "●", "● 25°–70°", "●", "●", "—"],
      ["自动报告 / 序列", "●", "● RIQA", "●", "●", "● TrueTest"],
      ["电气 / CAN测试", "未见公开", "未见公开", "●", "未见公开", "—"],
      ["太阳光 / 强光场景", "未见公开", "未见公开", "未见公开", "●", "需外配"],
    ];
    const table = s.tables.add({
      rows: values.length,
      columns: values[0].length,
      left: 42,
      top: 176,
      width: 1196,
      height: 438,
      columnWidths: [260, 185, 205, 190, 180, 176],
      values,
    });
    styleTable(table, 1, 15);
    for (let r = 1; r < values.length; r++) {
      for (let c = 1; c < values[0].length; c++) {
        const v = String(values[r][c]);
        if (v.startsWith("●")) markCell(table, r, c, "#E6F5F0", C.green, true);
        else if (v.startsWith("○") || v.includes("需外配")) markCell(table, r, c, "#FFF4DE", C.amber, true);
        else if (v === "—" || v.includes("未见公开")) markCell(table, r, c, "#F1F2F4", C.muted, false);
      }
    }
    textBox(s, "s8-legend", "● 厂商明确披露　○ 公开描述有限/需确认　— 产品边界外或未集成", 42, 632, 1196, 28, { fontSize: 15, color: C.muted });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
      "https://www.radiantvisionsystems.com/zh-hans/node/174",
      "https://www.konicaminolta.com.cn/instruments/solution/automotive/hud/index.html",
    ], "能力标记代表公开页面明确度，不代表实验室实测性能优劣。");
  }

  // 09 — architecture implications.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "自建台架应把运动精度与光学精度解耦验收", 9);
    textBox(s, "s9-lede", "竞品对比显示：光学项目清单趋同，真正决定可复现性的，是坐标链、夹具链与校准链。", 42, 160, 1196, 46, { fontSize: 23, color: C.muted });
    const cols = [
      ["01", "运动与坐标", "XYZ + 旋转轴\n绝对精度/重复性\n正交度与负载"],
      ["02", "光学测量", "成像亮/色度计\nVID/FOV/Eye-box\nMTF/畸变/重影"],
      ["03", "被测件与风挡", "左/右驾可换型\n风挡角度与定位\nHUD治具基准"],
      ["04", "软件与追溯", "自动序列与判定\n坐标/仪器校准\n报告与版本追踪"],
    ];
    cols.forEach((d, i) => {
      const x = 42 + i * 299;
      box(s, `s9-col-${i}`, x, 254, 270, 312, i === 0 ? C.accentPale : C.panel, i === 0 ? C.accent : C.panel, 7);
      textBox(s, `s9-num-${i}`, d[0], x + 22, 278, 70, 32, { fontSize: 19, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `s9-title-${i}`, d[1], x + 22, 334, 226, 45, { fontSize: 24, bold: true });
      addRule(s, x + 22, 395, 226, i === 0 ? C.accent : C.rule, 1);
      textBox(s, `s9-body-${i}`, d[2], x + 22, 420, 226, 118, { fontSize: 18, color: C.muted, lineSpacing: 1.18 });
    });
    textBox(s, "s9-bottom", "原则：运动平台FAT合格 ≠ HUD测量系统合格；必须再做整机光学MSA与跨日复现性。", 42, 604, 1196, 43, { fontSize: 20, bold: true, color: C.ink });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
    ], "架构建议为基于竞品公开信息的工程归纳，不是厂商原文。");
  }

  // 10 — proposed target specification.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "一期建议指标：覆盖公开最宽行程，并补齐精度定义", 10);
    textBox(s, "s10-lede", "以下为立项基线，不是任何单一竞品的完整公开规格；需结合最大风挡、眼盒与相机载荷复核。", 42, 158, 1196, 38, { fontSize: 18, color: C.muted });
    const values = [
      ["轴 / 项目", "建议一期目标", "依据", "验收重点"],
      ["X直线轴", "总行程 ≥500 mm\n精度 ≤±0.1 mm", "对齐RT-HUD公开行程\n对齐HUD-3000系统精度", "全行程多点双向测量"],
      ["Y直线轴", "总行程 ≥1500 mm\n精度 ≤±0.1 mm", "覆盖公开最大纵向范围", "直线度、俯仰/偏摆误差"],
      ["Z直线轴", "总行程 ≥160 mm\n精度 ≤±0.1 mm", "覆盖公开Z范围", "负载下精度与回差"],
      ["重复定位", "≤±0.05 mm（建议）", "给系统误差留50%裕量", "双向重复，≥7次/点"],
      ["直线分辨率", "≤0.01 mm", "对齐HUD-3000公开值", "指令分辨率≠反馈分辨率"],
      ["风挡/旋转轴", "25°–70°；精度≤±0.1°\n分辨率≤0.01°", "对齐RT-HUD角度范围\n对齐HUD-3000精度", "角度基准、回差、夹具挠度"],
    ];
    const table = s.tables.add({
      rows: values.length,
      columns: values[0].length,
      left: 42,
      top: 212,
      width: 1196,
      height: 406,
      columnWidths: [190, 310, 330, 366],
      values,
    });
    styleTable(table, 1, 15);
    for (let r = 1; r <= 3; r++) markCell(table, r, 1, "#E8F1FF", C.accent2, true);
    markCell(table, 4, 1, "#FFF4DE", C.amber, true);
    textBox(s, "s10-foot", "最终指标应同时写明：负载、速度、环境温度、测量基准、置信水平与校准周期。", 42, 634, 1196, 28, { fontSize: 16, bold: true });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://bidding.shu.edu.cn/sy/zbkscg_detail_phone.jsp?fl=A&gglx=KCGG&lx=KCGG&wid=202211050023837056",
    ], "建议行程取RT-HUD V3公开总行程；±0.1 mm与0.01 mm取HUD-3000公开系统级参数；±0.05 mm重复定位为本报告建议的工程裕量。");
  }

  // 11 — close / RFI plan, adapted from Codex Grid timeline slide 17.
  {
    const s = deck.slides.add();
    s.background.fill = C.white;
    addHeader(s, "下一步：用一次RFI把选型风险前置", 11);
    textBox(s, "s11-lede", "先补齐轴数据，再决定采购整机、模块集成或自研运动平台。", 42, 158, 1196, 54, { fontSize: 28, bold: true });
    addRule(s, 86, 344, 1088, C.ink, 2);
    const steps = [
      ["1", "坐标与边界冻结", "最大风挡/HUD包络\n左/右驾与载荷\nX/Y/Z方向定义"],
      ["2", "供应商RFI", "逐轴行程/速度\n精度/重复性/正交度\n校准证书与条件"],
      ["3", "FAT + 整机MSA", "运动轴多点双向验证\n光学标准件交叉验证\n跨日复现与报告追溯"],
    ];
    steps.forEach((d, i) => {
      const x = 86 + i * 398;
      box(s, `s11-dot-${i}`, x, 333, 22, 22, i === 1 ? C.accent2 : C.ink, i === 1 ? C.accent2 : C.ink, 11);
      textBox(s, `s11-step-${i}`, d[0], x - 4, 278, 44, 34, { fontSize: 21, bold: true, color: C.accent2, typeface: FONT_EN });
      textBox(s, `s11-title-${i}`, d[1], x, 392, 328, 42, { fontSize: 23, bold: true });
      textBox(s, `s11-body-${i}`, d[2], x, 450, 328, 112, { fontSize: 17, color: C.muted, lineSpacing: 1.18 });
    });
    box(s, "s11-callout", 42, 606, 1196, 54, C.accentPale, C.accentPale, 5);
    textBox(s, "s11-callout-text", "决策门：只有在“行程、精度、重复性、负载、校准方法”五项均有证据后，才进入方案定点。", 62, 619, 1156, 30, { fontSize: 19, bold: true, color: C.ink });
    addNotes(s, [
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/product/detail?id=1960",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://colorspace.com.cn/cs/cn/product/hud-display-solution.html",
      "https://www.radiantvisionsystems.com/zh-hans/node/174",
    ], "RFI与验收流程为本报告建议。");
  }

  // Render every slide and export layout JSON for QA.
  for (const [i, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    await writeBlob(path.join(RENDER_DIR, `${stem}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(RENDER_DIR, `${stem}.layout.json`), await layout.text());
  }
  await writeBlob(path.join(RENDER_DIR, "montage.webp"), await deck.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

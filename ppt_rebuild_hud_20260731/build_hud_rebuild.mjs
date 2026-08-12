import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = String.raw`D:\CHATGPT_file\else thing\HUD测试台架方案设计_完善版.pptx`;
const BUILD_DIR = String.raw`D:\CHATGPT_file\else thing\ppt_rebuild_hud_20260731`;
const RENDER_DIR = path.join(BUILD_DIR, "render");
const FONT = "Microsoft YaHei";
const MATH_FONT = "Cambria Math";
const W = 1600;
const H = 900;

const C = {
  ink: "#0B0B0D",
  muted: "#6F737A",
  soft: "#F3F4F6",
  line: "#D8DADF",
  red: "#E52B2C",
  redDark: "#BE1238",
  coral: "#FF6B63",
  pink: "#FF9A93",
  blue: "#4479C7",
  blueSoft: "#EAF2FF",
  yellow: "#FFF7D6",
  greenSoft: "#E7F2DB",
  white: "#FFFFFF",
};

const assetPaths = {
  stage: String.raw`C:\Users\admin\AppData\Local\Temp\codex-clipboard-5769d97a-7c6b-4778-bd76-f76c9358a11a.png`,
  robot: String.raw`C:\Users\admin\AppData\Local\Temp\codex-clipboard-acdf67f5-9d60-449d-9d05-944ea5920054.png`,
  charuco: String.raw`C:\Users\admin\AppData\Local\Temp\codex-clipboard-b85774ca-58e4-4b6e-a7d9-781f566f249b.png`,
  rig: String.raw`C:\Users\admin\AppData\Local\Temp\codex-clipboard-e6fbe13b-51da-4e7b-9d22-05053f5d0c1f.png`,
};

async function readBytes(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return undefined;
  }
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function addBox(slide, position, fill = "transparent", line = noLine(), name) {
  return slide.shapes.add({
    geometry: "rect",
    name,
    position,
    fill,
    line,
  });
}

function addText(slide, value, position, style = {}, name) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: noLine(),
  });
  shape.text = value;
  shape.text.style = {
    typeface: style.typeface ?? FONT,
    fontSize: style.fontSize ?? 26,
    bold: style.bold ?? false,
    color: style.color ?? C.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    lineSpacing: style.lineSpacing ?? 1.05,
    autoFit: style.autoFit ?? "none",
    wrap: style.wrap ?? "square",
    insets: style.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return shape;
}

function addRichText(slide, paragraphs, position, style = {}, name) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: noLine(),
  });
  shape.text = paragraphs;
  shape.text.style = {
    typeface: style.typeface ?? FONT,
    fontSize: style.fontSize ?? 26,
    color: style.color ?? C.ink,
    lineSpacing: style.lineSpacing ?? 1.08,
    autoFit: style.autoFit ?? "none",
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return shape;
}

function addRule(slide) {
  addBox(slide, { left: 80, top: 139, width: 1420, height: 3 }, C.ink);
}

function addTitle(slide, title, kicker) {
  if (kicker) {
    addText(slide, kicker, { left: 82, top: 34, width: 520, height: 26 }, {
      fontSize: 16,
      bold: true,
      color: C.red,
    });
  }
  addText(slide, title, { left: 80, top: kicker ? 56 : 62, width: 1420, height: 74 }, {
    fontSize: 56,
    bold: true,
    color: C.ink,
    autoFit: "shrinkText",
  }, "slide-title");
  addRule(slide);
}

function addFooter(slide) {
  slide.shapes.add({
    geometry: "ellipse",
    position: { left: 80, top: 853, width: 18, height: 18 },
    fill: C.ink,
    line: noLine(),
  });
  addText(slide, "Chief Tech", { left: 108, top: 850, width: 170, height: 26 }, {
    fontSize: 18,
    bold: true,
    color: C.ink,
    verticalAlignment: "middle",
  });
  addText(slide, "Confidential and Proprietary Materials  |  Chief Tech All Rights Reserved", {
    left: 450,
    top: 852,
    width: 700,
    height: 24,
  }, {
    fontSize: 16,
    color: "#B6B9BE",
    alignment: "center",
    verticalAlignment: "middle",
  });
}

function addNotes(slide, lines = []) {
  slide.speakerNotes.textFrame.setText([
    "[Sources]",
    ...lines.map((line) => `- ${line}`),
  ].join("\n"));
  slide.speakerNotes.setVisible(true);
}

function addSectionLabel(slide, value, x, y, width = 290, color = C.blue) {
  addBox(slide, { left: x, top: y + 4, width: 8, height: 30 }, color);
  addText(slide, value, { left: x + 20, top: y, width, height: 38 }, {
    fontSize: 25,
    bold: true,
    color,
    verticalAlignment: "middle",
  });
}

function addBulletList(slide, items, position, style = {}) {
  const rows = items.map((item) => ({
    bulletCharacter: "•",
    marginLeft: 28,
    indent: -14,
    spaceAfter: style.spaceAfter ?? 12,
    runs: Array.isArray(item) ? item : [item],
  }));
  return addRichText(slide, rows, position, {
    fontSize: style.fontSize ?? 26,
    lineSpacing: style.lineSpacing ?? 1.05,
  });
}

function addTable(slide, values, position, columnWidths, options = {}) {
  const table = slide.tables.add({
    rows: values.length,
    columns: values[0].length,
    left: position.left,
    top: position.top,
    width: position.width,
    height: position.height,
    values,
    columnWidths,
  });
  table.borders.assign({ style: "solid", fill: options.border ?? "#AEB1B7", width: 1 });
  for (let r = 0; r < values.length; r += 1) {
    if (table.rows?.[r]) table.rows[r].height = options.rowHeights?.[r] ?? position.height / values.length;
    for (let c = 0; c < values[0].length; c += 1) {
      const cell = table.getCell(r, c);
      const header = r === 0;
      cell.fill = header ? (options.headerFill ?? "#F2F2F2") : (r % 2 === 0 ? "#FAFAFA" : C.white);
      cell.text.style = {
        typeface: FONT,
        fontSize: header ? (options.headerFontSize ?? 21) : (options.fontSize ?? 20),
        bold: header,
        color: header ? C.ink : (options.bodyColor ?? C.ink),
        alignment: c === 0 ? "left" : "center",
        verticalAlignment: "middle",
        autoFit: "shrinkText",
        insets: { left: 8, right: 8, top: 4, bottom: 4 },
      };
    }
  }
  return table;
}

function addImage(slide, bytes, alt, position, crop) {
  if (!bytes) return undefined;
  return slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit: "cover",
    position,
    ...(crop ? { crop } : {}),
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
}

function setBackground(slide) {
  slide.background.fill = C.white;
}

function addPageBase(slide, title, kicker) {
  setBackground(slide);
  addTitle(slide, title, kicker);
  addFooter(slide);
}

function addNumberedStep(slide, index, title, body, x, y, accent = C.blue) {
  slide.shapes.add({
    geometry: "ellipse",
    position: { left: x, top: y, width: 46, height: 46 },
    fill: accent,
    line: noLine(),
  });
  addText(slide, String(index), { left: x, top: y + 3, width: 46, height: 38 }, {
    fontSize: 25,
    bold: true,
    color: C.white,
    alignment: "center",
    verticalAlignment: "middle",
  });
  addText(slide, title, { left: x + 64, top: y - 1, width: 250, height: 34 }, {
    fontSize: 24,
    bold: true,
    color: C.ink,
  });
  addText(slide, body, { left: x + 64, top: y + 34, width: 258, height: 66 }, {
    fontSize: 18,
    color: C.muted,
    lineSpacing: 1.08,
    autoFit: "shrinkText",
  });
}

async function buildDeck() {
  await fs.mkdir(RENDER_DIR, { recursive: true });
  const [stage, robot, charuco, rig] = await Promise.all([
    readBytes(assetPaths.stage),
    readBytes(assetPaths.robot),
    readBytes(assetPaths.charuco),
    readBytes(assetPaths.rig),
  ]);

  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Cover
  {
    const slide = deck.slides.add();
    slide.background.fill = "linear(135deg, #D91F2A 0%, #E52B2C 46%, #FF766D 100%)";
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: -230, top: -250, width: 1750, height: 720, rotation: 9 },
      fill: "linear(0deg, #A8123A/92 0%, #E52B2C/10 100%)",
      line: noLine(),
    });
    slide.shapes.add({
      geometry: "roundRect",
      position: { left: 960, top: 245, width: 930, height: 560, rotation: -24 },
      fill: "#FF8B83/66",
      line: noLine(),
      borderRadius: "rounded-3xl",
    });
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: 1120, top: -230, width: 830, height: 560 },
      fill: "#B30E3A/68",
      line: noLine(),
    });
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: 104, top: 156, width: 76, height: 76 },
      fill: C.white,
      line: noLine(),
    });
    addText(slide, "C", { left: 104, top: 160, width: 76, height: 66 }, {
      fontSize: 48,
      bold: true,
      color: C.red,
      alignment: "center",
      verticalAlignment: "middle",
    });
    addText(slide, "Chief Tech", { left: 205, top: 147, width: 520, height: 92 }, {
      fontSize: 68,
      bold: true,
      color: C.white,
      verticalAlignment: "middle",
    });
    addText(slide, "HUD测试台架方案设计", { left: 240, top: 394, width: 1120, height: 106 }, {
      fontSize: 76,
      bold: true,
      color: C.white,
      alignment: "center",
      verticalAlignment: "middle",
      autoFit: "shrinkText",
    });
    addText(slide, "评审稿｜六自由度定位 · 双目几何测量 · 亮色度测试", {
      left: 330,
      top: 530,
      width: 940,
      height: 50,
    }, {
      fontSize: 26,
      color: C.white,
      alignment: "center",
      verticalAlignment: "middle",
    });
    addText(slide, "2026.7.31", { left: 1030, top: 676, width: 260, height: 40 }, {
      fontSize: 27,
      color: C.white,
      alignment: "center",
      verticalAlignment: "middle",
    });
    addText(slide, "Confidential and Proprietary Materials  |  Chief Tech All Rights Reserved", {
      left: 440,
      top: 850,
      width: 720,
      height: 24,
    }, {
      fontSize: 16,
      color: "#FFFFFF/75",
      alignment: "center",
      verticalAlignment: "middle",
    });
    addNotes(slide, ["User-provided cover screenshot; rebuilt as editable cover artwork."]);
  }

  // 2. Recommendation
  {
    const slide = deck.slides.add();
    addPageBase(slide, "方案结论", "RECOMMENDATION");
    addBox(slide, { left: 80, top: 188, width: 18, height: 500 }, C.red);
    addText(slide, "一期推荐采用\n六轴精密位移台 + 双目成像系统\n+ 亮 / 色度测量单元 + 自动化软件", {
      left: 132,
      top: 204,
      width: 760,
      height: 196,
    }, {
      fontSize: 40,
      bold: true,
      color: C.ink,
      lineSpacing: 1.05,
      autoFit: "shrinkText",
    });
    addText(slide, "优先保证末端位姿的可追溯性与重复性；六轴机器人保留为大空间扫描和后续扩展方案。", {
      left: 132,
      top: 438,
      width: 720,
      height: 86,
    }, {
      fontSize: 26,
      color: C.muted,
      lineSpacing: 1.15,
    });
    addSectionLabel(slide, "推荐架构", 960, 208, 260, C.blue);
    const rightSteps = [
      ["几何定位", "六轴精密位移台\nXYZ + Ry / Rz，Rx 作为调平轴"],
      ["图像测量", "双目相机完成特征、视线与几何关系计算"],
      ["光学测量", "成像亮色度计 / 点式仪器按测试项分工"],
      ["数据闭环", "位姿、图像、HUD 状态统一时间戳并归档"],
    ];
    rightSteps.forEach((item, i) => addNumberedStep(slide, i + 1, item[0], item[1], 970, 280 + i * 110, i === 0 ? C.red : C.blue));
    addNotes(slide, ["User-provided requirements and option-comparison screenshots."]);
  }

  // 3. Contents
  {
    const slide = deck.slides.add();
    setBackground(slide);
    addText(slide, "目录 Content", { left: 80, top: 66, width: 620, height: 88 }, {
      fontSize: 58,
      bold: true,
      color: C.ink,
    });
    addBox(slide, { left: 82, top: 150, width: 240, height: 3 }, C.ink);
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: 1128, top: -176, width: 730, height: 700 },
      fill: "linear(0deg, #B20F3D 0%, #E52B2C 100%)",
      line: noLine(),
    });
    slide.shapes.add({
      geometry: "roundRect",
      position: { left: 1244, top: 135, width: 540, height: 390, rotation: -32 },
      fill: "#FF817B/68",
      line: noLine(),
      borderRadius: "rounded-3xl",
    });
    const contents = [
      ["01", "行业调研与测试需求"],
      ["02", "运动平台与系统选型"],
      ["03", "标定、对准与指标计算"],
      ["04", "验证、风险与实施计划"],
    ];
    contents.forEach((item, i) => {
      addText(slide, item[0], { left: 315, top: 230 + i * 102, width: 86, height: 52 }, {
        fontSize: 30,
        bold: true,
        color: C.red,
        verticalAlignment: "middle",
      });
      addText(slide, item[1], { left: 422, top: 224 + i * 102, width: 490, height: 64 }, {
        fontSize: 34,
        color: C.ink,
        verticalAlignment: "middle",
      });
      addBox(slide, { left: 315, top: 291 + i * 102, width: 592, height: 1 }, C.line);
    });
    addFooter(slide);
    addNotes(slide, ["User-provided content slide; content organization refined for the rebuilt deck."]);
  }

  // 4. Benchmarking
  {
    const slide = deck.slides.add();
    addPageBase(slide, "行业方案表明：多自由度调节与可追溯精度是共同能力", "BENCHMARK");
    addText(slide, "公开信息仅用于能力边界参考；未公开参数不作为性能结论。", {
      left: 82,
      top: 174,
      width: 760,
      height: 38,
    }, { fontSize: 23, color: C.muted });
    const values = [
      ["方案 / 产品", "公开行程 / 调节", "公开精度信息", "对本方案的启示"],
      ["远方光电 HUD-3000", "未公开", "系统级 ±0.1 mm / 0.01 mm；\n±0.1° / 0.01°", "精度应区分分辨率、重复性与绝对精度"],
      ["研鼎 RT-HUD V3", "X ±250 mm；Y ±750 mm；Z ±80 mm", "未公开；玻璃 25°–70°", "大行程与玻璃姿态调节是基本需求"],
      ["复瞻 FTS-HUD", "未公开", "高精度伺服；数值未公开", "定制夹具和自动化扫描通常成套提供"],
      ["正印科技 ColorSpace HUD", "未公开", "玻璃 25°–67° 可调；数值未公开", "测量单元与运动单元需要协同规划"],
    ];
    const table = addTable(slide, values, { left: 80, top: 236, width: 1420, height: 390 }, [310, 330, 340, 440], {
      headerFill: "#F0F0F0",
      headerFontSize: 21,
      fontSize: 20,
      rowHeights: [62, 82, 82, 82, 82],
    });
    table.getCell(1, 2).fill = C.yellow;
    table.getCell(2, 1).fill = C.greenSoft;
    addText(slide, "结论：台架设计需把“自动多自由度定位、视觉 / 光度分工、定制夹具、数据可追溯”作为一体化能力建设。", {
      left: 102,
      top: 676,
      width: 1360,
      height: 48,
    }, { fontSize: 27, bold: true, color: C.blue, alignment: "center", verticalAlignment: "middle" });
    addNotes(slide, [
      "User-provided benchmark slide.",
      "https://www.everfine.cn/pro_desc_440.html",
      "https://yanding.com/upload/products/downloads/2025/09/f_68b9782ede8e81.20112038.pdf",
      "https://www.fulllightcn.com/product-item-102.html",
      "https://yanding.com/product/detail?id=1960",
    ]);
  }

  // 5. Test scope
  {
    const slide = deck.slides.add();
    addPageBase(slide, "测试需求决定必须具备 XYZ + Ry + Rz", "TEST SCOPE");
    addSectionLabel(slide, "测试项目分类", 100, 185, 280, C.blue);
    addBox(slide, { left: 102, top: 244, width: 700, height: 350 }, C.soft, { style: "solid", fill: C.line, width: 1 });
    addText(slide, "几何与视场", { left: 136, top: 274, width: 210, height: 34 }, { fontSize: 27, bold: true, color: C.blue });
    addText(slide, "视场角｜下视角｜左视角｜VID｜眼盒尺寸｜倾斜角｜静态畸变｜双目视差", {
      left: 136, top: 320, width: 608, height: 74,
    }, { fontSize: 23, color: C.ink, lineSpacing: 1.12 });
    addText(slide, "成像与光学", { left: 136, top: 416, width: 210, height: 34 }, { fontSize: 27, bold: true, color: C.red });
    addText(slide, "亮度｜均匀性｜对比度｜色饱和度｜色温｜杂散光｜重影｜串扰｜AR 贴合度", {
      left: 136, top: 462, width: 608, height: 74,
    }, { fontSize: 23, color: C.ink, lineSpacing: 1.12 });
    addText(slide, "每一项需冻结：标准来源、工况、采样点、传感器、算法与判定限值。", {
      left: 102,
      top: 620,
      width: 700,
      height: 44,
    }, { fontSize: 24, bold: true, color: C.muted, alignment: "center" });
    addSectionLabel(slide, "运动能力拆解", 920, 185, 300, C.red);
    const axes = [
      ["X / Y / Z", "眼点与眼盒扫描；适配车型、风挡和驾驶员身高", C.blue],
      ["Ry", "下视角与垂直光轴对准", C.red],
      ["Rz", "安装坐标校准、偏角与角亮度测试", C.red],
      ["Rx", "水平光轴调平；可由手动微调承担", C.muted],
    ];
    axes.forEach((a, i) => {
      addBox(slide, { left: 930, top: 250 + i * 105, width: 474, height: 82 }, C.white, { style: "solid", fill: C.line, width: 1 });
      addText(slide, a[0], { left: 956, top: 265 + i * 105, width: 126, height: 46 }, { fontSize: 29, bold: true, color: a[2], verticalAlignment: "middle" });
      addText(slide, a[1], { left: 1087, top: 263 + i * 105, width: 292, height: 54 }, { fontSize: 20, color: C.ink, verticalAlignment: "middle", autoFit: "shrinkText" });
    });
    addNotes(slide, ["User-provided test-item and axis-requirement slides; reorganized by measurement family and movement requirement."]);
  }

  // 6. Motion targets
  {
    const slide = deck.slides.add();
    addPageBase(slide, "建议以“目标行程 + 重复性 + 绝对位姿”定义运动指标", "MOTION TARGETS");
    const values = [
      ["轴", "主要用途", "建议行程 / 范围", "重复定位目标", "备注"],
      ["X", "左右眼点、眼盒宽度扫描", "≥ 500 mm", "≤ 0.02 mm", "总行程需明确"],
      ["Y", "眼点前后、不同风挡 / 车型适配", "≥ 500 mm", "≤ 0.02 mm", "总行程需明确"],
      ["Z", "驾驶员身高、眼盒高度扫描", "≥ 600 mm", "≤ 0.02 mm", "总行程需明确"],
      ["Rx", "水平光轴调平", "≥ ±15°", "≤ 0.01°", "可采用手动微调"],
      ["Ry", "下视角、垂直光轴对准", "≥ ±30°", "≤ 0.01°", "必配"],
      ["Rz", "安装校准、偏角 / 角亮度测试", "≥ ±30°", "≤ 0.01°", "必配"],
    ];
    const table = addTable(slide, values, { left: 80, top: 205, width: 1420, height: 420 }, [120, 470, 250, 260, 320], {
      headerFill: "#F0F0F0",
      headerFontSize: 21,
      fontSize: 21,
      rowHeights: [58, 60, 60, 60, 60, 60, 60],
    });
    for (let r = 1; r <= 6; r += 1) {
      table.getCell(r, 2).text.style = { typeface: FONT, fontSize: 23, bold: true, color: C.blue, alignment: "center", verticalAlignment: "middle" };
      table.getCell(r, 3).text.style = { typeface: FONT, fontSize: 22, bold: true, color: C.blue, alignment: "center", verticalAlignment: "middle" };
    }
    addBox(slide, { left: 80, top: 664, width: 1420, height: 84 }, C.blueSoft, { style: "solid", fill: "#C8D8F4", width: 1 });
    addText(slide, "补充验收：末端负载 ≥10 kg；补偿后绝对位姿精度建议 ≤0.10 mm / 0.05°。\n“编码器分辨率”“重复定位精度”“绝对位姿精度”必须分别写入规格与验收方法。", {
      left: 115,
      top: 680,
      width: 1350,
      height: 56,
    }, { fontSize: 25, bold: true, color: C.ink, alignment: "center", verticalAlignment: "middle", autoFit: "shrinkText" });
    addNotes(slide, ["User-provided motion-axis travel and precision table; terminology clarified for review and acceptance."]);
  }

  // 7. Motion choice
  {
    const slide = deck.slides.add();
    addPageBase(slide, "一期以六轴精密位移台为主，机器人作为扩展路径", "MOTION SELECTION");
    addBox(slide, { left: 80, top: 190, width: 670, height: 420 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addBox(slide, { left: 850, top: 190, width: 670, height: 420 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addText(slide, "方案 A｜六轴精密位移台", { left: 116, top: 218, width: 525, height: 43 }, { fontSize: 32, bold: true, color: C.blue });
    addText(slide, "方案 B｜六轴机器人", { left: 886, top: 218, width: 410, height: 43 }, { fontSize: 32, bold: true, color: C.red });
    const platformPoints = [
      ["精度与刚度", "适合精密测量与重复性验证"],
      ["定制与可溯源", "行程、夹具和运动学关系可随台架冻结"],
      ["采购边界", "参考价格 2–3 万元起；最终以供应商方案为准"],
    ];
    platformPoints.forEach((p, i) => {
      addBox(slide, { left: 118, top: 292 + i * 104, width: 590, height: 76 }, i === 0 ? C.blueSoft : C.soft, { style: "solid", fill: C.line, width: 1 });
      addText(slide, p[0], { left: 142, top: 308 + i * 104, width: 180, height: 34 }, { fontSize: 24, bold: true, color: C.blue, verticalAlignment: "middle" });
      addText(slide, p[1], { left: 332, top: 304 + i * 104, width: 340, height: 42 }, { fontSize: 20, color: C.ink, verticalAlignment: "middle", autoFit: "shrinkText" });
    });
    const robotPoints = [
      ["灵活工作空间", "适合大范围扫描与后续扩展"],
      ["计量前提", "重复定位精度不等于绝对位姿精度，需要外部标定与补偿"],
      ["参考能力", "原始资料：10 kg 负载、0.05 mm 重复定位"],
    ];
    robotPoints.forEach((p, i) => {
      addBox(slide, { left: 888, top: 292 + i * 104, width: 590, height: 76 }, i === 0 ? "#FFF5F3" : C.soft, { style: "solid", fill: C.line, width: 1 });
      addText(slide, p[0], { left: 912, top: 308 + i * 104, width: 180, height: 34 }, { fontSize: 24, bold: true, color: C.red, verticalAlignment: "middle" });
      addText(slide, p[1], { left: 1102, top: 298 + i * 104, width: 340, height: 54 }, { fontSize: 20, color: C.ink, verticalAlignment: "middle", autoFit: "shrinkText" });
    });
    addBox(slide, { left: 190, top: 640, width: 1220, height: 78 }, "#FFF5F3", { style: "solid", fill: "#FFC8C4", width: 1 });
    addText(slide, "决策建议：一期采用精密位移台；\n当测试空间或自动路径需求扩大时，再评估机器人扩展。", {
      left: 225,
      top: 651,
      width: 1150,
      height: 56,
    }, { fontSize: 23, bold: true, color: C.red, alignment: "center", verticalAlignment: "middle", lineSpacing: 1.05 });
    addNotes(slide, ["User-provided six-axis displacement-stage and robot option slides; vendor claims/quotation require confirmation."]);
  }

  // 8. System and coordinate architecture
  {
    const slide = deck.slides.add();
    addPageBase(slide, "系统架构以统一坐标系和同步数据为主线", "SYSTEM ARCHITECTURE");
    const arrowYs = 334;
    [420, 710, 1000].forEach((x) => {
      slide.shapes.add({ geometry: "rightArrow", position: { left: x, top: arrowYs, width: 92, height: 46 }, fill: C.red, line: noLine() });
    });
    const nodes = [
      ["HUD / 风挡 / 夹具", "DUT 参考基准\n与装夹状态", 100, C.ink],
      ["双目相机 + 光度单元", "特征、视线、图像\n与亮 / 色度数据", 520, C.blue],
      ["六轴精密位移台", "位姿运动与\n实时反馈", 810, C.red],
      ["控制与分析软件", "同步、计算、\n报告与追溯", 1100, C.ink],
    ];
    nodes.forEach((n) => {
      addBox(slide, { left: n[2], top: 252, width: 300, height: 210 }, C.white, { style: "solid", fill: n[3], width: 2 });
      addText(slide, n[0], { left: n[2] + 20, top: 280, width: 260, height: 46 }, { fontSize: 26, bold: true, color: n[3], alignment: "center", verticalAlignment: "middle", autoFit: "shrinkText" });
      addText(slide, n[1], { left: n[2] + 28, top: 343, width: 244, height: 72 }, { fontSize: 21, color: C.ink, alignment: "center", verticalAlignment: "middle", lineSpacing: 1.10 });
    });
    addBox(slide, { left: 160, top: 565, width: 1280, height: 112 }, C.blueSoft, { style: "solid", fill: "#C8D8F4", width: 1 });
    addText(slide, "坐标定义", { left: 195, top: 587, width: 168, height: 32 }, { fontSize: 24, bold: true, color: C.blue });
    addText(slide, "B：平台基座    G：移动台    Cₗ / Cᵣ：左右相机    T：标定板    W：客户 / 车辆测试基准", {
      left: 380,
      top: 587,
      width: 990,
      height: 32,
    }, { fontSize: 23, color: C.ink, verticalAlignment: "middle" });
    addText(slide, "测量参考点以相机光心 / 入瞳为准，而不是机械法兰或 CMOS 平面；图像、平台位姿、HUD 状态必须统一触发或统一时间戳。", {
      left: 195,
      top: 630,
      width: 1170,
      height: 30,
    }, { fontSize: 21, bold: true, color: C.muted, alignment: "center" });
    addNotes(slide, ["User-provided system requirements and optical-alignment notes; coordinate symbols standardized for the rebuilt deck."]);
  }

  // 9. Automated process
  {
    const slide = deck.slides.add();
    addPageBase(slide, "自动化测试把“手动找点”变成可回放、可追溯的流程", "AUTOMATED TEST FLOW");
    const xs = [100, 382, 664, 946, 1228];
    const titles = ["回零与夹具确认", "标定与基准对齐", "同步采集", "自动扫描", "计算与归档"];
    const subs = [
      "锁定风挡 / HUD\n装夹基准和焦距状态",
      "相机、光度单元、\n平台和眼点基准一致",
      "图像、位姿、HUD 状态\n同步触发 / 时间戳",
      "按配方扫描眼盒、\n视场与角度工况",
      "输出指标、原始数据、\n算法版本与报告",
    ];
    [295, 577, 859, 1141].forEach((x) => {
      slide.shapes.add({ geometry: "rightArrow", position: { left: x, top: 355, width: 70, height: 42 }, fill: C.red, line: noLine() });
    });
    xs.forEach((x, i) => {
      slide.shapes.add({ geometry: "ellipse", position: { left: x + 88, top: 244, width: 56, height: 56 }, fill: i === 0 ? C.red : C.blue, line: noLine() });
      addText(slide, String(i + 1), { left: x + 88, top: 248, width: 56, height: 46 }, { fontSize: 28, bold: true, color: C.white, alignment: "center", verticalAlignment: "middle" });
      addBox(slide, { left: x, top: 322, width: 232, height: 196 }, C.white, { style: "solid", fill: C.line, width: 1 });
      addText(slide, titles[i], { left: x + 18, top: 348, width: 196, height: 48 }, { fontSize: 24, bold: true, color: C.ink, alignment: "center", verticalAlignment: "middle", autoFit: "shrinkText" });
      addText(slide, subs[i], { left: x + 18, top: 414, width: 196, height: 66 }, { fontSize: 19, color: C.muted, alignment: "center", verticalAlignment: "middle", lineSpacing: 1.10, autoFit: "shrinkText" });
    });
    addBox(slide, { left: 180, top: 602, width: 1240, height: 70 }, "#FFF5F3", { style: "solid", fill: "#FFC8C4", width: 1 });
    addText(slide, "所有报告应关联：DUT 与夹具版本、平台配方、标定版本、原始图像、环境条件与操作者信息。", {
      left: 220,
      top: 617,
      width: 1160,
      height: 42,
    }, { fontSize: 25, bold: true, color: C.red, alignment: "center", verticalAlignment: "middle" });
    addNotes(slide, ["User-provided manual-to-automatic test-plan slide; expanded into an auditable automated workflow."]);
  }

  // 10. Camera calibration
  {
    const slide = deck.slides.add();
    addPageBase(slide, "单目与双目标定先建立可靠的图像几何关系", "CAMERA CALIBRATION");
    addBox(slide, { left: 94, top: 230, width: 310, height: 340 }, C.blueSoft, { style: "solid", fill: "#C8D8F4", width: 1 });
    addText(slide, "推荐标定板", { left: 116, top: 270, width: 266, height: 34 }, { fontSize: 22, bold: true, color: C.blue, alignment: "center" });
    addText(slide, "ChArUco\n/ AprilGrid", { left: 116, top: 330, width: 266, height: 96 }, { fontSize: 34, bold: true, color: C.ink, alignment: "center", verticalAlignment: "middle", lineSpacing: 1.0 });
    addBox(slide, { left: 126, top: 465, width: 246, height: 54 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addText(slide, "部分可见仍可识别", { left: 138, top: 477, width: 222, height: 28 }, { fontSize: 19, bold: true, color: C.blue, alignment: "center", verticalAlignment: "middle" });
    addText(slide, "标定板规格、表面处理与采购尺寸需在 P1 前冻结。", { left: 82, top: 596, width: 334, height: 45 }, { fontSize: 19, color: C.muted, alignment: "center", autoFit: "shrinkText" });
    addBox(slide, { left: 470, top: 205, width: 470, height: 470 }, C.soft, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "1｜单目标定", 510, 238, 250, C.blue);
    addText(slide, "估计每个相机的内参 K 与畸变 D；\n后续以去畸变后的图像参与特征、视线和重投影计算。", { left: 510, top: 300, width: 380, height: 80 }, { fontSize: 23, color: C.ink, lineSpacing: 1.12 });
    addText(slide, "p̃  ~  K [R | t] P̃", { left: 532, top: 420, width: 350, height: 55 }, { fontSize: 34, typeface: MATH_FONT, color: C.ink, alignment: "center", verticalAlignment: "middle" });
    addText(slide, "输出：Kₗ、Dₗ、Kᵣ、Dᵣ；\n记录重投影误差与图像覆盖率。", { left: 510, top: 530, width: 385, height: 76 }, { fontSize: 22, bold: true, color: C.blue, alignment: "center", lineSpacing: 1.10 });
    addBox(slide, { left: 1000, top: 205, width: 500, height: 470 }, C.soft, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "2｜双目标定", 1040, 238, 250, C.red);
    addText(slide, "估计左右相机相对位姿，并以极线约束完成校正。\n“极线约束”不是“极化约束”。", { left: 1040, top: 300, width: 405, height: 80 }, { fontSize: 23, color: C.ink, lineSpacing: 1.12 });
    addText(slide, "pᵣ  =  Rᵣₗ pₗ  +  tᵣₗ", { left: 1052, top: 420, width: 390, height: 55 }, { fontSize: 31, typeface: MATH_FONT, color: C.ink, alignment: "center", verticalAlignment: "middle" });
    addText(slide, "输出：Rᵣₗ、tᵣₗ、基线、校正矩阵和纵向视差残差。", { left: 1040, top: 530, width: 405, height: 76 }, { fontSize: 22, bold: true, color: C.red, alignment: "center", lineSpacing: 1.10 });
    addText(slide, "OpenCvSharp：CalibrateCamera · StereoCalibrate · StereoRectify · UndistortPoints", { left: 310, top: 734, width: 980, height: 32 }, { fontSize: 21, bold: true, color: C.muted, alignment: "center" });
    addNotes(slide, ["User-provided calibration-board reference and calibration slides.", "OpenCV camera calibration / 3D reconstruction API semantics used for technical wording."]);
  }

  // 11. Hand-eye calibration
  {
    const slide = deck.slides.add();
    addPageBase(slide, "手眼标定将相机三维点连接到平台基座坐标系", "HAND–EYE CALIBRATION");
    addBox(slide, { left: 90, top: 210, width: 790, height: 420 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "固定标定板、相机随平台运动", 130, 244, 430, C.blue);
    addText(slide, "每一组姿态满足：", { left: 136, top: 322, width: 260, height: 38 }, { fontSize: 24, color: C.ink });
    addText(slide, "ᴮTᴳᵢ · ᴳTᶜ · ᶜTᵀᵢ  =  ᴮTᵀ", { left: 160, top: 374, width: 650, height: 58 }, { fontSize: 35, typeface: MATH_FONT, bold: true, color: C.ink, alignment: "center", verticalAlignment: "middle" });
    addText(slide, "相对运动写为 AX = XB，求得固定变换 ᴳTᶜ。", { left: 136, top: 468, width: 690, height: 36 }, { fontSize: 25, bold: true, color: C.red, alignment: "center" });
    addText(slide, "在线三维点转换：", { left: 136, top: 530, width: 235, height: 30 }, { fontSize: 23, color: C.ink });
    addText(slide, "ᴮp  =  ᴮTᴳ · ᴳTᶜ · ᶜp", { left: 362, top: 522, width: 360, height: 44 }, { fontSize: 29, typeface: MATH_FONT, color: C.blue, bold: true, alignment: "center" });
    addBox(slide, { left: 950, top: 210, width: 550, height: 420 }, "#FFF5F3", { style: "solid", fill: "#FFC8C4", width: 1 });
    addSectionLabel(slide, "采集与验证要求", 990, 244, 350, C.red);
    const handEyeChecks = [
      ["01", "采集 15–30 组同步位姿；必须包含多个方向的显著旋转。"],
      ["02", "SolvePnP：target → camera；CalibrateHandEye：camera → gripper。"],
      ["03", "统一使用 mm（或 m）作为平移单位；不要混用平台和标定板单位。"],
      ["04", "以标定板在基座坐标下的离散、已知点误差和闭环重投影验证。"],
    ];
    handEyeChecks.forEach((item, i) => {
      const y = 314 + i * 63;
      addText(slide, item[0], { left: 995, top: y + 2, width: 36, height: 28 }, { fontSize: 18, bold: true, color: C.red, alignment: "center", verticalAlignment: "middle" });
      addText(slide, item[1], { left: 1042, top: y, width: 388, height: 52 }, { fontSize: 18, color: C.ink, verticalAlignment: "middle", lineSpacing: 1.04, autoFit: "shrinkText" });
    });
    addText(slide, "世界坐标说明：若定义 B = W，则平台基座就是世界坐标；否则需额外建立 ᵂTᴮ。", {
      left: 155,
      top: 697,
      width: 1280,
      height: 42,
    }, { fontSize: 26, bold: true, color: C.blue, alignment: "center", verticalAlignment: "middle" });
    addText(slide, "OpenCvSharp：SolvePnP · Rodrigues · CalibrateHandEye", { left: 420, top: 750, width: 760, height: 28 }, { fontSize: 21, bold: true, color: C.muted, alignment: "center" });
    addNotes(slide, ["User-provided calibration-method and test-plan slides; coordinate-chain wording completed using standard OpenCV hand-eye semantics."]);
  }

  // 12. Alignment and geometry
  {
    const slide = deck.slides.add();
    addPageBase(slide, "画面对准、光轴对准与眼盒中心需分层处理", "ALIGNMENT AND GEOMETRY");
    addBox(slide, { left: 80, top: 200, width: 700, height: 480 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "画面对准｜特征到视线", 116, 232, 360, C.blue);
    addText(slide, "1. 采集并识别 HUD 十字或稳定特征；先去畸变，再转为相机视线。", { left: 118, top: 296, width: 610, height: 52 }, { fontSize: 23, color: C.ink });
    addText(slide, "α = arctan((u − cₓ) / fₓ)       β = arctan((v − cᵧ) / fᵧ)", { left: 118, top: 370, width: 610, height: 42 }, { fontSize: 26, typeface: MATH_FONT, color: C.ink, alignment: "center" });
    addText(slide, "2. 通过相机外参 / 手眼结果，将视线统一到平台基座坐标。", { left: 118, top: 446, width: 610, height: 52 }, { fontSize: 23, color: C.ink });
    addText(slide, "3. 将误差映射为经标定的六轴修正量；有限 VID 下不能只把左右角度简单平均。", { left: 118, top: 528, width: 610, height: 62 }, { fontSize: 23, bold: true, color: C.red, lineSpacing: 1.10 });
    addBox(slide, { left: 850, top: 200, width: 670, height: 480 }, C.soft, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "光轴与眼盒中心｜两种定位路径", 888, 232, 450, C.red);
    addText(slide, "方法 A｜视觉路径", { left: 892, top: 300, width: 260, height: 34 }, { fontSize: 25, bold: true, color: C.blue });
    addText(slide, "使虚像中心标志与相机成像中心重合，并检查上下 / 左右视场角一致性。双目时以实际基线为准，在中线两侧布置相机。", { left: 892, top: 342, width: 560, height: 96 }, { fontSize: 22, color: C.ink, lineSpacing: 1.10 });
    addText(slide, "方法 B｜三维建模路径", { left: 892, top: 472, width: 290, height: 34 }, { fontSize: 25, bold: true, color: C.red });
    addText(slide, "在物理尺度下建立眼盒中心和世界基准；应以镜头入瞳 / 光心，而不是 CMOS 平面作为相机参考点。", { left: 892, top: 514, width: 560, height: 80 }, { fontSize: 22, color: C.ink, lineSpacing: 1.10 });
    addText(slide, "成像亮色度计可承担图像特征识别；点式色度计只承担其适用的光学测量。", { left: 200, top: 720, width: 1200, height: 34 }, { fontSize: 24, bold: true, color: C.blue, alignment: "center" });
    addNotes(slide, ["User-provided image-alignment and optical-axis alignment slides; finite-VID and sensor-role limitations clarified."]);
  }

  // 13. Validation & risks
  {
    const slide = deck.slides.add();
    addPageBase(slide, "以验证与不确定度管理解决当前台架风险", "VALIDATION AND RISKS");
    addBox(slide, { left: 95, top: 228, width: 480, height: 405 }, C.soft, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "当前主要风险", 132, 258, 250, C.red);
    const risks = [
      ["R1", "风挡 / 夹具", "装夹姿态和重复定位不稳定，会直接放大测试结果离散。"],
      ["R2", "手动运动轴", "双目对准和光轴调整缺乏可回放性，难以复现。"],
      ["R3", "HUD 模组基线", "重复定位暂时可接受，但仍须用数据确认其对总误差的贡献。"],
    ];
    risks.forEach((risk, i) => {
      const y = 326 + i * 88;
      addText(slide, risk[0], { left: 130, top: y, width: 48, height: 28 }, { fontSize: 19, bold: true, color: C.red, alignment: "center", verticalAlignment: "middle" });
      addText(slide, risk[1], { left: 194, top: y - 2, width: 165, height: 28 }, { fontSize: 20, bold: true, color: C.ink, verticalAlignment: "middle" });
      addText(slide, risk[2], { left: 194, top: y + 28, width: 330, height: 46 }, { fontSize: 18, color: C.muted, lineSpacing: 1.06, autoFit: "shrinkText" });
    });
    addBox(slide, { left: 110, top: 667, width: 450, height: 70 }, "#FFF5F3", { style: "solid", fill: "#FFC8C4", width: 1 });
    addText(slide, "先固定夹具基准，再验证平台、相机与算法", { left: 120, top: 686, width: 430, height: 30 }, { fontSize: 21, bold: true, color: C.red, alignment: "center", verticalAlignment: "middle" });
    addBox(slide, { left: 650, top: 225, width: 780, height: 160 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "验证项目", 690, 252, 210, C.blue);
    addBulletList(slide, [
      "单目：重投影误差、覆盖率与焦距稳定性；测试期间不得随意调焦。",
      "双目：校正后的纵向视差、基线稳定性、已知距离误差。",
      "手眼：标定板在基座坐标下的闭环离散、已知点 / 已知角误差。",
    ], { left: 690, top: 303, width: 690, height: 94 }, { fontSize: 19, spaceAfter: 6, lineSpacing: 1.03 });
    addBox(slide, { left: 650, top: 420, width: 780, height: 170 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addSectionLabel(slide, "MSA 与误差预算", 690, 447, 260, C.red);
    addText(slide, "执行 GR&R；误差预算至少包括相机、平台、夹具变形、标定板、同步、环境光和 HUD 光学变化。\n双目可作为非接触几何辅助测量，但不能在未验证相关性的情况下替代专用蓝光扫描。", { left: 690, top: 500, width: 690, height: 66 }, { fontSize: 20, color: C.ink, lineSpacing: 1.08, autoFit: "shrinkText" });
    addBox(slide, { left: 650, top: 625, width: 780, height: 85 }, "#FFF5F3", { style: "solid", fill: "#FFC8C4", width: 1 });
    addText(slide, "解决优先级：夹具定位基准 → 自动化运动 → 标定闭环 → 相关性与 GR&R → 试运行。", { left: 690, top: 646, width: 690, height: 42 }, { fontSize: 25, bold: true, color: C.red, alignment: "center", verticalAlignment: "middle" });
    addNotes(slide, ["User-provided current-problem and solution slides; risk language converted into verifiable engineering actions."]);
  }

  // 14. Implementation and decisions
  {
    const slide = deck.slides.add();
    addPageBase(slide, "实施计划以标准冻结、联调验证和可验收交付为终点", "IMPLEMENTATION");
    const timelineX = [130, 470, 810, 1150];
    const phaseTitles = ["P0｜冻结基线", "P1｜集成准备", "P2｜标定与算法", "P3｜试运行验收"];
    const phaseBodies = [
      "确认标准版本、眼点 / 眼盒定义、VID 基准、指标限值与验收方法。",
      "确定供应商、行程 / 负载、夹具基准、安装图、控制与安全接口。",
      "采购 ChArUco / AprilGrid；完成相机、双目、手眼、对准与自动化配方。",
      "完成相关性、GR&R、重复性、原始数据追溯和试运行报告。",
    ];
    [405, 745, 1085].forEach((x) => slide.shapes.add({ geometry: "rightArrow", position: { left: x, top: 342, width: 55, height: 36 }, fill: C.red, line: noLine() }));
    timelineX.forEach((x, i) => {
      addBox(slide, { left: x, top: 250, width: 280, height: 230 }, C.white, { style: "solid", fill: i === 0 ? C.red : C.blue, width: 2 });
      addText(slide, phaseTitles[i], { left: x + 20, top: 280, width: 240, height: 42 }, { fontSize: 27, bold: true, color: i === 0 ? C.red : C.blue, alignment: "center", verticalAlignment: "middle", autoFit: "shrinkText" });
      addText(slide, phaseBodies[i], { left: x + 24, top: 346, width: 232, height: 100 }, { fontSize: 20, color: C.ink, alignment: "center", verticalAlignment: "middle", lineSpacing: 1.10, autoFit: "shrinkText" });
    });
    addBox(slide, { left: 130, top: 575, width: 1300, height: 132 }, C.blueSoft, { style: "solid", fill: "#C8D8F4", width: 1 });
    addText(slide, "本次评审待决项", { left: 175, top: 600, width: 210, height: 36 }, { fontSize: 26, bold: true, color: C.blue });
    addText(slide, "① 一期平台与供应商路径  ② 行程 / 负载 / 绝对精度验收值  ③ 风挡 / HUD 夹具基准  ④ SDK 与数据接口  ⑤ 标定板采购与试运行样件", {
      left: 395,
      top: 600,
      width: 980,
      height: 40,
    }, { fontSize: 22, bold: true, color: C.ink, verticalAlignment: "middle", autoFit: "shrinkText" });
    addText(slide, "决策完成后，供应商可输出安装图与结构模型；测试软件按“标准—配方—原始数据—报告”的链路实施。", {
      left: 175,
      top: 655,
      width: 1200,
      height: 28,
    }, { fontSize: 20, color: C.muted, alignment: "center" });
    addNotes(slide, ["User-provided installation, other-work, and unresolved-issues slides; converted into an actionable implementation and decision page."]);
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(RENDER_DIR, `${stem}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(RENDER_DIR, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(path.join(RENDER_DIR, "deck-montage.webp"), await deck.export({ format: "webp", montage: true, scale: 0.7 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
  console.log(JSON.stringify({ output: OUT, slides: deck.slides.items.length }));
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

buildDeck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

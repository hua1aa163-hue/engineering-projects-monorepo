import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "D:/CHATGPT_file/else thing/tmp/codex-presentations/hud-test-bench/tmp/HUD_test_bench_design_GBT46926_2025.pptx";
const QA = "D:/CHATGPT_file/else thing/tmp/codex-presentations/hud-test-bench/tmp/qa";
const W = 1280, H = 720;
const C = {
  white: "#FFFFFF", ink: "#000000", muted: "#5E6673", panel: "#EDEDED",
  panel2: "#F6F7F8", rule: "#B8BCC4", blue: "#3D8DFF", sky: "#6DCBF4",
  pale: "#D0EDFA", green: "#15805D", amber: "#C77A11", red: "#C8443A"
};
const FONT = "Microsoft YaHei";
const MONO = "Cascadia Mono";

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, text, x, y, w, h, size=20, opts={}) {
  const sh = slide.shapes.add({
    geometry: "textbox",
    name: opts.name || undefined,
    position: { left:x, top:y, width:w, height:h },
    fill: opts.fill || "none",
    line: { style:"solid", fill:"none", width:0 },
  });
  sh.text = text;
  sh.text.style = {
    fontSize: size,
    typeface: opts.typeface || FONT,
    color: opts.color || C.ink,
    bold: !!opts.bold,
    alignment: opts.align || "left",
    verticalAlignment: opts.valign || "top",
    autoFit: opts.autoFit || "shrinkText",
    wrap: "square",
    insets: opts.insets || { top:0, right:0, bottom:0, left:0 },
  };
  if (opts.rotation) sh.rotation = opts.rotation;
  return sh;
}

function addRect(slide, x,y,w,h, fill=C.panel, opts={}) {
  const geometry = opts.geometry || "roundRect";
  return slide.shapes.add({
    geometry,
    name: opts.name || undefined,
    position: { left:x, top:y, width:w, height:h },
    fill,
    line: { style:opts.dashed ? "dashed" : "solid", fill:opts.line || "none", width:opts.lineWidth ?? 0 },
    borderRadius: geometry === "roundRect" ? "rounded-lg" : undefined,
  });
}

function addLine(slide, x,y,w,h, color=C.rule, width=1.5, opts={}) {
  return slide.shapes.add({
    geometry: "straightConnector1",
    position: { left:x, top:y, width:w, height:h },
    fill: "none",
    line: { style: opts.dashed ? "dashed" : "solid", fill:color, width },
    head: opts.head ? { type:opts.head, width:"med", length:"med" } : undefined,
    tail: opts.tail ? { type:opts.tail, width:"med", length:"med" } : undefined,
  });
}

function title(slide, t, n, source="GB/T 46926—2025") {
  addText(slide, t, 42, 34, 1150, 74, 40, { bold:true, autoFit:"shrinkText" });
  addText(slide, String(n).padStart(2,"0"), 1180, 660, 58, 22, 13, { align:"right", color:C.muted });
  addText(slide, source, 42, 660, 850, 22, 11, { color:C.muted });
}

function sectionLabel(slide, text, x, y, w=200) {
  addText(slide, text, x,y,w,25, 13, { bold:true, color:C.blue, valign:"middle" });
}

function metric(slide, x,y,w,h, value, label, note="", color=C.blue) {
  addRect(slide,x,y,w,h,C.panel2,{geometry:"rect"});
  addRect(slide,x,y,8,h,color,{geometry:"rect"});
  addText(slide,value,x+24,y+20,w-40,52,34,{bold:true,color});
  addText(slide,label,x+24,y+76,w-40,30,18,{bold:true});
  if(note) addText(slide,note,x+24,y+112,w-40,h-124,14,{color:C.muted});
}

function table(slide, x,y,width, rows, colWidths, opts={}) {
  const total = colWidths.reduce((a,b)=>a+b,0);
  const ws = colWidths.map(v=>width*v/total);
  const rowHeights = opts.rowHeights || rows.map((_,i)=>i===0 ? 42 : 50);
  let cy=y;
  rows.forEach((row,ri)=>{
    let cx=x;
    row.forEach((cell,ci)=>{
      const fill = ri===0 ? (opts.headerFill || C.ink) : (ri%2===0 ? C.panel2 : C.white);
      addRect(slide,cx,cy,ws[ci],rowHeights[ri],fill,{geometry:"rect",line:C.rule,lineWidth:0.8});
      addText(slide,String(cell),cx+10,cy+7,ws[ci]-20,rowHeights[ri]-14,opts.fontSize || 15,{
        color:ri===0 ? C.white : C.ink,
        bold:ri===0 || (opts.boldFirst && ci===0),
        valign:"middle",
        autoFit:"shrinkText"
      });
      cx += ws[ci];
    });
    cy += rowHeights[ri];
  });
  return cy;
}

function bulletList(slide, items, x,y,w, lineH=54, size=18, accent=C.blue) {
  items.forEach((item,i)=>{
    const yy=y+i*lineH;
    addRect(slide,x,yy+8,8,8,accent,{geometry:"ellipse"});
    addText(slide,item,x+22,yy,w-22,lineH-4,size,{autoFit:"shrinkText"});
  });
}

function node(slide, x,y,w,h, head, body, fill=C.panel2, accent=C.blue) {
  const sh=addRect(slide,x,y,w,h,fill,{line:C.rule,lineWidth:1});
  addRect(slide,x,y,w,6,accent,{geometry:"rect"});
  addText(slide,head,x+18,y+18,w-36,30,19,{bold:true});
  addText(slide,body,x+18,y+54,w-36,h-66,15,{color:C.muted});
  return sh;
}

function formula(slide, text, x,y,w,h, note="") {
  addRect(slide,x,y,w,h,C.panel2,{geometry:"rect",line:C.rule,lineWidth:1});
  addText(slide,text,x+18,y+14,w-36,h-(note?44:28),18,{typeface:MONO,bold:true,valign:"middle"});
  if(note) addText(slide,note,x+18,y+h-27,w-36,18,11,{color:C.muted});
}

const p = Presentation.create({slideSize:{width:W,height:H}});

// 1 — cover (Codex Grid cover silhouette)
{
  const s=p.slides.add(); s.background.fill=C.white;
  addText(s,"GB/T 46926—2025",42,42,460,42,22,{bold:true,color:C.blue});
  addText(s,"HUD 双目成像色度计\n六轴测试台架设计方案",42,252,1050,212,62,{bold:true,valign:"bottom",autoFit:"shrinkText"});
  addText(s,"推荐架构：六自由度并联位移台 · 65 mm 双目基线 · 世界坐标/手眼标定 · 自动化判定",42,510,1120,62,23,{color:C.muted});
  addLine(s,42,620,1196,0,C.ink,2);
  addText(s,"概念设计 / 采购技术规格 / 验收方法",42,638,600,24,14,{bold:true});
  addText(s,"2026.07",1080,638,158,24,14,{align:"right",color:C.muted});
}

// 2 — recommendation
{
  const s=p.slides.add(); title(s,"建议一次建设“几何 + 光色 + 环境”三域共用台架",2);
  addText(s,"主测量链以双目成像色度计同步采集虚像，六轴平台在世界坐标系下复现驾驶员眼点与眼盒扫描；辅助模块覆盖温度、太阳倒灌、杂散光、噪声与动态显示。",42,122,1196,66,21,{color:C.muted});
  metric(s,42,230,360,205,"65.000 mm","双目光学中心基线","等效标准中相对眼点左右 ±32.5 mm；基线需溯源标定。",C.blue);
  metric(s,460,230,360,205,"300 × 300 × 200 mm","推荐平移工作空间","X/Y ±150 mm，Z ±100 mm，覆盖眼盒与标定姿态。",C.green);
  metric(s,878,230,360,205,"≤ 0.11 mm","定位链 RSS 目标","含平台、手眼、双目外参与热漂移；角测量 U(k=2) ≤ 0.5′。",C.amber);
  addRect(s,42,480,1196,130,C.panel2,{geometry:"rect"});
  addText(s,"立项结论",64,500,160,32,20,{bold:true,color:C.blue});
  addText(s,"优先选择高精度六自由度并联位移台；若必须覆盖整车多车型，则保留六轴机器人接口，但需外部基准复定位与绝对精度补偿。台架按“条款—画面—位姿—原始图—算法—判定—不确定度”全链路留证。",220,497,985,82,20,{bold:true});
}

// 3 — standards matrix geometry
{
  const s=p.slides.add(); title(s,"几何性能的判定门槛决定了台架的空间与角度能力",3,"GB/T 46926—2025 5.4–5.13, 6.2.5–6.2.14");
  const rows=[
    ["项目","国标要求","核心位姿 / 采集","输出"],
    ["虚像距离","≥ 2 m","眼盒中心；双目/左右 ±32.5 mm","dVID、视差图"],
    ["下视角 / 左视角","≥ 1° / -0.5°~0.5°","光轴水平与指向虚像中心两姿态","LDA、LOA"],
    ["视场角","HFOV ≥ 3.5°；VFOV ≥ 0.5°","眼盒中心、边界方框画面","水平/垂直 FOV"],
    ["眼盒","可调 ≥120×40 mm，行程 ≥80 mm；不可调 ≥120×120 mm","中心、上/中/下、边界搜索","边界点云、尺寸"],
    ["重影 / 双目视差","≤3′；水平≤10′、垂直≤7.5′","点阵画面；双目同步","主/副像与对应点偏差"],
    ["畸变 / 旋转","静态≤5%；动态<36′/20′；旋转 -2°~2°","中心 + 眼盒边缘点","点阵残差、回归角"],
    ["MTF","最小值 ≥0.3","2′黑白条纹，9区域","水平/垂直最小值"],
  ];
  table(s,42,128,1196,rows,[175,265,440,250],{fontSize:14,rowHeights:[42,58,58,58,66,66,66,58],boldFirst:true});
}

// 4 — standards matrix photometry/environment
{
  const s=p.slides.add(); title(s,"光色与环境测试需共享暗室，但采用可切换的专用激励模块",4,"GB/T 46926—2025 5.1–5.3, 5.14–5.19, 6.2.1–6.2.4, 6.2.15–6.2.20");
  const rows=[
    ["项目","判定 / 条件","主要设备","自动输出"],
    ["亮度 / 对比度","≥10,000 cd/m²；≥1000:1","双目成像色度计、全白/全黑画面","9点统计、CR"],
    ["均匀性 / 色域","≥65%；≥29%","白场 + R/G/B 单色画面","Lmin/Lmax、u′v′面积"],
    ["杂散光","50,000±5,000 lx；最大<1500 cd/m²","太阳模拟光源、照度计","眼盒内亮度热图"],
    ["太阳倒灌","60±3℃、RH<30%、1090±100 W/m²、15 min","AM1.5G模拟器、温控罩","过程视频、功能/外观记录"],
    ["温度 / 噪声","-40~85℃；噪声<40 dB(A)","温箱/转接舱、声级计","状态检查、峰值噪声"],
    ["遮挡 / 信息形态","区域占比；角分；闪烁≥60 Hz采集","世界坐标叠加、高速相机","掩膜面积、角分、频率"],
    ["AR贴合度","目标物/车道线宜≤0.45°；导航分级","同步实景相机 / 道路场景","角偏差、方向/道路/车道级"],
  ];
  table(s,42,128,1196,rows,[175,360,330,265],{fontSize:14,rowHeights:[42,58,58,58,66,58,58,58],boldFirst:true});
}

// 5 — architecture
{
  const s=p.slides.add(); title(s,"台架把被测件、位姿链和测量链锁定在同一世界基准",5,"方案总体架构；条款映射见前两页");
  // nodes first; connectors are automatically behind endpoints
  const a=node(s,52,188,230,155,"HUD + 前风挡夹具","三点基准球定位\n风挡倾角可调\n图案/CAN同步",C.panel2,C.blue);
  const b=node(s,352,188,250,155,"六轴位移台","眼点/眼盒扫描\n光轴姿态调整\n绝对编码器 + 制动",C.panel2,C.green);
  const c=node(s,672,188,255,155,"双目成像色度计","左右光心 65 mm\n同步曝光/焦距锁定\n亮度、色度、图像",C.panel2,C.blue);
  const d=node(s,997,188,230,155,"测控与数据平台","位姿编排\n图像算法\n自动判定/报告",C.panel2,C.amber);
  s.shapes.connect(a,b,{kind:"straight",fromSide:"right",toSide:"left",line:{style:"solid",fill:C.rule,width:2},tail:{type:"arrow",width:"med",length:"med"}});
  s.shapes.connect(b,c,{kind:"straight",fromSide:"right",toSide:"left",line:{style:"solid",fill:C.rule,width:2},tail:{type:"arrow",width:"med",length:"med"}});
  s.shapes.connect(c,d,{kind:"straight",fromSide:"right",toSide:"left",line:{style:"solid",fill:C.rule,width:2},tail:{type:"arrow",width:"med",length:"med"}});
  addLine(s,158,420,967,0,C.rule,1.5);
  addRect(s,86,400,144,40,C.pale,{geometry:"rect"}); addText(s,"世界基准 W",86,408,144,24,15,{bold:true,align:"center"});
  addRect(s,320,400,175,40,C.panel2,{geometry:"rect"}); addText(s,"标定靶 T / 基准球",320,408,175,24,15,{bold:true,align:"center"});
  addRect(s,580,400,175,40,C.panel2,{geometry:"rect"}); addText(s,"太阳/杂散光模块",580,408,175,24,15,{bold:true,align:"center"});
  addRect(s,840,400,175,40,C.panel2,{geometry:"rect"}); addText(s,"温度/噪声模块",840,408,175,24,15,{bold:true,align:"center"});
  addRect(s,1070,400,120,40,C.panel2,{geometry:"rect"}); addText(s,"安全PLC",1070,408,120,24,15,{bold:true,align:"center"});
  addText(s,"数据闭环",52,500,180,28,18,{bold:true,color:C.blue});
  addText(s,"目标位姿 → 运动完成握手 → 双目同步触发 → 原始图/环境量/位姿同时间戳 → 算法计算 → 规则判定 → 可追溯报告",52,540,1160,60,23,{bold:true});
}

// 6 — mechanical layout
{
  const s=p.slides.add(); title(s,"机械布局以“光学中心可达、夹具可复位、杂散光可控”为约束",6,"推荐机械概念；尺寸需由具体HUD/风挡CAD复核");
  sectionLabel(s,"侧视布局",52,122);
  // diagram
  addLine(s,80,560,1120,0,C.ink,2);
  addRect(s,108,450,235,90,C.panel,{geometry:"rect",line:C.ink,lineWidth:1});
  addText(s,"HUD 模组夹具\n6点约束 + 定位销",125,468,200,55,18,{bold:true,align:"center"});
  const glass=addRect(s,416,225,26,335,C.pale,{geometry:"rect",line:C.blue,lineWidth:1}); glass.rotation=-18;
  addText(s,"前风挡",370,190,120,30,17,{bold:true,color:C.blue,align:"center"});
  addLine(s,476,260,410,80,C.sky,3,{head:"arrow"});
  addText(s,"虚像光路",610,250,145,30,17,{bold:true,color:C.blue,align:"center"});
  addRect(s,870,315,230,105,C.panel2,{line:C.ink,lineWidth:1});
  addRect(s,902,348,58,44,C.ink,{geometry:"ellipse"});
  addRect(s,1002,348,58,44,C.ink,{geometry:"ellipse"});
  addText(s,"双目成像色度计\nB = 65.000 mm",880,432,215,55,17,{bold:true,align:"center"});
  addRect(s,826,500,320,52,C.panel,{geometry:"rect",line:C.ink,lineWidth:1});
  addText(s,"六轴并联位移台（平台法兰）",842,511,288,30,18,{bold:true,align:"center"});
  addLine(s,1160,395,0,55,C.green,3,{tail:"arrow"});
  addText(s,"Z",1170,390,32,25,15,{bold:true,color:C.green});
  addLine(s,1100,450,60,0,C.blue,3,{tail:"arrow"});
  addText(s,"Y",1065,440,32,25,15,{bold:true,color:C.blue});
  addText(s,"建议基座占地 2.4 m × 1.5 m；暗室净高 ≥2.4 m；维护通道 ≥0.8 m",52,604,820,30,17,{color:C.muted});
  addRect(s,915,594,300,48,C.pale,{geometry:"rect"});
  addText(s,"防碰撞：软限位 + 3D包络 + 急停",930,606,270,26,16,{bold:true,align:"center"});
}

// 7 — BOM
{
  const s=p.slides.add(); title(s,"设备配置同时满足几何溯源、光色动态范围和环境激励",7,"推荐采购最低规格；非国标规定的设备品牌/型号");
  const rows=[
    ["子系统","推荐最低规格","数量","用途"],
    ["成像色度计","≥12 MP；0.005~200,000 cd/m²；Y精度±3%；色度±0.003；硬触发","2","光色、点阵、重影、双目"],
    ["双目刚性梁","基线65.000±0.020 mm；热膨胀补偿；俯仰/偏航微调","1","模拟左右眼/±32.5 mm"],
    ["六轴并联台","X/Y ±150 mm；Z ±100 mm；角度±12°/±12°/±20°；载荷≥35 kg","1","眼点与眼盒扫描"],
    ["世界标定件","玻璃点阵 + 编码标志；平面度≤0.05 mm；三颗工具球","1套","内参、手眼、世界注册"],
    ["光源模块","AM1.5G；1090±100 W/m²；50,000±5,000 lx模式；发散半角≤0.5°","1","倒灌与杂散光"],
    ["辅助采集","≥120 fps高速相机、声级计、照度计、温湿度/辐照传感器","1套","闪烁、关闭时间、环境记录"],
    ["DUT控制","可编程电源、CAN/CAN-FD/以太网、图案发生器、同步IO","1套","画面与状态自动切换"],
  ];
  table(s,42,126,1196,rows,[170,650,90,260],{fontSize:13,rowHeights:[40,66,60,66,60,66,60,60],boldFirst:true});
}

// 8 — hexapod specs
{
  const s=p.slides.add(); title(s,"六轴并联台的采购指标围绕120 mm眼盒与3′角度门槛倒推",8,"推荐工程规格；最终以负载重心和CAD干涉校核为准");
  metric(s,42,138,270,162,"±150 / ±150 / ±100 mm","X / Y / Z 行程","全行程 300 / 300 / 200 mm",C.blue);
  metric(s,330,138,270,162,"±12° / ±12° / ±20°","Rx / Ry / Rz 行程","满足光轴水平、指向虚像及标定倾角",C.green);
  metric(s,618,138,270,162,"≥ 35 kg","平台负载","双机 + 刚性梁 + 线缆按 1.5 安全系数",C.amber);
  metric(s,906,138,332,162,"≤±0.010 mm / ±0.003°","重复定位精度","绝对误差补偿后≤±0.05 mm / ±0.01°",C.red);
  const rows=[
    ["指标","推荐值","验收方法"],
    ["最小指令增量","≤1 μm；≤0.0005°","激光干涉仪 / 电子水平仪"],
    ["最大速度","平移≥50 mm/s；转动≥10°/s","空载与额定载荷轨迹"],
    ["姿态同步","6轴插补；位置到位硬件输出≤5 ms","示波器记录到位/触发"],
    ["稳定时间","100 mm步进后≤0.5 s进入±0.01 mm窗口","位移传感器记录"],
    ["安全功能","绝对编码器、断电制动、软硬限位、STO","FAT安全用例"],
  ];
  table(s,42,345,1196,rows,[250,480,430],{fontSize:15,rowHeights:[40,49,49,49,49,49],boldFirst:true});
}

// 9 — robot alternative
{
  const s=p.slides.add(); title(s,"整车多车型优先覆盖性，台架单品优先绝对精度",9,"六轴机器人为兼容选项；推荐规格同样属于采购技术协议");
  addText(s,"并联位移台（推荐）",52,132,520,34,24,{bold:true,color:C.blue});
  bulletList(s,[
    "工作空间：300×300×200 mm；姿态 ±12°/±12°/±20°",
    "负载 ≥35 kg；重复定位 ≤±0.010 mm / ±0.003°",
    "优点：刚度高、误差模型稳定、眼盒小范围扫描快",
    "限制：需要为不同车型设计可复位的风挡/HUD夹具"
  ],52,190,520,78,18,C.blue);
  addText(s,"六轴机器人（兼容）",684,132,520,34,24,{bold:true,color:C.green});
  bulletList(s,[
    "关节范围：J1±170°、J2 -130°/+145°、J3±150°、J4±200°、J5±125°、J6±360°",
    "臂展 ≥1000 mm；负载 ≥30 kg；重复定位 ≤±0.03 mm",
    "绝对精度经标定 ≤±0.30 mm；每次换车以世界靶快速复定位",
    "需增加安全围栏/扫描器、外部轴标定和更严格的碰撞包络"
  ],684,190,520,78,18,C.green);
  addRect(s,52,524,1152,96,C.panel2,{geometry:"rect"});
  addText(s,"选择规则",74,545,140,32,20,{bold:true,color:C.amber});
  addText(s,"固定HUD模组/风挡与高精度研发验证：并联台。整车进舱、多车型换型、AR实景联动：机器人；但所有合格判定都使用视觉世界靶闭环后的实测位姿，不直接信任机器人名义TCP。",210,540,960,58,19,{bold:true});
}

// 10 — coordinate frames
{
  const s=p.slides.add(); title(s,"五类坐标系把车辆设计眼点、平台运动与双目光心统一起来",10,"车辆方向约定：+X后、+Y左、+Z上；与标准驾驶员眼点表保持一致");
  const rows=[
    ["坐标系","原点与方向","建立方式"],
    ["{W} 世界/车辆","夹具三基准球定义原点；轴与车辆三维基准平行","激光跟踪/便携CMM测量工具球与R点"],
    ["{B} 六轴基座","制造商基座坐标","通过世界标定求 T_W←B"],
    ["{F} 平台法兰","动平台机械中心","控制器给出 T_B←F(q)"],
    ["{C} 双目刚体","左右光心中点；Zc沿平均光轴","手眼标定求 T_F←C"],
    ["{CL}/{CR}","左右成像色度计光心","双目标定求 T_C←CL / T_C←CR"],
    ["{T}/{H}/{V}","标定靶 / HUD夹具 / 虚像中心","靶标测量、CAD注册、图像识别"],
  ];
  table(s,42,132,720,rows,[135,330,255],{fontSize:14,rowHeights:[42,66,58,58,58,58,58],boldFirst:true});
  addRect(s,815,160,368,410,C.panel2,{geometry:"rect",line:C.rule,lineWidth:1});
  addText(s,"{W}",850,515,60,34,24,{bold:true});
  addLine(s,890,500,165,0,C.blue,4,{head:"arrow"}); addText(s,"+Y 左",1060,486,80,26,16,{bold:true,color:C.blue});
  addLine(s,890,340,0,160,C.green,4,{tail:"arrow"}); addText(s,"+Z 上",905,325,80,26,16,{bold:true,color:C.green});
  addLine(s,890,500,120,92,C.red,4,{head:"arrow"}); addText(s,"+X 后",1017,585,85,26,16,{bold:true,color:C.red});
  addRect(s,928,252,120,54,C.ink,{geometry:"rect"});
  addRect(s,942,263,35,27,C.white,{geometry:"ellipse"}); addRect(s,999,263,35,27,C.white,{geometry:"ellipse"});
  addText(s,"{C}",1058,263,55,26,19,{bold:true,color:C.blue});
  addLine(s,988,192,0,60,C.blue,3,{tail:"arrow"}); addText(s,"Zc 光轴",1002,185,90,24,15,{bold:true,color:C.blue});
  addText(s,"所有测试点保存为 T_W←C*；控制器内部再变换为平台/机器人目标。",820,602,375,42,16,{bold:true});
}

// 11 — transform chain & pose calculation
{
  const s=p.slides.add(); title(s,"目标相机位姿由虚像中心“看向”计算，再反解成六轴指令",11,"坐标变换采用齐次矩阵与SE(3)平均；单位统一为mm、deg");
  sectionLabel(s,"实时变换链",42,116);
  const n1=node(s,42,160,200,104,"世界 {W}","车辆/R点/眼盒",C.panel2,C.blue);
  const n2=node(s,292,160,200,104,"基座 {B}","T_W←B",C.panel2,C.green);
  const n3=node(s,542,160,200,104,"法兰 {F}","T_B←F(q)",C.panel2,C.green);
  const n4=node(s,792,160,200,104,"双目 {C}","T_F←C",C.panel2,C.blue);
  const n5=node(s,1042,160,196,104,"左/右相机","T_C←CL/CR",C.panel2,C.amber);
  for (const [u,v] of [[n1,n2],[n2,n3],[n3,n4],[n4,n5]]) s.shapes.connect(u,v,{kind:"straight",fromSide:"right",toSide:"left",line:{style:"solid",fill:C.rule,width:2},tail:{type:"arrow",width:"med",length:"med"}});
  formula(s,"T_W←C(q) = T_W←B · T_B←F(q) · T_F←C",42,310,565,80,"正向运动链：平台读数到世界中的双目刚体");
  formula(s,"T_B←F* = T_B←W · T_W←C* · T_C←F",42,410,565,80,"平台目标；机器人方案再由 q* = IK(T_B←F*) 求关节角");
  addRect(s,650,310,588,250,C.panel2,{geometry:"rect",line:C.rule,lineWidth:1});
  addText(s,"从眼点 pE 指向虚像中心 pV",674,330,540,30,21,{bold:true,color:C.blue});
  addText(s,"z = normalize(pV − pE)\nx = normalize([0,0,1]ᵀ × z)\ny = z × x\nR_W←C* = [ x  y  z ]\nT_W←C* = [ R_W←C*   pE ; 0 0 0 1 ]",674,378,520,145,19,{typeface:MONO,bold:true});
  addText(s,"姿态接近奇异方向时，使用上一姿态的x轴做连续化，避免翻转。",42,588,1196,34,16,{color:C.muted});
}

// 12 — stereo calibration
{
  const s=p.slides.add(); title(s,"双目色度计先完成几何、光度和时间三类一致性标定",12,"建议每次换镜头/焦距后重做；每日执行快速核查");
  const x0=42, gap=28, cw=376;
  node(s,x0,152,cw,205,"1  单机内参与畸变","玻璃点阵 20–30 姿态\n求 K_L,D_L 与 K_R,D_R\n重投影RMS ≤0.08 px\n视场边缘残差无系统趋势",C.panel2,C.blue);
  node(s,x0+cw+gap,152,cw,205,"2  双目外参与基线","同步采集同一靶标\n求 R_LR,t_LR 与极线校正\nB=65.000±0.020 mm\n垂直极线残差 ≤0.10 px",C.panel2,C.green);
  node(s,x0+2*(cw+gap),152,cw,205,"3  光色与时间匹配","标准亮度/色度源多点传递\n左右Y差 ≤1.5%\nΔu′v′ ≤0.0015\n触发偏差 <100 μs",C.panel2,C.amber);
  addLine(s,120,425,1030,0,C.rule,2);
  addText(s,"焦距与光阑锁定",70,450,210,30,18,{bold:true});
  addText(s,"在虚像清晰焦面锁焦；两路采用相同曝光策略，HDR时保持同一包围序列。",70,488,300,85,16,{color:C.muted});
  addText(s,"双目刚体坐标",435,450,210,30,18,{bold:true});
  addText(s,"原点取左右光心中点；YC沿左向；输出每次标定的协方差。",435,488,300,85,16,{color:C.muted});
  addText(s,"快速核查",800,450,210,30,18,{bold:true});
  addText(s,"固定靶一姿态 + 标准白板；偏差超阈值则禁止测试并触发重标。",800,488,350,85,16,{color:C.muted});
}

// 13 — hand-eye
{
  const s=p.slides.add(); title(s,"手眼标定求法兰到双目刚体，世界注册求基座到车辆基准",13,"eye-in-hand：双目色度计安装在动平台；标定靶固定在世界中");
  formula(s,"A_k · X = X · B_k     ;     X = T_F←C",42,142,530,92,"A_k：相邻平台运动；B_k：相机观测到的靶标相对运动");
  formula(s,"T_W←B = T_W←T · T_T←C · T_C←F · T_F←B",42,258,530,92,"每个姿态得到一组T_W←B，剔除异常后在SE(3)中加权平均");
  addText(s,"采样设计",640,140,220,30,22,{bold:true,color:C.blue});
  bulletList(s,[
    "18–25个姿态；平移覆盖Y/Z全行程的60%",
    "Rx/Ry/Rz至少各含±6°；避免纯平移退化",
    "靶标布满相机视场并包含边缘视角",
    "求解：双四元数/Tsai-Lenz + Huber鲁棒优化"
  ],640,186,560,61,17,C.blue);
  addText(s,"独立验证（不参与求解的6个位姿）",42,405,530,34,21,{bold:true});
  const rows=[
    ["验收量","目标"],
    ["世界点位置残差 RMS","≤0.10 mm"],
    ["相机姿态残差 RMS","≤0.015°"],
    ["靶标重投影 RMS","≤0.12 px"],
    ["65 mm左右位移复现误差","≤0.03 mm"],
  ];
  table(s,42,452,530,rows,[335,195],{fontSize:15,rowHeights:[40,42,42,42,42],boldFirst:true});
  addRect(s,640,433,558,155,C.pale,{geometry:"rect"});
  addText(s,"每日复位逻辑",664,454,180,30,20,{bold:true,color:C.blue});
  addText(s,"回零 → 观测固定世界靶 → 更新一个小量 ΔT_W←B → 复测3个检查点。若任一残差超限，锁定台架并要求完整手眼标定。",664,500,510,67,18,{bold:true});
}

// 14 — scan path
{
  const s=p.slides.add(); title(s,"眼盒点按标准生成，边界采用二分搜索",14,"GB/T 46926—2025 6.2.9, 6.2.11, 6.2.12");
  addRect(s,42,138,540,430,C.panel2,{geometry:"rect",line:C.rule,lineWidth:1});
  addText(s,"眼盒平面（Y-Z）",64,155,250,30,20,{bold:true});
  // grid
  for(let i=0;i<5;i++) addLine(s,110+i*90,225,0,270,C.rule,1);
  for(let j=0;j<5;j++) addLine(s,110,225+j*67.5,360,0,C.rule,1);
  const pts=[[110,225],[290,225],[470,225],[110,360],[290,360],[470,360],[110,495],[290,495],[470,495]];
  pts.forEach(([x,y],i)=>{addRect(s,x-7,y-7,14,14,i===4?C.red:C.blue,{geometry:"ellipse"});});
  addText(s,"上极限",485,212,70,26,14,{bold:true}); addText(s,"中心",485,347,70,26,14,{bold:true}); addText(s,"下极限",485,482,70,26,14,{bold:true});
  addText(s,"Y 左 +",110,515,100,24,14,{bold:true,color:C.blue}); addText(s,"Z 上 +",55,220,60,24,14,{bold:true,color:C.green,rotation:270});
  addText(s,"中心 + 8边缘点用于动态畸变；上/中/下各执行双目左右眼采集。",64,535,480,30,15,{color:C.muted});
  addText(s,"自动路径",640,138,220,32,22,{bold:true,color:C.blue});
  const steps=[
    ["01","回零与世界靶核查"],["02","眼盒中心：VID/FOV/旋转/MTF/光色"],
    ["03","上/中/下：双目视差与眼盒边缘"],["04","8边缘点：动态畸变"],
    ["05","四方向二分搜索眼盒边界"],["06","回到检查点：漂移复测"]
  ];
  steps.forEach((it,i)=>{
    const yy=190+i*65;
    addText(s,it[0],640,yy,55,30,18,{bold:true,color:C.blue});
    addLine(s,700,yy+15,55,0,C.rule,2);
    addText(s,it[1],770,yy-2,420,40,18,{bold:true,valign:"middle"});
  });
  addText(s,"边界判据：附录D边框/点阵完整可识别且亮度、对比度不低于项目预设；阈值与原始图一起写入报告。",640,585,558,50,16,{color:C.muted});
}

// 15 — geometric algorithms
{
  const s=p.slides.add(); title(s,"几何算法全部从点阵特征与已标定光心出发，避免依赖像素名义尺寸",15,"GB/T 46926—2025 6.2.5–6.2.14；画面规格按附录D");
  const rows=[
    ["量","核心计算","实现要点"],
    ["虚像距离","dVID = fpx·B / |uL−uR|","极线校正；中心标识亚像素定位；左右焦距分别使用"],
    ["视角","LDA=asin(ΔZ/dVID)；LOA=asin(ΔY/dVID)","ΔY/ΔZ来自世界坐标下虚像中心与眼点差"],
    ["视场","HFOV=2atan(x/2dVID)；VFOV=2atan(y/2dVID)","通过边界方框中点求虚像线性尺寸"],
    ["重影","γ=60atan(Xghost/dVID)","副像亮度>主像10%才计入；取最大偏离"],
    ["静态畸变","Dj,h=max|Δh|/H；Dj,v=max|Δv|/V","中心为基准，最小二乘求平均点距与参考点阵"],
    ["动态畸变","Ddh=60atan(Δxmax/dVID)；Ddv同理","边缘位姿与相应眼盒中心点阵比较"],
    ["旋转 / MTF","行列线性回归平均角；(Lmax−Lmin)/(Lmax+Lmin)","首/中/末行列；9区域水平/垂直取最小"],
  ];
  table(s,42,126,1196,rows,[170,430,540],{fontSize:13,rowHeights:[40,62,58,58,58,62,62,62],boldFirst:true});
  addText(s,"附录D画面：m、n为不小于3的奇数；相邻点视角≤2°且宜接近1°；圆点直径≤min(Δx,Δy)/3；中心必须有可唯一识别标志。",42,628,1196,26,14,{color:C.muted});
}

// 16 — VID/eyebox/disparity detail
{
  const s=p.slides.add(); title(s,"双目刚体同时完成VID与视差，眼盒尺寸由三高度边界平均",16,"GB/T 46926—2025 6.2.5, 6.2.9, 6.2.11");
  addText(s,"双目等效标准左右位移",42,132,500,32,22,{bold:true,color:C.blue});
  addRect(s,42,182,530,185,C.panel2,{geometry:"rect"});
  addRect(s,90,240,40,40,C.ink,{geometry:"ellipse"}); addRect(s,285,240,40,40,C.ink,{geometry:"ellipse"});
  addLine(s,110,214,195,0,C.blue,3); addText(s,"B = 65 mm",165,184,90,26,17,{bold:true,color:C.blue,align:"center"});
  addText(s,"CL = E − 32.5 mm",62,302,180,28,17,{bold:true}); addText(s,"CR = E + 32.5 mm",258,302,210,28,17,{bold:true});
  addText(s,"硬同步消除显示刷新引起的左右时差；报告保留校正前后图像与基线证书。",62,335,470,25,14,{color:C.muted});
  addText(s,"双目视差",650,132,500,32,22,{bold:true,color:C.green});
  formula(s,"δh,i = 60·atan(dh,i / dVID)\nδv,i = 60·atan(dv,i / dVID)",650,182,548,105,"上/中/下眼盒位置分别求点阵绝对偏差均值");
  formula(s,"δh = (δh,1+δh,2+δh,3)/3\nδv = (δv,1+δv,2+δv,3)/3",650,310,548,105,"判定：水平≤10′；垂直≤7.5′");
  addText(s,"可调眼盒尺寸",42,432,500,32,22,{bold:true,color:C.amber});
  formula(s,"xe = [(xmel+xmer)+(xuel+xuer)+(xlel+xler)] / 3",42,478,1156,72,"me/u/l：中/上/下高度；l/r：向左/向右边界移动量");
  formula(s,"ye = [(ymeu+ymed)+(yueu+yued)+(yleu+yled)] / 3",42,566,1156,72,"垂直方向同理；PPT中采用up/down记号以避免标准提取文本的下标歧义");
}

// 17 — photometry/color
{
  const s=p.slides.add(); title(s,"光色计算采用同一采样掩膜，减少画面切换带来的区域漂移",17,"GB/T 46926—2025 6.2.16–6.2.19");
  const x=[42,340,638,936];
  metric(s,x[0],146,260,176,"≥10,000","白场亮度 cd/m²","图19取样点求均值；输出最高亮度",C.blue);
  metric(s,x[1],146,260,176,"≥1000:1","对比度","CR = Lwhite / Lblack；暗电流先校正",C.green);
  metric(s,x[2],146,260,176,"≥65%","亮度均匀性","U = Lmin / Lmax ×100%",C.amber);
  metric(s,x[3],146,260,176,"≥29%","色域覆盖率","R/G/B中心点在CIE 1976 u′v′计算",C.red);
  addRect(s,42,374,560,216,C.panel2,{geometry:"rect",line:C.rule,lineWidth:1});
  addText(s,"统一ROI与曝光策略",66,398,260,32,21,{bold:true,color:C.blue});
  bulletList(s,[
    "白/黑/R/G/B画面在同一眼盒中心姿态采集",
    "白场不过曝；黑场采用暗帧与HDR长曝光",
    "双目分别计算，合格判定取较差一侧",
    "保存9点表、伪彩图、曝光参数与校准证书号"
  ],66,447,500,38,16,C.blue);
  addRect(s,640,374,558,216,C.pale,{geometry:"rect"});
  addText(s,"色域公式",664,398,180,32,21,{bold:true,color:C.blue});
  addText(s,"S = |(u′r−u′b)(v′g−v′b) −\n     (u′g−u′b)(v′r−v′b)| / 2\n\nG = S / 0.1952 × 100%",664,448,495,120,20,{typeface:MONO,bold:true});
  addText(s,"左右相机完成传递标定后仍独立判定，不平均掩盖单眼风险。",42,618,1156,28,15,{color:C.muted});
}

// 18 — auxiliary tests
{
  const s=p.slides.add(); title(s,"太阳、温度、噪声和动态显示通过可切换工装纳入同一数据链",18,"GB/T 46926—2025 6.1.3–6.1.4, 6.2.2–6.2.4, 6.2.15");
  const cols=[42,344,646,948];
  node(s,cols[0],142,258,245,"温度范围","-40℃ / 85℃各5 h\n前2 h系统关闭\n2 h后转正常电气连接\n最后3 h每小时检查",C.panel2,C.blue);
  node(s,cols[1],142,258,245,"太阳倒灌","60±3℃、RH<30%\nAM1.5G 1090±100 W/m²\n15 min；光斑覆盖≥50%通光孔\n过程允许自动调光",C.panel2,C.amber);
  node(s,cols[2],142,258,245,"杂散光","人工全黑画面\n光机表面 50,000±5,000 lx\n高/中/低眼盒采集\n最大亮度 <1500 cd/m²",C.panel2,C.red);
  node(s,cols[3],142,258,245,"噪声 / 动态","背景≤25 dB(A)\n距表面中心50 cm测峰值\n高速相机≥120 fps\n闪烁与关闭时间自动计时",C.panel2,C.green);
  addRect(s,42,438,1164,145,C.panel2,{geometry:"rect"});
  addText(s,"工装切换互锁",66,462,180,30,20,{bold:true,color:C.blue});
  addText(s,"光源模块伸入时锁定六轴平台低速；温控罩关闭时禁止人工进入；太阳模拟器开启需风挡/光机温度、辐照度和舱门三重许可。每次切换自动写入工装ID、校准有效期和环境曲线。",238,457,940,85,18,{bold:true});
  addText(s,"建议把整车道路AR贴合度作为二期扩展：台架完成静态几何基线，实车同步采集完成目标物/车道线/导航分级。",42,612,1164,30,15,{color:C.muted});
}

// 19 — uncertainty / MSA
{
  const s=p.slides.add(); title(s,"先验误差预算把最紧的3′重影门槛转换成可验收的测量能力",19,"推荐实验室内部控制线；正式不确定度需按实际设备证书更新");
  addText(s,"位置链 RSS（典型目标）",42,126,480,32,22,{bold:true,color:C.blue});
  const pos=[
    ["平台重复定位",0.010],["手眼/世界残差",0.080],["双目外参",0.030],["特征提取等效",0.050],["夹具/热漂移",0.040]
  ];
  pos.forEach(([lab,val],i)=>{
    const yy=180+i*56;
    addText(s,lab,42,yy,175,24,15,{bold:true});
    addRect(s,225,yy+2,Math.max(8,val/0.08*270),20,i===1?C.blue:C.pale,{geometry:"rect"});
    addText(s,val.toFixed(3)+" mm",510,yy,90,24,15,{align:"right"});
  });
  addRect(s,42,480,558,78,C.panel2,{geometry:"rect"});
  addText(s,"RSS ≈ 0.11 mm",64,496,240,34,26,{bold:true,color:C.blue});
  addText(s,"作为眼盒边界与世界定位目标",320,501,250,26,15,{color:C.muted});
  addText(s,"角测量预算（1σ）",660,126,480,32,22,{bold:true,color:C.green});
  const ang=[["特征定位",0.10],["内参/畸变",0.12],["相机姿态",0.12],["平台重复",0.05],["热漂移",0.05]];
  ang.forEach(([lab,val],i)=>{
    const yy=180+i*56;
    addText(s,lab,660,yy,175,24,15,{bold:true});
    addRect(s,845,yy+2,Math.max(8,val/0.12*270),20,i<3?C.green:C.pale,{geometry:"rect"});
    addText(s,val.toFixed(2)+"′",1130,yy,70,24,15,{align:"right"});
  });
  addRect(s,660,480,540,78,C.pale,{geometry:"rect"});
  addText(s,"U(k=2) ≤ 0.5′",682,496,240,34,26,{bold:true,color:C.green});
  addText(s,"≤3′门槛的1/6，支持保护带判定",915,501,255,26,15,{color:C.muted});
  addText(s,"MSA：3件样品 × 3人 × 3次；关键量 GR&R ≤10%，10%~20%需风险批准；黄金样件每月趋势监控。",42,598,1158,38,17,{bold:true});
}

// 20 — software/test flow/safety
{
  const s=p.slides.add(); title(s,"软件将位姿、画面、环境与算法版本绑定成一条可重放记录",20,"测试控制与数据治理方案");
  const stages=[
    ["计划","DUT/CAD\n条款/画面\n点位集"],["预检","校准有效\n世界靶残差\n安全互锁"],["执行","位姿到位\n画面握手\n同步触发"],["分析","点阵/光色\n公式计算\n不确定度"],["判定","限值+保护带\n异常复测\n审批"],["报告","原始图/曲线\nJSON+PDF\n追溯ID"]
  ];
  const xs=[42,245,448,651,854,1057];
  const nsh=[];
  stages.forEach((st,i)=>nsh.push(node(s,xs[i],160,165,150,st[0],st[1],i%2?C.panel2:C.pale,i===5?C.green:C.blue)));
  for(let i=0;i<nsh.length-1;i++) s.shapes.connect(nsh[i],nsh[i+1],{kind:"straight",fromSide:"right",toSide:"left",line:{style:"solid",fill:C.rule,width:2},tail:{type:"arrow",width:"sm",length:"sm"}});
  const rows=[
    ["控制层","主要接口","故障策略"],
    ["运动 / 安全PLC","EtherCAT/厂商API、STO、门禁、急停","任何互锁断开：停止触发并保持/安全回撤"],
    ["DUT与图案","CAN/CAN-FD/以太网/视频链路","画面CRC或状态字不符：本点无效"],
    ["测量设备","硬触发、SDK、PTP/NTP时间","丢帧/曝光饱和/校准过期：阻断判定"],
    ["数据平台","原始图、位姿、环境、算法容器、审计日志","版本不可追溯：禁止出具正式报告"],
  ];
  table(s,42,365,1196,rows,[220,460,480],{fontSize:14,rowHeights:[40,54,54,54,54],boldFirst:true});
  addText(s,"命名建议：项目-样品-日期-序列-点位-左右眼；所有结果可由原始图与配置JSON离线重算。",42,626,1196,24,13,{color:C.muted});
}

// 21 — plan and acceptance
{
  const s=p.slides.add(); title(s,"13周完成设计、集成、MSA与交付，四个闸口控制风险",21,"实施计划与最终验收");
  const weeks=["W1–2","W3–5","W6–8","W9–10","W11–12","W13"];
  const tasks=[
    ["需求冻结 / CAD接口",0,1,C.blue],
    ["采购与详细机械设计",1,2,C.pale],
    ["制造、测控与算法开发",2,3,C.blue],
    ["集成、标定与安全验证",3,4,C.green],
    ["MSA / 黄金样件相关性",4,5,C.amber],
    ["FAT、SAT、培训与移交",5,6,C.red]
  ];
  const left=250, top=155, col=155;
  weeks.forEach((w,i)=>addText(s,w,left+i*col,top,145,28,16,{bold:true,align:"center"}));
  tasks.forEach((t,i)=>{
    const yy=205+i*55;
    addText(s,t[0],42,yy,190,30,16,{bold:true,valign:"middle"});
    addRect(s,left+t[1]*col,yy,Math.max(145,(t[2]-t[1])*col-10),34,t[3],{geometry:"rect"});
  });
  addLine(s,42,560,1196,0,C.rule,1.5);
  const gates=[
    ["G1 机械/暗室","行程、负载、反射率、照度、安全互锁"],
    ["G2 标定","手眼≤0.10 mm/0.015°；双目与光色匹配达标"],
    ["G3 测量能力","角测量U(k=2)≤0.5′；GR&R≤10%"],
    ["G4 相关性","黄金样件与参考实验室关键量差异在保护带内"]
  ];
  gates.forEach((g,i)=>{
    const x=42+i*298;
    addText(s,g[0],x,585,270,24,17,{bold:true,color:i===3?C.green:C.blue});
    addText(s,g[1],x,615,270,46,13,{color:C.muted});
  });
}

// 22 — closing / approval checklist
{
  const s=p.slides.add(); s.background.fill=C.white;
  addText(s,"立项批准前只需确认三件事",42,42,720,42,22,{bold:true,color:C.blue});
  addText(s,"坐标可追溯、能力有余量、\n测试能自动复现。",42,185,1090,205,58,{bold:true,valign:"bottom"});
  addLine(s,42,450,1196,0,C.ink,2);
  addText(s,"01",42,488,70,30,22,{bold:true,color:C.blue});
  addText(s,"冻结HUD/风挡/R点CAD与负载重心",110,485,300,50,18,{bold:true});
  addText(s,"02",455,488,70,30,22,{bold:true,color:C.blue});
  addText(s,"选择并联台主方案或机器人兼容方案",525,485,300,50,18,{bold:true});
  addText(s,"03",868,488,70,30,22,{bold:true,color:C.blue});
  addText(s,"指定黄金样件与参考实验室用于相关性",938,485,300,50,18,{bold:true});
  addText(s,"交付物：机械/电气图、坐标与标定文件、算法说明、测试脚本、原始数据规范、FAT/SAT/MSA报告、操作维护SOP。",42,615,1196,36,16,{color:C.muted});
}

await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.mkdir(QA,{recursive:true});
for (const [i,s] of p.slides.items.entries()) {
  const stem=`slide-${String(i+1).padStart(2,"0")}`;
  await writeBlob(path.join(QA,stem+".png"),await p.export({slide:s,format:"png",scale:1}));
  const layout=await s.export({format:"layout"});
  await fs.writeFile(path.join(QA,stem+".layout.json"),await layout.text());
}
await writeBlob(path.join(QA,"deck-montage.webp"),await p.export({format:"webp",montage:true,scale:0.5}));
const out=await PresentationFile.exportPptx(p);
await fs.writeFile(OUT,out.data);
console.log(OUT);

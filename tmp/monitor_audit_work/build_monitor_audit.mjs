import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/CHATGPT_file/else thing/outputs/019fcfd4-488c-7230-b71f-360ecae9754a";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const main = workbook.worksheets.add("修正后参数");
const issuesSheet = workbook.worksheets.add("错误与证据");
const sourceSheet = workbook.worksheets.add("来源索引");

const mainRows = [
  ["序号", "1", "2", "3", "4", "5", "6"],
  ["品牌", "弥德科技（MiD）", "ViewX", "TITAN ARMY（泰坦军团）", "Acer", "Acer", "Samsung"],
  ["型号", "16 英寸裸眼 3D 便携显示器（公开名称；未见字母数字 SKU）", "ViewX Liber 15.6″ Glass Free 3D Spatial AI Display", "M27E6V-3D", "Predator SpatialLabs View 27（PSV27-2；地区料号不同）", "Predator XB273K 3D（不是旧款二维 XB273K）", "Odyssey 3D G90XF 27″（LS27FG900…，地区尾码不同）"],
  ["主链接", "https://midstereo.com/solution", "https://viewx3d.com/viewx-liber/", "https://item.jd.com/100387934554.html（现售量产 SKU；官网暂无独立产品页）", "https://www.acer.com/tw-zh/predator/monitors/spatiallabs-view-27/pdp/FF.R2DTA.003", "https://news.acer.com/acers-new-predator-and-nitro-monitors-bring-gaming-experiences-to-life", "https://www.samsung.com/uk/monitors/gaming/odyssey-3d-g90xf-27-inch-165hz-uhd-ls27fg900xuxxu/"],
  ["分辨率", "2D：3200×2000；3D：3200×2000（旧版官方产品资料；当前官网另称单眼可达物理分辨率、2D/3D 无损切换）", "3840×2160（4K UHD）", "3840×2160（4K UHD）；3D 单眼/每视图有效分辨率未公开", "3840×2160；官方未公布 3D 单眼有效分辨率", "3840×2160（4K UHD）；官方未公布 3D 单眼有效分辨率", "3840×2160；3D 仅支持 UHD 输入；官方未公布单眼有效分辨率"],
  ["刷新率", "厂商未公开；删除“推测 60 Hz”", "60 Hz", "原生 180 Hz；超频 185 Hz（早期预热/展机资料曾称面板 190 Hz）", "最高 160 Hz", "最高 180 Hz", "最高 165 Hz"],
  ["尺寸", "厂商未公开", "356.7×216.8×16.3 mm", "613.3×524.16×227.97 mm（含底座，宽×高×深）", "裸机：628.6×387.5×29.5 mm（台湾区域口径，待复核）；含底座约：627.4×477.5–607.1×304.8 mm（美版官方商店）", "官方发布稿未公布；原 613×246×570 mm 暂无可追溯产品级来源", "裸机：614.1×372.2×46.0 mm；含底座：614.1×541.5×203.3 mm"],
  ["重量", "厂商未公开", "约 1274 g", "暂未检索到可追溯的官方/零售参数；原“约 6 kg”不可确认", "裸机约 4.86 kg（台湾区域口径，待复核）；含底座约 6.80 kg（美版官方商店）", "官方发布稿未公布；原 6.55 kg 暂无可追溯产品级来源", "裸机 4.7 kg；含底座 7.5 kg"],
  ["亮度", "厂商未公开", "350 cd/m²（2D/3D 均标称 350）", "SDR 峰值：典型 650 nit、最低 550 nit；HDR 峰值 1400 nit；XDR 峰值 2000 nit", "400 cd/m²", "400 cd/m²", "典型 350 cd/m²；最低 280 cd/m²"],
  ["对比度", "厂商未公开", "1000:1（静态）", "1200:1（静态）", "1000:1（静态）", "原生静态值未公布；100,000,000:1 是 ACM 动态对比度，不能填入静态栏", "1000:1（静态）"],
  ["色彩 / 位深", "厂商未公开", "8-bit（约 1670 万色）", "1.07B 色；10-bit（零售报道注明 8-bit + FRC）", "10.7 亿色 / 10-bit 输出；原生 10-bit 或 FRC 未说明", "1.07B 色；8-bit + FRC（10-bit 抖动）", "Max 1B 色；官方未说明原生 10-bit 或 8-bit + FRC"],
  ["色域", "厂商未公开", "72% NTSC / 100% sRGB", "100% sRGB（CIE 1931）；99% DCI-P3 / 99% Adobe RGB（CIE 1976）", "95% DCI-P3", "95% DCI-P3", "99% sRGB（CIE 1931）"],
  ["响应时间", "厂商未公开", "25 ms（未注明 GTG/MPRT）", "1 ms（GTG）", "5 ms（GTG）", "1 ms / 0.5 ms（GTG，Min.）", "1 ms（GTG）"],
  ["面板 / 背光", "厂商未公开；删除“推测 IPS”", "IPS LCD", "Fast IPS；早期/展会资料称 BOE ADS Pro；QD Mini LED 为背光（2304 分区）", "AHVA（IPS 类）", "IPS；中国零售资料称 Fast IPS", "IPS（官方未写 Fast IPS）"],
  ["可视角度 / 3D FoV", "3D FoV：±20°；2D 面板视角未公开", "2D：178°；3D 最佳观看角 40°（±20°）", "178°（H）/178°（V）", "2D：178°/178°", "178°/178°", "178°/178°"],
  ["3D 成像技术", "指向光场；2D/3D 无损切换；时空混合控光/时间分像/空间分光属于技术族表述", "液晶透镜（LC Liquid Crystal Lens）；官网另称 Proprietary GRIN LC Lens / Metasurface Liquid Crystal Lens，未证明两者严格等义", "3D 立体光学透镜；展会报道进一步称“第三代液晶树脂棱镜”方案；支持实时 2D→3D", "2D/3D 可切换双凸透镜（lenticular lens）+ SpatialLabs 渲染", "SpatialLabs 3D；3D 光学透镜 + 本地 AI 2D→3D + SpatialLabs 3D Hub", "Light Field Display；前置双凸透镜 + View Mapping 视图映射"],
  ["眼 / 头部追踪", "产品页：单人头部追踪；官网技术族另述 AI 人眼跟踪", "180 fps 高速眼动追踪，随视线实时调整；官方仅确认单用户", "双摄像头 + 双红外补光；自动对焦、毫秒级响应；宣称串扰率 ≤2%（非独立实测）", "立体摄像头实时眼/头部追踪；未公布眼追算法帧率", "3D 眼部追踪 + 本地 AI 模型；未公布摄像头/算法帧率", "顶部双目立体摄像头实时检测双眼位置与距离；官方访谈称可识别戴眼镜用户"],
  ["固定视点数量", "未公开；“单人版/单用户”不等于单视点", "未公开；Single Viewer 不等于固定 2-view", "未公开；双摄像头不等于“双视点”", "未公开；官方只说明单用户动态左右眼视图", "未公开；眼追 3D 不等于固定 2-view", "未公开；单人模式不等于固定 2-view"],
  ["3D 最佳观看距离（非出屏深度）", "40–75 cm", "40–70 cm", "未公开", "约 50–110 cm（随内容；19.69″–43.3″）", "未公开", "55–95 cm；建议位于正前方左右各 25°内"],
  ["视频输入", "厂商未公开", "Mini HDMI 2.0 ×1；USB-C ×2（DP 视频输入）", "HDMI 2.1 ×2；DisplayPort 1.4 ×1；USB-C（90 W）×1", "HDMI 2.1 ×1；DisplayPort 1.4 ×1；USB-C（DP Alt）×1", "HDMI 2.1 ×2；DisplayPort 1.4 ×1", "HDMI 2.1 ×2；DisplayPort 1.4 ×1"],
  ["其他 I/O / 音频", "厂商未公开", "Micro-USB ×1（工厂模式）；3.5 mm 音频输出 ×1", "USB-B ×1；USB-A ×2；3.5 mm 音频输出；2×5 W + 12 W 低音扬声器", "USB 3.2 Hub、音频输出（具体 A 口数量以地区 SKU 页为准）", "USB-B 上行 ×1；USB-A 3.2 ×2；音频输出；5 W ×2 扬声器", "USB-B 上行 ×1；USB-A 3.1 Gen1 ×2；5 W ×2 扬声器；无 USB-C / 3.5 mm 耳机口"],
  ["相关补充", "当前官网技术族另列：3D 窗口化、全局串扰率 <5%、大尺寸方案支持 3–5 人；不可自动绑定到该 16 英寸产品", "Single Viewer；2D/3D 标称亮度相同；跃出幅度可调但无厘米值", "2304 分区；24 V 8.3 A / 200 W Max；ΔE<1；VESA 100×100；升降 90 mm、旋转/竖屏支架", "FreeSync Premium；区域资料所列 1280×480@60 fps 只能表示相机视频流（待复核），不能当眼追算法频率", "FreeSync Premium + G-SYNC Compatible；5 W×2；VESA 100×100", "3D 需 UHD 输入；官方支持指南给出 55–95 cm / ±25°范围"],
  ["公开状态摘要", "多数硬件规格未公开；不可用推测补齐", "核心规格完整；视点数和“出屏深度”未公开", "零售核心规格较完整；重量、观看距离、固定视点数未公开", "核心面板规格完整；单眼分辨率、固定视点数、眼追帧率未公开", "发布稿核心规格完整；尺寸、重量、单眼分辨率、静态对比度、固定视点数、观看距离未公开", "核心规格完整；单眼分辨率、固定视点数、原生位深/追踪相机规格未公开"],
];

const issues = [
  ["1", "MiD 16″", "型号", "16 英寸裸眼 3D 便携显示器", "需说明", "保留为公开产品名称；不要把它当作字母数字 SKU", "全网未见可核验的具体 SKU。", "A", "MID-01"],
  ["1", "MiD 16″", "刷新率", "未明确（推测 60 Hz）", "推测应删除", "厂商未公开", "没有产品级来源支持 60 Hz。", "A/F", "MID-01"],
  ["1", "MiD 16″", "面板类型", "LCD（推测 IPS）", "推测应删除", "厂商未公开", "便携屏外观或同类产品不能证明面板模式。", "A/F", "MID-01"],
  ["1", "MiD 16″", "可视角度", "±20°（3D FoV）", "口径混用", "3D FoV ±20°；2D 面板视角未公开", "3D 视场角不是普通液晶面板可视角。", "A", "MID-01"],
  ["1", "MiD 16″", "3D 成像技术", "自由曲面直下背光 + 菲涅尔透镜阵列", "证据越级", "产品级只写“指向光场”；更细结构仅作专利/技术族备注", "这是多个专利概念的拼接；尚无证据把该结构绑定到这台 16 英寸产品。", "B/E", "MID-02;MID-03"],
  ["1", "MiD 16″", "眼球追踪", "AI 眼瞳跟踪预判", "证据越级", "产品级：单人头部追踪；AI 人眼跟踪仅为技术族表述", "官网技术页不能自动等同每一在售产品配置。", "A/B", "MID-01;MID-02"],
  ["1", "MiD 16″", "视点数量", "单人版单用户", "概念错误", "固定视点数未公开", "用户人数不等于离散视点数。", "A", "MID-01"],
  ["1", "MiD 16″", "出屏距离", "40–75 cm", "口径混用", "3D 最佳观看距离 40–75 cm；出屏深度未公开", "这是人眼到屏幕距离，不是画面跃出屏幕的距离。", "A", "MID-01"],
  ["2", "ViewX Liber", "品牌", "view X", "格式错误", "ViewX", "官方品牌无空格，X 大写。", "A", "VIEW-01"],
  ["2", "ViewX Liber", "型号", "ViewX 15.6 英寸…", "型号不完整", "ViewX Liber 15.6″ Glass Free 3D Spatial AI Display", "当前产品页标题含 Liber。", "A", "VIEW-01"],
  ["2", "ViewX Liber", "面板类型", "LCD（IPS 推测）", "已可证实", "IPS", "官方 Product Profile 和规格页明确写 IPS。", "A", "VIEW-02;VIEW-04"],
  ["2", "ViewX Liber", "3D 技术", "超表面液晶透镜（GRIN LC，即…）", "过度等同", "并列记录 LC Lens / GRIN LC / Metasurface LC Lens", "官网未证明 GRIN LC 与“超表面液晶透镜”严格等义。", "A", "VIEW-01;VIEW-02"],
  ["2", "ViewX Liber", "眼球追踪", "180 fps + 红外捕捉 + 动态光场 + AI 光场计算", "证据混用", "官方确认 180 fps 与实时调整；其余扩展措辞标为媒体报道", "新华网稿件并非完整硬件规格表。", "A/D", "VIEW-01;VIEW-05"],
  ["2", "ViewX Liber", "视点数量", "双视点（推测）", "推测错误", "固定视点数未公开；官方仅写 Single Viewer", "单用户与双视点不是同一指标。", "A", "VIEW-02;VIEW-04"],
  ["2", "ViewX Liber", "出屏距离", "40–70 cm", "口径混用", "3D 最佳观看距离 40–70 cm；出屏深度未公开", "说明书只给观看距离，跃出幅度可调但无厘米值。", "A", "VIEW-03"],
  ["2", "ViewX Liber", "视频接口", "含 Micro USB 与 3.5 mm", "分类错误", "视频输入仅 Mini HDMI 2.0 ×1、USB-C ×2", "Micro-USB 是工厂模式，3.5 mm 是音频输出。", "A", "VIEW-03"],
  ["3", "M27E6V-3D", "型号/链接", "TITANM27E6V；链接指向 id/383", "严重错误", "M27E6V-3D；改用官方 3D 专区/零售页", "id/383 实际是 M27E6V-PRO 普通 2D 屏，参数不能迁移。", "A/B", "TITAN-01;TITAN-04"],
  ["3", "M27E6V-3D", "刷新率", "185 Hz（原生 180 Hz）", "零售版正确", "原生 180 Hz / 超频 185 Hz；早期 190 Hz 单列备注", "早期预热和上市零售口径不同，应以最终在售版为主。", "C/D", "TITAN-02;TITAN-04"],
  ["3", "M27E6V-3D", "尺寸", "613.3×227.97×524.16 mm", "维度顺序错误", "613.3×524.16×227.97 mm（宽×高×深）", "零售参数图的顺序为宽×高×深。", "C", "TITAN-04"],
  ["3", "M27E6V-3D", "重量", "约 6 kg", "未证实", "暂未检索到可追溯值", "官方 3D 专区、上市参数图和主流报道均未列。", "B/C/D", "TITAN-01;TITAN-04"],
  ["3", "M27E6V-3D", "面板类型", "Fast IPS（BOE ADS Pro）", "需拆分", "面板：Fast IPS / ADS Pro；背光：2304 分区 QD Mini LED", "QD Mini LED 是背光，不是面板类型；BOE ADS Pro 来自早期/展会资料。", "C/D", "TITAN-02;TITAN-04"],
  ["3", "M27E6V-3D", "可视角度", "未明确", "可补全", "178°/178°", "上市参数图已列出。", "C", "TITAN-04"],
  ["3", "M27E6V-3D", "视点数量", "双视点（2-view）", "无依据", "固定视点数未公开", "双摄像头/双眼追踪不等于固定双视点。", "B/C/D", "TITAN-01;TITAN-03;TITAN-04"],
  ["4", "PSV27-2", "分辨率", "3D 模式单眼 1920×1080", "无官方依据", "只写整屏 3840×2160；单眼有效分辨率未公开", "不要按光学结构自行折算后当作官方规格。", "A", "ACER-P-01;ACER-P-03"],
  ["4", "PSV27-2", "尺寸/重量", "628.6×387.5×29.5 mm；4.86 kg", "区域口径待复核", "标为裸机台湾区域口径；另补美版含底座约 627.4×477.5–607.1×304.8 mm、6.80 kg", "两组数值并不冲突；本轮台湾页 CDN 超时，裸机值需待页面恢复后复核。", "A", "ACER-P-02;ACER-P-03"],
  ["4", "PSV27-2", "色彩", "10-bit", "口径不完整", "10.7 亿色 / 10-bit 输出；实现方式未说明", "不能据此断言原生 10-bit。", "A", "ACER-P-03"],
  ["4", "PSV27-2", "眼球追踪", "1280×480@60 fps，因此眼追 60 fps", "概念风险", "立体摄像头实时追踪；眼追算法帧率未公开", "相机视频输出规格即使存在，也不等于算法追踪帧率。", "A", "ACER-P-01;ACER-P-04"],
  ["4", "PSV27-2", "视点数量", "双视点（2-view）", "无依据", "固定视点数未公开；单用户动态左右眼视图", "动态眼追不应被写成固定双视点。", "A", "ACER-P-04"],
  ["4", "PSV27-2", "出屏距离", "约 50–110 cm", "口径混用", "3D 最佳观看距离约 50–110 cm", "这是观看距离，不是出屏深度。", "A", "ACER-P-03"],
  ["5", "XB273K 3D", "型号", "Predator XB273K", "严重歧义", "Predator XB273K 3D", "旧款 XB273K 是另一台二维 4K 144 Hz 显示器。", "A", "ACER-X-01"],
  ["5", "XB273K 3D", "静态对比度", "100,000,000:1（ACM）", "口径错误", "原生静态值未公开；ACM 动态 100,000,000:1", "ACM 不能填入“静态对比度”栏。", "A", "ACER-X-01"],
  ["5", "XB273K 3D", "尺寸/重量", "613×246×570 mm；6.55 kg", "未证实", "暂写“官方未公布 / 暂未检索到可追溯产品级来源”", "不得套用 2018 老款 XB273K 的尺寸重量；现有官方发布稿完全未列。", "A/C", "ACER-X-01;ACER-X-02;ACER-X-03"],
  ["5", "XB273K 3D", "视点数量", "双视点（2-view）", "无依据", "固定视点数未公开", "眼动追踪和左右眼渲染不等于公开了固定视点数。", "A", "ACER-X-01"],
  ["6", "G90XF", "分辨率", "3D 模式单眼 1920×2160", "推算冒充规格", "整屏 3840×2160；厂商未公开单眼有效分辨率", "1920×2160 只能算按水平分配的推算，不能列作官方值。", "A", "SAMSUNG-01;SAMSUNG-04"],
  ["6", "G90XF", "色彩", "10-bit", "口径不完整", "Max 1B 色；原生位深/FRC 未公开", "颜色数不自动证明原生 10-bit。", "A", "SAMSUNG-01"],
  ["6", "G90XF", "面板类型", "IPS（Fast IPS）", "证据不足", "IPS", "官方规格只写 IPS，未写 Fast IPS。", "A", "SAMSUNG-01"],
  ["6", "G90XF", "视点数量", "双视点（2-view）", "无依据", "固定视点数未公开；官方按单人眼追描述", "双目摄像头不是双视点参数。", "A", "SAMSUNG-03;SAMSUNG-04"],
  ["6", "G90XF", "出屏距离", "约 50–70 cm", "数值错误", "3D 最佳观看距离 55–95 cm；左右各 25°内", "官方使用指南给出更宽的有效范围。", "A", "SAMSUNG-03;SAMSUNG-04"],
  ["6", "G90XF", "视频接口", "把 USB 与扬声器混列为视频接口", "分类错误", "视频输入：HDMI 2.1 ×2、DP 1.4 ×1；USB/扬声器另列", "USB Hub 和扬声器不是视频输入。", "A", "SAMSUNG-01"],
];

const sources = [
  ["MID-01", "MiD 16″", "A", "官方解决方案/旧版产品资料", "弥德科技解决方案：16 英寸产品及指向光场能力", "https://midstereo.com/solution", "旧版产品资料/用户截图支持 3200×2000、3D FoV、观看距离；当前页主要展示技术族能力。"],
  ["MID-02", "MiD 技术族", "B", "官方技术页", "时间空间混合控制与 AI 人眼跟踪", "https://midstereo.com/technology.html", "仅能作为技术族/公司能力，不能自动绑定到 16 英寸 SKU。"],
  ["MID-03", "MiD 专利族", "E", "公开专利列表", "指向背光、菲涅尔透镜、折叠/弧形背光等专利", "https://aiqicha.baidu.com/company_patent_29707660703987", "含 CN106609959A、CN106772718B、CN106773084A、CN103197428B、CN117434744A、CN112946912B；均未明确绑定该 16 英寸产品。"],
  ["VIEW-01", "ViewX Liber", "A", "官方产品页", "ViewX Liber 产品页", "https://viewx3d.com/viewx-liber/", "完整型号、180 fps、GRIN LC Lens。"],
  ["VIEW-02", "ViewX Liber", "A", "官方规格页", "ViewX Wholesale / Technical Specs", "https://viewx3d.com/wholesale/", "IPS、Single Viewer、接口、Metasurface LC Lens。"],
  ["VIEW-03", "ViewX Liber", "A", "官方中文手册", "ViewX 用户手册（中文）", "https://www.viewx3d.com/wp-content/uploads/download/usermanual/ViewxUserManual_CN.pdf", "分辨率、亮度、色域、响应、接口、尺寸、重量与 40–70 cm。"],
  ["VIEW-04", "ViewX Liber", "A", "官方 Product Profile", "ViewX Liber Product Profile", "https://viewx3d.com/wp-content/uploads/download/usermanual/ViewX_Liber_Product_Profile.pdf", "IPS、180 fps、±20°、Single Viewer。"],
  ["VIEW-05", "ViewX Liber", "D", "媒体/发布稿转述", "新华网：ViewX 发布报道", "https://www.xinhuanet.com/finance/20260529/50c36353f88343698c8ed3fd7da0219b/c.html", "红外捕捉、动态光场、AI 光场计算等扩展描述；不等同官方规格表。"],
  ["TITAN-01", "M27E6V-3D", "B", "官方 3D 专区", "M27E6V-3D 专用裸眼 3D 程序与 PC-TOOL", "https://www.titanarmy.cn/portal/list/index/id/50.html", "可确认型号及其与 M27E6V-PRO 为独立产品；页面不含完整硬件表。"],
  ["TITAN-02", "M27E6V-3D", "D", "媒体预热报道", "UHD 190 Hz / HDR 1400 预热资料", "https://www.ithome.com/0/968/380.htm", "属于早期/展机阶段；刷新率与最终零售版不同。"],
  ["TITAN-03", "M27E6V-3D", "D", "展会实机报道", "XDR 2000 与第三代液晶树脂棱镜方案", "https://www.ithome.com/0/970/130.htm", "双摄像头、双 IR、毫秒追踪、≤2% 串扰均为厂商展示/媒体转述。"],
  ["TITAN-04", "M27E6V-3D", "C/D", "上市报道+零售参数图", "4K 185 Hz M27E6V-3D 上市", "https://www.ithome.com/0/983/305.htm", "最终零售口径：原生 180/超频 185、亮度、色域、尺寸、接口。"],
  ["TITAN-05", "M27E6V-3D", "C", "京东商品页", "泰坦军团旗舰店商品 SKU 100387934554", "https://item.jd.com/100387934554.html", "零售页会变更；用于交叉核对上市配置。"],
  ["ACER-P-01", "PSV27-2", "A", "官方产品页", "Predator SpatialLabs View 27", "https://www.acer.com/tw-zh/predator/monitors/spatiallabs-view-27", "27 英寸、4K、160 Hz、AHVA、400 nit、5 ms。"],
  ["ACER-P-02", "PSV27-2", "A", "官方地区 SKU 页", "FF.R2DTA.003", "https://www.acer.com/tw-zh/predator/monitors/spatiallabs-view-27/pdp/FF.R2DTA.003", "台湾地区料号；本轮 CDN 超时，裸机尺寸/重量需待页面恢复复核。"],
  ["ACER-P-03", "PSV27-2", "A", "官方商店", "27″ Predator SpatialLabs View 27 Monitor - PSV27-2", "https://store.acer.com/en-us/27-predator-spatiallabs-view-27-monitor-psv27-2", "美国地区尺寸、重量、色彩、观看距离与连接信息。"],
  ["ACER-P-04", "PSV27-2", "B", "官方新闻稿", "Acer Expands SpatialLabs Stereoscopic 3D Portfolio", "https://news.acer.com/acer-expands-spatiallabs-stereoscopic-3d-portfolio-with-new-laptop-and-gaming-monitor", "SpatialLabs 可切换光学与眼/头部追踪。"],
  ["ACER-X-01", "XB273K 3D", "A", "官方发布稿+规格表", "Acer’s New Predator and Nitro Monitors Bring Gaming Experiences to Life", "https://news.acer.com/acers-new-predator-and-nitro-monitors-bring-gaming-experiences-to-life", "明确型号含 3D；4K 180 Hz、亮度、ACM、位深、色域、接口。"],
  ["ACER-X-02", "XB273K 3D", "C/D", "中国上市报道", "掠夺者 XB273K 3D 上市", "https://www.ithome.com/0/975/994.htm", "中国零售页图可确认上市配置与接口，但未给可核验尺寸/重量。"],
  ["ACER-X-03", "XB273K 3D", "C", "京东商品页", "宏碁掠夺者 XB273K 3D，SKU 100362195168", "https://item.jd.com/100362195168.html", "零售页会变更；不是旧款二维 XB273K；尺寸/重量暂不可核。"],
  ["SAMSUNG-01", "G90XF", "A", "官方产品规格", "Odyssey 3D G90XF 27″", "https://www.samsung.com/uk/monitors/gaming/odyssey-3d-g90xf-27-inch-165hz-uhd-ls27fg900xuxxu/", "尺寸、重量、亮度、颜色数、色域、面板、接口。"],
  ["SAMSUNG-02", "G90XF", "A", "官方支持页", "LS27FG900XUXXU Support", "https://www.samsung.com/uk/support/model/LS27FG900XUXXU/", "手册与固件入口。"],
  ["SAMSUNG-03", "G90XF", "A", "官方 3D 使用指南", "How to use 3D on the Odyssey 3D", "https://www.samsung.com/uk/support/displays/how-to-use-3d-on-the-odyssey-3d-gaming-monitor/", "观看范围、姿态与 3D 使用限制。"],
  ["SAMSUNG-04", "G90XF", "A", "官方在线手册", "Using the 3D Monitor", "https://downloadcenter.samsung.com/content/PM/202511/20251126154323473/EN/ENG/ENG/005_using_the_3d_monitor_1.html", "55–95 cm、左右各 25°、单人使用及 UHD 输入要求。"],
  ["SAMSUNG-05", "G90XF", "B", "官方技术发布", "Samsung Unveils Glasses-Free Odyssey 3D", "https://news.samsung.com/global/samsung-electronics-unveils-groundbreaking-glasses-free-odyssey-3d-gaming-monitor-at-gamescom-2024", "Light Field Display、lenticular lens、eye tracking、View Mapping。"],
  ["SAMSUNG-06", "G90XF", "B", "官方研发访谈", "Transforming the Monitor Experience with Odyssey 3D", "https://news.samsung.com/global/interview-transforming-the-monitor-experience-expanding-the-boundaries-with-odyssey-3d", "双眼位置/距离检测与戴眼镜用户识别。"],
];

// Main sheet
main.showGridLines = false;
main.getRange("A1:G1").merge();
main.getRange("A1").values = [["六款裸眼 3D 显示器参数核验（修正版）"]];
main.getRange("A2:G2").merge();
main.getRange("A2").values = [["核验日期：2026-08-05｜观看距离 ≠ 出屏深度；单用户 ≠ 固定视点数；动态对比度 ≠ 静态对比度"]];
main.getRange("A3:G3").merge();
main.getRange("A3").values = [["未公开＝厂商未披露且未找到可信产品级来源；第三方数据均在“错误与证据 / 来源索引”中降级标注。"]];
main.getRange(`A4:G${3 + mainRows.length}`).values = mainRows;
main.freezePanes.freezeRows(4);
main.freezePanes.freezeColumns(1);

main.getRange("A1:G1").format = { fill: "#16324F", font: { bold: true, color: "#FFFFFF", size: 18 }, horizontalAlignment: "center", verticalAlignment: "center" };
main.getRange("A2:G2").format = { fill: "#DCEAF4", font: { color: "#16324F", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
main.getRange("A3:G3").format = { fill: "#EFF6F8", font: { color: "#355A6C", italic: true, size: 9 }, horizontalAlignment: "left", verticalAlignment: "center", wrapText: true };
main.getRange("A4:G4").format = { fill: "#0F766E", font: { bold: true, color: "#FFFFFF", size: 11 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#B7CCC9" } };
main.getRange(`A5:G${3 + mainRows.length}`).format = { font: { color: "#172B36", size: 9 }, verticalAlignment: "center", wrapText: true, borders: { insideHorizontal: { style: "thin", color: "#D8E3E8" }, insideVertical: { style: "thin", color: "#E4ECEF" }, bottom: { style: "thin", color: "#BCCDD3" } } };
main.getRange(`A5:A${3 + mainRows.length}`).format = { fill: "#E8F2F2", font: { bold: true, color: "#164E63", size: 9 }, verticalAlignment: "center", wrapText: true, borders: { insideHorizontal: { style: "thin", color: "#C9D9DD" }, right: { style: "medium", color: "#8DB1B6" } } };
main.getRange(`B5:G${3 + mainRows.length}`).format.horizontalAlignment = "left";
main.getRange(`A5:A${3 + mainRows.length}`).format.horizontalAlignment = "center";
main.getRange(`A1:A${3 + mainRows.length}`).format.columnWidth = 22;
main.getRange(`B1:G${3 + mainRows.length}`).format.columnWidth = 38;
main.getRange("A1:G1").format.rowHeight = 34;
main.getRange("A2:G2").format.rowHeight = 28;
main.getRange("A3:G3").format.rowHeight = 27;
main.getRange("A4:G4").format.rowHeight = 42;
main.getRange(`A5:G${3 + mainRows.length}`).format.rowHeight = 45;
for (const row of [7, 8, 9, 11, 12, 16, 18, 19, 22, 23, 24, 25, 26]) {
  if (row <= 3 + mainRows.length) main.getRange(`A${row}:G${row}`).format.rowHeight = 62;
}
for (const row of [20, 21]) main.getRange(`A${row}:G${row}`).format.rowHeight = 92;
main.getRange(`B5:G${3 + mainRows.length}`).conditionalFormats.add("containsText", { text: "未公开", format: { fill: "#EEF2F5", font: { color: "#52606D" } } });
main.getRange(`B5:G${3 + mainRows.length}`).conditionalFormats.add("containsText", { text: "未公布", format: { fill: "#EEF2F5", font: { color: "#52606D" } } });
main.getRange(`B5:G${3 + mainRows.length}`).conditionalFormats.add("containsText", { text: "推测", format: { fill: "#FFF4D6", font: { color: "#8A5B00" } } });

// Issues sheet
issuesSheet.showGridLines = false;
issuesSheet.getRange("A1:I1").merge();
issuesSheet.getRange("A1").values = [["错误、口径混用与证据等级"]];
issuesSheet.getRange("A2:I2").merge();
issuesSheet.getRange("A2").values = [["结论优先级：官方规格/手册 ＞ 官方新闻/支持页 ＞ 官方旗舰零售页 ＞ 可靠媒体/实机 ＞ 专利或技术族 ＞ 推测。"]];
issuesSheet.getRange("A3:I3").values = [["序号", "产品", "字段", "原填写", "结论", "建议 / 修正", "核验说明", "证据等级", "来源 ID"]];
issuesSheet.getRange(`A4:I${3 + issues.length}`).values = issues;
issuesSheet.freezePanes.freezeRows(3);
issuesSheet.getRange("A1:I1").format = { fill: "#16324F", font: { bold: true, color: "#FFFFFF", size: 17 }, horizontalAlignment: "center", verticalAlignment: "center" };
issuesSheet.getRange("A2:I2").format = { fill: "#DCEAF4", font: { color: "#16324F", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
issuesSheet.getRange("A3:I3").format = { fill: "#0F766E", font: { bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#B7CCC9" } };
issuesSheet.getRange(`A4:I${3 + issues.length}`).format = { font: { color: "#243746", size: 9 }, verticalAlignment: "top", wrapText: true, borders: { insideHorizontal: { style: "thin", color: "#D8E3E8" }, insideVertical: { style: "thin", color: "#E4ECEF" } } };
issuesSheet.getRange(`A4:A${3 + issues.length}`).format.horizontalAlignment = "center";
issuesSheet.getRange(`E4:E${3 + issues.length}`).format.horizontalAlignment = "center";
issuesSheet.getRange(`H4:I${3 + issues.length}`).format.horizontalAlignment = "center";
issuesSheet.getRange(`A1:A${3 + issues.length}`).format.columnWidth = 8;
issuesSheet.getRange(`B1:B${3 + issues.length}`).format.columnWidth = 18;
issuesSheet.getRange(`C1:C${3 + issues.length}`).format.columnWidth = 16;
issuesSheet.getRange(`D1:D${3 + issues.length}`).format.columnWidth = 31;
issuesSheet.getRange(`E1:E${3 + issues.length}`).format.columnWidth = 18;
issuesSheet.getRange(`F1:F${3 + issues.length}`).format.columnWidth = 38;
issuesSheet.getRange(`G1:G${3 + issues.length}`).format.columnWidth = 42;
issuesSheet.getRange(`H1:H${3 + issues.length}`).format.columnWidth = 12;
issuesSheet.getRange(`I1:I${3 + issues.length}`).format.columnWidth = 24;
issuesSheet.getRange("A1:I1").format.rowHeight = 34;
issuesSheet.getRange("A2:I2").format.rowHeight = 30;
issuesSheet.getRange("A3:I3").format.rowHeight = 38;
issuesSheet.getRange(`A4:I${3 + issues.length}`).format.rowHeight = 55;
const statusRange = issuesSheet.getRange(`E4:E${3 + issues.length}`);
statusRange.conditionalFormats.add("containsText", { text: "错误", format: { fill: "#FDE2E2", font: { bold: true, color: "#991B1B" } } });
statusRange.conditionalFormats.add("containsText", { text: "无依据", format: { fill: "#FDE2E2", font: { bold: true, color: "#991B1B" } } });
statusRange.conditionalFormats.add("containsText", { text: "推测", format: { fill: "#FFF1CF", font: { color: "#8A5B00" } } });
statusRange.conditionalFormats.add("containsText", { text: "口径", format: { fill: "#FFE8C2", font: { color: "#8A4B08" } } });
statusRange.conditionalFormats.add("containsText", { text: "未证实", format: { fill: "#EEF2F5", font: { color: "#52606D" } } });

// Sources sheet
sourceSheet.showGridLines = false;
sourceSheet.getRange("A1:G1").merge();
sourceSheet.getRange("A1").values = [["来源索引与证据适用范围"]];
sourceSheet.getRange("A2:G2").merge();
sourceSheet.getRange("A2").values = [["等级 A＝官方规格/手册/产品页；B＝官方发布/支持/软件页；C＝旗舰店/零售页；D＝媒体/实机；E＝专利/技术族；F＝推测（不进入事实值）。"]];
sourceSheet.getRange("A3:G3").values = [["来源 ID", "产品", "等级", "来源类型", "标题 / 用途", "URL", "关键说明"]];
sourceSheet.getRange(`A4:G${3 + sources.length}`).values = sources;
sourceSheet.freezePanes.freezeRows(3);
sourceSheet.getRange("A1:G1").format = { fill: "#16324F", font: { bold: true, color: "#FFFFFF", size: 17 }, horizontalAlignment: "center", verticalAlignment: "center" };
sourceSheet.getRange("A2:G2").format = { fill: "#DCEAF4", font: { color: "#16324F", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
sourceSheet.getRange("A3:G3").format = { fill: "#0F766E", font: { bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#B7CCC9" } };
sourceSheet.getRange(`A4:G${3 + sources.length}`).format = { font: { color: "#243746", size: 9 }, verticalAlignment: "top", wrapText: true, borders: { insideHorizontal: { style: "thin", color: "#D8E3E8" }, insideVertical: { style: "thin", color: "#E4ECEF" } } };
sourceSheet.getRange(`A4:C${3 + sources.length}`).format.horizontalAlignment = "center";
sourceSheet.getRange(`A1:A${3 + sources.length}`).format.columnWidth = 16;
sourceSheet.getRange(`B1:B${3 + sources.length}`).format.columnWidth = 20;
sourceSheet.getRange(`C1:C${3 + sources.length}`).format.columnWidth = 9;
sourceSheet.getRange(`D1:D${3 + sources.length}`).format.columnWidth = 22;
sourceSheet.getRange(`E1:E${3 + sources.length}`).format.columnWidth = 40;
sourceSheet.getRange(`F1:F${3 + sources.length}`).format.columnWidth = 64;
sourceSheet.getRange(`G1:G${3 + sources.length}`).format.columnWidth = 46;
sourceSheet.getRange("A1:G1").format.rowHeight = 34;
sourceSheet.getRange("A2:G2").format.rowHeight = 32;
sourceSheet.getRange("A3:G3").format.rowHeight = 38;
sourceSheet.getRange(`A4:G${3 + sources.length}`).format.rowHeight = 54;

// Compact verification and previews.
const mainCheck = await workbook.inspect({ kind: "table", range: `修正后参数!A1:G${3 + mainRows.length}`, include: "values,formulas", tableMaxRows: 30, tableMaxCols: 7, maxChars: 5000 });
const errorCheck = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(mainCheck.ndjson);
console.log(errorCheck.ndjson);

for (const [sheetName, fileName] of [["修正后参数", "preview_main.png"], ["错误与证据", "preview_issues.png"], ["来源索引", "preview_sources.png"]]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/六款裸眼3D显示器参数核验_2026-08-05.xlsx`);
console.log(`saved:${outputDir}/六款裸眼3D显示器参数核验_2026-08-05.xlsx`);

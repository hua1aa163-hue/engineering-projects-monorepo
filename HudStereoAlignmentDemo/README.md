# HUD双目成像式色度计—六轴台对准Demo

这是一个可编译运行的 `.NET 8 + OpenCvSharp4` 示例，覆盖：

1. 离线生成左右相机内参、双目外参、手眼矩阵、HUD/风挡世界注册矩阵；
2. 在线原子化加载整套标定快照；
3. 核对设备序列号、图像配置、有效期、矩阵质量和标定RMS；
4. 计算双目中点TCP的目标位姿；
5. 反算六轴法兰目标位姿并执行软限位检查；
6. 同步采集左右HUD十字；
7. 去畸变、亚像素十字检测、视线角/视差/VID距离计算；
8. 绕双目中点TCP执行视觉闭环；
9. 保存诊断图和可追溯JSON记录。

Demo使用模拟相机和模拟六轴台，不会驱动真实设备。接入真机时，只替换：

- `ICameraPair`：对接双目成像式色度计SDK；
- `ISixAxisMotionController`：对接六轴台或机器人控制器。

## 1. 环境与运行

NuGet包：

```xml
<PackageReference Include="OpenCvSharp4" Version="4.13.0.20260627" />
<PackageReference Include="OpenCvSharp4.runtime.win" Version="4.13.0.20260627" />
```

运行：

```powershell
cd "D:\CHATGPT_file\else thing\HudStereoAlignmentDemo"
dotnet restore
dotnet run -c Release
```

也可以指定自己的标定文件：

```powershell
dotnet run -c Release -- "D:\calibration\hud-rig-01.json"
```

输出位于：

```text
bin\Release\net8.0\output\
  iter_00_left.png
  iter_00_right.png
  ...
  alignment_result.json
```

## 2. 坐标和矩阵约定

`AFromB`表示：

```text
p_A = AFromB · p_B
```

例如：

```text
W_From_C0 = W_From_F · F_From_C0
W_From_CL = W_From_C0 · C0_From_CL
W_From_CR = W_From_C0 · C0_From_CR
```

坐标系：

|符号|含义|
|---|---|
|`W`|台架世界坐标系|
|`F`|六轴台动平台/机器人法兰|
|`C0`|左右光学中心中点，即TCP|
|`CL/CR`|左/右相机坐标系|
|`H`|HUD安装基准坐标系|
|`S`|风挡基准坐标系|

相机使用OpenCV约定：X向图像右、Y向图像下、Z沿光轴向前。平移统一为mm，配置和界面角度为°，三角函数内部为rad。

## 3. 在线测试调用顺序

### 步骤1：加载完整标定快照

```csharp
var bundle = CalibrationService.LoadBundle(calibrationPath);
```

不要分别从四个目录随意选择“最新文件”。单目、双目、手眼、夹具注册应以同一个 `CalibrationId` 原子化发布。

### 步骤2：读取当前设备信息并校验

```csharp
var runtime = new RuntimeDeviceInfo(...);
var report = CalibrationService.ValidateBundle(bundle, runtime, DateTime.UtcNow);
if (!report.IsValid)
    throw new InvalidOperationException("标定无效，禁止自动运动");
```

有效性检查包括：

- 相机、镜头、双目支架、六轴设备、HUD夹具、风挡夹具编号；
- 分辨率与焦点标签；
- 标定有效期和mm单位；
- `RᵀR≈I`、`det(R)≈+1`；
- 基线 `65.000±0.020 mm`；
- 单目/双目RMS、极线残差、手眼RMS和注册RMS；
- `C0_From_CL/CR`与`CL_From_CR`坐标链闭合。

### 步骤3：计算名义双目TCP位姿

```csharp
var worldFromC0 = PosePlanningService.CalculateTargetC0Pose(bundle.Registration);
```

该函数先计算：

```text
设计眼点_W = W_From_H · 设计眼点_H
VID中心_W  = W_From_H · VID中心_H
```

再构造双目中点位于设计眼点、平均Z轴指向VID中心、滚转由 `WorldUp` 约束的 `W_From_C0`。

### 步骤4：反算法兰位姿并检查行程

```csharp
var worldFromF = PosePlanningService.CalculateTargetFlangePose(
    worldFromC0,
    bundle.HandEye.FlangeFromC0.ToRigidTransform());

var pose = worldFromF.ToPoseZyx();
var safety = MotionSafetyService.ValidateMotionCommand(pose, limits);
```

反算公式：

```text
W_From_F* = W_From_C0* · inverse(F_From_C0)
```

### 步骤5：低速运动并等待稳定

```csharp
await motion.MoveAbsoluteAsync(worldFromF, 5.0, 0.5, token);
await motion.WaitForInPositionAsync(TimeSpan.FromSeconds(10), token);
```

软件软限位不能替代硬件限位、碰撞检测、安全PLC和急停。

### 步骤6：同步采图、去畸变和十字检测

```csharp
using var frame = await cameras.CaptureAsync(token);
using var left = StereoVisionService.Undistort(frame.Left, bundle.LeftCamera);
var cross = StereoVisionService.DetectHudCross(left);
```

`DetectHudCross`的处理链：

```text
灰度/亮度通道 → 8位归一化 → Otsu二值化
→ Hough区分横线/竖线 → FitLine亚像素拟合
→ 两直线求交得到中心 → 水平线角度得到滚转
```

### 步骤7：计算光轴误差、视差和VID距离

```csharp
var observation = StereoVisionService.CalculateObservation(
    leftCross, rightCross,
    bundle.LeftCamera, bundle.RightCamera,
    baselineMm: 65.0);
```

关键公式：

```text
α = atan((u-cx)/fx)
β = atan((v-cy)/fy)
MeanYaw   = (αL+αR)/2
MeanPitch = (βL+βR)/2
dVID      = f·B/|xL-xR|
```

左右图像不应同时居中。正常情况下存在与虚像距离相关的水平视差，只要求平均视线指向目标。

### 步骤8：生成闭环角度修正

```csharp
var correction = StereoVisionService.BuildCorrection(observation, options);
var correctedC0 = PosePlanningService.ApplyFineCorrection(currentC0, correction);
```

本工程相机坐标约定下：

```text
Yaw修正   = Gain × MeanYaw
Pitch修正 = -Gain × MeanPitch
Roll修正  = Gain × 图像水平线角度
```

真机首次调试必须做正方向确认：六轴台分别执行很小的 `+Yaw/+Pitch/+Roll`，记录图像中心和水平线角度的变化方向，再在设备适配层固定轴符号。

### 步骤9：运行自动闭环并保存记录

```csharp
var result = await workflow.RunFineAlignmentAsync(token);
ResultLogService.SaveJson(logPath, bundle, runtime, result);
```

整体六轴台只能修正平均Yaw/Pitch/Roll，不能修复双目内部垂直视差。若左右图中心出现明显反向上下偏差，应调整单相机安装或重新进行双目标定。

## 4. 核心函数、参数和用途

### CalibrationService：在线加载和有效性检查

|函数|主要参数|返回/用途|
|---|---|---|
|`LoadBundle(filePath)`|标定JSON路径|返回完整 `CalibrationBundle`；不存在或JSON错误时抛异常|
|`ValidateBundle(bundle,runtime,nowUtc)`|标定快照、当前设备、当前UTC|总入口；返回 `ValidationReport`|
|`ValidateCamera(camera,...,report)`|单相机内参、相机/镜头SN、分辨率、焦点标签|检查内参身份、矩阵形状和RMS|
|`ValidateStereo(stereo,rigSn,report)`|双目标定、双目支架SN|检查65mm基线、极线残差和坐标链闭合|
|`ValidateHandEye(handEye,motionSn,report)`|手眼标定、六轴设备SN|检查 `F_From_C0` 和位置/角度RMS|
|`ValidateRegistration(registration,runtime,report)`|HUD/风挡注册和夹具身份|检查夹具、矩阵、设计点和注册RMS|
|`ValidateTransform(data,name,report)`|旋转+平移、矩阵名称|检查形状、正交性和行列式|

### OfflineCalibrationService：离线生成矩阵

|函数|主要参数|返回/用途|
|---|---|---|
|`CreateChessboardObjectPoints(pattern,squareMm)`|内角点数、格距mm|生成标定板三维点|
|`DetectChessboardCorners(image,pattern)`|标定图、内角点数|返回亚像素 `Point2f[]`|
|`CalibrateSingleCamera(objectSets,imageSets,imageSize)`|至少10组3D/2D点、分辨率|返回K、D、RMS、各视图rvec/tvec|
|`CalibrateStereo(objectSets,leftSets,rightSets,left,right,imageSize)`|同步双目角点和左右内参|固定内参求 `CL_From_CR`、E、F和RMS|
|`SolveCalibrationTargetPose(objectPoints,imagePoints,camera)`|板上3D点、图像点、内参|返回 `C_From_Target`|
|`CalibrateEyeInHand(worldFromFlangeSamples,cameraFromTargetSamples,method)`|至少8组同步 `W_From_F` 与 `C_From_Target`|返回 `F_From_Camera`|
|`RegisterRigidPointSets(localPoints,worldPoints)`|至少3组不共线同名点|Kabsch求 `W_From_Local`|
|`CalculateRegistrationRmsMm(transform,local,world)`|注册矩阵和同名点|返回三维RMS，单位mm|
|`SaveBundle(filePath,bundle)`|路径和审核后的完整标定包|保存在线测试用JSON|

手眼标定注意：如果标定板由左相机观测，OpenCV输出的是 `F_From_CL`。双目TCP需要：

```text
F_From_C0 = F_From_CL · CL_From_C0
CL_From_C0 = inverse(C0_From_CL)
```

### RigidTransform：坐标计算

|函数|参数|用途|
|---|---|---|
|`Identity()`|无|单位变换|
|`Compose(right)`|右侧坐标链变换|矩阵复合；如 `WFromF.Compose(FFromC0)`|
|`Inverse()`|无|求逆；A_From_B变成B_From_A|
|`TransformPoint(pointMm)`|三维点|旋转并平移|
|`TransformVector(vector)`|方向向量|只旋转|
|`RotationX/Y/Z(degrees)`|右手角度°|构造单轴旋转|
|`ApplyCameraLocalRotation(yaw,pitch,roll)`|绕相机Y/X/Z轴角度°|保持TCP位置不变追加姿态修正|
|`CreateCameraLookAt(origin,target,worldUp)`|眼点、VID中心、世界向上|构造 `W_From_C0`|
|`ToPoseZyx()`|无|矩阵转 `XYZ+RxRyRz`，满足 `R=Rz·Ry·Rx`|
|`FromPoseZyx(pose)`|六轴位姿|控制器位姿转刚体变换|
|`Determinant3x3/OrthogonalityError`|3×3矩阵|标定有效性检查|
|`DegreesToRadians/RadiansToDegrees`|角度|单位转换|
|`Norm/Normalize`|向量|长度和归一化|

### PosePlanningService：目标位姿

|函数|参数|返回/用途|
|---|---|---|
|`GetDesignEyePointWorld(registration)`|HUD世界注册|设计眼点世界坐标|
|`GetVidCenterWorld(registration)`|HUD世界注册|虚像中心世界坐标|
|`CalculateTargetC0Pose(registration)`|注册、眼点、VID中心、WorldUp|目标 `W_From_C0`|
|`CalculateTargetFlangePose(worldFromC0,flangeFromC0)`|目标TCP、手眼矩阵|目标 `W_From_F`|
|`CalculateCurrentC0Pose(worldFromF,flangeFromC0)`|法兰反馈、手眼矩阵|当前 `W_From_C0`|
|`ApplyFineCorrection(currentC0,correction)`|当前TCP位姿、局部角度修正|保持TCP位置的精调目标|

### StereoVisionService：图像和双目计算

|函数|参数|返回/用途|
|---|---|---|
|`Undistort(source,calibration)`|原图、对应内参|返回新建去畸变Mat，必须Dispose|
|`DetectHudCross(image,minimumWhitePixels)`|去畸变图、最低亮点数|返回亚像素中心、水平线角度、质量|
|`PixelToRayAngles(point,calibration)`|像素点、内参|返回水平/垂直视线角°|
|`CalculateObservation(left,right,leftK,rightK,baseline)`|左右检测、内参、基线|返回平均光轴误差、视差和dVID|
|`BuildCorrection(observation,options)`|当前观测、增益和限幅|返回绕相机Y/X/Z局部修正角|
|`IsConverged(observation,options)`|当前观测、阈值|全部指标满足时返回true|
|`CalculateVidDistanceMm(f,B,xL,xR)`|像素焦距、基线mm、左右X|返回VID距离mm|

### MotionSafetyService：运动前检查

|函数|参数|返回/用途|
|---|---|---|
|`ValidateMotionCommand(target,limits)`|六轴位姿、行程/精度/负载/速度|返回软限位报告|
|`CheckRange(value,min,max,axis,unit,report)`|单轴值及范围|向报告加入越界错误|

### AlignmentWorkflow：完整在线流程

|函数|参数|返回/用途|
|---|---|---|
|构造函数|bundle、motion、cameras、limits、options、outputDir|注入标定和硬件适配器|
|`ConnectAsync(token)`|取消令牌|连接六轴台和双目设备|
|`MoveToNominalHudPoseAsync(token)`|取消令牌|名义定位，返回目标 `W_From_F`|
|`CaptureAndMeasureAsync(prefix,token)`|诊断图前缀、取消令牌|采图并返回一次完整观测|
|`RunFineAlignmentAsync(token)`|取消令牌|自动闭环并返回最终结果|
|`MoveCheckedAsync(target,token)`|目标 `W_From_F`|软限位检查、运动、等待到位|
|`DrawDetection(image,result)`|诊断Mat、检测结果|在图像上画中心和角度|
|`PrintObservation(iteration,observation)`|迭代号、观测|控制台输出关键量|

### 硬件接口

`ICameraPair`：

|函数|参数|要求|
|---|---|---|
|`ConnectAsync(token)`|取消令牌|打开左右设备、核对SN、锁定分辨率/曝光/焦点|
|`CaptureAsync(token)`|取消令牌|返回同步 `StereoFrame`，时间差应满足项目要求|

`ISixAxisMotionController`：

|函数|参数|要求|
|---|---|---|
|`ConnectAsync(token)`|取消令牌|连接并检查伺服、安全链、报警状态|
|`GetWorldFromFlangeAsync(token)`|取消令牌|返回与本工程定义一致的 `W_From_F`|
|`MoveAbsoluteAsync(target,v,a,token)`|目标矩阵、线速度、角速度、取消令牌|绝对法兰运动；设备侧再次检查限位|
|`WaitForInPositionAsync(timeout,token)`|超时、取消令牌|同时检查到位、速度为零和稳定时间|

`ResultLogService.SaveJson(filePath,bundle,runtime,result)` 保存标定ID、设备身份、最终观测和最终法兰位姿。

## 5. 真机适配要点

### 双目成像式色度计

真机 `ICameraPair.CaptureAsync` 应完成：

1. 软件触发或硬触发同步曝光；
2. 等待左右帧号/时间戳对应；
3. 从色度计SDK取得几何定位所用亮度图；
4. 将SDK缓冲区复制为独立 `Mat`；
5. 返回 `StereoFrame`，由调用方统一释放。

若SDK输出16位或浮点亮度图，`DetectHudCross`会先归一化为8位定位图；正式亮度/色度测量仍须使用原始辐射定标数据，不能使用这张8位定位图。

### 六轴台或机器人

设备适配层必须明确：

- 控制器反馈的是 `W_From_F` 还是 `F_From_W`；
- 欧拉角顺序是ZYX、XYZ还是设备自定义；
- 角度单位是°还是rad；
- 平移单位是mm还是m；
- 正方向是否与本项目相机坐标约定一致。

推荐设备适配层内部全部转换成 `RigidTransform`，不要让控制器欧拉角进入视觉算法层。

## 6. Demo验证结果

模拟未建模装调残差：

```text
Yaw   +0.35°
Pitch -0.22°
Roll  +0.12°
```

当前Demo在4次闭环后得到：

```text
MeanYaw   -0.00013°
MeanPitch -0.00008°
Roll      -0.00007°
VDisp      0.000 px
HDisp     25.995 px
dVID    2500.4 mm
```

水平视差被保留，说明算法对准的是双目平均光轴，没有错误地把左右图都强制居中。

## 7. 上线前必须补充

- 相机SDK与六轴控制器真实适配器；
- 硬件急停、安全PLC、碰撞区和人员防护；
- 相机曝光、HDR、滤镜、对焦和色度计辐射定标状态管理；
- 标定文件签名/哈希、审批人、温度范围和失效规则；
- 六轴轴符号小步确认；
- 真实HUD十字的阈值、ROI、杂散光和反射抑制；
- 重复性、再现性、温漂和测量不确定度评估。

代码中的0.20 px、0.10 mm、0.02°等数值是本方案的工程建议默认值，应由设备能力、企业规范和最终验收指标确认。

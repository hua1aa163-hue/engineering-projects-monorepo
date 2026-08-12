using HudStereoAlignmentDemo.Core;
using HudStereoAlignmentDemo.Hardware;

namespace HudStereoAlignmentDemo;

public static class Program
{
    /// <summary>Demo入口：加载标定、校验、名义定位、视觉闭环并保存结果。</summary>
    /// <param name="args">可选第1项为标定JSON路径；省略时使用输出目录中的config/calibration.json。</param>
    /// <returns>0=成功，2=标定无效，1=运行异常。</returns>
    public static async Task<int> Main(string[] args)
    {
        try
        {
            var calibrationPath = args.Length > 0
                ? Path.GetFullPath(args[0])
                : Path.Combine(AppContext.BaseDirectory, "config", "calibration.json");
            var outputDirectory = Path.Combine(AppContext.BaseDirectory, "output");
            Directory.CreateDirectory(outputDirectory);

            Console.WriteLine("1. 加载整套标定快照");
            var bundle = CalibrationService.LoadBundle(calibrationPath);
            var runtime = CreateDemoRuntimeDeviceInfo();

            Console.WriteLine("2. 核对设备身份、矩阵质量、有效期和单位");
            var validation = CalibrationService.ValidateBundle(bundle, runtime, DateTime.UtcNow);
            PrintValidation(validation);
            if (!validation.IsValid)
            {
                Console.Error.WriteLine("标定无效：禁止六轴台自动运动。");
                return 2;
            }

            RunMathematicalSelfChecks();

            var limits = CreateDemoSixAxisLimits();
            var options = CreateDemoAlignmentOptions();

            await using var motion = new SimulatedSixAxisController(RigidTransform.Identity());
            // 模拟未被手眼模型覆盖的0.35°/−0.22°/0.12°装调误差。
            var opticalBias = RigidTransform.Identity()
                .ApplyCameraLocalRotation(0.35, -0.22, 0.12);
            await using var cameras = new SyntheticCameraPair(bundle, motion, opticalBias);
            var workflow = new AlignmentWorkflow(
                bundle,
                motion,
                cameras,
                limits,
                options,
                outputDirectory);

            using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));
            Console.WriteLine("3. 连接模拟六轴台和模拟双目相机");
            await workflow.ConnectAsync(cts.Token);

            Console.WriteLine("4. 计算W_From_C0目标和W_From_F法兰指令，执行名义对准");
            var nominalFlange = await workflow.MoveToNominalHudPoseAsync(cts.Token);
            Console.WriteLine($"   名义法兰位姿：{FormatPose(nominalFlange.ToPoseZyx())}");

            Console.WriteLine("5. 采集左右HUD十字并执行视觉闭环");
            var result = await workflow.RunFineAlignmentAsync(cts.Token);

            var logPath = Path.Combine(outputDirectory, "alignment_result.json");
            ResultLogService.SaveJson(logPath, bundle, runtime, result);
            Console.WriteLine("6. 对准完成");
            Console.WriteLine($"   迭代次数：{result.Iterations}");
            Console.WriteLine($"   最终法兰位姿：{FormatPose(result.FinalFlangePose)}");
            Console.WriteLine($"   结果日志：{logPath}");
            Console.WriteLine($"   诊断图目录：{outputDirectory}");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"运行失败：{ex.Message}");
            Console.Error.WriteLine(ex);
            return 1;
        }
    }

    /// <summary>创建与示例标定文件严格匹配的模拟设备身份。</summary>
    /// <returns>Demo运行时设备信息。</returns>
    public static RuntimeDeviceInfo CreateDemoRuntimeDeviceInfo() => new(
        LeftCameraSerial: "ICM-L-00125",
        RightCameraSerial: "ICM-R-00126",
        LeftLensSerial: "LENS-L-35-008",
        RightLensSerial: "LENS-R-35-009",
        StereoRigSerial: "STEREO-65-01",
        MotionDeviceSerial: "HEXAPOD-02",
        HudFixtureSerial: "HUD-FIX-07",
        WindshieldFixtureSerial: "WS-FIX-03",
        ImageWidth: 1280,
        ImageHeight: 720,
        FocusTag: "VID-2500MM");

    /// <summary>创建Demo六轴设备的行程、精度、负载和低速调试参数。</summary>
    /// <returns>供软限位检查使用的六轴限制。</returns>
    public static SixAxisLimits CreateDemoSixAxisLimits() => new(
        XMinMm: -500, XMaxMm: 500,
        YMinMm: -500, YMaxMm: 500,
        ZMinMm: -500, ZMaxMm: 500,
        RxMinDeg: -180, RxMaxDeg: 180,
        RyMinDeg: -180, RyMaxDeg: 180,
        RzMinDeg: -180, RzMaxDeg: 180,
        RatedLoadKg: 30,
        PayloadKg: 18,
        PositionAccuracyMm: 0.05,
        RotationAccuracyDeg: 0.01,
        MaxLinearSpeedMmPerSec: 5,
        MaxAngularSpeedDegPerSec: 0.5);

    /// <summary>创建视觉闭环的增益、限幅和停止阈值。</summary>
    /// <returns>默认最多12次，Yaw/Pitch阈值0.5 arcmin的闭环配置。</returns>
    public static AlignmentOptions CreateDemoAlignmentOptions() => new(
        MaxIterations: 12,
        Gain: 0.80,
        MaxCoarseStepDeg: 0.10,
        MaxFineStepDeg: 0.02,
        FineThresholdDeg: 0.05,
        YawToleranceDeg: 0.5 / 60.0,
        PitchToleranceDeg: 0.5 / 60.0,
        RollToleranceDeg: 0.02,
        VerticalDisparityTolerancePx: 0.20);

    /// <summary>把校验报告打印到控制台。</summary>
    /// <param name="report">CalibrationService.ValidateBundle的输出。</param>
    public static void PrintValidation(ValidationReport report)
    {
        if (report.Issues.Count == 0)
        {
            Console.WriteLine("   所有标定参数有效。");
            return;
        }

        foreach (var issue in report.Issues)
            Console.WriteLine($"   [{(issue.IsError ? "错误" : "警告")}] {issue.Code}: {issue.Message}");
    }

    /// <summary>将六轴位姿格式化为单行工程输出。</summary>
    /// <param name="pose">要显示的XYZ+RxRyRz位姿。</param>
    /// <returns>含mm和°单位的字符串。</returns>
    public static string FormatPose(Pose6D pose) =>
        $"X={pose.XMm:F3}mm, Y={pose.YMm:F3}mm, Z={pose.ZMm:F3}mm, " +
        $"Rx={pose.RxDeg:F5}°, Ry={pose.RyDeg:F5}°, Rz={pose.RzDeg:F5}°";

    /// <summary>用已知刚体变换检查矩阵复合、求逆和Kabsch点集注册。</summary>
    /// <exception cref="InvalidOperationException">数值误差超过1e-6mm。</exception>
    public static void RunMathematicalSelfChecks()
    {
        var known = new RigidTransform(
            RigidTransform.RotationZ(12.0).Rotation,
            [120.0, -35.0, 18.0]);
        var localPoints = new[]
        {
            new[] { 0.0, 0.0, 0.0 },
            new[] { 100.0, 0.0, 0.0 },
            new[] { 0.0, 80.0, 0.0 },
            new[] { 20.0, 15.0, 60.0 }
        };
        var worldPoints = localPoints.Select(known.TransformPoint).ToArray();
        var estimated = OfflineCalibrationService.RegisterRigidPointSets(localPoints, worldPoints);
        var rms = OfflineCalibrationService.CalculateRegistrationRmsMm(estimated, localPoints, worldPoints);
        var inverseRoundTrip = known.Inverse().TransformPoint(known.TransformPoint(localPoints[3]));
        var inverseError = Math.Sqrt(inverseRoundTrip.Zip(localPoints[3], (a, b) => (a - b) * (a - b)).Sum());
        if (rms > 1e-6 || inverseError > 1e-6)
            throw new InvalidOperationException($"矩阵自检失败：registrationRms={rms:E3}, inverseError={inverseError:E3}。");
    }
}

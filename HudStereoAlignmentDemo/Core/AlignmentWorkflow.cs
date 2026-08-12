using HudStereoAlignmentDemo.Hardware;
using OpenCvSharp;

namespace HudStereoAlignmentDemo.Core;

/// <summary>组织名义位姿计算、六轴运动、同步采图、十字检测和视觉闭环。</summary>
public sealed class AlignmentWorkflow
{
    private readonly CalibrationBundle _bundle;
    private readonly ISixAxisMotionController _motion;
    private readonly ICameraPair _cameras;
    private readonly SixAxisLimits _limits;
    private readonly AlignmentOptions _options;
    private readonly string _outputDirectory;

    public AlignmentWorkflow(
        CalibrationBundle bundle,
        ISixAxisMotionController motion,
        ICameraPair cameras,
        SixAxisLimits limits,
        AlignmentOptions options,
        string outputDirectory)
    {
        _bundle = bundle;
        _motion = motion;
        _cameras = cameras;
        _limits = limits;
        _options = options;
        _outputDirectory = outputDirectory;
        Directory.CreateDirectory(outputDirectory);
    }

    /// <summary>连接六轴控制器和双目相机。</summary>
    /// <param name="cancellationToken">用于取消连接。</param>
    public async Task ConnectAsync(CancellationToken cancellationToken)
    {
        await _motion.ConnectAsync(cancellationToken);
        await _cameras.ConnectAsync(cancellationToken);
    }

    /// <summary>把双目中点移动到设计眼点，并使名义平均光轴指向VID中心。</summary>
    /// <param name="cancellationToken">用于取消运动或等待。</param>
    /// <returns>已发送并到位的目标WFromF。</returns>
    public async Task<RigidTransform> MoveToNominalHudPoseAsync(CancellationToken cancellationToken)
    {
        var targetC0 = PosePlanningService.CalculateTargetC0Pose(_bundle.Registration);
        var targetFlange = PosePlanningService.CalculateTargetFlangePose(
            targetC0,
            _bundle.HandEye.FlangeFromC0.ToRigidTransform());
        await MoveCheckedAsync(targetFlange, cancellationToken);
        return targetFlange;
    }

    /// <summary>采集左右图、去畸变、检测十字并计算双目对准观测。</summary>
    /// <param name="imageNamePrefix">保存诊断图的前缀；传null则不保存。</param>
    /// <param name="cancellationToken">用于取消采图。</param>
    /// <returns>光轴误差、视差、滚转和虚像距离。</returns>
    public async Task<AlignmentObservation> CaptureAndMeasureAsync(
        string? imageNamePrefix,
        CancellationToken cancellationToken)
    {
        using var frame = await _cameras.CaptureAsync(cancellationToken);
        using var leftUndistorted = StereoVisionService.Undistort(frame.Left, _bundle.LeftCamera);
        using var rightUndistorted = StereoVisionService.Undistort(frame.Right, _bundle.RightCamera);

        var leftCross = StereoVisionService.DetectHudCross(leftUndistorted);
        var rightCross = StereoVisionService.DetectHudCross(rightUndistorted);
        DrawDetection(leftUndistorted, leftCross);
        DrawDetection(rightUndistorted, rightCross);

        if (!string.IsNullOrWhiteSpace(imageNamePrefix))
        {
            Cv2.ImWrite(Path.Combine(_outputDirectory, $"{imageNamePrefix}_left.png"), leftUndistorted);
            Cv2.ImWrite(Path.Combine(_outputDirectory, $"{imageNamePrefix}_right.png"), rightUndistorted);
        }

        var baseline = RigidTransform.Norm(_bundle.Stereo.LeftFromRight.TranslationMm);
        return StereoVisionService.CalculateObservation(
            leftCross,
            rightCross,
            _bundle.LeftCamera,
            _bundle.RightCamera,
            baseline);
    }

    /// <summary>循环执行“采图—计算修正—绕TCP运动”，直到满足阈值。</summary>
    /// <param name="cancellationToken">用于取消采图、运算或运动。</param>
    /// <returns>迭代次数、最终观测和最终法兰位姿。</returns>
    /// <exception cref="InvalidOperationException">超过最大迭代次数或命令超限。</exception>
    public async Task<AlignmentRunResult> RunFineAlignmentAsync(CancellationToken cancellationToken)
    {
        AlignmentObservation? latest = null;
        for (var iteration = 0; iteration <= _options.MaxIterations; iteration++)
        {
            latest = await CaptureAndMeasureAsync($"iter_{iteration:00}", cancellationToken);
            PrintObservation(iteration, latest);

            if (StereoVisionService.IsConverged(latest, _options))
            {
                var finalWorldFromFlange = await _motion.GetWorldFromFlangeAsync(cancellationToken);
                return new(iteration, latest, finalWorldFromFlange.ToPoseZyx());
            }

            if (iteration == _options.MaxIterations) break;

            // 整体六轴运动不能修复双目内部的差分垂直误差。
            if (Math.Abs(latest.VerticalDisparityPx) > _options.VerticalDisparityTolerancePx * 5)
                throw new InvalidOperationException(
                    $"垂直视差={latest.VerticalDisparityPx:F3}px过大，应调整单相机支架或重做双目标定，不能靠整体六轴台修正。");

            var correction = StereoVisionService.BuildCorrection(latest, _options);
            var currentFlange = await _motion.GetWorldFromFlangeAsync(cancellationToken);
            var currentC0 = PosePlanningService.CalculateCurrentC0Pose(
                currentFlange,
                _bundle.HandEye.FlangeFromC0.ToRigidTransform());
            var targetC0 = PosePlanningService.ApplyFineCorrection(currentC0, correction);
            var targetFlange = PosePlanningService.CalculateTargetFlangePose(
                targetC0,
                _bundle.HandEye.FlangeFromC0.ToRigidTransform());
            await MoveCheckedAsync(targetFlange, cancellationToken);
        }

        throw new InvalidOperationException(
            $"视觉闭环在{_options.MaxIterations}次后仍未收敛。最后观测：" +
            $"Yaw={latest?.MeanYawRayDeg:F5}°，Pitch={latest?.MeanPitchRayDeg:F5}°，Roll={latest?.MeanRollImageDeg:F5}°。");
    }

    /// <summary>执行软限位检查，然后发送绝对运动并等待稳定。</summary>
    /// <param name="targetWorldFromFlange">目标WFromF。</param>
    /// <param name="cancellationToken">用于取消运动或等待。</param>
    public async Task MoveCheckedAsync(
        RigidTransform targetWorldFromFlange,
        CancellationToken cancellationToken)
    {
        var pose = targetWorldFromFlange.ToPoseZyx();
        var safety = MotionSafetyService.ValidateMotionCommand(pose, _limits);
        if (!safety.IsValid)
            throw new InvalidOperationException("运动安全检查失败：" +
                string.Join("；", safety.Issues.Where(x => x.IsError).Select(x => x.Message)));

        await _motion.MoveAbsoluteAsync(
            targetWorldFromFlange,
            _limits.MaxLinearSpeedMmPerSec,
            _limits.MaxAngularSpeedDegPerSec,
            cancellationToken);
        await _motion.WaitForInPositionAsync(TimeSpan.FromSeconds(10), cancellationToken);
    }

    /// <summary>在诊断图上标记检测中心和角度信息。</summary>
    /// <param name="image">要直接修改的诊断图。</param>
    /// <param name="result">十字检测结果。</param>
    public static void DrawDetection(Mat image, CrossDetectionResult result)
    {
        var center = new Point((int)Math.Round(result.CenterPx.X), (int)Math.Round(result.CenterPx.Y));
        Cv2.Circle(image, center, 12, Scalar.Gray, 2, LineTypes.AntiAlias);
        Cv2.PutText(
            image,
            $"({result.CenterPx.X:F2},{result.CenterPx.Y:F2}) angle={result.HorizontalLineAngleDeg:F3}deg",
            new Point(20, 35),
            HersheyFonts.HersheySimplex,
            0.6,
            Scalar.Gray,
            1,
            LineTypes.AntiAlias);
    }

    /// <summary>向控制台输出一轮闭环的关键观测量。</summary>
    /// <param name="iteration">当前迭代编号，0表示名义位姿到位后的首次观测。</param>
    /// <param name="observation">本轮双目观测。</param>
    public static void PrintObservation(int iteration, AlignmentObservation observation)
    {
        Console.WriteLine(
            $"迭代{iteration:00}: MeanYaw={observation.MeanYawRayDeg,9:F5}°, " +
            $"MeanPitch={observation.MeanPitchRayDeg,9:F5}°, " +
            $"Roll={observation.MeanRollImageDeg,9:F5}°, " +
            $"VDisp={observation.VerticalDisparityPx,7:F3}px, " +
            $"HDisp={observation.HorizontalDisparityPx,8:F3}px, " +
            $"dVID={observation.EstimatedVidDistanceMm,9:F1}mm");
    }
}

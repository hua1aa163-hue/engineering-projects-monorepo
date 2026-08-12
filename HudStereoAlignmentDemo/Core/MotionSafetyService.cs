namespace HudStereoAlignmentDemo.Core;

/// <summary>六轴运动指令的软限位、负载和速度检查。</summary>
public static class MotionSafetyService
{
    /// <summary>检查目标位姿、负载、定位精度和速度设置是否满足项目限制。</summary>
    /// <param name="target">准备发送给控制器的目标位姿。</param>
    /// <param name="limits">设备行程、角度、额定负载、实际负载和速度参数。</param>
    /// <returns>无错误表示可以进入设备侧二次安全检查。</returns>
    public static ValidationReport ValidateMotionCommand(Pose6D target, SixAxisLimits limits)
    {
        var report = new ValidationReport();
        CheckRange(target.XMm, limits.XMinMm, limits.XMaxMm, "X", "mm", report);
        CheckRange(target.YMm, limits.YMinMm, limits.YMaxMm, "Y", "mm", report);
        CheckRange(target.ZMm, limits.ZMinMm, limits.ZMaxMm, "Z", "mm", report);
        CheckRange(target.RxDeg, limits.RxMinDeg, limits.RxMaxDeg, "Rx", "°", report);
        CheckRange(target.RyDeg, limits.RyMinDeg, limits.RyMaxDeg, "Ry", "°", report);
        CheckRange(target.RzDeg, limits.RzMinDeg, limits.RzMaxDeg, "Rz", "°", report);

        if (limits.PayloadKg > limits.RatedLoadKg)
            report.Error("PAYLOAD", $"实际负载{limits.PayloadKg:F1}kg超过额定负载{limits.RatedLoadKg:F1}kg。");
        if (limits.PositionAccuracyMm > 0.10)
            report.Warning("POSITION_ACCURACY", "设备标称位置精度差于0.10mm，可能不能满足眼点定位指标。");
        if (limits.RotationAccuracyDeg > 0.02)
            report.Warning("ROTATION_ACCURACY", "设备标称角度精度差于0.02°，可能不能满足光轴定位指标。");
        if (limits.MaxLinearSpeedMmPerSec <= 0 || limits.MaxAngularSpeedDegPerSec <= 0)
            report.Error("SPEED", "运动速度必须大于0。");
        return report;
    }

    /// <summary>检查单个轴值是否处于闭区间。</summary>
    /// <param name="value">目标轴值。</param>
    /// <param name="min">允许的最小值。</param>
    /// <param name="max">允许的最大值。</param>
    /// <param name="axis">轴名称。</param>
    /// <param name="unit">显示单位。</param>
    /// <param name="report">接收越界错误的报告。</param>
    public static void CheckRange(
        double value,
        double min,
        double max,
        string axis,
        string unit,
        ValidationReport report)
    {
        if (value < min || value > max)
            report.Error($"LIMIT_{axis.ToUpperInvariant()}", $"{axis}={value:F3}{unit}超出[{min:F3},{max:F3}]{unit}。");
    }
}

using OpenCvSharp;

namespace HudStereoAlignmentDemo.Core;

/// <summary>HUD十字检测、像素转视线角、双目视差和闭环修正计算。</summary>
public static class StereoVisionService
{
    /// <summary>使用相机内参和畸变系数对原始图像去畸变。</summary>
    /// <param name="source">相机原始图像，灰度或彩色Mat。</param>
    /// <param name="calibration">与相机、镜头、分辨率和焦点位置匹配的内参。</param>
    /// <returns>新建的去畸变图像；调用方负责Dispose。</returns>
    public static Mat Undistort(Mat source, CameraCalibration calibration)
    {
        using var k = calibration.CreateCameraMatrix();
        using var d = calibration.CreateDistCoeffs();
        var output = new Mat();
        Cv2.Undistort(source, output, k, d);
        return output;
    }

    /// <summary>在黑底白色HUD十字图中检测十字中心和水平线角度。</summary>
    /// <param name="image">建议先调用Undistort得到的图像。</param>
    /// <param name="minimumWhitePixels">有效亮像素下限；用于发现HUD未点亮或曝光错误。</param>
    /// <returns>中心像素、水平线相对图像X轴的角度和0~1质量值。</returns>
    /// <exception cref="InvalidOperationException">亮像素不足或没有检测到水平线。</exception>
    public static CrossDetectionResult DetectHudCross(Mat image, int minimumWhitePixels = 100)
    {
        using var grayRaw = new Mat();
        if (image.Channels() == 1) image.CopyTo(grayRaw);
        else Cv2.CvtColor(image, grayRaw, ColorConversionCodes.BGR2GRAY);

        using var gray = new Mat();
        if (grayRaw.Depth() == MatType.CV_8U) grayRaw.CopyTo(gray);
        else Cv2.Normalize(grayRaw, gray, 0, 255, NormTypes.MinMax, MatType.CV_8U);

        using var binary = new Mat();
        Cv2.Threshold(gray, binary, 0, 255, ThresholdTypes.Binary | ThresholdTypes.Otsu);
        var whitePixels = Cv2.CountNonZero(binary);
        if (whitePixels < minimumWhitePixels)
            throw new InvalidOperationException($"HUD十字亮像素只有{whitePixels}，低于{minimumWhitePixels}。请检查点亮、曝光和ROI。");

        var lines = Cv2.HoughLinesP(binary, 1, Math.PI / 180.0, 40, 40, 8);
        var candidates = lines
            .Select(line => new
            {
                Line = line,
                Angle = NormalizeLineAngle(Math.Atan2(
                    line.P2.Y - line.P1.Y,
                    line.P2.X - line.P1.X) * 180.0 / Math.PI),
                Length = Math.Sqrt(
                    Math.Pow(line.P2.X - line.P1.X, 2) +
                    Math.Pow(line.P2.Y - line.P1.Y, 2))
            })
            .OrderByDescending(x => x.Length)
            .ToArray();
        var horizontalCandidates = candidates.Where(x => Math.Abs(x.Angle) <= 30.0).ToArray();
        var verticalCandidates = candidates.Where(x => Math.Abs(Math.Abs(x.Angle) - 90.0) <= 30.0).ToArray();

        if (horizontalCandidates.Length == 0)
            throw new InvalidOperationException("没有检测到HUD十字的水平线。");
        if (verticalCandidates.Length == 0)
            throw new InvalidOperationException("没有检测到HUD十字的垂直线。");

        // Hough只用于分离水平/垂直线；FitLine和两线交点给出亚像素中心及滚转角。
        var horizontalLine = FitBinaryLine(binary, horizontalCandidates[0].Line);
        var verticalLine = FitBinaryLine(binary, verticalCandidates[0].Line);
        var center = IntersectLines(horizontalLine, verticalLine);
        var angle = NormalizeLineAngle(Math.Atan2(horizontalLine.Vy, horizontalLine.Vx) * 180.0 / Math.PI);
        var totalLength = horizontalCandidates[0].Length + verticalCandidates[0].Length;
        var quality = Math.Clamp(totalLength / Math.Max(image.Width, image.Height), 0.0, 1.0);
        return new(center, angle, quality);
    }

    /// <summary>收集Hough粗线附近亮点并用M估计器拟合亚像素直线。</summary>
    /// <param name="binary">8位二值图。</param>
    /// <param name="coarse">HoughLinesP返回的粗线段。</param>
    /// <returns>方向向量和线上一点组成的Line2D。</returns>
    private static Line2D FitBinaryLine(Mat binary, LineSegmentPoint coarse)
    {
        var dx0 = coarse.P2.X - coarse.P1.X;
        var dy0 = coarse.P2.Y - coarse.P1.Y;
        var coarseLength = Math.Sqrt(dx0 * dx0 + dy0 * dy0);
        var ux = dx0 / coarseLength;
        var uy = dy0 / coarseLength;
        var fitPoints = new List<Point2f>();
        var rows = binary.Rows;
        var cols = binary.Cols;
        for (var y = 0; y < rows; y++)
        for (var x = 0; x < cols; x++)
        {
            if (binary.At<byte>(y, x) == 0) continue;
            var dx = x - coarse.P1.X;
            var dy = y - coarse.P1.Y;
            var perpendicularDistance = Math.Abs(-uy * dx + ux * dy);
            var longitudinalDistance = ux * dx + uy * dy;
            if (perpendicularDistance <= 5.0 &&
                longitudinalDistance >= -20.0 &&
                longitudinalDistance <= coarseLength + 20.0)
                fitPoints.Add(new Point2f(x, y));
        }

        if (fitPoints.Count < 20)
            throw new InvalidOperationException($"直线拟合点只有{fitPoints.Count}个，无法可靠拟合。");
        return Cv2.FitLine(fitPoints, DistanceTypes.L2, 0, 0.01, 0.001);
    }

    /// <summary>计算两条无限二维直线的亚像素交点。</summary>
    /// <param name="a">第一条直线。</param>
    /// <param name="b">第二条直线。</param>
    /// <returns>两线交点。</returns>
    private static Point2d IntersectLines(Line2D a, Line2D b)
    {
        var denominator = a.Vx * b.Vy - a.Vy * b.Vx;
        if (Math.Abs(denominator) < 1e-9) throw new InvalidOperationException("HUD十字两条拟合线近似平行。");
        var qpx = b.X1 - a.X1;
        var qpy = b.Y1 - a.Y1;
        var t = (qpx * b.Vy - qpy * b.Vx) / denominator;
        return new(a.X1 + t * a.Vx, a.Y1 + t * a.Vy);
    }

    /// <summary>把去畸变像素坐标转换为相机光轴坐标下的水平/垂直视线角。</summary>
    /// <param name="pointPx">去畸变后的像素坐标。</param>
    /// <param name="calibration">该相机内参。</param>
    /// <returns>Yaw为图像向右的视线角，Pitch为图像向下的视线角，单位°。</returns>
    public static (double YawDeg, double PitchDeg) PixelToRayAngles(
        Point2d pointPx,
        CameraCalibration calibration)
    {
        var yaw = Math.Atan2(pointPx.X - calibration.Cx, calibration.Fx);
        var pitch = Math.Atan2(pointPx.Y - calibration.Cy, calibration.Fy);
        return (RigidTransform.RadiansToDegrees(yaw), RigidTransform.RadiansToDegrees(pitch));
    }

    /// <summary>合并左右十字检测结果，计算整体指向误差、双目视差和虚像距离。</summary>
    /// <param name="left">左图十字检测结果。</param>
    /// <param name="right">右图十字检测结果。</param>
    /// <param name="leftCalibration">左相机内参。</param>
    /// <param name="rightCalibration">右相机内参。</param>
    /// <param name="baselineMm">双目基线长度，单位mm。</param>
    /// <returns>闭环所需的完整观测量。</returns>
    public static AlignmentObservation CalculateObservation(
        CrossDetectionResult left,
        CrossDetectionResult right,
        CameraCalibration leftCalibration,
        CameraCalibration rightCalibration,
        double baselineMm)
    {
        var leftAngles = PixelToRayAngles(left.CenterPx, leftCalibration);
        var rightAngles = PixelToRayAngles(right.CenterPx, rightCalibration);
        var horizontalDisparity = left.CenterPx.X - right.CenterPx.X;
        var verticalDisparity = left.CenterPx.Y - right.CenterPx.Y;
        var meanFocalPx = 0.5 * (leftCalibration.Fx + rightCalibration.Fx);
        var vidDistance = Math.Abs(horizontalDisparity) < 1e-9
            ? double.PositiveInfinity
            : Math.Abs(meanFocalPx * baselineMm / horizontalDisparity);

        return new(
            leftAngles.YawDeg,
            rightAngles.YawDeg,
            leftAngles.PitchDeg,
            rightAngles.PitchDeg,
            0.5 * (leftAngles.YawDeg + rightAngles.YawDeg),
            0.5 * (leftAngles.PitchDeg + rightAngles.PitchDeg),
            0.5 * (left.HorizontalLineAngleDeg + right.HorizontalLineAngleDeg),
            verticalDisparity,
            horizontalDisparity,
            vidDistance);
    }

    /// <summary>把图像观测误差转换为相机局部轴的限幅角度修正。</summary>
    /// <param name="observation">CalculateObservation的输出。</param>
    /// <param name="options">闭环增益、粗细调阈值和最大步长。</param>
    /// <returns>绕相机Y/X/Z轴的修正角，单位°。</returns>
    /// <remarks>
    /// 本Demo采用相机X向右、Y向下、Z向前：Yaw修正=平均水平视线角，
    /// Pitch修正=-平均垂直视线角，Roll修正=图像水平线角。
    /// 真机首次调试必须用已知正方向小步运动确认控制器轴符号。
    /// </remarks>
    public static CameraLocalCorrection BuildCorrection(
        AlignmentObservation observation,
        AlignmentOptions options)
    {
        var largest = new[]
        {
            Math.Abs(observation.MeanYawRayDeg),
            Math.Abs(observation.MeanPitchRayDeg),
            Math.Abs(observation.MeanRollImageDeg)
        }.Max();
        var maxStep = largest > options.FineThresholdDeg
            ? options.MaxCoarseStepDeg
            : options.MaxFineStepDeg;

        return new(
            ClampSymmetric(options.Gain * observation.MeanYawRayDeg, maxStep),
            ClampSymmetric(-options.Gain * observation.MeanPitchRayDeg, maxStep),
            ClampSymmetric(options.Gain * observation.MeanRollImageDeg, maxStep));
    }

    /// <summary>判断平均光轴、滚转和垂直视差是否全部满足停止阈值。</summary>
    /// <param name="observation">当前双目观测。</param>
    /// <param name="options">Yaw、Pitch、Roll和垂直视差阈值。</param>
    /// <returns>true表示视觉闭环可以结束。</returns>
    public static bool IsConverged(AlignmentObservation observation, AlignmentOptions options) =>
        Math.Abs(observation.MeanYawRayDeg) <= options.YawToleranceDeg &&
        Math.Abs(observation.MeanPitchRayDeg) <= options.PitchToleranceDeg &&
        Math.Abs(observation.MeanRollImageDeg) <= options.RollToleranceDeg &&
        Math.Abs(observation.VerticalDisparityPx) <= options.VerticalDisparityTolerancePx;

    /// <summary>计算双目虚像距离d=fB/|xL-xR|。</summary>
    /// <param name="focalLengthPx">校正后水平方向像素焦距。</param>
    /// <param name="baselineMm">基线，单位mm。</param>
    /// <param name="leftXPx">左图同名特征X坐标。</param>
    /// <param name="rightXPx">右图同名特征X坐标。</param>
    /// <returns>虚像距离，单位mm；零视差时返回正无穷。</returns>
    public static double CalculateVidDistanceMm(
        double focalLengthPx,
        double baselineMm,
        double leftXPx,
        double rightXPx)
    {
        var disparity = leftXPx - rightXPx;
        return Math.Abs(disparity) < 1e-9
            ? double.PositiveInfinity
            : Math.Abs(focalLengthPx * baselineMm / disparity);
    }

    private static double ClampSymmetric(double value, double absoluteLimit) =>
        Math.Clamp(value, -Math.Abs(absoluteLimit), Math.Abs(absoluteLimit));

    private static double NormalizeLineAngle(double angleDeg)
    {
        while (angleDeg > 90) angleDeg -= 180;
        while (angleDeg <= -90) angleDeg += 180;
        return angleDeg;
    }
}

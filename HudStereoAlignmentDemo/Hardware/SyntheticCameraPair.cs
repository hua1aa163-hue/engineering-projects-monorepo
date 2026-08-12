using HudStereoAlignmentDemo.Core;
using OpenCvSharp;

namespace HudStereoAlignmentDemo.Hardware;

/// <summary>
/// 根据当前六轴位姿投影HUD十字的模拟双目相机。固定光学偏置用于演示视觉闭环消除装调残差。
/// </summary>
public sealed class SyntheticCameraPair : ICameraPair
{
    private readonly CalibrationBundle _bundle;
    private readonly ISixAxisMotionController _motion;
    private readonly RigidTransform _unmodelledOpticalBias;
    private bool _connected;

    public SyntheticCameraPair(
        CalibrationBundle bundle,
        ISixAxisMotionController motion,
        RigidTransform unmodelledOpticalBias)
    {
        _bundle = bundle;
        _motion = motion;
        _unmodelledOpticalBias = unmodelledOpticalBias;
    }

    /// <inheritdoc />
    public Task ConnectAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _connected = true;
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task<StereoFrame> CaptureAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!_connected) throw new InvalidOperationException("模拟双目相机尚未连接。");

        var worldFromFlange = await _motion.GetWorldFromFlangeAsync(cancellationToken);
        var nominalWorldFromC0 = PosePlanningService.CalculateCurrentC0Pose(
            worldFromFlange,
            _bundle.HandEye.FlangeFromC0.ToRigidTransform());
        var physicalWorldFromC0 = nominalWorldFromC0.Compose(_unmodelledOpticalBias);

        var worldFromHud = _bundle.Registration.WorldFromHud.ToRigidTransform();
        var centerWorld = worldFromHud.TransformPoint(_bundle.Registration.VidCenterInHudMm);
        var horizontalWorld = worldFromHud.TransformPoint(_bundle.Registration.HudHorizontalPointInHudMm);

        var left = RenderCamera(
            _bundle.LeftCamera,
            physicalWorldFromC0.Compose(_bundle.Stereo.C0FromLeft.ToRigidTransform()),
            centerWorld,
            horizontalWorld);
        var right = RenderCamera(
            _bundle.RightCamera,
            physicalWorldFromC0.Compose(_bundle.Stereo.C0FromRight.ToRigidTransform()),
            centerWorld,
            horizontalWorld);
        return new(left, right, DateTime.UtcNow);
    }

    /// <summary>释放模拟相机连接。</summary>
    public ValueTask DisposeAsync()
    {
        _connected = false;
        return ValueTask.CompletedTask;
    }

    /// <summary>将世界中的HUD中心和水平参考点投影并绘制为黑底白十字图。</summary>
    /// <param name="calibration">当前相机内参。</param>
    /// <param name="worldFromCamera">当前WFromCamera。</param>
    /// <param name="centerWorld">HUD中心世界坐标，单位mm。</param>
    /// <param name="horizontalWorld">HUD水平参考点世界坐标，单位mm。</param>
    /// <returns>8位单通道模拟图像；调用方负责Dispose。</returns>
    public static Mat RenderCamera(
        CameraCalibration calibration,
        RigidTransform worldFromCamera,
        double[] centerWorld,
        double[] horizontalWorld)
    {
        var cameraFromWorld = worldFromCamera.Inverse();
        var centerPx = ProjectPoint(cameraFromWorld.TransformPoint(centerWorld), calibration);
        var horizontalPx = ProjectPoint(cameraFromWorld.TransformPoint(horizontalWorld), calibration);
        var image = Mat.Zeros(calibration.ImageHeight, calibration.ImageWidth, MatType.CV_8UC1).ToMat();

        var dx = horizontalPx.X - centerPx.X;
        var dy = horizontalPx.Y - centerPx.Y;
        var length = Math.Sqrt(dx * dx + dy * dy);
        if (length < 1e-6) throw new InvalidOperationException("HUD水平参考点投影与中心重合。");
        dx /= length;
        dy /= length;

        var cx = (int)Math.Round(centerPx.X);
        var cy = (int)Math.Round(centerPx.Y);
        var halfHorizontal = 500;
        var halfVertical = 120;
        const int shift = 8;
        const int subPixelScale = 1 << shift;
        var h1 = new Point(
            (int)Math.Round((centerPx.X - dx * halfHorizontal) * subPixelScale),
            (int)Math.Round((centerPx.Y - dy * halfHorizontal) * subPixelScale));
        var h2 = new Point(
            (int)Math.Round((centerPx.X + dx * halfHorizontal) * subPixelScale),
            (int)Math.Round((centerPx.Y + dy * halfHorizontal) * subPixelScale));
        var vx = -dy;
        var vy = dx;
        var v1 = new Point(
            (int)Math.Round((centerPx.X - vx * halfVertical) * subPixelScale),
            (int)Math.Round((centerPx.Y - vy * halfVertical) * subPixelScale));
        var v2 = new Point(
            (int)Math.Round((centerPx.X + vx * halfVertical) * subPixelScale),
            (int)Math.Round((centerPx.Y + vy * halfVertical) * subPixelScale));
        Cv2.Line(image, h1, h2, Scalar.White, 3, LineTypes.AntiAlias, shift);
        Cv2.Line(image, v1, v2, Scalar.White, 3, LineTypes.AntiAlias, shift);
        Cv2.Circle(image, new Point(cx, cy), 7, Scalar.White, 2, LineTypes.AntiAlias);
        return image;
    }

    /// <summary>用针孔模型将相机坐标三维点投影到像素坐标。</summary>
    /// <param name="pointCameraMm">相机坐标中的XYZ，要求Z&gt;0。</param>
    /// <param name="calibration">相机内参。</param>
    /// <returns>理想去畸变像素坐标。</returns>
    public static Point2d ProjectPoint(double[] pointCameraMm, CameraCalibration calibration)
    {
        if (pointCameraMm[2] <= 1e-6) throw new InvalidOperationException("HUD点位于相机后方或焦平面上。");
        return new(
            calibration.Fx * pointCameraMm[0] / pointCameraMm[2] + calibration.Cx,
            calibration.Fy * pointCameraMm[1] / pointCameraMm[2] + calibration.Cy);
    }
}

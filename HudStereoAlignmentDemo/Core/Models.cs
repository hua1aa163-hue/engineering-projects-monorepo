using OpenCvSharp;

namespace HudStereoAlignmentDemo.Core;

/// <summary>运行时检测到的设备和成像配置；用于确认标定文件没有串用。</summary>
public sealed record RuntimeDeviceInfo(
    string LeftCameraSerial,
    string RightCameraSerial,
    string LeftLensSerial,
    string RightLensSerial,
    string StereoRigSerial,
    string MotionDeviceSerial,
    string HudFixtureSerial,
    string WindshieldFixtureSerial,
    int ImageWidth,
    int ImageHeight,
    string FocusTag);

/// <summary>单个相机的几何内参和标定元数据。</summary>
public sealed class CameraCalibration
{
    public required string CameraSerial { get; init; }
    public required string LensSerial { get; init; }
    public required string FocusTag { get; init; }
    public required string DistortionModel { get; init; }
    public required int ImageWidth { get; init; }
    public required int ImageHeight { get; init; }
    public required double[][] CameraMatrix { get; init; }
    public required double[] DistCoeffs { get; init; }
    public required double ReprojectionRmsPx { get; init; }

    /// <summary>把JSON中的3×3内参转成OpenCvSharp矩阵。</summary>
    /// <returns>CV_64FC1的3×3相机矩阵；调用方负责Dispose。</returns>
    public Mat CreateCameraMatrix()
    {
        var result = new Mat(3, 3, MatType.CV_64FC1);
        for (var r = 0; r < 3; r++)
        for (var c = 0; c < 3; c++)
            result.Set(r, c, CameraMatrix[r][c]);
        return result;
    }

    /// <summary>把JSON中的畸变系数转成OpenCvSharp行向量。</summary>
    /// <returns>CV_64FC1畸变系数矩阵；调用方负责Dispose。</returns>
    public Mat CreateDistCoeffs()
    {
        var result = new Mat(1, DistCoeffs.Length, MatType.CV_64FC1);
        for (var i = 0; i < DistCoeffs.Length; i++) result.Set(0, i, DistCoeffs[i]);
        return result;
    }

    public double Fx => CameraMatrix[0][0];
    public double Fy => CameraMatrix[1][1];
    public double Cx => CameraMatrix[0][2];
    public double Cy => CameraMatrix[1][2];
}

/// <summary>可序列化的刚体变换；含3×3旋转和3×1平移，平移单位为mm。</summary>
public sealed class TransformData
{
    public required double[][] Rotation { get; init; }
    public required double[] TranslationMm { get; init; }

    /// <summary>将配置数据转换为可参与计算的刚体变换。</summary>
    /// <returns>与配置数据等价的RigidTransform。</returns>
    public RigidTransform ToRigidTransform() => new(Rotation, TranslationMm);
}

/// <summary>双目相机之间以及双目中点到左右相机的几何关系。</summary>
public sealed class StereoCalibration
{
    public required string StereoRigSerial { get; init; }
    public required double ExpectedBaselineMm { get; init; }
    public required TransformData LeftFromRight { get; init; }
    public required TransformData C0FromLeft { get; init; }
    public required TransformData C0FromRight { get; init; }
    public required double StereoRmsPx { get; init; }
    public required double RectifiedVerticalResidualPx { get; init; }
}

/// <summary>法兰坐标系到双目中点TCP坐标系的手眼标定。</summary>
public sealed class HandEyeCalibration
{
    public required string MotionDeviceSerial { get; init; }
    public required TransformData FlangeFromC0 { get; init; }
    public required double PositionRmsMm { get; init; }
    public required double RotationRmsDeg { get; init; }
}

/// <summary>HUD、风挡与世界坐标系的注册关系及关键设计点。</summary>
public sealed class WorldRegistration
{
    public required string HudFixtureSerial { get; init; }
    public required string WindshieldFixtureSerial { get; init; }
    public required TransformData WorldFromHud { get; init; }
    public required TransformData WorldFromWindshield { get; init; }
    public required double[] DesignEyePointInHudMm { get; init; }
    public required double[] VidCenterInHudMm { get; init; }
    public required double[] HudHorizontalPointInHudMm { get; init; }
    public required double[] WorldUp { get; init; }
    public required double HudRegistrationRmsMm { get; init; }
    public required double WindshieldRegistrationRmsMm { get; init; }
}

/// <summary>一套必须原子化加载的标定快照；禁止混用不同版本的子文件。</summary>
public sealed class CalibrationBundle
{
    public required string SchemaVersion { get; init; }
    public required string CalibrationId { get; init; }
    public required DateTime CreatedUtc { get; init; }
    public required DateTime ValidUntilUtc { get; init; }
    public required string LengthUnit { get; init; }
    public required CameraCalibration LeftCamera { get; init; }
    public required CameraCalibration RightCamera { get; init; }
    public required StereoCalibration Stereo { get; init; }
    public required HandEyeCalibration HandEye { get; init; }
    public required WorldRegistration Registration { get; init; }
}

/// <summary>单条标定校验结果。</summary>
public sealed record ValidationIssue(string Code, string Message, bool IsError);

/// <summary>整套标定文件的校验报告。</summary>
public sealed class ValidationReport
{
    public List<ValidationIssue> Issues { get; } = [];
    public bool IsValid => Issues.All(x => !x.IsError);

    /// <summary>加入一条错误；任何错误都会使IsValid变为false。</summary>
    /// <param name="code">可供程序判断的稳定错误码。</param>
    /// <param name="message">面向操作人员的说明。</param>
    public void Error(string code, string message) => Issues.Add(new(code, message, true));

    /// <summary>加入一条警告；警告不会单独阻止运动。</summary>
    /// <param name="code">可供程序判断的稳定警告码。</param>
    /// <param name="message">面向操作人员的说明。</param>
    public void Warning(string code, string message) => Issues.Add(new(code, message, false));
}

/// <summary>六轴设备的工作范围、负载和运动安全参数。</summary>
public sealed record SixAxisLimits(
    double XMinMm, double XMaxMm,
    double YMinMm, double YMaxMm,
    double ZMinMm, double ZMaxMm,
    double RxMinDeg, double RxMaxDeg,
    double RyMinDeg, double RyMaxDeg,
    double RzMinDeg, double RzMaxDeg,
    double RatedLoadKg,
    double PayloadKg,
    double PositionAccuracyMm,
    double RotationAccuracyDeg,
    double MaxLinearSpeedMmPerSec,
    double MaxAngularSpeedDegPerSec);

/// <summary>发送给六轴控制器的XYZ+RxRyRz位姿，角度采用ZYX欧拉角分解。</summary>
public sealed record Pose6D(
    double XMm, double YMm, double ZMm,
    double RxDeg, double RyDeg, double RzDeg);

/// <summary>一次左右相机同步采图；释放对象会同时释放两幅Mat。</summary>
public sealed class StereoFrame : IDisposable
{
    public StereoFrame(Mat left, Mat right, DateTime timestampUtc)
    {
        Left = left;
        Right = right;
        TimestampUtc = timestampUtc;
    }

    public Mat Left { get; }
    public Mat Right { get; }
    public DateTime TimestampUtc { get; }

    /// <summary>释放左右图像占用的OpenCV非托管内存。</summary>
    public void Dispose()
    {
        Left.Dispose();
        Right.Dispose();
    }
}

/// <summary>HUD十字中心和水平线方向的检测结果。</summary>
public sealed record CrossDetectionResult(Point2d CenterPx, double HorizontalLineAngleDeg, double Quality);

/// <summary>由左右图像得到的双目整体观测误差。</summary>
public sealed record AlignmentObservation(
    double LeftYawRayDeg,
    double RightYawRayDeg,
    double LeftPitchRayDeg,
    double RightPitchRayDeg,
    double MeanYawRayDeg,
    double MeanPitchRayDeg,
    double MeanRollImageDeg,
    double VerticalDisparityPx,
    double HorizontalDisparityPx,
    double EstimatedVidDistanceMm);

/// <summary>一次闭环迭代中实际施加到双目TCP局部坐标系的角度修正。</summary>
public sealed record CameraLocalCorrection(double YawAboutYDeg, double PitchAboutXDeg, double RollAboutZDeg);

/// <summary>视觉闭环的增益、步长和停止阈值。</summary>
public sealed record AlignmentOptions(
    int MaxIterations,
    double Gain,
    double MaxCoarseStepDeg,
    double MaxFineStepDeg,
    double FineThresholdDeg,
    double YawToleranceDeg,
    double PitchToleranceDeg,
    double RollToleranceDeg,
    double VerticalDisparityTolerancePx);

/// <summary>视觉闭环结束时的迭代次数、最终观测和最终法兰位姿。</summary>
public sealed record AlignmentRunResult(
    int Iterations,
    AlignmentObservation FinalObservation,
    Pose6D FinalFlangePose);

/// <summary>OpenCV单目标定直接输出的内参、畸变和各标定板位姿。</summary>
public sealed record SingleCameraCalibrationResult(
    double[,] CameraMatrix,
    double[] DistCoeffs,
    double RmsPx,
    Vec3d[] RotationVectors,
    Vec3d[] TranslationVectors);

/// <summary>OpenCV双目标定输出；LeftFromRight即左相机坐标中的右相机位姿。</summary>
public sealed record StereoExtrinsicResult(
    RigidTransform LeftFromRight,
    double RmsPx,
    double[,] EssentialMatrix,
    double[,] FundamentalMatrix);

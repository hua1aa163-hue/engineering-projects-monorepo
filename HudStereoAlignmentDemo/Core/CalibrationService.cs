using System.Text.Json;

namespace HudStereoAlignmentDemo.Core;

/// <summary>负责标定快照加载和运动前有效性校验。</summary>
public static class CalibrationService
{
    /// <summary>从JSON文件一次性读取完整标定快照。</summary>
    /// <param name="filePath">标定JSON绝对路径或相对当前进程的路径。</param>
    /// <returns>反序列化后的标定包。</returns>
    /// <exception cref="FileNotFoundException">文件不存在。</exception>
    /// <exception cref="InvalidDataException">JSON结构不完整或无法解析。</exception>
    public static CalibrationBundle LoadBundle(string filePath)
    {
        if (!File.Exists(filePath)) throw new FileNotFoundException("标定文件不存在。", filePath);
        var json = File.ReadAllText(filePath);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<CalibrationBundle>(json, options)
               ?? throw new InvalidDataException("标定JSON反序列化结果为空。");
    }

    /// <summary>校验完整标定快照和当前硬件身份，决定是否允许自动运动。</summary>
    /// <param name="bundle">通过LoadBundle读取的完整标定快照。</param>
    /// <param name="runtime">相机、镜头、支架、夹具和当前成像配置。</param>
    /// <param name="nowUtc">当前UTC时间；测试时可注入固定时间。</param>
    /// <returns>包含错误和警告的校验报告。仅IsValid为true时才可运动。</returns>
    public static ValidationReport ValidateBundle(
        CalibrationBundle bundle,
        RuntimeDeviceInfo runtime,
        DateTime nowUtc)
    {
        var report = new ValidationReport();

        if (bundle.SchemaVersion != "1.0") report.Error("SCHEMA", $"不支持的SchemaVersion={bundle.SchemaVersion}。");
        if (!string.Equals(bundle.LengthUnit, "mm", StringComparison.OrdinalIgnoreCase))
            report.Error("UNIT", "标定文件长度单位必须为mm。");
        if (nowUtc > bundle.ValidUntilUtc) report.Error("EXPIRED", $"标定已于{bundle.ValidUntilUtc:O}过期。");
        if (nowUtc < bundle.CreatedUtc) report.Error("TIME", "标定创建时间晚于当前时间，请检查系统时钟。");

        ValidateCamera(bundle.LeftCamera, runtime.LeftCameraSerial, runtime.LeftLensSerial,
            runtime.ImageWidth, runtime.ImageHeight, runtime.FocusTag, "LEFT", report);
        ValidateCamera(bundle.RightCamera, runtime.RightCameraSerial, runtime.RightLensSerial,
            runtime.ImageWidth, runtime.ImageHeight, runtime.FocusTag, "RIGHT", report);
        ValidateStereo(bundle.Stereo, runtime.StereoRigSerial, report);
        ValidateHandEye(bundle.HandEye, runtime.MotionDeviceSerial, report);
        ValidateRegistration(bundle.Registration, runtime, report);

        return report;
    }

    /// <summary>校验单相机内参、设备身份、焦点位置和重投影误差。</summary>
    /// <param name="camera">待检查的相机内参。</param>
    /// <param name="expectedCameraSerial">当前相机序列号。</param>
    /// <param name="expectedLensSerial">当前镜头序列号。</param>
    /// <param name="width">当前采图宽度。</param>
    /// <param name="height">当前采图高度。</param>
    /// <param name="focusTag">当前焦点位置标签。</param>
    /// <param name="side">用于错误码的LEFT或RIGHT。</param>
    /// <param name="report">接收检查结果的报告。</param>
    public static void ValidateCamera(
        CameraCalibration camera,
        string expectedCameraSerial,
        string expectedLensSerial,
        int width,
        int height,
        string focusTag,
        string side,
        ValidationReport report)
    {
        if (camera.CameraSerial != expectedCameraSerial)
            report.Error($"{side}_CAMERA_SN", $"{side}相机序列号不匹配。");
        if (camera.LensSerial != expectedLensSerial)
            report.Error($"{side}_LENS_SN", $"{side}镜头序列号不匹配。");
        if (camera.FocusTag != focusTag)
            report.Error($"{side}_FOCUS", $"{side}焦点标签不匹配：标定={camera.FocusTag}，当前={focusTag}。");
        if (camera.ImageWidth != width || camera.ImageHeight != height)
            report.Error($"{side}_SIZE", $"{side}标定分辨率与当前采图分辨率不一致。");
        if (camera.CameraMatrix.Length != 3 || camera.CameraMatrix.Any(r => r.Length != 3))
        {
            report.Error($"{side}_K_SHAPE", $"{side}内参矩阵不是3×3。");
            return;
        }

        if (camera.Fx <= 0 || camera.Fy <= 0) report.Error($"{side}_FOCAL", $"{side}焦距必须大于0。");
        if (camera.Cx < -0.1 * width || camera.Cx > 1.1 * width ||
            camera.Cy < -0.1 * height || camera.Cy > 1.1 * height)
            report.Error($"{side}_PRINCIPAL", $"{side}主点明显超出图像范围。");
        if (camera.DistCoeffs.Length is not (4 or 5 or 8 or 12 or 14))
            report.Error($"{side}_DIST", $"{side}畸变系数数量不受支持。");
        if (camera.ReprojectionRmsPx > 0.20)
            report.Error($"{side}_RMS", $"{side}内参重投影RMS={camera.ReprojectionRmsPx:F3}px，超过0.20px。");
    }

    /// <summary>校验双目外参、65mm基线和极线残差。</summary>
    /// <param name="stereo">待检查的双目标定。</param>
    /// <param name="expectedRigSerial">当前双目支架编号。</param>
    /// <param name="report">接收检查结果的报告。</param>
    public static void ValidateStereo(
        StereoCalibration stereo,
        string expectedRigSerial,
        ValidationReport report)
    {
        if (stereo.StereoRigSerial != expectedRigSerial)
            report.Error("STEREO_RIG_SN", "双目支架编号不匹配。");

        ValidateTransform(stereo.LeftFromRight, "CL_FROM_CR", report);
        ValidateTransform(stereo.C0FromLeft, "C0_FROM_CL", report);
        ValidateTransform(stereo.C0FromRight, "C0_FROM_CR", report);

        var baseline = RigidTransform.Norm(stereo.LeftFromRight.TranslationMm);
        if (Math.Abs(baseline - stereo.ExpectedBaselineMm) > 0.020)
            report.Error("BASELINE", $"实测基线={baseline:F4}mm，期望={stereo.ExpectedBaselineMm:F4}mm，偏差超过0.020mm。");
        if (Math.Abs(stereo.ExpectedBaselineMm - 65.0) > 1e-6)
            report.Warning("BASELINE_STANDARD", "当前Demo按GB/T场景预期65mm基线，请确认项目定义。");
        if (stereo.StereoRmsPx > 0.20)
            report.Error("STEREO_RMS", $"双目标定RMS={stereo.StereoRmsPx:F3}px，超过0.20px。");
        if (stereo.RectifiedVerticalResidualPx > 0.20)
            report.Error("EPIPOLAR", $"校正后垂直残差={stereo.RectifiedVerticalResidualPx:F3}px，超过0.20px。");

        var derivedLeftFromRight = stereo.C0FromLeft.ToRigidTransform().Inverse()
            .Compose(stereo.C0FromRight.ToRigidTransform());
        var delta = RigidTransform.Norm(new[]
        {
            derivedLeftFromRight.TranslationMm[0] - stereo.LeftFromRight.TranslationMm[0],
            derivedLeftFromRight.TranslationMm[1] - stereo.LeftFromRight.TranslationMm[1],
            derivedLeftFromRight.TranslationMm[2] - stereo.LeftFromRight.TranslationMm[2]
        });
        if (delta > 0.02) report.Error("STEREO_CHAIN", $"C0到左右相机的变换与双目外参不闭合，平移差={delta:F4}mm。");
    }

    /// <summary>校验法兰到双目中点TCP的手眼标定。</summary>
    /// <param name="handEye">手眼标定数据。</param>
    /// <param name="expectedMotionSerial">当前六轴台或机器人编号。</param>
    /// <param name="report">接收检查结果的报告。</param>
    public static void ValidateHandEye(
        HandEyeCalibration handEye,
        string expectedMotionSerial,
        ValidationReport report)
    {
        if (handEye.MotionDeviceSerial != expectedMotionSerial)
            report.Error("MOTION_SN", "六轴设备编号与手眼标定不匹配。");
        ValidateTransform(handEye.FlangeFromC0, "F_FROM_C0", report);
        if (handEye.PositionRmsMm > 0.10)
            report.Error("HAND_EYE_POS", $"手眼位置RMS={handEye.PositionRmsMm:F3}mm，超过0.10mm。");
        if (handEye.RotationRmsDeg > 0.02)
            report.Error("HAND_EYE_ROT", $"手眼角度RMS={handEye.RotationRmsDeg:F4}°，超过0.02°。");
    }

    /// <summary>校验HUD/风挡夹具身份、注册矩阵及设计点数据。</summary>
    /// <param name="registration">HUD和风挡世界注册数据。</param>
    /// <param name="runtime">当前夹具身份。</param>
    /// <param name="report">接收检查结果的报告。</param>
    public static void ValidateRegistration(
        WorldRegistration registration,
        RuntimeDeviceInfo runtime,
        ValidationReport report)
    {
        if (registration.HudFixtureSerial != runtime.HudFixtureSerial)
            report.Error("HUD_FIXTURE_SN", "HUD夹具编号不匹配。");
        if (registration.WindshieldFixtureSerial != runtime.WindshieldFixtureSerial)
            report.Error("WS_FIXTURE_SN", "风挡夹具编号不匹配。");
        ValidateTransform(registration.WorldFromHud, "W_FROM_H", report);
        ValidateTransform(registration.WorldFromWindshield, "W_FROM_S", report);
        if (registration.DesignEyePointInHudMm.Length != 3 || registration.VidCenterInHudMm.Length != 3)
            report.Error("REG_POINT", "设计眼点和VID中心必须各有3个坐标值。");
        if (registration.WorldUp.Length != 3 || RigidTransform.Norm(registration.WorldUp) < 0.99)
            report.Error("WORLD_UP", "WorldUp不是有效三维方向。");
        if (registration.HudRegistrationRmsMm > 0.10)
            report.Error("HUD_REG_RMS", $"HUD注册RMS={registration.HudRegistrationRmsMm:F3}mm，超过0.10mm。");
        if (registration.WindshieldRegistrationRmsMm > 0.20)
            report.Error("WS_REG_RMS", $"风挡注册RMS={registration.WindshieldRegistrationRmsMm:F3}mm，超过0.20mm。");
    }

    /// <summary>校验刚体变换尺寸、旋转正交性和行列式。</summary>
    /// <param name="data">待检查的可序列化变换。</param>
    /// <param name="name">用于错误码和提示的矩阵名称。</param>
    /// <param name="report">接收检查结果的报告。</param>
    public static void ValidateTransform(TransformData data, string name, ValidationReport report)
    {
        if (data.Rotation.Length != 3 || data.Rotation.Any(r => r.Length != 3) || data.TranslationMm.Length != 3)
        {
            report.Error($"{name}_SHAPE", $"{name}不是有效的3×3旋转加3×1平移。");
            return;
        }

        var ortho = RigidTransform.OrthogonalityError(data.Rotation);
        var det = RigidTransform.Determinant3x3(data.Rotation);
        if (ortho > 1e-6) report.Error($"{name}_ORTHO", $"{name}旋转矩阵正交误差={ortho:E3}。");
        if (Math.Abs(det - 1.0) > 1e-6) report.Error($"{name}_DET", $"{name}旋转矩阵det={det:F8}，不接近+1。");
    }
}

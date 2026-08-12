namespace HudStereoAlignmentDemo.Core;

/// <summary>根据HUD设计点、世界注册和手眼矩阵计算六轴目标位姿。</summary>
public static class PosePlanningService
{
    /// <summary>将HUD坐标中的设计眼点转换到世界坐标。</summary>
    /// <param name="registration">包含WFromH和设计眼点的世界注册数据。</param>
    /// <returns>世界坐标中的设计眼点XYZ，单位mm。</returns>
    public static double[] GetDesignEyePointWorld(WorldRegistration registration) =>
        registration.WorldFromHud.ToRigidTransform().TransformPoint(registration.DesignEyePointInHudMm);

    /// <summary>将HUD坐标中的虚像中心转换到世界坐标。</summary>
    /// <param name="registration">包含WFromH和VID中心的世界注册数据。</param>
    /// <returns>世界坐标中的虚像中心XYZ，单位mm。</returns>
    public static double[] GetVidCenterWorld(WorldRegistration registration) =>
        registration.WorldFromHud.ToRigidTransform().TransformPoint(registration.VidCenterInHudMm);

    /// <summary>计算双目中点位于设计眼点且平均光轴指向VID中心的目标位姿。</summary>
    /// <param name="registration">HUD世界注册、眼点、虚像中心和世界向上方向。</param>
    /// <returns>目标WFromC0刚体变换。</returns>
    public static RigidTransform CalculateTargetC0Pose(WorldRegistration registration)
    {
        var eyeWorld = GetDesignEyePointWorld(registration);
        var vidWorld = GetVidCenterWorld(registration);
        return RigidTransform.CreateCameraLookAt(eyeWorld, vidWorld, registration.WorldUp);
    }

    /// <summary>由目标双目TCP位姿和手眼矩阵反算六轴法兰目标位姿。</summary>
    /// <param name="worldFromC0Target">期望的WFromC0。</param>
    /// <param name="flangeFromC0">手眼标定F_From_C0。</param>
    /// <returns>控制器应到达的WFromF。</returns>
    public static RigidTransform CalculateTargetFlangePose(
        RigidTransform worldFromC0Target,
        RigidTransform flangeFromC0) =>
        worldFromC0Target.Compose(flangeFromC0.Inverse());

    /// <summary>由当前法兰位姿和手眼矩阵计算当前双目中点世界位姿。</summary>
    /// <param name="worldFromFlange">六轴控制器反馈的WFromF。</param>
    /// <param name="flangeFromC0">手眼标定F_From_C0。</param>
    /// <returns>当前WFromC0。</returns>
    public static RigidTransform CalculateCurrentC0Pose(
        RigidTransform worldFromFlange,
        RigidTransform flangeFromC0) =>
        worldFromFlange.Compose(flangeFromC0);

    /// <summary>在保持TCP位置不变的前提下，将图像误差转换为新的C0目标姿态。</summary>
    /// <param name="currentWorldFromC0">当前WFromC0。</param>
    /// <param name="correction">相机局部Y/X/Z轴的修正角。</param>
    /// <returns>修正后的WFromC0目标位姿。</returns>
    public static RigidTransform ApplyFineCorrection(
        RigidTransform currentWorldFromC0,
        CameraLocalCorrection correction) =>
        currentWorldFromC0.ApplyCameraLocalRotation(
            correction.YawAboutYDeg,
            correction.PitchAboutXDeg,
            correction.RollAboutZDeg);
}

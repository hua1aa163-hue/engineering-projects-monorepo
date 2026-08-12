using HudStereoAlignmentDemo.Core;

namespace HudStereoAlignmentDemo.Hardware;

/// <summary>左右相机同步采集的最小抽象；真机SDK适配器实现此接口。</summary>
public interface ICameraPair : IAsyncDisposable
{
    /// <summary>连接相机、加载设备侧配置并开始采集。</summary>
    /// <param name="cancellationToken">用于取消连接。</param>
    Task ConnectAsync(CancellationToken cancellationToken);

    /// <summary>触发一次左右同步曝光并返回两幅图像。</summary>
    /// <param name="cancellationToken">用于取消等待曝光。</param>
    /// <returns>包含左右Mat和时间戳的帧；调用方负责Dispose。</returns>
    Task<StereoFrame> CaptureAsync(CancellationToken cancellationToken);
}

/// <summary>六轴台或机器人的最小控制抽象；真机通信适配器实现此接口。</summary>
public interface ISixAxisMotionController : IAsyncDisposable
{
    /// <summary>连接控制器并读取状态。</summary>
    /// <param name="cancellationToken">用于取消连接。</param>
    Task ConnectAsync(CancellationToken cancellationToken);

    /// <summary>读取世界坐标到法兰坐标的当前位姿。</summary>
    /// <param name="cancellationToken">用于取消读取。</param>
    /// <returns>控制器当前WFromF。</returns>
    Task<RigidTransform> GetWorldFromFlangeAsync(CancellationToken cancellationToken);

    /// <summary>以受控速度运动到绝对法兰位姿。</summary>
    /// <param name="targetWorldFromFlange">目标WFromF。</param>
    /// <param name="linearSpeedMmPerSec">线速度，单位mm/s。</param>
    /// <param name="angularSpeedDegPerSec">角速度，单位°/s。</param>
    /// <param name="cancellationToken">用于急停之外的软件取消；真机仍需独立硬件急停。</param>
    Task MoveAbsoluteAsync(
        RigidTransform targetWorldFromFlange,
        double linearSpeedMmPerSec,
        double angularSpeedDegPerSec,
        CancellationToken cancellationToken);

    /// <summary>等待控制器报告到位且稳定。</summary>
    /// <param name="timeout">最大等待时间。</param>
    /// <param name="cancellationToken">用于取消等待。</param>
    Task WaitForInPositionAsync(TimeSpan timeout, CancellationToken cancellationToken);
}

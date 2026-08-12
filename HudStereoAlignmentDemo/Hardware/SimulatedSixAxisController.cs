using HudStereoAlignmentDemo.Core;

namespace HudStereoAlignmentDemo.Hardware;

/// <summary>仅供Demo使用的内存六轴控制器；不会驱动任何真实设备。</summary>
public sealed class SimulatedSixAxisController : ISixAxisMotionController
{
    private readonly object _sync = new();
    private RigidTransform _worldFromFlange;
    private bool _connected;

    public SimulatedSixAxisController(RigidTransform initialWorldFromFlange)
    {
        _worldFromFlange = initialWorldFromFlange;
    }

    /// <inheritdoc />
    public Task ConnectAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _connected = true;
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<RigidTransform> GetWorldFromFlangeAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        lock (_sync) return Task.FromResult(_worldFromFlange);
    }

    /// <inheritdoc />
    public Task MoveAbsoluteAsync(
        RigidTransform targetWorldFromFlange,
        double linearSpeedMmPerSec,
        double angularSpeedDegPerSec,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        if (linearSpeedMmPerSec <= 0 || angularSpeedDegPerSec <= 0)
            throw new ArgumentOutOfRangeException(nameof(linearSpeedMmPerSec), "速度必须大于0。");
        lock (_sync) _worldFromFlange = targetWorldFromFlange;
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task WaitForInPositionAsync(TimeSpan timeout, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        if (timeout <= TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(timeout));
        return Task.CompletedTask;
    }

    /// <summary>释放模拟连接；真机实现应关闭采集或通信句柄。</summary>
    public ValueTask DisposeAsync()
    {
        _connected = false;
        return ValueTask.CompletedTask;
    }

    private void EnsureConnected()
    {
        if (!_connected) throw new InvalidOperationException("六轴控制器尚未连接。");
    }
}

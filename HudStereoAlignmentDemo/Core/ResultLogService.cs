using System.Text.Json;

namespace HudStereoAlignmentDemo.Core;

/// <summary>保存可追溯的对准结果。</summary>
public static class ResultLogService
{
    /// <summary>把标定ID、设备身份、最终观测和六轴位姿写入JSON。</summary>
    /// <param name="filePath">结果JSON路径。</param>
    /// <param name="bundle">本次使用的原子标定快照。</param>
    /// <param name="runtime">本次连接的设备身份。</param>
    /// <param name="result">视觉闭环最终结果。</param>
    public static void SaveJson(
        string filePath,
        CalibrationBundle bundle,
        RuntimeDeviceInfo runtime,
        AlignmentRunResult result)
    {
        var record = new
        {
            CompletedUtc = DateTime.UtcNow,
            bundle.CalibrationId,
            Devices = runtime,
            Result = result
        };
        var json = JsonSerializer.Serialize(record, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(filePath, json);
    }
}

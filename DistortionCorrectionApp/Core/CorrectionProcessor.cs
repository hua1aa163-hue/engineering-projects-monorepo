using OpenCvSharp;
using Size = OpenCvSharp.Size;

namespace DistortionCorrectionApp.Core;

public sealed class CorrectionRunResult : IDisposable
{
    public required Mat SourceOverlay { get; init; }
    public required Mat TargetOverlay { get; init; }
    public required Mat CorrectedImage { get; init; }
    public required Mat PreDistortedImage { get; init; }
    public required IReadOnlyList<Point2d> SourcePoints { get; init; }
    public required IReadOnlyList<Point2d> TargetPoints { get; init; }
    public required GridWarp Warp { get; init; }
    public required double RmsErrorPx { get; init; }
    public required double MaxErrorPx { get; init; }
    public required int SourceCandidateCount { get; init; }
    public required int TargetCandidateCount { get; init; }

    public void Dispose()
    {
        SourceOverlay.Dispose();
        TargetOverlay.Dispose();
        CorrectedImage.Dispose();
        PreDistortedImage.Dispose();
    }
}

public static class CorrectionProcessor
{
    public static CorrectionRunResult Run(
        string sourcePath,
        string targetPath,
        int columns,
        int rows,
        double threshold,
        bool useOtsu,
        double minimumArea,
        double maximumArea)
    {
        using var source = Cv2.ImRead(sourcePath, ImreadModes.Unchanged);
        using var target = Cv2.ImRead(targetPath, ImreadModes.Unchanged);
        if (source.Empty())
            throw new InvalidOperationException($"无法读取拍摄图像：{sourcePath}");
        if (target.Empty())
            throw new InvalidOperationException($"无法读取原始基准图：{targetPath}");

        var sourceDetection = GridPointDetector.Detect(
            source, columns, rows, threshold, useOtsu, minimumArea, maximumArea);
        var targetDetection = GridPointDetector.Detect(
            target, columns, rows, threshold, useOtsu, minimumArea, maximumArea);

        var warp = GridWarp.Fit(
            targetDetection.Points,
            sourceDetection.Points,
            columns,
            rows);
        var error = warp.CalculateError(
            targetDetection.Points,
            sourceDetection.Points);

        using var maps = new RemapMaps(
            warp,
            target.Size(),
            source.Size(),
            targetDetection.Points,
            sourceDetection.Points,
            columns,
            rows);
        var corrected = new Mat();
        Cv2.Remap(
            source,
            corrected,
            maps.MapX,
            maps.MapY,
            InterpolationFlags.Linear,
            BorderTypes.Constant,
            Scalar.Black);

        var preDistorted = new Mat();
        Cv2.Remap(
            target,
            preDistorted,
            maps.PreMapX,
            maps.PreMapY,
            InterpolationFlags.Linear,
            BorderTypes.Constant,
            Scalar.Black);

        return new CorrectionRunResult
        {
            SourceOverlay = GridPointDetector.DrawPoints(source, sourceDetection.Points, Scalar.LimeGreen),
            TargetOverlay = GridPointDetector.DrawPoints(target, targetDetection.Points, Scalar.Cyan),
            CorrectedImage = corrected,
            PreDistortedImage = preDistorted,
            SourcePoints = sourceDetection.Points,
            TargetPoints = targetDetection.Points,
            Warp = warp,
            RmsErrorPx = error.RmsPx,
            MaxErrorPx = error.MaxErrorPx,
            SourceCandidateCount = sourceDetection.CandidateCount,
            TargetCandidateCount = targetDetection.CandidateCount
        };
    }

    private sealed class RemapMaps : IDisposable
    {
        public RemapMaps(
            GridWarp warp,
            Size targetSize,
            Size sourceSize,
            IReadOnlyList<Point2d> targetPoints,
            IReadOnlyList<Point2d> sourcePoints,
            int columns,
            int rows)
        {
            (MapX, MapY) = GridWarp.CreateRemap(warp, targetSize);
            var inverseTargetPoints = sourcePoints
                .Select(point => GridWarp.ScalePoint(point, sourceSize, targetSize))
                .ToArray();
            var inverseWarp = GridWarp.Fit(
                inverseTargetPoints,
                targetPoints,
                columns,
                rows);
            (PreMapX, PreMapY) = GridWarp.CreateRemap(inverseWarp, targetSize);
        }

        public Mat MapX { get; }
        public Mat MapY { get; }
        public Mat PreMapX { get; }
        public Mat PreMapY { get; }

        public void Dispose()
        {
            MapX.Dispose();
            MapY.Dispose();
            PreMapX.Dispose();
            PreMapY.Dispose();
        }
    }
}

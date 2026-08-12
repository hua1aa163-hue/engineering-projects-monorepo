using System.Text.Json;
using OpenCvSharp;
using Size = OpenCvSharp.Size;

namespace DistortionCorrectionApp.Core;

public sealed class PolynomialWarp
{
    private readonly IReadOnlyList<PolynomialTerm> _terms;
    private readonly double[] _sourceXCoefficients;
    private readonly double[] _sourceYCoefficients;

    private PolynomialWarp(
        int degree,
        IReadOnlyList<PolynomialTerm> terms,
        double[] sourceXCoefficients,
        double[] sourceYCoefficients)
    {
        Degree = degree;
        _terms = terms;
        _sourceXCoefficients = sourceXCoefficients;
        _sourceYCoefficients = sourceYCoefficients;
    }

    public int Degree { get; }

    public static PolynomialWarp Fit(
        IReadOnlyList<Point2d> targetPoints,
        IReadOnlyList<Point2d> sourcePoints,
        Size targetSize,
        Size sourceSize,
        int degree)
    {
        if (targetPoints.Count != sourcePoints.Count)
            throw new ArgumentException("对应点数量不一致。");
        if (degree < 1 || degree > 5)
            throw new ArgumentOutOfRangeException(nameof(degree), "多项式阶数必须在 1 到 5 之间。");

        var terms = BuildTerms(degree);
        if (targetPoints.Count < terms.Count)
        {
            throw new InvalidOperationException(
                $"当前阶数至少需要 {terms.Count} 个点，实际只有 {targetPoints.Count} 个点。");
        }

        using var design = new Mat(targetPoints.Count, terms.Count, MatType.CV_64FC1);
        using var sourceX = new Mat(targetPoints.Count, 1, MatType.CV_64FC1);
        using var sourceY = new Mat(targetPoints.Count, 1, MatType.CV_64FC1);

        for (var row = 0; row < targetPoints.Count; row++)
        {
            var normalizedTarget = Normalize(targetPoints[row], targetSize);
            for (var column = 0; column < terms.Count; column++)
                design.Set(row, column, terms[column].Evaluate(normalizedTarget.X, normalizedTarget.Y));

            var normalizedSource = Normalize(sourcePoints[row], sourceSize);
            sourceX.Set(row, 0, normalizedSource.X);
            sourceY.Set(row, 0, normalizedSource.Y);
        }

        using var fittedX = new Mat();
        using var fittedY = new Mat();
        if (!Cv2.Solve(design, sourceX, fittedX, DecompTypes.SVD) ||
            !Cv2.Solve(design, sourceY, fittedY, DecompTypes.SVD))
        {
            throw new InvalidOperationException("无法求解点阵映射，请检查点阵检测结果。");
        }

        var coefficientsX = Enumerable.Range(0, terms.Count)
            .Select(index => fittedX.At<double>(index, 0))
            .ToArray();
        var coefficientsY = Enumerable.Range(0, terms.Count)
            .Select(index => fittedY.At<double>(index, 0))
            .ToArray();

        return new PolynomialWarp(degree, terms, coefficientsX, coefficientsY);
    }

    public Point2d Evaluate(Point2d targetPoint, Size targetSize, Size sourceSize)
    {
        var normalizedTarget = Normalize(targetPoint, targetSize);
        var normalizedSourceX = 0.0;
        var normalizedSourceY = 0.0;
        for (var index = 0; index < _terms.Count; index++)
        {
            var basis = _terms[index].Evaluate(normalizedTarget.X, normalizedTarget.Y);
            normalizedSourceX += _sourceXCoefficients[index] * basis;
            normalizedSourceY += _sourceYCoefficients[index] * basis;
        }

        return new Point2d(
            Denormalize(normalizedSourceX, sourceSize.Width),
            Denormalize(normalizedSourceY, sourceSize.Height));
    }

    public (double RmsPx, double MaxErrorPx) CalculateError(
        IReadOnlyList<Point2d> targetPoints,
        IReadOnlyList<Point2d> sourcePoints,
        Size targetSize,
        Size sourceSize)
    {
        var squaredError = 0.0;
        var maximumError = 0.0;
        for (var index = 0; index < targetPoints.Count; index++)
        {
            var predicted = Evaluate(targetPoints[index], targetSize, sourceSize);
            var dx = predicted.X - sourcePoints[index].X;
            var dy = predicted.Y - sourcePoints[index].Y;
            var error = Math.Sqrt(dx * dx + dy * dy);
            squaredError += error * error;
            maximumError = Math.Max(maximumError, error);
        }

        return (Math.Sqrt(squaredError / targetPoints.Count), maximumError);
    }

    public void SaveJson(
        string path,
        Size targetSize,
        Size sourceSize,
        IReadOnlyList<Point2d> targetPoints,
        IReadOnlyList<Point2d> sourcePoints,
        double rmsPx,
        double maxErrorPx)
    {
        var document = new WarpModelDocument
        {
            SchemaVersion = "1.0",
            ModelType = "TargetToSourcePolynomial",
            Degree = Degree,
            TargetWidth = targetSize.Width,
            TargetHeight = targetSize.Height,
            SourceWidth = sourceSize.Width,
            SourceHeight = sourceSize.Height,
            RmsErrorPx = rmsPx,
            MaxErrorPx = maxErrorPx,
            Terms = _terms.Select(term => new[] { term.XPower, term.YPower }).ToArray(),
            SourceXCoefficients = _sourceXCoefficients,
            SourceYCoefficients = _sourceYCoefficients,
            Correspondences = targetPoints.Zip(sourcePoints, (target, source) => new PointPairDocument
            {
                TargetX = target.X,
                TargetY = target.Y,
                SourceX = source.X,
                SourceY = source.Y
            }).ToArray()
        };

        var json = JsonSerializer.Serialize(document, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(path, json);
    }

    public static (Mat MapX, Mat MapY) CreateRemap(
        PolynomialWarp warp,
        Size targetSize,
        Size sourceSize)
    {
        var mapX = new Mat(targetSize.Height, targetSize.Width, MatType.CV_32FC1);
        var mapY = new Mat(targetSize.Height, targetSize.Width, MatType.CV_32FC1);

        for (var y = 0; y < targetSize.Height; y++)
        {
            for (var x = 0; x < targetSize.Width; x++)
            {
                var source = warp.Evaluate(new Point2d(x, y), targetSize, sourceSize);
                mapX.Set(y, x, (float)source.X);
                mapY.Set(y, x, (float)source.Y);
            }
        }

        return (mapX, mapY);
    }

    private static IReadOnlyList<PolynomialTerm> BuildTerms(int degree)
    {
        var terms = new List<PolynomialTerm>();
        for (var totalDegree = 0; totalDegree <= degree; totalDegree++)
        {
            for (var xPower = totalDegree; xPower >= 0; xPower--)
            {
                var yPower = totalDegree - xPower;
                terms.Add(new PolynomialTerm(xPower, yPower));
            }
        }

        return terms;
    }

    private static Point2d Normalize(Point2d point, Size size) => new(
        NormalizeCoordinate(point.X, size.Width),
        NormalizeCoordinate(point.Y, size.Height));

    private static double NormalizeCoordinate(double coordinate, int length) =>
        length <= 1 ? 0 : coordinate / (length - 1) * 2 - 1;

    private static double Denormalize(double coordinate, int length) =>
        (coordinate + 1) * 0.5 * (length - 1);

    private sealed record PolynomialTerm(int XPower, int YPower)
    {
        public double Evaluate(double x, double y) => Math.Pow(x, XPower) * Math.Pow(y, YPower);
    }

    private sealed class WarpModelDocument
    {
        public required string SchemaVersion { get; init; }
        public required string ModelType { get; init; }
        public required int Degree { get; init; }
        public required int TargetWidth { get; init; }
        public required int TargetHeight { get; init; }
        public required int SourceWidth { get; init; }
        public required int SourceHeight { get; init; }
        public required double RmsErrorPx { get; init; }
        public required double MaxErrorPx { get; init; }
        public required int[][] Terms { get; init; }
        public required double[] SourceXCoefficients { get; init; }
        public required double[] SourceYCoefficients { get; init; }
        public required PointPairDocument[] Correspondences { get; init; }
    }

    private sealed class PointPairDocument
    {
        public required double TargetX { get; init; }
        public required double TargetY { get; init; }
        public required double SourceX { get; init; }
        public required double SourceY { get; init; }
    }
}

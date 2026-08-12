using System.Text.Json;
using OpenCvSharp;
using Size = OpenCvSharp.Size;

namespace DistortionCorrectionApp.Core;

public sealed class GridWarp
{
    private readonly Point2d[,] _targetGrid;
    private readonly Point2d[,] _sourceGrid;
    private readonly double[] _targetX;
    private readonly double[] _targetY;
    private readonly int _columns;
    private readonly int _rows;

    private GridWarp(
        Point2d[,] targetGrid,
        Point2d[,] sourceGrid,
        double[] targetX,
        double[] targetY,
        int columns,
        int rows)
    {
        _targetGrid = targetGrid;
        _sourceGrid = sourceGrid;
        _targetX = targetX;
        _targetY = targetY;
        _columns = columns;
        _rows = rows;
    }

    public static GridWarp Fit(
        IReadOnlyList<Point2d> targetPoints,
        IReadOnlyList<Point2d> sourcePoints,
        int columns,
        int rows)
    {
        var expectedCount = checked(columns * rows);
        if (targetPoints.Count != expectedCount || sourcePoints.Count != expectedCount)
            throw new ArgumentException($"网格点数量必须为 {expectedCount}。");

        var targetX = new double[columns];
        var targetY = new double[rows];
        for (var column = 0; column < columns; column++)
            targetX[column] = Enumerable.Range(0, rows).Average(row => targetPoints[row * columns + column].X);
        for (var row = 0; row < rows; row++)
            targetY[row] = Enumerable.Range(0, columns).Average(column => targetPoints[row * columns + column].Y);

        ValidateIncreasing(targetX, "目标图横坐标");
        ValidateIncreasing(targetY, "目标图纵坐标");

        var targetGrid = new Point2d[rows, columns];
        var sourceGrid = new Point2d[rows, columns];
        for (var row = 0; row < rows; row++)
        for (var column = 0; column < columns; column++)
        {
            targetGrid[row, column] = targetPoints[row * columns + column];
            sourceGrid[row, column] = sourcePoints[row * columns + column];
        }

        return new GridWarp(targetGrid, sourceGrid, targetX, targetY, columns, rows);
    }

    public Point2d Evaluate(Point2d targetPoint)
    {
        var column = FindCell(_targetX, targetPoint.X, out var u);
        var row = FindCell(_targetY, targetPoint.Y, out var v);

        var targetTopLeft = _targetGrid[row, column];
        var targetTopRight = _targetGrid[row, column + 1];
        var targetBottomLeft = _targetGrid[row + 1, column];
        var targetBottomRight = _targetGrid[row + 1, column + 1];
        (u, v) = SolveBilinearCoordinates(
            targetPoint,
            targetTopLeft,
            targetTopRight,
            targetBottomLeft,
            targetBottomRight,
            u,
            v);

        return Bilinear(
            _sourceGrid[row, column],
            _sourceGrid[row, column + 1],
            _sourceGrid[row + 1, column],
            _sourceGrid[row + 1, column + 1],
            u,
            v);
    }

    public (double RmsPx, double MaxErrorPx) CalculateError(
        IReadOnlyList<Point2d> targetPoints,
        IReadOnlyList<Point2d> sourcePoints)
    {
        var squaredError = 0.0;
        var maximumError = 0.0;
        for (var index = 0; index < targetPoints.Count; index++)
        {
            var predicted = Evaluate(targetPoints[index]);
            var dx = predicted.X - sourcePoints[index].X;
            var dy = predicted.Y - sourcePoints[index].Y;
            var error = Math.Sqrt(dx * dx + dy * dy);
            squaredError += error * error;
            maximumError = Math.Max(maximumError, error);
        }

        return (Math.Sqrt(squaredError / targetPoints.Count), maximumError);
    }

    public static (Mat MapX, Mat MapY) CreateRemap(GridWarp warp, Size targetSize)
    {
        var mapX = new Mat(targetSize.Height, targetSize.Width, MatType.CV_32FC1);
        var mapY = new Mat(targetSize.Height, targetSize.Width, MatType.CV_32FC1);
        var mapXRows = mapX.AsRows<float>();
        var mapYRows = mapY.AsRows<float>();

        for (var y = 0; y < targetSize.Height; y++)
        for (var x = 0; x < targetSize.Width; x++)
        {
            var source = warp.Evaluate(new Point2d(x, y));
            mapXRows[y][x] = (float)source.X;
            mapYRows[y][x] = (float)source.Y;
        }

        return (mapX, mapY);
    }

    public static Point2d ScalePoint(Point2d point, Size fromSize, Size toSize) => new(
        ScaleCoordinate(point.X, fromSize.Width, toSize.Width),
        ScaleCoordinate(point.Y, fromSize.Height, toSize.Height));

    public void SaveJson(
        string path,
        Size targetSize,
        Size sourceSize,
        IReadOnlyList<Point2d> targetPoints,
        IReadOnlyList<Point2d> sourcePoints,
        double rmsPx,
        double maxErrorPx)
    {
        var document = new GridWarpDocument
        {
            SchemaVersion = "1.0",
            ModelType = "TargetToSourceBilinearGrid",
            Columns = _columns,
            Rows = _rows,
            TargetWidth = targetSize.Width,
            TargetHeight = targetSize.Height,
            SourceWidth = sourceSize.Width,
            SourceHeight = sourceSize.Height,
            RmsErrorPx = rmsPx,
            MaxErrorPx = maxErrorPx,
            TargetPoints = targetPoints.Select(point => new PointDocument { X = point.X, Y = point.Y }).ToArray(),
            SourcePoints = sourcePoints.Select(point => new PointDocument { X = point.X, Y = point.Y }).ToArray()
        };

        var json = JsonSerializer.Serialize(document, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(path, json);
    }

    private static int FindCell(IReadOnlyList<double> coordinates, double value, out double fraction)
    {
        var cell = 0;
        if (value >= coordinates[^1])
        {
            cell = coordinates.Count - 2;
        }
        else if (value > coordinates[0])
        {
            while (cell + 1 < coordinates.Count - 1 && value > coordinates[cell + 1])
                cell++;
        }

        var denominator = coordinates[cell + 1] - coordinates[cell];
        fraction = (value - coordinates[cell]) / denominator;
        return cell;
    }

    private static Point2d Lerp(Point2d first, Point2d second, double fraction) => new(
        first.X + (second.X - first.X) * fraction,
        first.Y + (second.Y - first.Y) * fraction);

    private static Point2d Bilinear(
        Point2d topLeft,
        Point2d topRight,
        Point2d bottomLeft,
        Point2d bottomRight,
        double u,
        double v)
    {
        var top = Lerp(topLeft, topRight, u);
        var bottom = Lerp(bottomLeft, bottomRight, u);
        return Lerp(top, bottom, v);
    }

    private static (double U, double V) SolveBilinearCoordinates(
        Point2d point,
        Point2d topLeft,
        Point2d topRight,
        Point2d bottomLeft,
        Point2d bottomRight,
        double u,
        double v)
    {
        for (var iteration = 0; iteration < 8; iteration++)
        {
            var estimate = Bilinear(topLeft, topRight, bottomLeft, bottomRight, u, v);
            var errorX = estimate.X - point.X;
            var errorY = estimate.Y - point.Y;
            if (Math.Abs(errorX) + Math.Abs(errorY) < 1e-6)
                break;

            var du = new Point2d(
                (topRight.X - topLeft.X) * (1 - v) + (bottomRight.X - bottomLeft.X) * v,
                (topRight.Y - topLeft.Y) * (1 - v) + (bottomRight.Y - bottomLeft.Y) * v);
            var dv = new Point2d(
                (bottomLeft.X - topLeft.X) * (1 - u) + (bottomRight.X - topRight.X) * u,
                (bottomLeft.Y - topLeft.Y) * (1 - u) + (bottomRight.Y - topRight.Y) * u);
            var determinant = du.X * dv.Y - du.Y * dv.X;
            if (Math.Abs(determinant) < 1e-9)
                break;

            var deltaU = (errorX * dv.Y - errorY * dv.X) / determinant;
            var deltaV = (du.X * errorY - du.Y * errorX) / determinant;
            u -= deltaU;
            v -= deltaV;
        }

        return (u, v);
    }

    private static double ScaleCoordinate(double coordinate, int sourceLength, int targetLength) =>
        sourceLength <= 1 ? 0 : coordinate / (sourceLength - 1) * (targetLength - 1);

    private static void ValidateIncreasing(IReadOnlyList<double> coordinates, string name)
    {
        for (var index = 1; index < coordinates.Count; index++)
        {
            if (coordinates[index] <= coordinates[index - 1])
                throw new InvalidOperationException($"{name}不是递增序列，无法建立网格映射。");
        }
    }

    private sealed class GridWarpDocument
    {
        public required string SchemaVersion { get; init; }
        public required string ModelType { get; init; }
        public required int Columns { get; init; }
        public required int Rows { get; init; }
        public required int TargetWidth { get; init; }
        public required int TargetHeight { get; init; }
        public required int SourceWidth { get; init; }
        public required int SourceHeight { get; init; }
        public required double RmsErrorPx { get; init; }
        public required double MaxErrorPx { get; init; }
        public required PointDocument[] TargetPoints { get; init; }
        public required PointDocument[] SourcePoints { get; init; }
    }

    private sealed class PointDocument
    {
        public required double X { get; init; }
        public required double Y { get; init; }
    }
}

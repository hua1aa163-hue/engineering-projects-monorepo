using OpenCvSharp;
using Point = OpenCvSharp.Point;

namespace DistortionCorrectionApp.Core;

public sealed record GridPointDetection(
    IReadOnlyList<Point2d> Points,
    int CandidateCount,
    int SelectedCount);

public static class GridPointDetector
{
    public static GridPointDetection Detect(
        Mat image,
        int columns,
        int rows,
        double threshold,
        bool useOtsu,
        double minimumArea,
        double maximumArea)
    {
        if (columns < 2 || rows < 2)
            throw new ArgumentOutOfRangeException(nameof(columns), "点阵行列数必须至少为 2。");

        if (minimumArea <= 0 || maximumArea <= minimumArea)
            throw new ArgumentException("点面积范围无效。");

        using var gray = ToGray(image);
        using var binary = new Mat();
        var thresholdType = ThresholdTypes.Binary;
        if (useOtsu)
            thresholdType |= ThresholdTypes.Otsu;
        Cv2.Threshold(gray, binary, threshold, 255, thresholdType);

        Point[][] contours;
        HierarchyIndex[] hierarchy;
        Cv2.FindContours(
            binary,
            out contours,
            out hierarchy,
            RetrievalModes.External,
            ContourApproximationModes.ApproxSimple);

        var candidates = new List<CandidatePoint>();
        foreach (var contour in contours)
        {
            var area = Cv2.ContourArea(contour);
            if (area < minimumArea || area > maximumArea)
                continue;

            var rectangle = Cv2.BoundingRect(contour);
            if (rectangle.Width < 1 || rectangle.Height < 1)
                continue;

            var aspectRatio = (double)Math.Max(rectangle.Width, rectangle.Height) /
                              Math.Min(rectangle.Width, rectangle.Height);
            if (aspectRatio > 4.5)
                continue;

            var moments = Cv2.Moments(contour);
            if (Math.Abs(moments.M00) < double.Epsilon)
                continue;

            candidates.Add(new CandidatePoint(
                new Point2d(moments.M10 / moments.M00, moments.M01 / moments.M00),
                area));
        }

        var expectedCount = checked(columns * rows);
        if (candidates.Count < expectedCount)
        {
            throw new InvalidOperationException(
                $"只检测到 {candidates.Count} 个候选点，需要 {expectedCount} 个。请降低阈值或放宽面积范围。");
        }

        var selected = SelectGridCandidates(candidates, expectedCount);
        var ordered = OrderRowMajor(selected, columns, rows);
        return new GridPointDetection(ordered, candidates.Count, selected.Count);
    }

    public static Mat DrawPoints(Mat image, IReadOnlyList<Point2d> points, Scalar color)
    {
        var canvas = ToBgr(image);
        for (var index = 0; index < points.Count; index++)
        {
            var point = new Point((int)Math.Round(points[index].X), (int)Math.Round(points[index].Y));
            Cv2.Circle(canvas, point, 7, color, 2, LineTypes.AntiAlias);
            Cv2.PutText(
                canvas,
                (index + 1).ToString(),
                point + new Point(8, -8),
                HersheyFonts.HersheySimplex,
                0.35,
                color,
                1,
                LineTypes.AntiAlias);
        }

        return canvas;
    }

    public static Mat ToGray(Mat image)
    {
        var gray = new Mat();
        if (image.Channels() == 1)
        {
            image.CopyTo(gray);
        }
        else if (image.Channels() == 4)
        {
            Cv2.CvtColor(image, gray, ColorConversionCodes.BGRA2GRAY);
        }
        else
        {
            Cv2.CvtColor(image, gray, ColorConversionCodes.BGR2GRAY);
        }

        return gray;
    }

    public static Mat ToBgr(Mat image)
    {
        var bgr = new Mat();
        if (image.Channels() == 1)
        {
            Cv2.CvtColor(image, bgr, ColorConversionCodes.GRAY2BGR);
        }
        else if (image.Channels() == 4)
        {
            Cv2.CvtColor(image, bgr, ColorConversionCodes.BGRA2BGR);
        }
        else
        {
            image.CopyTo(bgr);
        }

        return bgr;
    }

    private static List<Point2d> SelectGridCandidates(
        IReadOnlyList<CandidatePoint> candidates,
        int expectedCount)
    {
        if (candidates.Count == expectedCount)
            return candidates.Select(candidate => candidate.Point).ToList();

        var medianArea = candidates
            .Select(candidate => candidate.Area)
            .OrderBy(area => area)
            .ElementAt(candidates.Count / 2);

        return candidates
            .OrderBy(candidate => Math.Abs(candidate.Area - medianArea))
            .ThenByDescending(candidate => candidate.Area)
            .Take(expectedCount)
            .Select(candidate => candidate.Point)
            .ToList();
    }

    private static List<Point2d> OrderRowMajor(
        IReadOnlyList<Point2d> points,
        int columns,
        int rows)
    {
        var meanX = points.Average(point => point.X);
        var meanY = points.Average(point => point.Y);
        var centre = points
            .OrderBy(point => DistanceSquared(point, new Point2d(meanX, meanY)))
            .First();
        var neighbourVectors = points
            .Where(point => point != centre)
            .Select(point => new Point2d(point.X - centre.X, point.Y - centre.Y))
            .OrderBy(vector => vector.X * vector.X + vector.Y * vector.Y)
            .Take(Math.Min(12, points.Count - 1))
            .ToArray();

        var basisCandidates = new List<BasisCandidate>();
        for (var first = 0; first < neighbourVectors.Length; first++)
        {
            for (var second = first + 1; second < neighbourVectors.Length; second++)
            {
                var firstLength = Length(neighbourVectors[first]);
                var secondLength = Length(neighbourVectors[second]);
                var cosine = Dot(neighbourVectors[first], neighbourVectors[second]) /
                             (firstLength * secondLength);
                if (cosine > -0.75)
                    continue;

                var basis = new Point2d(
                    (neighbourVectors[first].X - neighbourVectors[second].X) / 2,
                    (neighbourVectors[first].Y - neighbourVectors[second].Y) / 2);
                basisCandidates.Add(new BasisCandidate(
                    OrientVector(basis, preferX: true),
                    (firstLength + secondLength) / 2));
            }
        }

        var columnBasis = basisCandidates
            .OrderBy(candidate => candidate.Length)
            .FirstOrDefault();
        if (columnBasis is null)
            throw new InvalidOperationException("无法估计点阵列方向，请检查点阵是否完整。");

        var rowBasis = basisCandidates
            .Where(candidate => AngleBetweenUndirected(candidate.Vector, columnBasis.Vector) > Math.PI / 8)
            .OrderBy(candidate => candidate.Length)
            .FirstOrDefault();
        if (rowBasis is null)
            throw new InvalidOperationException("无法估计点阵行方向，请检查点阵是否完整。");

        var columnVector = columnBasis.Vector;
        var rowVector = OrientVector(rowBasis.Vector, preferX: false);
        var determinant = columnVector.X * rowVector.Y - columnVector.Y * rowVector.X;
        if (Math.Abs(determinant) < 1e-6)
            throw new InvalidOperationException("点阵行列方向接近平行，无法建立坐标映射。");

        var projected = points
            .Select(point => new ProjectedPoint(
                point,
                ((point.X - centre.X) * rowVector.Y - (point.Y - centre.Y) * rowVector.X) / determinant,
                (columnVector.X * (point.Y - centre.Y) - columnVector.Y * (point.X - centre.X)) / determinant))
            .OrderBy(point => point.RowCoordinate)
            .ThenBy(point => point.ColumnCoordinate)
            .ToList();

        var ordered = new List<Point2d>(points.Count);
        for (var row = 0; row < rows; row++)
        {
            var rowPoints = projected
                .Skip(row * columns)
                .Take(columns)
                .OrderBy(point => point.ColumnCoordinate)
                .Select(point => point.Point);
            ordered.AddRange(rowPoints);
        }

        return ordered;
    }

    private static Point2d OrientVector(Point2d vector, bool preferX)
    {
        var flip = preferX
            ? vector.X < 0 || (Math.Abs(vector.X) < 1e-9 && vector.Y < 0)
            : vector.Y < 0 || (Math.Abs(vector.Y) < 1e-9 && vector.X < 0);
        return flip ? new Point2d(-vector.X, -vector.Y) : vector;
    }

    private static double AngleBetweenUndirected(Point2d first, Point2d second)
    {
        var cosine = Math.Abs(Dot(first, second) / (Length(first) * Length(second)));
        return Math.Acos(Math.Clamp(cosine, -1, 1));
    }

    private static double Dot(Point2d first, Point2d second) =>
        first.X * second.X + first.Y * second.Y;

    private static double Length(Point2d vector) =>
        Math.Sqrt(vector.X * vector.X + vector.Y * vector.Y);

    private static double DistanceSquared(Point2d first, Point2d second) =>
        (first.X - second.X) * (first.X - second.X) +
        (first.Y - second.Y) * (first.Y - second.Y);

    private sealed record CandidatePoint(Point2d Point, double Area);
    private sealed record BasisCandidate(Point2d Vector, double Length);
    private sealed record ProjectedPoint(Point2d Point, double ColumnCoordinate, double RowCoordinate);
}

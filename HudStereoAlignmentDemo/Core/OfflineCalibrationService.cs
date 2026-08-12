using System.Text.Json;
using OpenCvSharp;

namespace HudStereoAlignmentDemo.Core;

/// <summary>
/// 离线标定工具。生产测试启动时只调用已经审核并冻结的标定快照，不应在每次测试前自动重标定。
/// </summary>
public static class OfflineCalibrationService
{
    /// <summary>生成棋盘格内角点在标定板坐标系中的三维坐标。</summary>
    /// <param name="innerCornerPattern">横向、纵向内角点数量，例如9×6。</param>
    /// <param name="squareSizeMm">相邻内角点间距，单位mm。</param>
    /// <returns>Z=0平面上的三维点，顺序与FindChessboardCorners一致。</returns>
    public static Point3f[] CreateChessboardObjectPoints(Size innerCornerPattern, float squareSizeMm)
    {
        if (innerCornerPattern.Width < 2 || innerCornerPattern.Height < 2)
            throw new ArgumentOutOfRangeException(nameof(innerCornerPattern));
        if (squareSizeMm <= 0) throw new ArgumentOutOfRangeException(nameof(squareSizeMm));

        var points = new List<Point3f>(innerCornerPattern.Width * innerCornerPattern.Height);
        for (var y = 0; y < innerCornerPattern.Height; y++)
        for (var x = 0; x < innerCornerPattern.Width; x++)
            points.Add(new Point3f(x * squareSizeMm, y * squareSizeMm, 0));
        return points.ToArray();
    }

    /// <summary>检测棋盘格内角点并执行亚像素精修。</summary>
    /// <param name="image">灰度或BGR标定图。</param>
    /// <param name="innerCornerPattern">内角点行列数，必须与实物一致。</param>
    /// <returns>精修后的像素点。</returns>
    /// <exception cref="InvalidOperationException">没有检测到完整棋盘格。</exception>
    public static Point2f[] DetectChessboardCorners(Mat image, Size innerCornerPattern)
    {
        using var gray = new Mat();
        if (image.Channels() == 1) image.CopyTo(gray);
        else Cv2.CvtColor(image, gray, ColorConversionCodes.BGR2GRAY);

        var found = Cv2.FindChessboardCorners(
            gray,
            innerCornerPattern,
            out Point2f[] corners,
            ChessboardFlags.AdaptiveThresh | ChessboardFlags.NormalizeImage);
        if (!found) throw new InvalidOperationException("未检测到完整棋盘格内角点。");

        Cv2.CornerSubPix(
            gray,
            corners,
            new Size(11, 11),
            new Size(-1, -1),
            new TermCriteria(CriteriaTypes.Eps | CriteriaTypes.MaxIter, 40, 0.001));
        return corners;
    }

    /// <summary>使用多姿态棋盘格图像点完成单相机内参标定。</summary>
    /// <param name="objectPointSets">每幅图对应的标定板三维内角点，单位mm。</param>
    /// <param name="imagePointSets">每幅图检测到的二维亚像素内角点。</param>
    /// <param name="imageSize">参与标定的原始图像分辨率。</param>
    /// <returns>相机矩阵、畸变系数、RMS及每幅图的rvec/tvec。</returns>
    public static SingleCameraCalibrationResult CalibrateSingleCamera(
        IReadOnlyList<Point3f[]> objectPointSets,
        IReadOnlyList<Point2f[]> imagePointSets,
        Size imageSize)
    {
        ValidateCalibrationViews(objectPointSets, imagePointSets, 10);
        var cameraMatrix = new double[3, 3];
        cameraMatrix[0, 0] = 1;
        cameraMatrix[1, 1] = 1;
        cameraMatrix[2, 2] = 1;
        var distortion = new double[8];
        var rms = Cv2.CalibrateCamera(
            objectPointSets,
            imagePointSets,
            imageSize,
            cameraMatrix,
            distortion,
            out Vec3d[] rvecs,
            out Vec3d[] tvecs,
            CalibrationFlags.RationalModel,
            new TermCriteria(CriteriaTypes.Eps | CriteriaTypes.MaxIter, 100, 1e-9));
        return new(cameraMatrix, distortion, rms, rvecs, tvecs);
    }

    /// <summary>固定左右内参，标定右相机到左相机的双目外参。</summary>
    /// <param name="objectPointSets">每组同步图像对应的标定板三维点。</param>
    /// <param name="leftImagePointSets">左相机亚像素角点。</param>
    /// <param name="rightImagePointSets">右相机亚像素角点。</param>
    /// <param name="left">左相机单目标定结果。</param>
    /// <param name="right">右相机单目标定结果。</param>
    /// <param name="imageSize">左右相机共同分辨率。</param>
    /// <returns>CL_From_CR、双目RMS、本质矩阵和基础矩阵。</returns>
    public static StereoExtrinsicResult CalibrateStereo(
        IReadOnlyList<Point3f[]> objectPointSets,
        IReadOnlyList<Point2f[]> leftImagePointSets,
        IReadOnlyList<Point2f[]> rightImagePointSets,
        SingleCameraCalibrationResult left,
        SingleCameraCalibrationResult right,
        Size imageSize)
    {
        ValidateCalibrationViews(objectPointSets, leftImagePointSets, 10);
        ValidateCalibrationViews(objectPointSets, rightImagePointSets, 10);
        using var rotation = new Mat();
        using var translation = new Mat();
        using var essential = new Mat();
        using var fundamental = new Mat();
        var rms = Cv2.StereoCalibrate(
            objectPointSets,
            leftImagePointSets,
            rightImagePointSets,
            left.CameraMatrix,
            left.DistCoeffs,
            right.CameraMatrix,
            right.DistCoeffs,
            imageSize,
            rotation,
            translation,
            essential,
            fundamental,
            CalibrationFlags.FixIntrinsic,
            new TermCriteria(CriteriaTypes.Eps | CriteriaTypes.MaxIter, 100, 1e-9));

        var leftFromRight = new RigidTransform(Read3x3(rotation), ReadVector3(translation));
        return new(leftFromRight, rms, ReadMatrix(essential), ReadMatrix(fundamental));
    }

    /// <summary>根据标定板三维点和图像点求标定板到相机的位姿。</summary>
    /// <param name="objectPoints">标定板坐标中的三维点，单位mm。</param>
    /// <param name="imagePoints">对应的去畸变或原始像素点。</param>
    /// <param name="camera">相机内参和畸变。</param>
    /// <returns>C_From_Target；可直接作为CalibrateHandEye的target2cam输入。</returns>
    public static RigidTransform SolveCalibrationTargetPose(
        IReadOnlyList<Point3f> objectPoints,
        IReadOnlyList<Point2f> imagePoints,
        SingleCameraCalibrationResult camera)
    {
        double[] rvec = [0, 0, 0];
        double[] tvec = [0, 0, 0];
        Cv2.SolvePnP(
            objectPoints.ToArray(),
            imagePoints.ToArray(),
            camera.CameraMatrix,
            camera.DistCoeffs,
            ref rvec,
            ref tvec,
            false,
            SolvePnPMethod.Iterative);
        if (rvec.Any(x => !double.IsFinite(x)) || tvec.Any(x => !double.IsFinite(x)))
            throw new InvalidOperationException("SolvePnP返回非有限数。");

        using var rvecMat = MatFromVector(rvec);
        using var rotation = new Mat();
        Cv2.Rodrigues(rvecMat, rotation);
        return new(Read3x3(rotation), tvec);
    }

    /// <summary>执行Eye-in-Hand手眼标定，输出法兰到相机的变换。</summary>
    /// <param name="worldFromFlangeSamples">各姿态控制器记录的W_From_F。</param>
    /// <param name="cameraFromTargetSamples">相同姿态图像SolvePnP得到的C_From_Target。</param>
    /// <param name="method">OpenCV手眼算法；默认Tsai。</param>
    /// <returns>F_From_C。若用左相机观测，则结果是F_From_CL，需再结合CL_From_C0换算。</returns>
    public static RigidTransform CalibrateEyeInHand(
        IReadOnlyList<RigidTransform> worldFromFlangeSamples,
        IReadOnlyList<RigidTransform> cameraFromTargetSamples,
        HandEyeCalibrationMethod method = HandEyeCalibrationMethod.TSAI)
    {
        if (worldFromFlangeSamples.Count != cameraFromTargetSamples.Count || worldFromFlangeSamples.Count < 8)
            throw new ArgumentException("手眼标定要求至少8组严格同步的法兰位姿和标定板图像位姿。");

        var rGripperToBase = worldFromFlangeSamples.Select(x => MatFromRotation(x.Rotation)).ToArray();
        var tGripperToBase = worldFromFlangeSamples.Select(x => MatFromVector(x.TranslationMm)).ToArray();
        var rTargetToCamera = cameraFromTargetSamples.Select(x => MatFromRotation(x.Rotation)).ToArray();
        var tTargetToCamera = cameraFromTargetSamples.Select(x => MatFromVector(x.TranslationMm)).ToArray();
        try
        {
            using var rCameraToGripper = new Mat();
            using var tCameraToGripper = new Mat();
            Cv2.CalibrateHandEye(
                rGripperToBase,
                tGripperToBase,
                rTargetToCamera,
                tTargetToCamera,
                rCameraToGripper,
                tCameraToGripper,
                method);
            return new(Read3x3(rCameraToGripper), ReadVector3(tCameraToGripper));
        }
        finally
        {
            foreach (var mat in rGripperToBase.Concat(tGripperToBase).Concat(rTargetToCamera).Concat(tTargetToCamera))
                mat.Dispose();
        }
    }

    /// <summary>由至少3组不共线同名点，通过Kabsch算法求局部坐标到世界坐标的刚体注册。</summary>
    /// <param name="localPointsMm">HUD或风挡坐标中的基准点，单位mm。</param>
    /// <param name="worldPointsMm">测量得到的对应世界点，单位mm。</param>
    /// <returns>W_From_Local。</returns>
    public static RigidTransform RegisterRigidPointSets(
        IReadOnlyList<double[]> localPointsMm,
        IReadOnlyList<double[]> worldPointsMm)
    {
        if (localPointsMm.Count != worldPointsMm.Count || localPointsMm.Count < 3)
            throw new ArgumentException("刚体注册要求至少3组一一对应点。");
        if (localPointsMm.Any(x => x.Length != 3) || worldPointsMm.Any(x => x.Length != 3))
            throw new ArgumentException("每个注册点必须包含XYZ三个分量。");

        var localCenter = Centroid(localPointsMm);
        var worldCenter = Centroid(worldPointsMm);
        using var covariance = Mat.Zeros(3, 3, MatType.CV_64FC1).ToMat();
        for (var i = 0; i < localPointsMm.Count; i++)
        {
            var a = Subtract(localPointsMm[i], localCenter);
            var b = Subtract(worldPointsMm[i], worldCenter);
            for (var r = 0; r < 3; r++)
            for (var c = 0; c < 3; c++)
                covariance.Set(r, c, covariance.At<double>(r, c) + a[r] * b[c]);
        }

        using var w = new Mat();
        using var u = new Mat();
        using var vt = new Mat();
        Cv2.SVDecomp(covariance, w, u, vt, SVD.Flags.FullUV);
        var uArray = Read3x3(u);
        var vtArray = Read3x3(vt);
        var rotation = Multiply(Transpose(vtArray), Transpose(uArray));
        if (RigidTransform.Determinant3x3(rotation) < 0)
        {
            // 反射修正：翻转V的最后一列，也就是Vt的最后一行。
            for (var c = 0; c < 3; c++) vtArray[2][c] *= -1;
            rotation = Multiply(Transpose(vtArray), Transpose(uArray));
        }

        var translation = Subtract(worldCenter, Multiply(rotation, localCenter));
        return new(rotation, translation);
    }

    /// <summary>计算刚体注册后所有同名点的三维RMS。</summary>
    /// <param name="worldFromLocal">RegisterRigidPointSets得到的注册矩阵。</param>
    /// <param name="localPointsMm">局部坐标点。</param>
    /// <param name="worldPointsMm">对应世界实测点。</param>
    /// <returns>三维位置RMS，单位mm。</returns>
    public static double CalculateRegistrationRmsMm(
        RigidTransform worldFromLocal,
        IReadOnlyList<double[]> localPointsMm,
        IReadOnlyList<double[]> worldPointsMm)
    {
        if (localPointsMm.Count != worldPointsMm.Count || localPointsMm.Count == 0)
            throw new ArgumentException("注册点数量必须相等且非空。");
        var sumSquares = 0.0;
        for (var i = 0; i < localPointsMm.Count; i++)
        {
            var predicted = worldFromLocal.TransformPoint(localPointsMm[i]);
            var error = Subtract(predicted, worldPointsMm[i]);
            sumSquares += error.Sum(x => x * x);
        }
        return Math.Sqrt(sumSquares / localPointsMm.Count);
    }

    /// <summary>把经过审核的完整标定快照保存为在线测试程序可加载的JSON。</summary>
    /// <param name="filePath">目标JSON路径。</param>
    /// <param name="bundle">完整且版本一致的标定包。</param>
    public static void SaveBundle(string filePath, CalibrationBundle bundle)
    {
        var json = JsonSerializer.Serialize(bundle, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(filePath, json);
    }

    /// <summary>验证单目/双目标定视图数量、对应关系和每组点数。</summary>
    private static void ValidateCalibrationViews<TImagePoint>(
        IReadOnlyList<Point3f[]> objectSets,
        IReadOnlyList<TImagePoint[]> imageSets,
        int minimumViews)
    {
        if (objectSets.Count != imageSets.Count || objectSets.Count < minimumViews)
            throw new ArgumentException($"标定要求至少{minimumViews}组一一对应视图。");
        for (var i = 0; i < objectSets.Count; i++)
        {
            if (objectSets[i].Length != imageSets[i].Length || objectSets[i].Length < 6)
                throw new ArgumentException($"第{i}组的三维点和二维点数量不一致或过少。");
        }
    }

    /// <summary>将3×3数组转换为CV_64F矩阵。</summary>
    private static Mat MatFromRotation(double[][] rotation)
    {
        var mat = new Mat(3, 3, MatType.CV_64FC1);
        for (var r = 0; r < 3; r++)
        for (var c = 0; c < 3; c++)
            mat.Set(r, c, rotation[r][c]);
        return mat;
    }

    /// <summary>将三维数组转换为3×1 CV_64F矩阵。</summary>
    private static Mat MatFromVector(IReadOnlyList<double> vector)
    {
        var mat = new Mat(3, 1, MatType.CV_64FC1);
        for (var i = 0; i < 3; i++) mat.Set(i, 0, vector[i]);
        return mat;
    }

    /// <summary>读取CV_64F矩阵前3×3元素。</summary>
    private static double[][] Read3x3(Mat mat) =>
        [
            [mat.At<double>(0, 0), mat.At<double>(0, 1), mat.At<double>(0, 2)],
            [mat.At<double>(1, 0), mat.At<double>(1, 1), mat.At<double>(1, 2)],
            [mat.At<double>(2, 0), mat.At<double>(2, 1), mat.At<double>(2, 2)]
        ];

    /// <summary>读取3×1或1×3 CV_64F向量。</summary>
    private static double[] ReadVector3(Mat mat) => mat.Rows == 3
        ? [mat.At<double>(0, 0), mat.At<double>(1, 0), mat.At<double>(2, 0)]
        : [mat.At<double>(0, 0), mat.At<double>(0, 1), mat.At<double>(0, 2)];

    /// <summary>将任意CV_64F Mat复制为二维托管数组。</summary>
    private static double[,] ReadMatrix(Mat mat)
    {
        var rows = mat.Rows;
        var cols = mat.Cols;
        var result = new double[rows, cols];
        for (var r = 0; r < rows; r++)
        for (var c = 0; c < cols; c++)
            result[r, c] = mat.At<double>(r, c);
        return result;
    }

    /// <summary>计算三维点集质心。</summary>
    private static double[] Centroid(IReadOnlyList<double[]> points) =>
        [points.Average(x => x[0]), points.Average(x => x[1]), points.Average(x => x[2])];

    /// <summary>计算3×3矩阵乘法。</summary>
    private static double[][] Multiply(double[][] a, double[][] b)
    {
        var result = new[] { new double[3], new double[3], new double[3] };
        for (var r = 0; r < 3; r++)
        for (var c = 0; c < 3; c++)
        for (var k = 0; k < 3; k++)
            result[r][c] += a[r][k] * b[k][c];
        return result;
    }

    /// <summary>计算3×3矩阵乘三维向量。</summary>
    private static double[] Multiply(double[][] a, double[] b) =>
        [
            a[0][0] * b[0] + a[0][1] * b[1] + a[0][2] * b[2],
            a[1][0] * b[0] + a[1][1] * b[1] + a[1][2] * b[2],
            a[2][0] * b[0] + a[2][1] * b[1] + a[2][2] * b[2]
        ];

    /// <summary>转置3×3矩阵。</summary>
    private static double[][] Transpose(double[][] a) =>
        [[a[0][0], a[1][0], a[2][0]], [a[0][1], a[1][1], a[2][1]], [a[0][2], a[1][2], a[2][2]]];

    /// <summary>三维向量相减。</summary>
    private static double[] Subtract(double[] a, double[] b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

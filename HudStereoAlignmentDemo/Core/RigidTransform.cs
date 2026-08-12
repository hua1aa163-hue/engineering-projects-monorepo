namespace HudStereoAlignmentDemo.Core;

/// <summary>
/// 右手坐标系刚体变换。若对象名为AFromB，则点变换为pA=AFromB.TransformPoint(pB)。
/// </summary>
public sealed class RigidTransform
{
    public RigidTransform(double[][] rotation, double[] translationMm)
    {
        if (rotation.Length != 3 || rotation.Any(r => r.Length != 3))
            throw new ArgumentException("Rotation必须是3×3。", nameof(rotation));
        if (translationMm.Length != 3)
            throw new ArgumentException("Translation必须有3个元素。", nameof(translationMm));

        Rotation = rotation.Select(r => r.ToArray()).ToArray();
        TranslationMm = translationMm.ToArray();
    }

    public double[][] Rotation { get; }
    public double[] TranslationMm { get; }

    /// <summary>创建单位变换。</summary>
    /// <returns>旋转为单位阵且平移为零的刚体变换。</returns>
    public static RigidTransform Identity() => new(
        [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0]);

    /// <summary>将两个刚体变换按坐标链顺序相乘。</summary>
    /// <param name="right">右侧变换。例如WFromF.Compose(FFromC0)得到WFromC0。</param>
    /// <returns>复合后的刚体变换。</returns>
    public RigidTransform Compose(RigidTransform right)
    {
        var r = Multiply(Rotation, right.Rotation);
        var rt = Multiply(Rotation, right.TranslationMm);
        var t = Add(rt, TranslationMm);
        return new(r, t);
    }

    /// <summary>计算刚体变换的逆。</summary>
    /// <returns>若当前对象是AFromB，则返回BFromA。</returns>
    public RigidTransform Inverse()
    {
        var rt = Transpose(Rotation);
        var t = Scale(Multiply(rt, TranslationMm), -1);
        return new(rt, t);
    }

    /// <summary>转换一个三维点，旋转和平移都会生效。</summary>
    /// <param name="pointMm">源坐标系中的XYZ点，单位mm。</param>
    /// <returns>目标坐标系中的XYZ点，单位mm。</returns>
    public double[] TransformPoint(double[] pointMm) => Add(Multiply(Rotation, pointMm), TranslationMm);

    /// <summary>转换一个方向向量，只施加旋转，不施加平移。</summary>
    /// <param name="vector">源坐标系中的三维方向。</param>
    /// <returns>目标坐标系中的三维方向。</returns>
    public double[] TransformVector(double[] vector) => Multiply(Rotation, vector);

    /// <summary>创建只包含绕X轴旋转的局部变换。</summary>
    /// <param name="degrees">右手定则角度，单位°。</param>
    /// <returns>旋转变换。</returns>
    public static RigidTransform RotationX(double degrees)
    {
        var a = DegreesToRadians(degrees);
        var c = Math.Cos(a);
        var s = Math.Sin(a);
        return new([[1, 0, 0], [0, c, -s], [0, s, c]], [0, 0, 0]);
    }

    /// <summary>创建只包含绕Y轴旋转的局部变换。</summary>
    /// <param name="degrees">右手定则角度，单位°。</param>
    /// <returns>旋转变换。</returns>
    public static RigidTransform RotationY(double degrees)
    {
        var a = DegreesToRadians(degrees);
        var c = Math.Cos(a);
        var s = Math.Sin(a);
        return new([[c, 0, s], [0, 1, 0], [-s, 0, c]], [0, 0, 0]);
    }

    /// <summary>创建只包含绕Z轴旋转的局部变换。</summary>
    /// <param name="degrees">右手定则角度，单位°。</param>
    /// <returns>旋转变换。</returns>
    public static RigidTransform RotationZ(double degrees)
    {
        var a = DegreesToRadians(degrees);
        var c = Math.Cos(a);
        var s = Math.Sin(a);
        return new([[c, -s, 0], [s, c, 0], [0, 0, 1]], [0, 0, 0]);
    }

    /// <summary>在当前TCP局部相机坐标中追加Yaw(Y)、Pitch(X)、Roll(Z)修正。</summary>
    /// <param name="yawAboutYDeg">绕相机Y轴的右手角，单位°。</param>
    /// <param name="pitchAboutXDeg">绕相机X轴的右手角，单位°。</param>
    /// <param name="rollAboutZDeg">绕相机Z轴的右手角，单位°。</param>
    /// <returns>保持TCP位置不变、只改变姿态的新位姿。</returns>
    public RigidTransform ApplyCameraLocalRotation(
        double yawAboutYDeg,
        double pitchAboutXDeg,
        double rollAboutZDeg)
    {
        var local = RotationY(yawAboutYDeg)
            .Compose(RotationX(pitchAboutXDeg))
            .Compose(RotationZ(rollAboutZDeg));
        return Compose(local);
    }

    /// <summary>从观察点、目标点和世界向上方向构造相机位姿。</summary>
    /// <param name="originWorldMm">双目中点在世界坐标中的位置，单位mm。</param>
    /// <param name="targetWorldMm">HUD虚像中心在世界坐标中的位置，单位mm。</param>
    /// <param name="worldUp">世界坐标中的向上单位方向；函数内部会归一化。</param>
    /// <returns>WFromC0；相机X向右、Y向下、Z沿平均光轴向前。</returns>
    public static RigidTransform CreateCameraLookAt(
        double[] originWorldMm,
        double[] targetWorldMm,
        double[] worldUp)
    {
        var zForward = Normalize(Subtract(targetWorldMm, originWorldMm));
        var yDownSeed = Scale(Normalize(worldUp), -1);
        var xRight = Normalize(Cross(yDownSeed, zForward));
        var yDown = Normalize(Cross(zForward, xRight));

        // R_W_C的三列是相机X/Y/Z轴在世界坐标中的表达。
        var r = new[]
        {
            new[] { xRight[0], yDown[0], zForward[0] },
            new[] { xRight[1], yDown[1], zForward[1] },
            new[] { xRight[2], yDown[2], zForward[2] }
        };
        return new(r, originWorldMm);
    }

    /// <summary>把刚体变换转换为控制器常见的XYZ+ZYX欧拉角。</summary>
    /// <returns>位置单位mm；Rx、Ry、Rz单位°，满足R=Rz·Ry·Rx。</returns>
    public Pose6D ToPoseZyx()
    {
        var r20 = Rotation[2][0];
        double rx;
        double ry;
        double rz;

        if (Math.Abs(r20) < 1.0 - 1e-9)
        {
            ry = Math.Asin(-r20);
            rx = Math.Atan2(Rotation[2][1], Rotation[2][2]);
            rz = Math.Atan2(Rotation[1][0], Rotation[0][0]);
        }
        else
        {
            // 万向锁附近令Rz=0，并保留一个确定解。
            ry = r20 <= -1 ? Math.PI / 2 : -Math.PI / 2;
            rx = Math.Atan2(-Rotation[0][1], Rotation[1][1]);
            rz = 0;
        }

        return new(
            TranslationMm[0], TranslationMm[1], TranslationMm[2],
            RadiansToDegrees(rx), RadiansToDegrees(ry), RadiansToDegrees(rz));
    }

    /// <summary>从XYZ+ZYX欧拉角重建刚体变换。</summary>
    /// <param name="pose">位置单位mm、角度单位°的六轴位姿。</param>
    /// <returns>满足R=Rz·Ry·Rx的刚体变换。</returns>
    public static RigidTransform FromPoseZyx(Pose6D pose)
    {
        var rotation = RotationZ(pose.RzDeg)
            .Compose(RotationY(pose.RyDeg))
            .Compose(RotationX(pose.RxDeg));
        return new(rotation.Rotation, [pose.XMm, pose.YMm, pose.ZMm]);
    }

    /// <summary>计算3×3矩阵的行列式。</summary>
    /// <param name="m">3×3矩阵。</param>
    /// <returns>行列式。</returns>
    public static double Determinant3x3(double[][] m) =>
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    /// <summary>计算旋转正交性误差||RᵀR-I||F。</summary>
    /// <param name="r">待检查的3×3旋转矩阵。</param>
    /// <returns>Frobenius范数；越接近0越好。</returns>
    public static double OrthogonalityError(double[][] r)
    {
        var shouldBeI = Multiply(Transpose(r), r);
        double sum = 0;
        for (var i = 0; i < 3; i++)
        for (var j = 0; j < 3; j++)
        {
            var expected = i == j ? 1.0 : 0.0;
            sum += Math.Pow(shouldBeI[i][j] - expected, 2);
        }
        return Math.Sqrt(sum);
    }

    /// <summary>将角度从°转换为rad。</summary>
    /// <param name="degrees">角度，单位°。</param>
    /// <returns>角度，单位rad。</returns>
    public static double DegreesToRadians(double degrees) => degrees * Math.PI / 180.0;

    /// <summary>将角度从rad转换为°。</summary>
    /// <param name="radians">角度，单位rad。</param>
    /// <returns>角度，单位°。</returns>
    public static double RadiansToDegrees(double radians) => radians * 180.0 / Math.PI;

    /// <summary>计算三维向量的欧氏长度。</summary>
    /// <param name="v">三维向量。</param>
    /// <returns>向量长度。</returns>
    public static double Norm(double[] v) => Math.Sqrt(v.Sum(x => x * x));

    /// <summary>将三维向量归一化。</summary>
    /// <param name="v">非零三维向量。</param>
    /// <returns>长度为1的向量。</returns>
    public static double[] Normalize(double[] v)
    {
        var n = Norm(v);
        if (n < 1e-12) throw new ArgumentException("不能归一化零向量。", nameof(v));
        return Scale(v, 1.0 / n);
    }

    private static double[][] Multiply(double[][] a, double[][] b)
    {
        var result = new[] { new double[3], new double[3], new double[3] };
        for (var i = 0; i < 3; i++)
        for (var j = 0; j < 3; j++)
        for (var k = 0; k < 3; k++)
            result[i][j] += a[i][k] * b[k][j];
        return result;
    }

    private static double[] Multiply(double[][] a, double[] v) =>
        [
            a[0][0] * v[0] + a[0][1] * v[1] + a[0][2] * v[2],
            a[1][0] * v[0] + a[1][1] * v[1] + a[1][2] * v[2],
            a[2][0] * v[0] + a[2][1] * v[1] + a[2][2] * v[2]
        ];

    private static double[][] Transpose(double[][] a) =>
        [
            [a[0][0], a[1][0], a[2][0]],
            [a[0][1], a[1][1], a[2][1]],
            [a[0][2], a[1][2], a[2][2]]
        ];

    private static double[] Add(double[] a, double[] b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    private static double[] Subtract(double[] a, double[] b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    private static double[] Scale(double[] a, double s) => [a[0] * s, a[1] * s, a[2] * s];
    private static double[] Cross(double[] a, double[] b) =>
        [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

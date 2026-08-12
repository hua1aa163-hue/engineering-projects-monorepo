using DistortionCorrectionApp.Core;
using OpenCvSharp;

var sourcePath = @"C:\Users\admin\Desktop\20260729-134511.png";
using var source = Cv2.ImRead(sourcePath, ImreadModes.Unchanged);
Console.WriteLine($"source size={source.Width}x{source.Height}");
var detection = GridPointDetector.Detect(source, 27, 7, 30, false, 2, 500);
using var overlay = GridPointDetector.DrawPoints(source, detection.Points, Scalar.LimeGreen);
var outputPath = Path.Combine(Environment.CurrentDirectory, "source-order.png");
Cv2.ImWrite(outputPath, overlay);
Console.WriteLine(outputPath);
for (var row = 0; row < 7; row++)
{
    var values = detection.Points
        .Skip(row * 27)
        .Take(27)
        .Select(point => $"({point.X:F1},{point.Y:F1})");
    Console.WriteLine($"row {row + 1}: {string.Join(" ", values)}");
}

var syntheticTargetPath = Path.Combine(Environment.CurrentDirectory, "synthetic-target.png");
using var syntheticTarget = new Mat(1080, 1920, MatType.CV_8UC1, Scalar.Black);
for (var row = 0; row < 7; row++)
for (var column = 0; column < 27; column++)
{
    var x = 76.0 + column * (1768.0 / 26.0);
    var y = 201.0 + row * (678.0 / 6.0);
    Cv2.Circle(syntheticTarget, new Point((int)x, (int)y), 4, Scalar.White, -1);
}
Cv2.ImWrite(syntheticTargetPath, syntheticTarget);
using var correction = CorrectionProcessor.Run(sourcePath, syntheticTargetPath, 27, 7, 30, false, 2, 500);
var correctedPath = Path.Combine(Environment.CurrentDirectory, "synthetic-target-corrected.png");
Cv2.ImWrite(correctedPath, correction.CorrectedImage);
Console.WriteLine($"corrected={correctedPath}, size={correction.CorrectedImage.Width}x{correction.CorrectedImage.Height}, rms={correction.RmsErrorPx:F3}");

var realTargetPath = Path.Combine(Environment.CurrentDirectory, "reference-real.png");
using var realCorrection = CorrectionProcessor.Run(sourcePath, realTargetPath, 27, 7, 30, false, 2, 500);
var realCorrectedPath = Path.Combine(Environment.CurrentDirectory, "real-corrected.png");
Cv2.ImWrite(realCorrectedPath, realCorrection.CorrectedImage);
Console.WriteLine($"real corrected={realCorrectedPath}, size={realCorrection.CorrectedImage.Width}x{realCorrection.CorrectedImage.Height}, rms={realCorrection.RmsErrorPx:F3}");
var realPreDistortedPath = Path.Combine(Environment.CurrentDirectory, "real-predistorted.png");
Cv2.ImWrite(realPreDistortedPath, realCorrection.PreDistortedImage);
Console.WriteLine($"real predistorted={realPreDistortedPath}, size={realCorrection.PreDistortedImage.Width}x{realCorrection.PreDistortedImage.Height}");

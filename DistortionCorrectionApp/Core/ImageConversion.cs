using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using OpenCvSharp;

namespace DistortionCorrectionApp.Core;

public static class ImageConversion
{
    public static Bitmap ToBitmap(Mat image)
    {
        using var bgr = GridPointDetector.ToBgr(image);
        using var bitmap = new Bitmap(bgr.Width, bgr.Height, PixelFormat.Format24bppRgb);
        var rectangle = new Rectangle(0, 0, bgr.Width, bgr.Height);
        var bitmapData = bitmap.LockBits(rectangle, ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
        try
        {
            var rowBytes = bgr.Width * 3;
            var rowBuffer = new byte[rowBytes];
            var height = bgr.Height;
            for (var row = 0; row < height; row++)
            {
                Marshal.Copy(bgr.Ptr(row), rowBuffer, 0, rowBytes);
                Marshal.Copy(rowBuffer, 0, IntPtr.Add(bitmapData.Scan0, row * bitmapData.Stride), rowBytes);
            }
        }
        finally
        {
            bitmap.UnlockBits(bitmapData);
        }

        return new Bitmap(bitmap);
    }
}

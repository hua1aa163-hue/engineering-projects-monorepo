using System.Drawing;
using OpenCvSharp;
using DistortionCorrectionApp.Core;

namespace DistortionCorrectionApp;

public sealed class MainForm : Form
{
    private readonly TextBox _sourcePathBox = new();
    private readonly TextBox _targetPathBox = new();
    private readonly TextBox _outputPathBox = new();
    private readonly TextBox _preDistortedOutputPathBox = new();
    private readonly NumericUpDown _columnsBox = new();
    private readonly NumericUpDown _rowsBox = new();
    private readonly NumericUpDown _thresholdBox = new();
    private readonly NumericUpDown _minimumAreaBox = new();
    private readonly NumericUpDown _maximumAreaBox = new();
    private readonly CheckBox _otsuBox = new();
    private readonly Button _runButton = new();
    private readonly Label _statusLabel = new();
    private readonly PictureBox _sourcePreview = CreatePreviewBox();
    private readonly PictureBox _targetPreview = CreatePreviewBox();
    private readonly PictureBox _correctedPreview = CreatePreviewBox();
    private readonly PictureBox _preDistortedPreview = CreatePreviewBox();

    public MainForm()
    {
        Text = "点阵畸变矫正工具";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new System.Drawing.Size(1100, 700);
        Width = 1500;
        Height = 900;
        Font = new Font("Microsoft YaHei UI", 9F);
        BackColor = Color.FromArgb(245, 247, 250);

        ConfigureInputs();
        Controls.Add(CreateLayout());
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _sourcePreview.Image?.Dispose();
            _targetPreview.Image?.Dispose();
            _correctedPreview.Image?.Dispose();
            _preDistortedPreview.Image?.Dispose();
        }

        base.Dispose(disposing);
    }

    private void ConfigureInputs()
    {
        _sourcePathBox.Text = @"C:\Users\admin\Desktop\20260729-134511.png";
        _targetPathBox.Text = @"\\192.168.1.92\310_共享\042Yinlei\Optics\Test_process\Project\30004_Mazda_J90K\图卡\未预畸变图卡20250624\7x27point_9pix_1777x687in1920x1080.png";

        ConfigureNumeric(_columnsBox, 27, 2, 200, 1);
        ConfigureNumeric(_rowsBox, 7, 2, 100, 1);
        ConfigureNumeric(_thresholdBox, 30, 0, 255, 1);
        ConfigureNumeric(_minimumAreaBox, 2, 0.1M, 10000, 0.1M);
        ConfigureNumeric(_maximumAreaBox, 500, 1, 100000, 1);
        _otsuBox.Text = "使用 Otsu 自动阈值";
        _otsuBox.AutoSize = true;
        _otsuBox.Checked = false;

        _runButton.Text = "拟合映射并矫正";
        _runButton.AutoSize = true;
        _runButton.Padding = new Padding(14, 7, 14, 7);
        _runButton.BackColor = Color.FromArgb(30, 106, 210);
        _runButton.ForeColor = Color.White;
        _runButton.FlatStyle = FlatStyle.Flat;
        _runButton.FlatAppearance.BorderSize = 0;
        _runButton.Click += RunButton_Click;

        _statusLabel.Text = "请选择两张图，然后点击“拟合映射并矫正”。";
        _statusLabel.AutoEllipsis = true;
        _statusLabel.Dock = DockStyle.Fill;
        _statusLabel.Padding = new Padding(10, 7, 10, 7);
        _statusLabel.ForeColor = Color.FromArgb(55, 65, 81);
    }

    private Control CreateLayout()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 3,
            Padding = new Padding(12),
            BackColor = BackColor
        };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        root.Controls.Add(CreateSettingsPanel(), 0, 0);
        root.Controls.Add(CreatePreviewPanel(), 0, 1);
        root.Controls.Add(CreateStatusPanel(), 0, 2);
        return root;
    }

    private Control CreateSettingsPanel()
    {
        var panel = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            ColumnCount = 1,
            AutoSize = true,
            Padding = new Padding(10),
            BackColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };

        panel.Controls.Add(CreatePathRow("拍摄图像", _sourcePathBox, "拍摄图像|*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff|所有文件|*.*"), 0, 0);
        panel.Controls.Add(CreatePathRow("原始基准图", _targetPathBox, "基准图|*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff|所有文件|*.*"), 0, 1);
        panel.Controls.Add(CreatePathRow("拍摄矫正输出", _outputPathBox, "", true), 0, 2);
        panel.Controls.Add(CreatePathRow("投影预畸变输出", _preDistortedOutputPathBox, "", true), 0, 3);

        var parameters = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            WrapContents = true,
            Padding = new Padding(0, 8, 0, 0)
        };
        parameters.Controls.Add(CreateParameter("列数", _columnsBox));
        parameters.Controls.Add(CreateParameter("行数", _rowsBox));
        parameters.Controls.Add(CreateParameter("阈值", _thresholdBox));
        parameters.Controls.Add(CreateParameter("最小点面积", _minimumAreaBox));
        parameters.Controls.Add(CreateParameter("最大点面积", _maximumAreaBox));
        parameters.Controls.Add(_otsuBox);
        parameters.Controls.Add(_runButton);
        panel.Controls.Add(parameters, 0, 4);

        var note = new Label
        {
            Text = "点面积单位为像素²；默认点阵为 27×7。程序使用局部双线性网格映射，适合非对称和自由曲面畸变。",
            AutoSize = true,
            ForeColor = Color.FromArgb(107, 114, 128),
            Padding = new Padding(0, 6, 0, 0)
        };
        panel.Controls.Add(note, 0, 5);
        return panel;
    }

    private Control CreatePreviewPanel()
    {
        var panel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 4,
            Padding = new Padding(0, 12, 0, 0)
        };
        panel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        panel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.Percent, 50));

        panel.Controls.Add(CreatePreviewTitle("拍摄图像：自动检测点"), 0, 0);
        panel.Controls.Add(CreatePreviewTitle("原始基准图：对应点"), 1, 0);
        panel.Controls.Add(CreatePreviewTitle("拍摄矫正图：应接近原始基准图"), 0, 2);
        panel.Controls.Add(CreatePreviewTitle("投影预畸变图：用于重新投影"), 1, 2);
        panel.Controls.Add(_sourcePreview, 0, 1);
        panel.Controls.Add(_targetPreview, 1, 1);
        panel.Controls.Add(_correctedPreview, 0, 3);
        panel.Controls.Add(_preDistortedPreview, 1, 3);
        return panel;
    }

    private Control CreateStatusPanel()
    {
        var panel = new Panel
        {
            Dock = DockStyle.Fill,
            Height = 40,
            BackColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        panel.Controls.Add(_statusLabel);
        return panel;
    }

    private Control CreatePathRow(string labelText, TextBox pathBox, string filter, bool savePath = false)
    {
        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            AutoSize = true,
            Margin = new Padding(0, 0, 0, 4)
        };
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 78));

        var label = new Label
        {
            Text = labelText,
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft
        };
        pathBox.Dock = DockStyle.Fill;
        var browseButton = new Button
        {
            Text = savePath ? "另存为" : "浏览...",
            Dock = DockStyle.Fill,
            Tag = new PathDialogSettings(pathBox, filter, savePath)
        };
        browseButton.Click += BrowseButton_Click;
        row.Controls.Add(label, 0, 0);
        row.Controls.Add(pathBox, 1, 0);
        row.Controls.Add(browseButton, 2, 0);
        return row;
    }

    private static Control CreateParameter(string labelText, NumericUpDown input)
    {
        var panel = new FlowLayoutPanel
        {
            AutoSize = true,
            WrapContents = false,
            Margin = new Padding(0, 0, 14, 0)
        };
        panel.Controls.Add(new Label
        {
            Text = labelText,
            AutoSize = true,
            Padding = new Padding(0, 5, 4, 0)
        });
        input.Width = 72;
        panel.Controls.Add(input);
        return panel;
    }

    private static Label CreatePreviewTitle(string text) => new()
    {
        Text = text,
        Dock = DockStyle.Fill,
        TextAlign = ContentAlignment.MiddleCenter,
        Font = new Font("Microsoft YaHei UI", 9F, FontStyle.Bold),
        ForeColor = Color.FromArgb(31, 41, 55),
        Padding = new Padding(0, 0, 0, 6)
    };

    private static PictureBox CreatePreviewBox() => new()
    {
        Dock = DockStyle.Fill,
        SizeMode = PictureBoxSizeMode.Zoom,
        BackColor = Color.Black,
        BorderStyle = BorderStyle.FixedSingle
    };

    private static void ConfigureNumeric(
        NumericUpDown control,
        decimal value,
        decimal minimum,
        decimal maximum,
        decimal increment)
    {
        control.Minimum = minimum;
        control.Maximum = maximum;
        control.Increment = increment;
        control.DecimalPlaces = increment < 1 ? 1 : 0;
        control.ThousandsSeparator = false;
        control.Value = value;
    }

    private void BrowseButton_Click(object? sender, EventArgs e)
    {
        if (sender is not Button button || button.Tag is not PathDialogSettings settings)
            return;

        if (settings.Save)
        {
            using var dialog = new SaveFileDialog
            {
                Filter = "PNG 图像|*.png|JPEG 图像|*.jpg|所有文件|*.*",
                DefaultExt = "png",
                AddExtension = true,
                FileName = Path.GetFileName(settings.TextBox.Text)
            };
            if (dialog.ShowDialog(this) == DialogResult.OK)
                settings.TextBox.Text = dialog.FileName;
            return;
        }

        using var openDialog = new OpenFileDialog { Filter = settings.Filter, CheckFileExists = true };
        if (openDialog.ShowDialog(this) == DialogResult.OK)
            settings.TextBox.Text = openDialog.FileName;
    }

    private async void RunButton_Click(object? sender, EventArgs e)
    {
        var sourcePath = _sourcePathBox.Text.Trim();
        var targetPath = _targetPathBox.Text.Trim();
        if (!File.Exists(sourcePath))
        {
            ShowError($"拍摄图像不存在：{sourcePath}");
            return;
        }

        if (!File.Exists(targetPath))
        {
            ShowError($"原始基准图不存在或当前无法访问：{targetPath}");
            return;
        }

        var outputPath = _outputPathBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(outputPath))
        {
            outputPath = Path.Combine(
                Path.GetDirectoryName(sourcePath) ?? AppContext.BaseDirectory,
                $"{Path.GetFileNameWithoutExtension(sourcePath)}_corrected.png");
            _outputPathBox.Text = outputPath;
        }

        var preDistortedOutputPath = _preDistortedOutputPathBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(preDistortedOutputPath))
        {
            preDistortedOutputPath = Path.Combine(
                Path.GetDirectoryName(sourcePath) ?? AppContext.BaseDirectory,
                $"{Path.GetFileNameWithoutExtension(targetPath)}_predistorted.png");
            _preDistortedOutputPathBox.Text = preDistortedOutputPath;
        }

        SetBusy(true, "正在检测 27×7 点阵并拟合映射，请稍候...");
        try
        {
            using var result = await Task.Run(() => CorrectionProcessor.Run(
                sourcePath,
                targetPath,
                (int)_columnsBox.Value,
                (int)_rowsBox.Value,
                (double)_thresholdBox.Value,
                _otsuBox.Checked,
                (double)_minimumAreaBox.Value,
                (double)_maximumAreaBox.Value));

            var outputDirectory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrWhiteSpace(outputDirectory))
                Directory.CreateDirectory(outputDirectory);

            if (!Cv2.ImWrite(outputPath, result.CorrectedImage))
                throw new InvalidOperationException($"无法保存输出图像：{outputPath}");

            var preDistortedDirectory = Path.GetDirectoryName(preDistortedOutputPath);
            if (!string.IsNullOrWhiteSpace(preDistortedDirectory))
                Directory.CreateDirectory(preDistortedDirectory);
            if (!Cv2.ImWrite(preDistortedOutputPath, result.PreDistortedImage))
                throw new InvalidOperationException($"无法保存投影预畸变图：{preDistortedOutputPath}");

            var modelPath = Path.Combine(
                Path.GetDirectoryName(outputPath) ?? AppContext.BaseDirectory,
                $"{Path.GetFileNameWithoutExtension(outputPath)}_warp.json");
            result.Warp.SaveJson(
                modelPath,
                new OpenCvSharp.Size(result.CorrectedImage.Width, result.CorrectedImage.Height),
                new OpenCvSharp.Size(result.SourceOverlay.Width, result.SourceOverlay.Height),
                result.TargetPoints,
                result.SourcePoints,
                result.RmsErrorPx,
                result.MaxErrorPx);

            ReplacePreview(_sourcePreview, ImageConversion.ToBitmap(result.SourceOverlay));
            ReplacePreview(_targetPreview, ImageConversion.ToBitmap(result.TargetOverlay));
            ReplacePreview(_correctedPreview, ImageConversion.ToBitmap(result.CorrectedImage));
            ReplacePreview(_preDistortedPreview, ImageConversion.ToBitmap(result.PreDistortedImage));
            SetBusy(false,
                $"完成：候选点 {result.SourceCandidateCount}/{result.TargetCandidateCount}，" +
                $"拟合 RMS {result.RmsErrorPx:F3}px，最大误差 {result.MaxErrorPx:F3}px。" +
                $"拍摄矫正图：{outputPath}；投影预畸变图：{preDistortedOutputPath}；映射模型：{modelPath}");
        }
        catch (Exception exception)
        {
            SetBusy(false, "处理失败。");
            ShowError(exception.Message);
        }
    }

    private void SetBusy(bool busy, string message)
    {
        _runButton.Enabled = !busy;
        _statusLabel.Text = message;
        UseWaitCursor = busy;
    }

    private void ShowError(string message)
    {
        _statusLabel.Text = message;
        MessageBox.Show(this, message, "畸变矫正", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }

    private static void ReplacePreview(PictureBox pictureBox, Bitmap bitmap)
    {
        var previous = pictureBox.Image;
        pictureBox.Image = bitmap;
        previous?.Dispose();
    }

    private sealed record PathDialogSettings(TextBox TextBox, string Filter, bool Save);
}

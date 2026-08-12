# Engineering Projects Monorepo

这是当前工作区的源码版本库，用于集中管理 HUD、图像校正、双目对准、演示文稿与文档清点相关代码。

## 项目

- `DistortionCorrectionApp/`：.NET 8 WinForms + OpenCvSharp 图像畸变校正工具。
- `HudStereoAlignmentDemo/`：.NET 8 + OpenCvSharp HUD 双目成像与六轴台对准示例。
- `ppt_rebuild_hud_20260731/`：HUD 测试台架演示文稿生成脚本。
- `tmp/hud_axis_v2/`、`tmp/hud_research/`、`tmp/codex-presentations/hud-test-bench/tmp/`：具有独立价值的演示文稿生成源码。
- `tmp/monitor_audit_work/`：显示器数据核验表生成脚本。
- `tmp/distortion-inspect/`：畸变校正检查工具。
- 根目录 Python/Node.js 脚本：CIP 文档清点、表格生成与验证。

## 版本管理

默认分支为 `main`。日常修改建议使用功能分支：

```powershell
git switch -c feature/<change-name>
git add <changed-files>
git commit -m "feat: describe the change"
git push -u origin feature/<change-name>
```

编译产物、依赖目录、会话备份、数据库、安装包和生成的 Office/图片文件均不纳入 Git。这些内容保留在本地，不会因 Git 操作被删除。

部分早期工具仍包含本机绝对路径或内网路径，但不包含已知凭据。在其他电脑上运行前，需要将这些路径改为当前环境的配置。`tmp/hud_research/` 中保留了其生成脚本直接引用的最小图片资产。

## 构建状态

- `DistortionCorrectionApp`：Release 构建通过。
- `HudStereoAlignmentDemo`：Release 构建通过。

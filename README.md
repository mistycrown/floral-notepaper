<!-- markdownlint-disable -->

**简体中文** | [繁體中文](README_zh-HK.md) | [English](README_en-US.md)

<div align="center">

<img src="./src-tauri/icons/icon.png" width="120" alt="花笺图标">

# 花笺 Floral Notepaper · mistycrown 魔改版

轻量、优雅、现代化的本地便签工具<br>
基于 Tauri 2 + React 构建

[反馈问题](https://github.com/mistycrown/floral-notepaper/issues) · [更新日志](https://github.com/mistycrown/floral-notepaper/releases) <br>
[快速开始](#快速开始) · [FAQ](https://github.com/Achilng/floral-notepaper/wiki) · [构建指南](#从源码构建)

[![Fork](https://img.shields.io/badge/fork-mistycrown-blue)](https://github.com/mistycrown/floral-notepaper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Stars](https://img.shields.io/github/stars/mistycrown/floral-notepaper?color=ffcb47&labelColor=black)</br>
![React 19](https://img.shields.io/badge/React-19-blue?logo=react)
![Tauri v2](https://img.shields.io/badge/Tauri-v2-%2324C8D8?logo=tauri)
![Rust Edition 2021](https://img.shields.io/badge/Rust-2021-%23000000?logo=rust)<br>
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Achilng/floral-notepaper)

</div>

<!-- markdownlint-restore -->

---

## 来源与本版改动

本项目是 [Achilng/floral-notepaper](https://github.com/Achilng/floral-notepaper) 的个人维护衍生版本，由 mistycrown 维护。感谢 Achilng 和原项目贡献者提供的基础实现；原作者版权、MIT 许可证及第三方资源授权均予以保留。

本版主要改动：

- **交互式任务清单**：可在 Markdown 预览和桌面磁贴中勾选任务，并保存回笔记；右键菜单支持插入任务清单。
- **便签操作调整**：简化编辑界面，通过右键菜单切换编辑和打开笔记；支持磁贴文字选择与快捷复制。
- **保存流程改进**：串行处理保存请求，在切换笔记、固定磁贴和关闭窗口前保存待处理编辑。
- **磁贴贴边隐藏**：磁贴靠近屏幕左、右或上边缘后延迟收起，鼠标移入时展开；拖动、菜单操作和多显示器边界会参与隐藏判断。

当前提供修改后的源码，安装包请以[本仓库 Releases](https://github.com/mistycrown/floral-notepaper/releases) 实际发布内容为准。下方 Mirror 酱、Microsoft Store 和原项目 Wiki 属于原版渠道；应用内更新目前也沿用原版渠道，可能安装回原版，请通过本仓库获取本版后续更新。

## 为什么选择花笺

市面上现有的笔记或便签软件，要么功能繁重、上手门槛高，要么界面陈旧、久未更新。花笺因此而生，其特点是轻便、随呼随用，同时提供现代化的界面与舒适的编辑体验。

## 功能特点

- **Markdown 编辑与预览** — 支持 GitHub Flavored Markdown 语法，实时切换编辑和预览模式

  ![主窗口截图](Docs/images/主窗口截图.png)

- **快捷便签** — 通过托盘或全局快捷键（默认 `Ctrl+Space`）随时唤出便签窗口

  ![小窗多开示例](Docs/images/小窗多开示例.gif)

- **磁贴模式** — 将笔记固定在桌面某处，以便快速查阅和复制

  ![磁贴示例](Docs/images/AI绘画截图.png)

- **导入导出** — 支持 `.md` 文件的导入和导出

## 应用场景

- 当作随时可见的剪贴板，快速暂存和复制文本
- 游戏、看视频时随手记点东西
- 临时记录思路或灵感
- 桌面待办清单

## 快速开始

### 下载安装

#### 原版渠道：通过Mirror酱下载

> [!TIP]
> 如您的网络不便访问 GitHub，或下载速度过慢，您可以尝试通过Mirror酱下载花笺<br>
> 此外，您也可以通过使用Mirror酱下载花笺来赞助花笺的开发者，详见[Mirror酱官网](https://mirrorchyan.com/)

| 系统    | 架构                    | 下载链接                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows | x64                     | [![Windows x64 Setup](https://img.shields.io/badge/Setup-x64-blue?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyNDJ2MjQySDB6TTI3MCAwaDI0MnYyNDJIMjcwek0wIDI3MGgyNDJ2MjQySDB6TTI3MCAyNzBoMjQydjI0MkgyNzB6Ii8%2BPC9zdmc%2B)](https://mirrorchyan.com/zh/projects?rid=floral&os=windows&arch=x64&channel=stable)           |
| Windows | AArch64                 | [![Windows AArch64 Setup](https://img.shields.io/badge/Setup-AArch64-blue?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyNDJ2MjQySDB6TTI3MCAwaDI0MnYyNDJIMjcwek0wIDI3MGgyNDJ2MjQySDB6TTI3MCAyNzBoMjQydjI0MkgyNzB6Ii8%2BPC9zdmc%2B)](https://mirrorchyan.com/zh/projects?rid=floral&os=windows&arch=arm64&channel=stable) |
| macOS   | AArch64 (Apple Silicon) | [![macOS Apple Silicon](https://img.shields.io/badge/DMG-Apple%20Silicon-%23000000.svg?logo=apple)](https://mirrorchyan.com/zh/projects?rid=floral&os=macos&channel=stable&arch=arm64)                                                                                                                                                                                                                                                                                       |
| macOS   | x64 (Intel)             | [![macOS Apple Silicon](https://img.shields.io/badge/DMG-Intel%20X64-%2300A9E0.svg?logo=apple)](https://mirrorchyan.com/zh/projects?rid=floral&os=macos&channel=stable&arch=x64)                                                                                                                                                                                                                                                                                             |

#### 通过 GitHub 下载

请前往[本版 Releases](https://github.com/mistycrown/floral-notepaper/releases) 查看已发布安装包；尚无安装包时，请按下方指南从源码构建。

##### 下载参考

| 系统    | 架构                    | 类型             | 文件名                                      |
| ------- | ----------------------- | ---------------- | ------------------------------------------- |
| Windows | x64                     | 安装程序（推荐） | floral-notepaper\_版本号\_x64-setup.exe     |
| Windows | x64                     | 便携版           | floral-notepaper\_版本号.exe                |
| Windows | x64                     | 安装包           | floral-notepaper\_版本号\_x64.msix          |
| Windows | AArch64                 | 安装程序（推荐） | floral-notepaper\_版本号\_aarch64-setup.exe |
| Windows | AArch64                 | 安装包           | floral-notepaper\_版本号\_aarch64.msix      |
| macOS   | AArch64 (Apple Silicon) | DMG              | floral-notepaper\_版本号\_aarch64.dmg       |
| macOS   | x64 (Intel)             | DMG              | floral-notepaper\_版本号\_x64.dmg           |

#### 原版渠道：通过 Microsoft Store 下载

前往 [Microsoft Store](https://apps.microsoft.com/detail/9NRCC0ZSG81R) 下载花笺

> 注意：MSIX 安装（无论来自 Microsoft Store 还是侧载的 .msix 文件）暂不支持应用内更新，请通过 Microsoft Store 或 GitHub Releases 获取最新版本。

<!-- markdownlint-disable -->

<a href="https://apps.microsoft.com/detail/9NRCC0ZSG81R?referrer=appbadge&mode=full" target="_blank"  rel="noopener noreferrer">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>

<!-- markdownlint-restore -->

#### macOS 版安装指引

如遇安装问题，请参考：

- Wiki 中的 [macOS 安装指引](https://github.com/Achilng/floral-notepaper/wiki/macOS-%E5%AE%89%E8%A3%85%E6%8C%87%E5%BC%95-%7C-macOS-Installation-Guidance)
- 或视频（Bilibili）：[Mac云课堂 - 在 Mac 上装软件，要学会和苹果斗智斗勇](https://www.bilibili.com/video/BV1tg411t7hN)

### 从源码构建

请参考 [CONTRIBUTING.md](CONTRIBUTING.md)

## 原项目 Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=Achilng/floral-notepaper&type=Date&legend=top-left)](https://star-history.dera.page/#Achilng/floral-notepaper&Date)

## 🌟 原项目贡献者

[![contrib.rocks](https://contrib.rocks/image?repo=Achilng/floral-notepaper&max=1000)](https://contrib.rocks/image?repo=Achilng/floral-notepaper&max=1000)

## 原项目 Sponsors

<!-- markdownlint-disable -->

| <img src="https://signpath.org/assets/favicon.png" alt="SignPath Logo" width=50> | Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org/) |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |

<!-- markdownlint-restore -->

## 许可证

[MIT](LICENSE)

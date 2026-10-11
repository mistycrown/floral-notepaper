[简体中文](README.md) | [繁體中文](README_zh-HK.md) | **English**

<!-- markdownlint-disable -->

<div align="center">

<img src="./src-tauri/icons/icon.png" width="120" alt="Floral Notepaper Icon">

# Floral Notepaper · mistycrown Fork

A lightweight, elegant, and modern sticky note app for your desktop<br>
Built with Tauri 2 + React

[Report an Issue](https://github.com/mistycrown/floral-notepaper/issues) · [Changelog](https://github.com/mistycrown/floral-notepaper/releases) <br>
[Quick Start](#quick-start) · [FAQ](https://github.com/Achilng/floral-notepaper/wiki) · [Building from Source](#building-from-source)

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

## Attribution and Changes in This Fork

This is a derivative of [Achilng/floral-notepaper](https://github.com/Achilng/floral-notepaper), maintained by mistycrown. Thanks to Achilng and the upstream contributors for the original implementation. The original copyright, MIT license, and third-party resource licenses are preserved.

Changes in this fork:

- **Interactive task lists**: toggle tasks in Markdown previews and desktop tiles, save them back to the note, and insert task lists through the context menu.
- **Note interactions**: a simpler editor, context-menu actions to switch between editing and opening notes, selectable tile text, and a quick copy button.
- **Save handling**: serialize saves and flush pending edits before switching notes, pinning, or closing a window.
- **Tile edge hiding**: collapse tiles near the left, right, or top screen edge after a delay and reveal them on hover, accounting for dragging, menus, and monitor boundaries.

The modified source is available here. Check [this fork's Releases](https://github.com/mistycrown/floral-notepaper/releases) for published installers. MirrorChyan, Microsoft Store, and the upstream Wiki below belong to the original project. In-app updates currently also use upstream channels and may install the original version; obtain future fork updates from this repository.

## Why Floral Notepaper

Most note-taking or sticky note apps out there are either bloated and steep to learn, or dated and long abandoned. Floral Notepaper was built to be different — quick to summon, light to use, and a pleasure to look at.

## Features

- **Markdown Editing & Preview** — Full GitHub Flavored Markdown support with seamless toggling between edit and preview modes

  ![Main window screenshot](Docs/images/主窗口截图.png)

- **Quick Note** — Summon a note window instantly from the system tray or via a global hotkey (default: `Ctrl+Space`)

  ![Multi-window example](Docs/images/小窗多开示例.gif)

- **Pin Mode** — Pin a note to a fixed spot on your desktop for quick reference and easy copying

  ![Pin mode example](Docs/images/AI绘画截图.png)

- **Import & Export** — Import and export notes as `.md` files

## Use Cases

- Use it as an always-visible clipboard to stash and copy text on the fly
- Jot things down while gaming or watching videos
- Capture a quick thought or burst of inspiration
- Keep a to-do list right on your desktop

## Quick Start

### Download

#### Original Version: MirrorChyan

> [!TIP]
> If you have trouble accessing GitHub or experience slow downloads, try downloading Floral Notepaper via MirrorChyan.<br>
> Downloading via MirrorChyan also helps support the developer — see the [MirrorChyan website](https://mirrorchyan.com/) for details.

| Platform | Arch                    | Download                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows  | x64                     | [![Windows x64 Setup](https://img.shields.io/badge/Setup-x64-blue?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyNDJ2MjQySDB6TTI3MCAwaDI0MnYyNDJIMjcwek0wIDI3MGgyNDJ2MjQySDB6TTI3MCAyNzBoMjQydjI0MkgyNzB6Ii8%2BPC9zdmc%2B)](https://mirrorchyan.com/zh/projects?rid=floral&os=windows&arch=x64&channel=stable)           |
| Windows  | AArch64                 | [![Windows AArch64 Setup](https://img.shields.io/badge/Setup-AArch64-blue?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyNDJ2MjQySDB6TTI3MCAwaDI0MnYyNDJIMjcwek0wIDI3MGgyNDJ2MjQySDB6TTI3MCAyNzBoMjQydjI0MkgyNzB6Ii8%2BPC9zdmc%2B)](https://mirrorchyan.com/zh/projects?rid=floral&os=windows&arch=arm64&channel=stable) |
| macOS    | AArch64 (Apple Silicon) | [![macOS Apple Silicon](https://img.shields.io/badge/DMG-Apple%20Silicon-%23000000.svg?logo=apple)](https://mirrorchyan.com/zh/projects?rid=floral&os=macos&channel=stable&arch=arm64)                                                                                                                                                                                                                                                                                       |
| macOS    | x64 (Intel)             | [![macOS Intel](https://img.shields.io/badge/DMG-Intel%20X64-%2300A9E0.svg?logo=apple)](https://mirrorchyan.com/zh/projects?rid=floral&os=macos&channel=stable&arch=x64)                                                                                                                                                                                                                                                                                                     |

#### Via GitHub

Check [this fork's Releases](https://github.com/mistycrown/floral-notepaper/releases) for published installers. If none are available, follow the source build instructions below.

##### Download Reference

| Platform | Arch                    | Type                    | Filename                                 |
| -------- | ----------------------- | ----------------------- | ---------------------------------------- |
| Windows  | x64                     | Installer (Recommended) | floral-notepaper_x.y.z_x64-setup.exe     |
| Windows  | x64                     | Portable                | floral-notepaper_x.y.z.exe               |
| Windows  | x64                     | MSIX Package            | floral-notepaper_x.y.z_x64.msix          |
| Windows  | AArch64                 | Installer (Recommended) | floral-notepaper_x.y.z_aarch64-setup.exe |
| Windows  | AArch64                 | MSIX Package            | floral-notepaper_x.y.z_aarch64.msix      |
| macOS    | AArch64 (Apple Silicon) | DMG                     | floral-notepaper_x.y.z_aarch64.dmg       |
| macOS    | x64 (Intel)             | DMG                     | floral-notepaper_x.y.z_x64.dmg           |

#### Original Version: Microsoft Store

Download Floral Notepaper from the [Microsoft Store](https://apps.microsoft.com/detail/9NRCC0ZSG81R)

> Note: MSIX installs (from the Microsoft Store or sideloaded .msix files) do not support in-app updates. Get the latest version from the Microsoft Store or GitHub Releases.

<!-- markdownlint-disable -->

<a href="https://apps.microsoft.com/detail/9NRCC0ZSG81R?referrer=appbadge&mode=full" target="_blank"  rel="noopener noreferrer">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>

<!-- markdownlint-restore -->

#### macOS Installation Guidance

If you encounter installation issues, please refer to:

- Wiki: [macOS Installation Guidance](https://github.com/Achilng/floral-notepaper/wiki/macOS-%E5%AE%89%E8%A3%85%E6%8C%87%E5%BC%95-%7C-macOS-Installation-Guidance)
- Or video (Bilibili): [Mac云课堂 - Installing software on Mac means learning to wrestle with Apple](https://www.bilibili.com/video/BV1tg411t7hN)

### Building from Source

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## Upstream Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=Achilng/floral-notepaper&type=Date&legend=top-left)](https://star-history.dera.page/#Achilng/floral-notepaper&Date)

## 🌟 Upstream Contributors

[![contrib.rocks](https://contrib.rocks/image?repo=Achilng/floral-notepaper&max=1000)](https://contrib.rocks/image?repo=Achilng/floral-notepaper&max=1000)

## Upstream Sponsors

<!-- markdownlint-disable -->

| <img src="https://signpath.org/assets/favicon.png" alt="SignPath Logo" width=50> | Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org/) |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |

<!-- markdownlint-restore -->

## License

[MIT](LICENSE)

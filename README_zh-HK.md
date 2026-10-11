[简体中文](README.md) | **繁體中文** | [English](README_en-US.md)

<!-- markdownlint-disable -->

<div align="center">

<img src="./src-tauri/icons/icon.png" width="120" alt="花箋圖示">

# 花箋 Floral Notepaper · mistycrown 修改版

輕巧、優雅、現代化的本機便箋工具<br>
基於 Tauri 2 + React 構建

[回報問題](https://github.com/mistycrown/floral-notepaper/issues) · [更新日誌](https://github.com/mistycrown/floral-notepaper/releases) <br>
[快速開始](#快速開始) · [FAQ](https://github.com/Achilng/floral-notepaper/wiki) · [構建指南](#從原始碼構建)

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

## 來源與本版改動

本專案是 [Achilng/floral-notepaper](https://github.com/Achilng/floral-notepaper) 的個人維護衍生版本，由 mistycrown 維護。感謝 Achilng 及原專案貢獻者提供的基礎實作；原作者版權、MIT 授權及第三方資源授權均予以保留。

本版主要改動：

- **互動式任務清單**：可在 Markdown 預覽及桌面磁貼中勾選任務並儲存回筆記；右鍵選單支援插入任務清單。
- **便箋操作調整**：簡化編輯介面，透過右鍵選單切換編輯及開啟筆記；支援磁貼文字選取與快速複製。
- **儲存流程改進**：依序處理儲存請求，在切換筆記、固定磁貼及關閉視窗前儲存待處理編輯。
- **磁貼貼邊隱藏**：磁貼靠近螢幕左、右或上邊緣後延遲收起，滑鼠移入時展開；拖曳、選單操作及多螢幕邊界會參與隱藏判斷。

目前提供修改後的原始碼，安裝包請以[本儲存庫 Releases](https://github.com/mistycrown/floral-notepaper/releases) 實際發佈內容為準。下方 Mirror 醬、Microsoft Store 及原專案 Wiki 屬於原版渠道；應用程式內更新目前亦沿用原版渠道，可能安裝回原版，請透過本儲存庫取得本版後續更新。

## 為什麼選擇花箋

市面上現有的筆記或便箋軟件，要麼功能繁重、上手門檻高，要麼介面陳舊、久未更新。花箋因此而生，其特點是輕巧、隨呼隨用，同時提供現代化的介面與舒適的編輯體驗。

## 功能特點

- **Markdown 編輯與預覽** — 支援 GitHub Flavored Markdown 語法，可即時切換編輯及預覽模式

  ![主視窗截圖](Docs/images/主窗口截图.png)

- **快速便箋** — 透過系統匣或全域快速鍵（預設 `Ctrl+Space`）隨時喚出便箋視窗

  ![小視窗多開示例](Docs/images/小窗多开示例.gif)

- **磁貼模式** — 將筆記固定於桌面某處，以便快速查閱及複製

  ![磁貼示例](Docs/images/AI绘画截图.png)

- **匯入匯出** — 支援 `.md` 檔案的匯入及匯出

## 應用場景

- 用作隨時可見的剪貼簿，快速暫存及複製文字
- 遊戲、觀看影片時隨手記錄
- 臨時記錄思路或靈感
- 桌面待辦清單

## 快速開始

### 下載安裝

#### 原版渠道：透過 Mirror 醬下載

> [!TIP]
> 如您的網絡不便訪問 GitHub，或下載速度過慢，您可以嘗試透過 Mirror 醬下載花箋<br>
> 此外，您也可以透過使用 Mirror 醬下載花箋來贊助花箋的開發者，詳見 [Mirror 醬官網](https://mirrorchyan.com/)

| 系統    | 架構                    | 下載連結                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows | x64                     | [![Windows x64 Setup](https://img.shields.io/badge/Setup-x64-blue?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyNDJ2MjQySDB6TTI3MCAwaDI0MnYyNDJIMjcwek0wIDI3MGgyNDJ2MjQySDB6TTI3MCAyNzBoMjQydjI0MkgyNzB6Ii8%2BPC9zdmc%2B)](https://mirrorchyan.com/zh/projects?rid=floral&os=windows&arch=x64&channel=stable)           |
| Windows | AArch64                 | [![Windows AArch64 Setup](https://img.shields.io/badge/Setup-AArch64-blue?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyNDJ2MjQySDB6TTI3MCAwaDI0MnYyNDJIMjcwek0wIDI3MGgyNDJ2MjQySDB6TTI3MCAyNzBoMjQydjI0MkgyNzB6Ii8%2BPC9zdmc%2B)](https://mirrorchyan.com/zh/projects?rid=floral&os=windows&arch=arm64&channel=stable) |
| macOS   | AArch64 (Apple Silicon) | [![macOS Apple Silicon](https://img.shields.io/badge/DMG-Apple%20Silicon-%23000000.svg?logo=apple)](https://mirrorchyan.com/zh/projects?rid=floral&os=macos&channel=stable&arch=arm64)                                                                                                                                                                                                                                                                                       |
| macOS   | x64 (Intel)             | [![macOS Intel](https://img.shields.io/badge/DMG-Intel%20X64-%2300A9E0.svg?logo=apple)](https://mirrorchyan.com/zh/projects?rid=floral&os=macos&channel=stable&arch=x64)                                                                                                                                                                                                                                                                                                     |

#### 透過 GitHub 下載

請前往[本版 Releases](https://github.com/mistycrown/floral-notepaper/releases) 查看已發佈安裝包；尚無安裝包時，請按下方指南從原始碼構建。

##### 下載參考

| 系統    | 架構                    | 類型             | 檔案名稱                                    |
| ------- | ----------------------- | ---------------- | ------------------------------------------- |
| Windows | x64                     | 安裝程式（推薦） | floral-notepaper\_版本號\_x64-setup.exe     |
| Windows | x64                     | 可攜版           | floral-notepaper\_版本號.exe                |
| Windows | x64                     | 安裝包           | floral-notepaper\_版本號\_x64.msix          |
| Windows | AArch64                 | 安裝程式（推薦） | floral-notepaper\_版本號\_aarch64-setup.exe |
| Windows | AArch64                 | 安裝包           | floral-notepaper\_版本號\_aarch64.msix      |
| macOS   | AArch64 (Apple Silicon) | DMG              | floral-notepaper\_版本號\_aarch64.dmg       |
| macOS   | x64 (Intel)             | DMG              | floral-notepaper\_版本號\_x64.dmg           |

#### 原版渠道：透過 Microsoft Store 下載

前往 [Microsoft Store](https://apps.microsoft.com/detail/9NRCC0ZSG81R) 下載花箋

> 注意：MSIX 安裝（無論來自 Microsoft Store 或側載的 .msix 檔案）暫不支援應用程式內更新，請透過 Microsoft Store 或 GitHub Releases 取得最新版本。

<!-- markdownlint-disable -->

<a href="https://apps.microsoft.com/detail/9NRCC0ZSG81R?referrer=appbadge&mode=full" target="_blank"  rel="noopener noreferrer">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>

<!-- markdownlint-restore -->

#### macOS 版安裝指引

如遇安裝問題，請參考：

- Wiki 中的 [macOS 安裝指引](https://github.com/Achilng/floral-notepaper/wiki/macOS-%E5%AE%89%E8%A3%85%E6%8C%87%E5%BC%95-%7C-macOS-Installation-Guidance)
- 或影片（Bilibili）：[Mac雲課堂 - 在 Mac 上裝軟件，要學會和蘋果鬥智鬥勇](https://www.bilibili.com/video/BV1tg411t7hN)

### 從原始碼構建

請參考 [CONTRIBUTING.md](CONTRIBUTING.md)

## 原專案 Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=Achilng/floral-notepaper&type=Date&legend=top-left)](https://star-history.dera.page/#Achilng/floral-notepaper&Date)

## 🌟 原專案貢獻者

[![contrib.rocks](https://contrib.rocks/image?repo=Achilng/floral-notepaper&max=1000)](https://contrib.rocks/image?repo=Achilng/floral-notepaper&max=1000)

## 原專案 Sponsors

<!-- markdownlint-disable -->

| <img src="https://signpath.org/assets/favicon.png" alt="SignPath Logo" width=50> | Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org/) |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |

<!-- markdownlint-restore -->

## 授權條款

[MIT](LICENSE)

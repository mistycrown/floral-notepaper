<!-- markdownlint-disable -->

**简体中文** | [繁體中文](README_zh-HK.md) | [English](README_en-US.md)

<div align="center">

<img src="./src-tauri/icons/icon.png" width="120" alt="花笺图标">

# 花笺 Floral Notepaper · mistycrown 魔改版

轻量、优雅、现代化的本地便签工具<br>
基于 Tauri 2 + React 构建

[反馈问题](https://github.com/mistycrown/floral-notepaper/issues) · [更新日志](https://github.com/mistycrown/floral-notepaper/releases) <br>
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

1. 支持在钉选状态下点击完成待办列表。在编辑区右键可插入待办列表。
2. 修改模式隐藏“编辑 / 打开”标签和底部“清空 / 保存”按钮。通过右键菜单切换打开、编辑面板。预览文字可以选中复制。钉选卡片增加复制按钮
3. 增加靠边隐藏功能
4. 支持自定义字体
5. 支持每个便签设置不同颜色
6. 增加列表md语法的换行自动补全
7. 支持正文井号标签和左侧按标签分组。
8. 支持鼠标拖动笔记到分类，设置中可启用仅显示标题的紧凑模式。
9. 增加大纲类型的便签
10. 实现主界面和钉选便签的保存更新同步
11. 微调部分ui，支持钉选便签行距\透明度自定义

## 标签使用

在笔记正文输入 `#工作`、`#读书` 等标签，井号与标签名之间不加空格，多个标签用空格分隔。支持中文、字母、数字、下划线和连字符；同一笔记可拥有多个标签。编辑器会显示当前识别到的标签。

输入 `#` 会在光标附近提示已有标签，继续输入可按前缀筛选。用鼠标点击，或用上下方向键选择后按 Enter 补全；按 Esc 关闭提示。没有匹配项时可直接继续输入新标签。主窗口、小窗和列表笔记均支持提示，代码和 Markdown 标题里的井号不会误触发。

保存后，在左侧选择“标签”即可按标签折叠浏览笔记；没有标签的笔记显示在“无标签”分组。搜索支持标签名或 `#标签`。删除正文里的标签并保存即可移除关联，旧笔记中的标签也会自动识别。

Markdown 标题 `# 标题`、代码块、行内代码、转义井号及链接中的井号不作为标签。标签保留在 Markdown 正文中，导入导出无需额外操作。

## 笔记浏览

在左侧“分类”视图中，按住笔记卡片拖到目标文件夹即可移动；折叠和空文件夹也支持接收笔记。拖到“未分类”可以移出文件夹，按 Esc 可取消拖动。分类和标签分组采用缩进样式。

在“应用设置”中启用“紧凑模式”，分类、标签及小窗打开列表的笔记卡片只显示一行标题，隐藏正文预览、日期和字数。关闭后恢复普通模式，正文预览最多一行；这个设置会自动保存。

<!-- markdownlint-restore -->

## 许可证

[MIT](LICENSE)

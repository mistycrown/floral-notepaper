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
2. 修改模式隐藏“编辑 / 打开”标签和底部“清空 / 保存”按钮。通过右键菜单切换打开、编辑面板。预览文字可以选中复制。
3. 增加靠边隐藏功能
4. 支持自定义字体
5. 支持每个便签设置不同颜色
6. 增加列表md语法的换行自动补全
7. 支持在便签元数据栏编辑标签和左侧按标签分组。
8. 支持鼠标拖动笔记到分类，设置中可启用仅显示标题的紧凑模式。
9. 增加大纲类型的便签，Ctrl+Shift+T 切换普通条目／待办，也可通过右键菜单切换。
10. 实现主界面和钉选便签的保存更新同步
11. 微调部分ui，支持钉选便签行距\透明度自定义
12. 钉选时，文字类型便签可快速复制；列表类型便签可快速插入剪贴版中的条目/加入时间戳快速记录
13. 在钉选状态的编辑模式下，双击两下空白处，可以变回阅读模式

## 标签使用

在主窗口标题下方的标签栏输入标签名，按 Enter 或点击加号添加。支持中文、字母、数字、下划线和连字符，可以输入可选的 `#` 前缀；同一笔记可拥有多个标签。点击标签旁的 × 移除标签。小窗不显示或编辑标签，保存正文时保留已有标签。

标签输入框提供已有标签建议，输入文字可按前缀筛选。用鼠标点击，或用上下方向键选择后按 Enter 添加；按 Esc 关闭提示。标签只在元数据栏编辑，普通正文和列表条目中的井号不会生成或补全标签。

标签与便签一起保存，也支持自动保存。左侧选择“标签”即可按标签折叠浏览笔记；没有标签的笔记显示在“无标签”分组。搜索支持标签名或 `#标签`。已有元数据标签继续保留；更早的笔记缺少标签字段时，会从原正文迁移一次。

标签独立保存在便签元数据中，修改正文不会覆盖标签。Markdown 导出只包含原正文，导入 Markdown 不会自动创建标签。直接打开的外部文件没有本地便签标签栏。

## 笔记浏览

小窗顶部只显示便签标题，标题和便签类型在主窗口修改。小窗没有独立标题输入行、类型切换或标签栏，为正文留出更多编辑空间。

在左侧“分类”视图中，按住笔记卡片拖到目标文件夹即可移动；折叠和空文件夹也支持接收笔记。拖到“未分类”可以移出文件夹，按 Esc 可取消拖动。分类和标签分组采用缩进样式。

在“应用设置”中启用“紧凑模式”，分类、标签及小窗打开列表的笔记卡片只显示一行标题，隐藏正文预览、日期和字数。关闭后恢复普通模式，正文预览最多一行；这个设置会自动保存。

<!-- markdownlint-restore -->

## 许可证

[MIT](LICENSE)

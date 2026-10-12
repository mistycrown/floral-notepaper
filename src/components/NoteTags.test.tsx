import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { NoteGroupingControl, NoteTagHint } from "./NoteTags";
import { TagNoteBrowser } from "./TagNoteBrowser";
import type { NoteMetadata } from "../features/notes/types";

test("tag browser exposes each tag, untagged notes, counts and selection", () => {
  const note: NoteMetadata = {
    id: "1",
    title: "工作笔记",
    fileName: "1.md",
    category: "日常",
    createdAt: "2026-10-11T10:00:00Z",
    updatedAt: "2026-10-11T10:00:00Z",
    preview: "正文",
    wordCount: 2,
    tags: ["工作", "读书"],
  };
  const html = renderToStaticMarkup(
    <TagNoteBrowser
      notes={[note, { ...note, id: "2", title: "无标签笔记", tags: [] }]}
      selectedId="1"
      onSelect={() => {}}
    />,
  );
  expect(html).toContain("#工作");
  expect(html).toContain("#读书");
  expect(html).toContain("无标签");
  expect(html.match(/>工作笔记</g)).toHaveLength(2);
  expect(html.match(/aria-current="true"/g)).toHaveLength(2);
  expect(html.match(/aria-expanded="true"/g)).toHaveLength(3);
});

test("editor hints show Chinese tags while preserving Markdown headings", () => {
  const html = renderToStaticMarkup(<NoteTagHint content={"# 标题\n正文 #工作 #读书"} />);
  expect(html).toContain("#工作");
  expect(html).toContain("#读书");
  expect(html).not.toContain(">#标题<");
  expect(renderToStaticMarkup(<NoteTagHint content="正文" />)).toContain("输入 #标签");
});

test("grouping control exposes all modes and the selected mode", () => {
  const html = renderToStaticMarkup(<NoteGroupingControl value="tag" onChange={() => {}} />);
  expect(html).toContain("分类");
  expect(html).toContain("标签");
  expect(html).toContain("全部");
  expect(html).toMatch(/aria-pressed="true"[^>]*>标签/);
});

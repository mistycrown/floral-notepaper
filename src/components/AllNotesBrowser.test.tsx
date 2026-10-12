import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AllNotesBrowser } from "./AllNotesBrowser";
import type { NoteMetadata } from "../features/notes/types";

test("all notes browser displays notes sorted by latest update first", () => {
  const notes: NoteMetadata[] = [
    {
      id: "1",
      title: "旧笔记",
      fileName: "1.md",
      category: "日常",
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z",
      preview: "较早的笔记",
      wordCount: 2,
      tags: [],
    },
    {
      id: "2",
      title: "新笔记",
      fileName: "2.md",
      category: "工作",
      createdAt: "2026-10-11T10:00:00Z",
      updatedAt: "2026-10-11T10:00:00Z",
      preview: "最近的笔记",
      wordCount: 2,
      tags: [],
    },
  ];

  const html = renderToStaticMarkup(
    <AllNotesBrowser notes={notes} selectedId="2" onSelect={() => {}} />,
  );

  // Check that both notes are rendered
  expect(html).toContain("新笔记");
  expect(html).toContain("旧笔记");

  // Check that new note appears before old note (sorted by latest update)
  const newNotePos = html.indexOf("新笔记");
  const oldNotePos = html.indexOf("旧笔记");
  expect(newNotePos).toBeLessThan(oldNotePos);
});

test("all notes browser displays empty state when no notes", () => {
  const html = renderToStaticMarkup(<AllNotesBrowser notes={[]} onSelect={() => {}} />);
  expect(html).toContain("还没有笔记");
});

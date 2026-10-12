import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { NoteBrowserCard } from "./NoteBrowserCard";
import { TagNoteBrowser } from "./TagNoteBrowser";
import { NotepadOpenPanel } from "./NotepadOpenPanel";
import type { NoteMetadata } from "../features/notes/types";

const note: NoteMetadata = {
  id: "1",
  title: "标题",
  category: "",
  fileName: "1.md",
  preview: "不显示的正文预览",
  wordCount: 42,
  createdAt: "2026-10-11T00:00:00Z",
  updatedAt: "2026-10-11T00:00:00Z",
  tags: ["工作"],
};

test("compact cards contain a single truncated title without preview/date/count", () => {
  const html = renderToStaticMarkup(<NoteBrowserCard note={note} compact onSelect={() => {}} />);
  expect(html).toContain(">标题<");
  expect(html).toContain("truncate");
  expect(html).not.toContain(note.preview);
  expect(html).not.toContain("10-11");
  expect(html).not.toContain("42 字");
  expect(html).not.toContain("<p");
});

test("normal cards show one-line previews and metadata", () => {
  const html = renderToStaticMarkup(<NoteBrowserCard note={note} onSelect={() => {}} />);
  expect(html).toContain(note.preview);
  expect(html).toContain("10-11");
  expect(html).toContain("42 字");
  expect(html).not.toContain("line-clamp-2");
});

test("tag and small-window browsers both honor compact mode", () => {
  for (const html of [
    renderToStaticMarkup(<TagNoteBrowser notes={[note]} compact onSelect={() => {}} />),
    renderToStaticMarkup(<NotepadOpenPanel notes={[note]} compact onOpenNote={() => {}} />),
  ]) {
    expect(html).toContain(">标题<");
    expect(html).not.toContain(note.preview);
    expect(html).not.toContain("10-11");
    expect(html).not.toContain("42 字");
  }
});

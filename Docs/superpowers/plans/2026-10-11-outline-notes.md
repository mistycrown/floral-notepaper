# Outline Notes Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add text/list notes with editable bullet/todo nodes across all note surfaces.

**Architecture:** Shared flat preorder outline model and React editor; note content remains Markdown. Metadata persists type and node state and existing save queues carry both.

**Tech Stack:** React 19, TypeScript, Vitest, Rust, Tauri 2.
**Spec:** `2026-10-11-outline-design.md`

## Global Constraints

- UTF-8 source; preserve existing tags/colors and old text notes.
- No new editor dependency; use existing visual styles and autosave behavior.

## Review Focus

- IME composition must not split a Chinese node on Enter.
- Indent/outdent carries descendants and never creates orphan nodes.
- Folding, node type and checkbox-only changes must trigger saving.
- Switching notes during saves must not overwrite the current note state.
- External Markdown edits must override stale outline text.

### Task 1: Model and persistence

Files: `src/features/notes/types.ts`, `outline.ts`, `outline.test.ts`, `noteUtils.ts`, `src-tauri/src/services/notes.rs`.
Interfaces: `OutlineNode`, `NoteType`, `parseOutline(content)`, `outlineMarkdown(nodes)`, `indentNode(nodes,id,outdent)`, `splitNode(nodes,id,start,end)`, `visibleOutline(nodes)`.

- [ ] Test subtree movement, split/merge, Markdown multiline/todo round trips, visible nodes and stale metadata recovery.
- [ ] Add optional type/nodes to save requests and backwards compatible metadata fields.
- [ ] Persist and read state; verify legacy requests preserve it and text conversion clears it.

### Task 2: Shared editor

Files: `src/components/OutlineEditor.tsx`, `NoteTypeSelect.tsx`.
Interfaces: controlled nodes/onChange, imperative focus/undo/redo; read-only presentation with task/fold interaction for tiles.

- [ ] Implement node textarea, type selector, task checkbox, fold control, IME-safe keyboard handling, multiline paste and history.
- [ ] Verify Chinese input, subtree keyboard operations and history.

### Task 3: Surfaces and verification

Files: `MainWindow.tsx`, `NotePad.tsx`, `Tile.tsx`.

- [ ] Load/reset/save type and nodes through the existing refs and save queues, including changes with identical Markdown.
- [ ] Add creation/type controls and swap in the shared outline editor, preserving text editor behavior.
- [ ] Show outlines and interactive todo completion on tiles.
- [ ] Run Vitest, TypeScript/Vite build, targeted lint and Rust persistence tests; inspect browser UI if available.

# Outline Notes Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current session. Steps use checkbox (`- [x]`) syntax for tracking.

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

- [x] Test subtree movement, split/merge, Markdown multiline/todo round trips, visible nodes and stale metadata recovery.
- [x] Add optional type/nodes to save requests and backwards compatible metadata fields.
- [x] Persist and read state; verify legacy requests preserve it and text conversion clears it.

### Task 2: Shared editor

Files: `src/components/OutlineEditor.tsx`, `NoteTypeSelect.tsx`.
Interfaces: controlled nodes/onChange, imperative focus/undo/redo; pinned presentation has task interaction without folding controls.

- [x] Implement node textarea, keyboard/right-click type switching, task checkbox, editor fold control, IME-safe keyboard handling, multiline paste and history.
- [x] Verify Chinese input, subtree keyboard operations and history.

### Task 3: Surfaces and verification

Files: `MainWindow.tsx`, `NotePad.tsx`, `Tile.tsx`.

- [x] Load/reset/save type and nodes through the existing refs and save queues, including changes with identical Markdown.
- [x] Add creation/type controls and swap in the shared outline editor, preserving text editor behavior.
- [x] Show outlines and interactive todo completion on tiles.
- [x] Run Vitest, TypeScript/Vite build, targeted lint and Rust persistence tests; inspect browser UI if available.

## Validation completed

UI revision following user feedback: remove the keyboard hint and per-row type dropdowns; use Ctrl/Cmd+Shift+T and the existing clipboard context menu for bullet/todo conversion; omit fold buttons in pinned previews. The 17 focused editor/surface/tile/locale tests, TypeScript and targeted lint passed.

- Vitest: 64 files, 317 tests passed, including 16 outline model/editor/surface tests.
- Rust note persistence: 24 tests passed, including legacy metadata, hierarchy validation and outline reload/conversion.
- TypeScript, targeted oxlint, production Vite build, and git diff whitespace checks passed.
- Added jsdom as a development-only dependency for IME, keyboard, checkbox, folding, undo/redo and actual surface save-queue DOM tests.
- Live visual verification was unavailable: no browser connected to the UI automation runtime. Temporary browser fixtures and the verification server were removed.

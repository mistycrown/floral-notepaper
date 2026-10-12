# Note Browser Implementation Plan

**Goal:** Restore dragging notes into categories, remove group borders, and offer a persisted title-only compact mode.
**Architecture:** Use pointer dragging so native file drops remain enabled. Share note card rendering and move category browsing into a focused component. Add one backwards-compatible configuration flag.
**Tech Stack:** React, TypeScript, Tauri, Rust, Vitest/JSDOM; no new dependencies.
**Spec:** `Docs/plans/2026-10-11-note-browser-design.md`

## Tasks

- [x] Add `useNoteCategoryDrag` with 6px threshold, category hit testing, cancellation, edge scrolling and click suppression. Test actual event flows.
- [x] Add reusable `NoteBrowserCard` and `CategoryNoteBrowser`; integrate with MainWindow while preserving menus, renaming and saves. Remove group borders and indent contents.
- [x] Add optional frontend `compactNoteList` and default-false Rust config field; wire settings, locales and all browser views. Test persistence and old config compatibility.
- [x] Run focused/full frontend tests, TypeScript, production build, lint and Rust service tests; record validation.

## Validation

- Frontend: 64 test files, 318 tests passed, including pointer drag/cancel/scroll interaction tests.
- Rust note services: 24 tests passed, including compact config persistence and legacy defaults.
- TypeScript, targeted lint, production build and diff whitespace checks passed.
- Native file drops remain enabled; note dragging uses Pointer Events instead of HTML5 drag/drop.
- Existing build warning about missing SourceHanSerifSC-Bold.woff2 remains unchanged.

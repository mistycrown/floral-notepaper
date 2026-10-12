# Metadata Tags Implementation Plan

**Goal:** Edit independently stored note tags in the metadata row.
**Architecture:** Shared controlled tag editor; optional tags in existing save requests; metadata is authoritative with a one-time legacy fallback. Keep existing queues and events.
**Tech Stack:** React, TypeScript, Rust, Vitest/JSDOM.
**Spec:** `Docs/plans/2026-10-12-metadata-tags-design.md`

## Global Constraints

- UTF-8; no dependencies; retain existing source layout and unrelated working changes.
- Preserve existing tags and Markdown text; external files have no local tag editor.

## Review Focus

- Missing tags on legacy metadata migrates before an update writes new content.
- Explicitly clearing tags must survive content with hashtags and repeated saves.
- Editing tags while a save is pending leaves the note dirty.
- Switching notes / recycling a small window cannot leak previous tags.
- Chinese IME Enter must not add an unfinished tag.

## Tasks

- [x] Backend: `SaveNoteRequest.tags: Option<Vec<String>>` in `src-tauri/src/services/notes.rs`; trim/deduplicate tags with `normalize_tags` in `services/tags.rs`; migrate missing tags in load_metadata; preserve omitted arrays and accept empty arrays. Update round-trip, import/rebuild and migration tests; run `cargo test --manifest-path src-tauri/Cargo.toml --lib`.
- [x] Frontend: `SaveNoteRequest.tags?: string[]`; `metadataFromNote` copies saved tags. Add shared controlled `NoteTagEditor({ tags, knownTags, onChange })` in `src/components/NoteTags.tsx`, keyboard/mouse suggestions and explicit remove buttons. Add three locale strings and tests for Chinese tags/IME/normalization.
- [x] Surfaces: main/pad tag state and refs, load/reset/sync, save snapshots/dirty detection, autosave dependencies; replace NoteTagHint and remove body/outline TagAutocomplete. Update surface tests for tag saves, clear, switch, body Enter and pending-save edits.
- [x] Verification: focused/full frontend tests, TypeScript, changed-file lint, Rust formatting/tests, production Vite build, UTF-8/whitespace review; update README usage and task completion.

## Validation - 2026-10-12

User refinement: tags are edited/displayed only in the main window. The small window omits tags from save requests, removes tag/type/title inputs, and displays a read-only title in its compact header. Save status remains available to screen readers. Tests cover both text/list windows, preservation of newer main-window tags, and pooled draft reset.

- Refinement verification: 58 focused tests passed; TypeScript, changed-file lint, UTF-8 and whitespace checks passed; Vite production build passed.

- Full frontend suite: 69 files, 372 tests passed; subsequent focused checks: 44 tests passed, including note switching and pooled draft reset.
- Full Rust suite: 167 tests passed.
- TypeScript, changed-file lint, Rust formatting, UTF-8 / Chinese string round-trip and git diff checks passed.
- Vite production build passed; existing missing SourceHanSerifSC-Bold.woff2 warning persists.

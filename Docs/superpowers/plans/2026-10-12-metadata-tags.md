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

- [ ] Backend: `SaveNoteRequest.tags: Option<Vec<String>>` in `src-tauri/src/services/notes.rs`; trim/deduplicate tags with `normalize_tags` in `services/tags.rs`; migrate missing tags in load_metadata; preserve omitted arrays and accept empty arrays. Update round-trip, import/rebuild and migration tests; run `cargo test --manifest-path src-tauri/Cargo.toml --lib`.
- [ ] Frontend: `SaveNoteRequest.tags?: string[]`; `metadataFromNote` copies saved tags. Add shared controlled `NoteTagEditor({ tags, knownTags, onChange })` in `src/components/NoteTags.tsx`, keyboard/mouse suggestions and explicit remove buttons. Add three locale strings and tests for Chinese tags/IME/normalization.
- [ ] Surfaces: main/pad tag state and refs, load/reset/sync, save snapshots/dirty detection, autosave dependencies; replace NoteTagHint and remove body/outline TagAutocomplete. Update surface tests for tag saves, clear, switch, body Enter and pending-save edits.
- [ ] Verification: focused/full frontend tests, TypeScript, changed-file lint, Rust formatting/tests, production Vite build, UTF-8/whitespace review; update README usage and task completion.

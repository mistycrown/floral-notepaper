# Tile Background Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Globally adjust pinned note backgrounds while retaining opaque text and controls.

**Architecture:** Persist `tileBackgroundTransparency` in AppConfig and broadcast through existing settings events. Pass it only from NotePad's tile branch into Tile's background color alpha.

**Tech Stack:** React, TypeScript, Tauri, Rust, Vitest.
**Spec:** [Approved design](2026-10-12-tile-background-transparency-design.md)

## Global Constraints

- UTF-8 source files. No new dependencies.
- Transparency 0%–80%, default 0%, integer steps.
- Only pinned backgrounds change; text, controls, and editor backgrounds retain their current appearance.

## Review Focus

- Old configuration: default 0 and write the field on save.
- Excessive persisted values: clamp to 80 on load and save.
- Existing and newly opened tiles: apply live events and initial config.
- Per-note colors and Markdown: preserve RGB and opaque content colors.
- Tile-to-pad transitions: editing surface retains its existing background.

### Task 1: Persist the setting

**Files:** `src/features/settings/types.ts`, `src-tauri/src/services/notes.rs`, AppConfig fixtures in `src-tauri/src/desktop.rs`.
**Interfaces:** optional TypeScript `tileBackgroundTransparency?: number`; Rust `tile_background_transparency: u32`, serde default 0.

- [x] Add Rust tests for default, old config, save/reload, and clamping on load/save.
- [x] Add the field, normalize to at most 80, and update explicit AppConfig fixtures.
- [x] Run targeted Rust config tests and frontend type checking.

### Task 2: Control and render pinned backgrounds

**Files:** `src/features/settings/tileColor.ts`, `src/components/SettingsPanel.tsx`, `src/components/Tile.tsx`, `src/components/NotePad.tsx`, three locale translation files.
**Interfaces:** `normalizeTileBackgroundTransparency(value?: number): number`; Tile `backgroundTransparency?: number`; AppConfig field from Task 1.

- [x] Add tests for background alpha with opaque content, setting slider updates, and initial/live window settings.
- [x] Add an accessible 0–80 slider and translated label/description; set background color alpha only.
- [x] Load and listen for the field in NotePad, passing it only to the tile branch.
- [x] Test tile-to-pad behavior, per-note colors, and default compatibility.
- [x] Run focused Vitest tests, TypeScript, formatting/lint checks, and Vite production build.

## Validation

- Focused frontend suite: 27 tests passed across Tile, NotePad synchronization/settings, color normalization, and locale resources.
- Rust config suite: 9 tests passed; transparency clamp/persistence test: 1 passed.
- TypeScript, oxlint, rustfmt, and Vite production build passed.

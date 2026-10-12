# Tag Completion Implementation Plan

**Goal:** Suggest existing tags after a hashtag in every editable note surface.
**Architecture:** One reusable event-capture wrapper supplies a caret-positioned popup. Pure completion helpers reuse the existing Markdown tag parser. Parent editors apply edits through their own state and undo flows.
**Tech Stack:** React, TypeScript, Vitest/JSDOM; no backend changes or new dependencies.
**Spec:** `Docs/plans/2026-10-11-tag-completion-design.md`

- [x] Add tested helpers for context, candidates, token replacement and ordinary textarea edits.
- [x] Add shared caret-positioned suggestion popup with keyboard, mouse, IME and dismissal behavior.
- [x] Integrate main textarea, small-window textarea and outline nodes, including locales and usage documentation.
- [x] Verify actual editor interactions, full frontend tests, types, lint, UTF-8 and production build.

## Validation — 2026-10-12

- Focused completion tests: 40 passed, including actual main/pad save flows and outline undo.
- Full frontend suite: 67 files, 360 tests passed.
- TypeScript, targeted lint, UTF-8 validation, whitespace checks and Vite production build passed.
- Existing missing SourceHanSerifSC-Bold.woff2 build warning remains unchanged.

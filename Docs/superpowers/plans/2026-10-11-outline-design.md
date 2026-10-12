# Two note types and editable outline nodes

Approved on 2026-10-11: text notes keep the existing Markdown editor; list notes use a node editor in the main window and small notepad. Each node can switch between a bullet and a todo, preserving its text and children. Todos have a completion checkbox. Enter splits a node, Tab/Shift+Tab change subtree depth, Shift+Enter adds a line, arrows navigate, and undo/redo restores structural edits. Nodes with children fold; folding survives reopening. Tiles show the same outline and allow task completion.

Persist `noteType` and flat preorder `outlineNodes` with stable IDs, depth, text, kind, checked, and collapsed in note metadata. Generate readable Markdown content for search, tags, clipboard, and export. Old notes default to text. Omitted request fields preserve the stored type; explicitly switching to text clears outline metadata and keeps Markdown content. If the Markdown file was changed externally, rebuild nodes from its current content rather than showing stale metadata.

Expose a note type selector in both editors and a new-list action beside new-text in the main window. Node type changes use Ctrl+Shift+T (Cmd+Shift+T on Mac) or the existing right-click menu; rows have no type dropdown or keyboard hint line. Pinned previews show content and todo checkboxes without expand/collapse controls; folding remains available while editing. Use the existing theme, fonts, colors and autosave queues. Preserve unrelated in-progress tag changes.

Validation: tree operations, Markdown round trips, todo conversion, collapsed visibility, Chinese multiline input, undo/redo, legacy metadata, persistence and frontend type/build checks.

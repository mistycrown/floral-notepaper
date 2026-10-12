import { useCallback, useRef, useState } from "react";
import type { Note, NoteType, OutlineNode } from "./types";
import { outlineForNote, outlineMarkdown, parseOutline } from "./outline";

interface OutlineState {
  noteType: NoteType;
  outlineNodes: OutlineNode[];
}

export function useOutlineNote(onEdit: (content: string) => void) {
  const [state, setState] = useState<OutlineState>({ noteType: "text", outlineNodes: [] });
  const snapshot = useRef(state);
  const edit = useRef(onEdit);
  edit.current = onEdit;
  const assign = useCallback((next: OutlineState) => {
    if (JSON.stringify(snapshot.current) === JSON.stringify(next)) return;
    snapshot.current = next;
    setState(next);
  }, []);
  const load = useCallback(
    (note?: Pick<Note, "noteType" | "outlineNodes" | "content">) => {
      const noteType = note?.noteType ?? "text";
      assign({ noteType, outlineNodes: note && noteType === "list" ? outlineForNote(note) : [] });
    },
    [assign],
  );
  const changeNodes = useCallback(
    (outlineNodes: OutlineNode[]) => {
      assign({ noteType: "list", outlineNodes });
      edit.current(outlineMarkdown(outlineNodes));
    },
    [assign],
  );
  const changeType = useCallback(
    (noteType: NoteType, content: string) => {
      if (noteType === snapshot.current.noteType) return;
      const outlineNodes = noteType === "list" ? parseOutline(content) : [];
      assign({ noteType, outlineNodes });
      edit.current(noteType === "list" ? outlineMarkdown(outlineNodes) : content);
    },
    [assign],
  );
  return {
    noteType: state.noteType,
    nodes: state.outlineNodes,
    snapshot,
    load,
    changeNodes,
    changeType,
  };
}

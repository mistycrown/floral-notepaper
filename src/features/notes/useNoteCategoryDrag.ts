import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { NoteMetadata } from "./types";

interface DragSession {
  note: NoteMetadata;
  pointerId: number;
  source: HTMLElement;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

export function useNoteCategoryDrag(onMove: (id: string, category: string) => void) {
  const browserRef = useRef<HTMLDivElement>(null);
  const session = useRef<DragSession | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ note: NoteMetadata; x: number; y: number } | null>(null);
  const [targetCategory, setTargetCategory] = useState<string | null>(null);

  useEffect(() => {
    let frame: number | null = null;
    let previousCursor = "";
    let previousSelection = "";

    const targetAt = (x: number, y: number): string | null => {
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-note-category]");
      if (!target || !browserRef.current?.contains(target)) return null;
      const category = target.dataset.noteCategory ?? null;
      return category === session.current?.note.category ? null : category;
    };

    const finish = () => {
      const current = session.current;
      session.current = null;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      if (current?.moved) {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        if (current.source.hasPointerCapture?.(current.pointerId)) {
          current.source.releasePointerCapture(current.pointerId);
        }
      }
      setDrag(null);
      setTargetCategory(null);
    };

    const scrollAtEdge = () => {
      const current = session.current;
      if (!current?.moved) return;
      const scroll = browserRef.current?.closest<HTMLElement>("[data-note-browser-scroll]");
      if (scroll) {
        const rect = scroll.getBoundingClientRect();
        if (
          current.x >= rect.left &&
          current.x <= rect.right &&
          current.y >= rect.top &&
          current.y <= rect.bottom
        ) {
          const edge = Math.min(32, rect.height / 4);
          const speed = current.y < rect.top + edge ? -8 : current.y > rect.bottom - edge ? 8 : 0;
          if (speed) {
            scroll.scrollTop += speed;
            setTargetCategory(targetAt(current.x, current.y));
          }
        }
      }
      frame = requestAnimationFrame(scrollAtEdge);
    };

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const current = session.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (event.buttons === 0) {
        finish();
        return;
      }
      current.x = event.clientX;
      current.y = event.clientY;
      if (!current.moved) {
        if (Math.hypot(current.x - current.startX, current.y - current.startY) < 6) return;
        current.moved = true;
        suppressClick.current = true;
        previousCursor = document.body.style.cursor;
        previousSelection = document.body.style.userSelect;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        current.source.setPointerCapture?.(current.pointerId);
        frame = requestAnimationFrame(scrollAtEdge);
      }
      event.preventDefault();
      setDrag({ note: current.note, x: current.x, y: current.y });
      setTargetCategory(targetAt(current.x, current.y));
    };

    const onPointerUp = (event: globalThis.PointerEvent) => {
      const current = session.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const category = current.moved ? targetAt(event.clientX, event.clientY) : null;
      finish();
      if (category !== null) moveRef.current(current.note.id, category);
    };
    const onPointerCancel = (event: globalThis.PointerEvent) => {
      if (event.pointerId === session.current?.pointerId) finish();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current) {
        event.preventDefault();
        finish();
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", finish);
    return () => {
      finish();
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", finish);
    };
  }, []);

  const startDrag = (event: PointerEvent<HTMLElement>, note: NoteMetadata) => {
    if (event.button !== 0 || event.isPrimary === false || event.pointerType === "touch") return;
    suppressClick.current = false;
    session.current = {
      note,
      source: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return { browserRef, drag, targetCategory, startDrag, onClickCapture };
}

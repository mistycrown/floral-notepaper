import { useEffect } from "react";
import { setTileEdgeHide } from "./tileEdgeHide";

export function useTileEdgeHide(enabled: boolean): void {
  useEffect(() => {
    const reportError = (error: unknown) => console.error("Tile edge hide:", error);
    if (!enabled) {
      void setTileEdgeHide(false).catch(reportError);
      return;
    }

    // Windows checks native button state: OS dragging can consume DOM mouseup.
    const nativeButtons = /Win/i.test(navigator.platform);
    let pointerHeld = false;
    let suspended: boolean | undefined;
    const update = () => {
      const next = pointerHeld || Boolean(document.querySelector("[data-edge-hide-block]"));
      if (next === suspended) return;
      suspended = next;
      void setTileEdgeHide(true, next).catch(reportError);
    };
    const down = () => {
      if (!nativeButtons) pointerHeld = true;
      update();
    };
    const release = () => {
      pointerHeld = false;
      update();
    };
    const move = (event: MouseEvent) => {
      if (!event.buttons) release();
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("mousedown", down, true);
    document.addEventListener("mouseup", release, true);
    document.addEventListener("mousemove", move, true);
    window.addEventListener("blur", release);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("mousedown", down, true);
      document.removeEventListener("mouseup", release, true);
      document.removeEventListener("mousemove", move, true);
      window.removeEventListener("blur", release);
      void setTileEdgeHide(false).catch(reportError);
    };
  }, [enabled]);
}

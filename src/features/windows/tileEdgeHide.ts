import { invoke } from "@tauri-apps/api/core";

// Serialize lifecycle changes so a late enable cannot undo a mode-switch restore.
let pending: Promise<void> = Promise.resolve();

export function setTileEdgeHide(enabled: boolean, suspended = false): Promise<void> {
  const next = pending.then(() => invoke<void>("set_tile_edge_hide", { enabled, suspended }));
  pending = next.catch(() => undefined);
  return next;
}

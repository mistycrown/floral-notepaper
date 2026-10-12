import type { OutlineNode } from "./types";

export const OUTLINE_NODE_TYPE_EVENT = "outline-node-type";

export interface OutlineNodeTypeRequest {
  nodeId: string;
  kind: OutlineNode["kind"];
}

export function requestOutlineNodeType(target: HTMLElement, kind: OutlineNode["kind"]): void {
  const nodeId = target.dataset.outlineRow;
  if (!nodeId) return;
  target.dispatchEvent(
    new CustomEvent<OutlineNodeTypeRequest>(OUTLINE_NODE_TYPE_EVENT, {
      bubbles: true,
      detail: { nodeId, kind },
    }),
  );
}

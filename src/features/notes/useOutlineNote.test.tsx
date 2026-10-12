// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { useOutlineNote } from "./useOutlineNote";
import { newOutlineNode, outlineMarkdown } from "./outline";

test("fold-only edits change the save snapshot; reload preserves state; type conversion and reset clear it", () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const edits: string[] = [];
  let outline!: ReturnType<typeof useOutlineNote>;
  function Harness() {
    outline = useOutlineNote((content) => edits.push(content));
    return null;
  }
  try {
    act(() => root.render(<Harness />));
    const nodes = [newOutlineNode("项目"), newOutlineNode("子项", 1)];
    const content = outlineMarkdown(nodes);
    act(() => outline.load({ noteType: "list", content, outlineNodes: nodes }));
    const before = outline.snapshot.current;
    act(() =>
      outline.changeNodes(
        nodes.map((node, index) => (index === 0 ? { ...node, collapsed: true } : node)),
      ),
    );
    expect(outline.snapshot.current).not.toBe(before);
    expect(edits).toEqual([content]);
    const folded = outline.nodes;
    act(() => outline.load({ noteType: "list", content, outlineNodes: structuredClone(folded) }));
    expect(outline.nodes).toBe(folded);
    act(() => outline.changeType("text", content));
    expect(outline.noteType).toBe("text");
    expect(outline.nodes).toEqual([]);
    expect(edits[edits.length - 1]).toBe(content);
    act(() => outline.changeType("list", content));
    expect(outline.nodes.map((node) => node.text)).toEqual(["项目", "子项"]);
    act(() => outline.load());
    expect(outline.noteType).toBe("text");
    expect(outline.nodes).toEqual([]);
  } finally {
    act(() => root.unmount());
  }
});

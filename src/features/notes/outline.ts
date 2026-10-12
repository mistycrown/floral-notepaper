import type { Note, OutlineNode } from "./types";

export function newOutlineNode(text = "", depth = 0): OutlineNode {
  return { id: crypto.randomUUID(), text, depth, kind: "bullet", checked: false, collapsed: false };
}

export function outlineMarkdown(nodes: OutlineNode[]): string {
  return nodes
    .map((node) => {
      const indent = "  ".repeat(node.depth);
      const marker = node.kind === "todo" ? `- [${node.checked ? "x" : " "}] ` : "- ";
      const [first, ...rest] = node.text.split("\n");
      return `${indent}${marker}${first}${rest.map((line) => `\n${indent}  ${line}`).join("")}`;
    })
    .join("\n");
}

export function parseOutline(content: string): OutlineNode[] {
  if (!content) return [newOutlineNode()];
  const nodes: OutlineNode[] = [];
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    const match = /^(\s*)(?:[-+*]|\d+\.) (?:\[([ xX])\] )?(.*)$/.exec(line);
    if (match) {
      const wantedDepth = Math.floor(match[1].replace(/\t/g, "  ").length / 2);
      const depth = Math.min(wantedDepth, nodes.length ? nodes[nodes.length - 1].depth + 1 : 0);
      nodes.push({
        ...newOutlineNode(match[3], depth),
        kind: match[2] !== undefined ? "todo" : "bullet",
        checked: /[xX]/.test(match[2] ?? ""),
      });
    } else {
      const previous = nodes[nodes.length - 1];
      const continuation = previous && line.startsWith("  ".repeat(previous.depth + 1));
      if (continuation) previous.text += `\n${line.slice((previous.depth + 1) * 2)}`;
      else nodes.push(newOutlineNode(line));
    }
  }
  return nodes;
}

export function outlineForNote(note: Pick<Note, "content" | "outlineNodes">): OutlineNode[] {
  const nodes = note.outlineNodes;
  if (nodes?.length && outlineMarkdown(nodes) === note.content) return nodes;
  return parseOutline(note.content);
}

export function subtreeEnd(nodes: OutlineNode[], index: number): number {
  let end = index + 1;
  while (end < nodes.length && nodes[end].depth > nodes[index].depth) end++;
  return end;
}

export function visibleOutline(nodes: OutlineNode[]): OutlineNode[] {
  let foldedDepth = Infinity;
  return nodes.filter((node) => {
    if (node.depth > foldedDepth) return false;
    foldedDepth = node.collapsed ? node.depth : Infinity;
    return true;
  });
}

export function indentNode(nodes: OutlineNode[], id: string, outdent = false): OutlineNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index < 0) return nodes;
  const depth = nodes[index].depth;
  const end = subtreeEnd(nodes, index);
  let parent = index - 1;
  while (parent >= 0 && nodes[parent].depth >= depth) parent--;
  if (outdent) {
    if (!depth || parent < 0) return nodes;
    const parentEnd = subtreeEnd(nodes, parent);
    const branch = nodes.slice(index, end).map((node) => ({ ...node, depth: node.depth - 1 }));
    return [
      ...nodes.slice(0, index),
      ...nodes.slice(end, parentEnd),
      ...branch,
      ...nodes.slice(parentEnd),
    ];
  }
  let sibling = index - 1;
  while (sibling >= 0 && nodes[sibling].depth > depth) sibling--;
  if (sibling < 0 || nodes[sibling].depth !== depth) return nodes;
  return nodes.map((node, i) =>
    i >= index && i < end
      ? { ...node, depth: node.depth + 1 }
      : i === sibling
        ? { ...node, collapsed: false }
        : node,
  );
}

export function splitNode(
  nodes: OutlineNode[],
  id: string,
  start: number,
  end: number,
): { nodes: OutlineNode[]; focusId: string } {
  const index = nodes.findIndex((node) => node.id === id);
  const current = nodes[index];
  const next = { ...newOutlineNode(current.text.slice(end), current.depth), kind: current.kind };
  // At the beginning, insert a sibling before the existing branch.
  if (start === 0 && end === 0) {
    next.text = "";
    return { nodes: [...nodes.slice(0, index), next, ...nodes.slice(index)], focusId: next.id };
  }
  const insertAt = subtreeEnd(nodes, index);
  return {
    nodes: [
      ...nodes.slice(0, index),
      { ...current, text: current.text.slice(0, start) },
      ...nodes.slice(index + 1, insertAt),
      next,
      ...nodes.slice(insertAt),
    ],
    focusId: next.id,
  };
}

export function mergeNode(
  nodes: OutlineNode[],
  id: string,
): { nodes: OutlineNode[]; focusId: string; cursor: number } | null {
  const index = nodes.findIndex((node) => node.id === id);
  if (index <= 0) return null;
  const preceding = visibleOutline(nodes).filter((node) => nodes.indexOf(node) < index);
  const previous = preceding[preceding.length - 1];
  if (!previous) return null;
  const current = nodes[index];
  const end = subtreeEnd(nodes, index);
  const delta = previous.depth + 1 - (current.depth + 1);
  return {
    nodes: nodes
      .filter((_, i) => i !== index)
      .map((node) =>
        node.id === previous.id
          ? { ...node, text: node.text + current.text, collapsed: false }
          : nodes.indexOf(node) > index && nodes.indexOf(node) < end
            ? { ...node, depth: node.depth + delta }
            : node,
      ),
    focusId: previous.id,
    cursor: previous.text.length,
  };
}

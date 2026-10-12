import { describe, expect, test } from "vitest";
import {
  indentNode,
  mergeNode,
  newOutlineNode,
  outlineForNote,
  outlineMarkdown,
  parseOutline,
  splitNode,
  visibleOutline,
} from "./outline";

const branch = () => [
  newOutlineNode("项目"),
  newOutlineNode("任务", 1),
  newOutlineNode("子任务", 2),
  newOutlineNode("另一个任务", 1),
  newOutlineNode("另一个项目"),
];

describe("outline structure", () => {
  test("outdent carries children after the remaining parent branch", () => {
    const nodes = branch();
    const next = indentNode(nodes, nodes[1].id, true);
    expect(next.map(({ text, depth }) => [text, depth])).toEqual([
      ["项目", 0],
      ["另一个任务", 1],
      ["任务", 0],
      ["子任务", 1],
      ["另一个项目", 0],
    ]);
  });
  test("indent carries the entire subtree and unfolds its new parent", () => {
    const nodes = [newOutlineNode("前项"), ...branch()];
    nodes[0].collapsed = true;
    const next = indentNode(nodes, nodes[1].id);
    expect(next.map((node) => node.depth)).toEqual([0, 1, 2, 3, 2, 0]);
    expect(next[0].collapsed).toBe(false);
    expect(indentNode(nodes, nodes[0].id)).toBe(nodes);
  });
  test("splitting preserves children and todo kind without carrying completion", () => {
    const nodes = branch();
    nodes[0].kind = "todo";
    nodes[0].checked = true;
    const next = splitNode(nodes, nodes[0].id, 1, 1);
    expect(next.nodes.map((node) => node.text)).toEqual([
      "项",
      "任务",
      "子任务",
      "另一个任务",
      "目",
      "另一个项目",
    ]);
    expect(next.nodes[4].kind).toBe("todo");
    expect(next.nodes[4].checked).toBe(false);
  });
  test("merge preserves descendants when merging into parent", () => {
    const nodes = branch();
    const next = mergeNode(nodes, nodes[1].id)!;
    expect(next.nodes.map((node) => node.depth)).toEqual([0, 1, 1, 0]);
    expect(next.nodes[0].text).toBe("项目任务");
  });
  test("folding hides only descendants, including nested collapsed branches", () => {
    const nodes = branch();
    nodes[1].collapsed = true;
    expect(visibleOutline(nodes).map((node) => node.text)).toEqual([
      "项目",
      "任务",
      "另一个任务",
      "另一个项目",
    ]);
    nodes[0].collapsed = true;
    expect(visibleOutline(nodes).map((node) => node.text)).toEqual(["项目", "另一个项目"]);
  });
});

test("Chinese multiline and todo nodes round trip through Markdown", () => {
  const nodes = branch();
  nodes[1].text = "待办\n中文说明\n\n第二段";
  nodes[1].kind = "todo";
  nodes[1].checked = true;
  const parsed = parseOutline(outlineMarkdown(nodes));
  expect(parsed.map(({ id: _id, ...node }) => node)).toEqual(
    nodes.map(({ id: _id, ...node }) => node),
  );
});

test("stored ids/folding survive unchanged content; external changes rebuild", () => {
  const nodes = branch();
  nodes[0].collapsed = true;
  expect(outlineForNote({ content: outlineMarkdown(nodes), outlineNodes: nodes })).toBe(nodes);
  expect(outlineForNote({ content: "- 修改后的内容", outlineNodes: nodes })[0].text).toBe(
    "修改后的内容",
  );
  expect(parseOutline("")).toHaveLength(1);
});

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = process.cwd();
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const { MarkdownPreview } = await vite.ssrLoadModule("/src/features/markdown/MarkdownPreview.tsx");
const { getTileAccentColor, tileTextColor } = await vite.ssrLoadModule("/src/features/settings/tileColor.ts");
const css = fs.readdirSync(path.join(root, "dist/assets")).find((file) => /^index-.*\.css$/.test(file));
const sample = "- [x] **如果是**\n- 的才\n- [ ] 待办与文字对齐\n\n- [x] **较大字号**\n\n  待办换行后的文字也保持对齐。\n\n  - [ ] 嵌套待办\n  - 嵌套列表";
const cards = [["#d9eddf", 14], ["#2d5a3d", 14], ["#ffd9df", 20], ["#284563", 20]].map(([color, fontSize]) => {
  const accent = getTileAccentColor(color);
  const ink = tileTextColor(color);
  const markdown = renderToStaticMarkup(createElement(MarkdownPreview, { content: sample, fontSize, onTaskToggle: () => {} }));
  return `<article data-note-tile="true" style="background:${color};--note-accent-color:${accent};--note-accent-text-color:${tileTextColor(accent)};--color-ink:${ink};--color-ink-soft:${ink};--color-bamboo:${ink};color:${ink}"><header>${color} → ${accent} · ${fontSize}px</header>${markdown}</article>`;
}).join("");
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>便签复选框排版核对</title><link rel="stylesheet" href="/assets/${css}"><style>body{margin:0;background:#ddd;padding:24px;font-family:"Microsoft YaHei",sans-serif;display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:20px}article{padding:20px;border-radius:12px;min-height:300px}header{font-size:12px;margin-bottom:14px}article .font-body{font-family:"Microsoft YaHei",sans-serif}</style>${cards}</html>`;
const server = http.createServer((request, response) => {
  if (request.url === "/" || request.url === "/verify") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(html);
    return;
  }
  if (request.url?.startsWith("/assets/")) {
    const asset = path.join(root, "dist", request.url.split("?")[0]);
    if (fs.existsSync(asset)) { response.end(fs.readFileSync(asset)); return; }
  }
  response.statusCode = 404; response.end();
});
server.listen(1433, "127.0.0.1", () => process.stdout.write("Palette verification: http://127.0.0.1:1433/verify\n"));
process.on("SIGINT", async () => { server.close(); await vite.close(); process.exit(0); });

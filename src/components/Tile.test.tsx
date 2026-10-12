import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Tile } from "./Tile";
import { getTileAccentColor, tileTextColor } from "../features/settings/tileColor";

test.each(["#d9eddf", "#2d5a3d"])(
  "list notes use the shared checkbox and accent palette on %s",
  (color) => {
    const html = renderToStaticMarkup(
      <Tile
        content=""
        color={color}
        outlineNodes={[
          { id: "todo", text: "待办", depth: 0, kind: "todo", checked: true, collapsed: false },
          {
            id: "bullet",
            text: "普通条目",
            depth: 0,
            kind: "bullet",
            checked: false,
            collapsed: false,
          },
        ]}
        onOutlineChange={() => {}}
      />,
    );
    expect(html).toContain(`--note-accent-color:${getTileAccentColor(color)}`);
    expect(html).toContain('data-outline-editor="true"');
    expect(html).toContain("note-task-checkbox");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
    expect(html).toContain("待办");
    expect(html).not.toContain("mt-2 shrink-0 accent-bamboo");
  },
);

test("emphasis palette refreshes stale persisted accents and derives accents for existing notes", () => {
  const saved = renderToStaticMarkup(
    <Tile content="**Text**" color="#d9eddf" accentColor="#526658" />,
  );
  expect(saved).toContain(`--note-accent-color:${getTileAccentColor("#d9eddf")}`);
  expect(saved).toContain(
    `--note-accent-text-color:${tileTextColor(getTileAccentColor("#d9eddf"))}`,
  );
  const existing = renderToStaticMarkup(<Tile content="Text" color="#284563" />);
  expect(existing).toContain(`--note-accent-color:${getTileAccentColor("#284563")}`);
});

test("dark note title, body, and Markdown palette use white independently of app theme", () => {
  const html = renderToStaticMarkup(
    <Tile title="Dark note" content="Readable body" color="#284563" />,
  );
  expect(html).toContain("background-color:#284563");
  expect(html).toContain("--color-ink:#ffffff");
  expect(html).toContain("--color-ink-soft:#ffffff");
  expect(html).toMatch(/color:#ffffff[^>]*>Dark note/);
  expect(html).toMatch(/color:#ffffff[^>]*>Readable body/);
});

test("light note title and body use dark text", () => {
  const html = renderToStaticMarkup(
    <Tile title="Light note" content="Readable body" color="#d7eafa" />,
  );
  expect(html).toContain("--color-ink:#1a1a18");
  expect(html).toMatch(/color:#1a1a18[^>]*>Readable body/);
});

test.each(["#d7eafa", "#284563"])(
  "background transparency on %s preserves opaque title, body, and controls",
  (color) => {
    const html = renderToStaticMarkup(
      <Tile title="Title" content="Body" color={color} backgroundTransparency={50}>
        <button>Copy</button>
      </Tile>,
    );
    const [red, green, blue] = [1, 3, 5].map((offset) =>
      parseInt(color.slice(offset, offset + 2), 16),
    );
    expect(html).toContain(`background-color:rgb(${red} ${green} ${blue} / 0.5)`);
    expect(html).toContain(`--color-paper:${color}`);
    expect(html).toContain(`--color-ink:${tileTextColor(color)}`);
    expect(html).toContain(`--note-accent-color:${getTileAccentColor(color)}`);
    expect(html).toMatch(new RegExp(`color:${tileTextColor(color)}[^>]*>Title`));
    expect(html).toMatch(new RegExp(`color:${tileTextColor(color)}[^>]*>Body`));
    expect(html).toContain("<button>Copy</button>");
    expect(html).not.toContain("opacity:");
  },
);

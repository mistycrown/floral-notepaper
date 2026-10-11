import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Tile } from "./Tile";
import { getTileAccentColor, tileTextColor } from "../features/settings/tileColor";

test("emphasis palette uses persisted accents and derives accents for existing notes", () => {
  const saved = renderToStaticMarkup(
    <Tile content="**Text**" color="#d9eddf" accentColor="#526658" />,
  );
  expect(saved).toContain("--note-accent-color:#526658");
  expect(saved).toContain(`--note-accent-text-color:${tileTextColor("#526658")}`);
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

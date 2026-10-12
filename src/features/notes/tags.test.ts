import { describe, expect, it } from "vitest";
import fixtures from "./tagFixtures.json";
import { extractNoteTags } from "./tags";

describe("inline note tags", () => {
  for (const fixture of fixtures) {
    it(`extracts tags from ${JSON.stringify(fixture.content)}`, () => {
      expect(extractNoteTags(fixture.content)).toEqual(fixture.tags);
    });
  }
});

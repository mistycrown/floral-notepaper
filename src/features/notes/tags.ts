export function normalizeNoteTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().replace(/^#/, "")))].filter((tag) =>
    /^[\p{L}\p{N}_-]+$/u.test(tag),
  );
}

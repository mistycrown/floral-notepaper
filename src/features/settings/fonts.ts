const FONT_FALLBACK =
  '"HarmonyOS Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';

export function fontFamilyCss(family: string): string {
  const name = Array.from(family.trim())
    .filter((character) => {
      const code = character.codePointAt(0)!;
      return code >= 32 && code !== 127;
    })
    .join("");
  return name
    ? `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}", ${FONT_FALLBACK}`
    : FONT_FALLBACK;
}

export function applyFontFamily(family: string | undefined): void {
  for (const property of ["--font-body", "--font-display", "--font-serif"]) {
    if (family?.trim()) {
      document.documentElement.style.setProperty(property, fontFamilyCss(family));
    } else {
      document.documentElement.style.removeProperty(property);
    }
  }
}

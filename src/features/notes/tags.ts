// Tags are derived from Markdown, never stored independently of note content.
export function extractNoteTags(content: string): string[] {
  let fence: { marker: string; length: number } | null = null;
  const text = content
    .split("\n")
    .map((line) => {
      const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (
          match &&
          match[1][0] === fence.marker &&
          match[1].length >= fence.length &&
          !match[2].trim()
        )
          fence = null;
        return "";
      }
      if (match) {
        fence = { marker: match[1][0], length: match[1].length };
        return "";
      }
      return /^(?: {4}|\t)/.test(line) ? "" : line;
    })
    .join("\n");

  const chars = Array.from(text);
  const tags = new Set<string>();
  const isTagChar = (char: string) => /^[\p{L}\p{N}_-]$/u.test(char);
  for (let index = 0; index < chars.length; index++) {
    const char = chars[index];
    if (char === "\\") {
      index++;
      continue;
    }
    if (char === "`") {
      let end = index + 1;
      while (chars[end] === "`") end++;
      const length = end - index;
      let closing = end;
      while (closing < chars.length) {
        if (chars[closing] !== "`") {
          closing++;
          continue;
        }
        let after = closing + 1;
        while (chars[after] === "`") after++;
        if (after - closing === length) {
          index = after - 1;
          break;
        }
        closing = after;
      }
      if (closing === chars.length) index = end - 1;
      continue;
    }
    if (char === "[") {
      let close = index + 1;
      let brackets = 1;
      for (; close < chars.length; close++) {
        if (chars[close] === "\\") {
          close++;
          continue;
        }
        if (chars[close] === "[") brackets++;
        if (chars[close] === "]" && --brackets === 0) break;
      }
      if (chars[close + 1] === ":") {
        while (index < chars.length && chars[index] !== "\n") index++;
        continue;
      }
      if (close >= 0 && (chars[close + 1] === "(" || chars[close + 1] === "[")) {
        const opening = chars[close + 1];
        const closing = opening === "(" ? ")" : "]";
        let depth = 1;
        let end = close + 2;
        for (; end < chars.length && depth; end++) {
          if (chars[end] === "\\") {
            end++;
            continue;
          }
          if (chars[end] === opening) depth++;
          if (chars[end] === closing) depth--;
        }
        if (!depth) {
          index = end - 1;
          continue;
        }
      }
    }
    // A URL's fragment belongs to the URL, including fragments after punctuation.
    if (
      ["http://", "https://", "www."].some(
        (prefix) =>
          chars
            .slice(index, index + prefix.length)
            .join("")
            .toLowerCase() === prefix,
      )
    ) {
      while (index + 1 < chars.length && !/\s/.test(chars[index + 1])) index++;
      continue;
    }
    if (
      char !== "#" ||
      (index > 0 && !/[\s([{（【「『，。！？、；：,:;!?]/u.test(chars[index - 1]))
    )
      continue;
    let end = index + 1;
    while (end < chars.length && isTagChar(chars[end])) end++;
    if (end > index + 1) tags.add(chars.slice(index + 1, end).join(""));
    index = end - 1;
  }
  return [...tags];
}

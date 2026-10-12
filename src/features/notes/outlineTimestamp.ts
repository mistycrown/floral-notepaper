import { newOutlineNode } from "./outline";

export function newTimestampOutlineNode(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const label = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return newOutlineNode(`[${label}] `);
}

export function readOutlineTimestamp(text: string) {
  const match =
    /^\[(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]) (?:[01]\d|2[0-3]):[0-5]\d)\] /.exec(text);
  if (!match) return null;
  return {
    prefix: match[0],
    label: match[1],
    dateTime: match[1].replace(" ", "T"),
    text: text.slice(match[0].length),
  };
}

import { readOutlineTimestamp } from "../features/notes/outlineTimestamp";

export function OutlineTimestamp({
  timestamp,
  className = "",
}: {
  timestamp: NonNullable<ReturnType<typeof readOutlineTimestamp>>;
  className?: string;
}) {
  return (
    <time
      dateTime={timestamp.dateTime}
      title={timestamp.label}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] leading-4 tabular-nums whitespace-nowrap align-middle ${className}`}
      style={{ backgroundColor: "color-mix(in srgb, currentColor 7%, transparent)" }}
    >
      <svg
        aria-hidden="true"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 opacity-60"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="opacity-75">{timestamp.label.slice(5)}</span>
    </time>
  );
}

import chroma from "chroma-js";
import type { CSSProperties, HTMLAttributes } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
  tileTextColor,
  getTileAccentColor,
  resolveNoteTileColor,
  normalizeTileBackgroundTransparency,
} from "../features/settings/tileColor";
import { MarkdownPreviewLazy as MarkdownPreview } from "../features/markdown/MarkdownPreviewLazy";
import { OutlineEditor } from "./OutlineEditor";
import type { OutlineNode } from "../features/notes/types";
import { normalizeTileLineHeight } from "../features/settings/tileLineHeight";

export interface TileProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "color" | "content" | "title"
> {
  title?: string;
  content: string;
  color?: string;
  accentColor?: string;
  backgroundTransparency?: number;
  width?: number | string;
  rotation?: number;
  fontSize?: number;
  lineHeight?: number;
  renderMarkdown?: boolean;
  imageBaseDir?: string;
  onTaskToggle?: (offset: number, checked: boolean) => void;
  contentBottomPadding?: number;
  outlineNodes?: OutlineNode[];
  onOutlineChange?: (nodes: OutlineNode[]) => void;
}

const MARK_SIZE = 8;
const MARK_OFFSET = 6;

const cornerPaths = [
  {
    pos: { top: MARK_OFFSET, left: MARK_OFFSET },
    d: `M0,${MARK_SIZE} L0,0 L${MARK_SIZE},0`,
  },
  {
    pos: { top: MARK_OFFSET, right: MARK_OFFSET },
    d: `M0,0 L${MARK_SIZE},0 L${MARK_SIZE},${MARK_SIZE}`,
  },
  {
    pos: { bottom: MARK_OFFSET, left: MARK_OFFSET },
    d: `M0,0 L0,${MARK_SIZE} L${MARK_SIZE},${MARK_SIZE}`,
  },
  {
    pos: { bottom: MARK_OFFSET, right: MARK_OFFSET },
    d: `M${MARK_SIZE},0 L${MARK_SIZE},${MARK_SIZE} L0,${MARK_SIZE}`,
  },
];

function CornerMarks({ color }: { color: string }) {
  return (
    <>
      {cornerPaths.map((mark, index) => (
        <svg
          key={index}
          className="absolute pointer-events-none"
          data-tile-corner-mark="true"
          style={mark.pos as CSSProperties}
          width={MARK_SIZE}
          height={MARK_SIZE}
          viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
        >
          <path
            d={mark.d}
            stroke={color}
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </>
  );
}

export function Tile({
  title,
  content,
  color = DEFAULT_TILE_COLOR,
  accentColor,
  backgroundTransparency,
  width = 260,
  rotation = 0,
  fontSize = 14,
  lineHeight,
  renderMarkdown = false,
  imageBaseDir,
  onTaskToggle,
  contentBottomPadding,
  outlineNodes,
  onOutlineChange,
  className = "",
  style,
  children,
  ...divProps
}: TileProps) {
  const { t } = useTranslation();
  const tileColor = normalizeTileColor(color);
  const transparency = normalizeTileBackgroundTransparency(backgroundTransparency);
  const noteAccentColor = useMemo(() => {
    const derived = getTileAccentColor(tileColor);
    const saved = resolveNoteTileColor(accentColor, derived);
    // Accent is a derived cache, not a separately editable color. Refresh old
    // RGB-blended accents immediately, including notes already pinned at startup.
    return saved === derived ? saved : derived;
  }, [accentColor, tileColor]);
  const { borderColor, cornerColor, titleColor, contentColor, emptyColor } = useMemo(() => {
    const mixTarget = tileTextColor(tileColor);
    return {
      borderColor: chroma.mix(tileColor, mixTarget, 0.18).alpha(0.55).css(),
      cornerColor: chroma.mix(tileColor, mixTarget, 0.3).alpha(0.26).css(),
      titleColor: mixTarget,
      contentColor: mixTarget,
      emptyColor: mixTarget,
    };
  }, [tileColor]);
  const mergedStyle: CSSProperties = {
    width,
    backgroundColor:
      transparency === 0
        ? tileColor
        : chroma(tileColor)
            .alpha(1 - transparency / 100)
            .css(),
    color: contentColor,
    // Markdown and controls derive their palette from this note, independently
    // of the global application theme. This includes code blocks and tables.
    ...({
      "--color-ink": contentColor,
      "--note-accent-color": noteAccentColor,
      "--note-line-height": normalizeTileLineHeight(lineHeight),
      "--note-accent-text-color": tileTextColor(noteAccentColor),
      "--color-ink-soft": contentColor,
      "--color-ink-faint": chroma(contentColor).alpha(0.7).css(),
      "--color-ink-ghost": chroma(contentColor).alpha(0.55).css(),
      "--color-bamboo": contentColor,
      "--color-bamboo-light": contentColor,
      "--color-paper": tileColor,
      "--color-paper-warm": chroma.mix(tileColor, contentColor, 0.08).hex(),
      "--color-paper-deep": chroma.mix(tileColor, contentColor, 0.2).hex(),
    } as CSSProperties),
    borderColor,
    transition: "box-shadow 0.3s ease",
    ...(rotation ? { transform: `rotate(${rotation}deg)` } : {}),
    ...style,
  };

  return (
    <div
      {...divProps}
      data-note-tile="true"
      className={`app-surface-frame relative border overflow-hidden shadow-[0_1px_8px_rgba(26,26,24,0.04)] hover:shadow-[0_6px_24px_rgba(26,26,24,0.07)] ${className}`}
      style={mergedStyle}
    >
      <div
        className="px-4 pt-4 pb-4 h-full overflow-y-auto scrollbar-hidden"
        style={contentBottomPadding == null ? undefined : { paddingBottom: contentBottomPadding }}
      >
        {title && (
          <div
            className="select-none cursor-move font-display tracking-wide mb-3 leading-snug"
            style={{ color: titleColor, fontSize: `${fontSize + 1}px` }}
          >
            {title}
          </div>
        )}
        {outlineNodes ? (
          <OutlineEditor
            nodes={outlineNodes}
            onChange={onOutlineChange}
            readOnly
            fontSize={fontSize}
          />
        ) : content ? (
          renderMarkdown ? (
            <div data-note-selectable="true" style={{ color: contentColor }}>
              <MarkdownPreview
                content={content}
                fontSize={fontSize}
                renderHtml={false}
                imageBaseDir={imageBaseDir}
                onTaskToggle={onTaskToggle}
              />
            </div>
          ) : (
            <div
              data-note-selectable="true"
              className="note-selectable leading-[1.8] whitespace-pre-wrap font-body"
              style={{ color: contentColor, fontSize: `${fontSize}px` }}
            >
              {content}
            </div>
          )
        ) : (
          <div
            className="font-body text-center py-6"
            style={{ color: emptyColor, fontSize: `${fontSize}px` }}
          >
            {t("tile.empty", { defaultValue: "空" })}
          </div>
        )}
      </div>

      <CornerMarks color={cornerColor} />
      {children}
    </div>
  );
}

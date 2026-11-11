"use client";

import React from "react";
import type { VisualLine } from "@/lib/types";
import type { FontFamily } from "@/lib/theme";

interface ReadingViewProps {
  title: string;
  lines: VisualLine[];
  activeLineIdx: number;
  activeClauseId: number;
  clauseMenuOpen: boolean;
  highlightedClauses: Set<number>;
  underlinedClauses: Set<number>;
  noCameraMode: boolean;
  isCalibrated: boolean;
  bgBlur: boolean;
  showReticle: boolean;
  showRowMeta: boolean;
  fontSize: number;
  fontFamily: FontFamily;
  readingWidthPct: number;
  lineHeightPx: number;
  rowsPerPage: number;
  clauseGapPx: number;
  getFontCssString: (sizePx: number) => string;
  rowsContainerRef: React.RefObject<HTMLDivElement | null>;
  menuShowBookmark: boolean;
  menuShowHighlight: boolean;
  menuShowNotes: boolean;
  isNight: boolean;
  unifiedSurfaceClass: string;
  rowBadgeWeakContrastClass: string;
  clauseClickRatio: number;
  onSentenceClick: (lineIdx: number, clauseId: number, ratio: number) => void;
  onSentenceDoubleClick: (lineIdx: number, clauseId: number, ratio: number) => void;
  onPointerMoveGaze: (e: React.PointerEvent) => void;
  onAddBookmark: () => void;
  onToggleHighlight: () => void;
  onToggleUnderline: () => void;
  onAddToNotes: () => void;
  onCopy: () => void;
}

export function ReadingView({
  title,
  lines,
  activeLineIdx,
  activeClauseId,
  clauseMenuOpen,
  highlightedClauses,
  underlinedClauses,
  noCameraMode,
  isCalibrated,
  bgBlur,
  showReticle,
  showRowMeta,
  fontSize,
  fontFamily,
  readingWidthPct,
  lineHeightPx,
  rowsPerPage,
  clauseGapPx,
  getFontCssString,
  rowsContainerRef,
  menuShowBookmark,
  menuShowHighlight,
  menuShowNotes,
  isNight,
  unifiedSurfaceClass,
  rowBadgeWeakContrastClass,
  clauseClickRatio,
  onSentenceClick,
  onSentenceDoubleClick,
  onPointerMoveGaze,
  onAddBookmark,
  onToggleHighlight,
  onToggleUnderline,
  onAddToNotes,
  onCopy,
}: ReadingViewProps) {
  return (
    <main
      onPointerMove={onPointerMoveGaze}
      className="flex-1 w-full flex flex-col items-center justify-center py-2 relative z-10"
    >
      <div
        style={{ width: `${readingWidthPct}%` }}
        className="relative transition-all duration-150"
      >
        <div className="flex items-center justify-between mb-3">
          <h1
            className="font-serif opacity-65 tracking-tight truncate"
            style={{
              fontSize: Math.round(fontSize * 1.7),
              fontFamily:
                fontFamily === "Inter" ? "Inter, sans-serif" : "Georgia, serif",
            }}
          >
            {title}
          </h1>
        </div>

        <div
          ref={rowsContainerRef}
          style={{ minHeight: rowsPerPage * lineHeightPx }}
          className="w-full relative"
        >
          {lines.map((line, idx) => {
            const distFromActive = idx - activeLineIdx;
            const lineOpacity =
              distFromActive === 0
                ? 1
                : distFromActive < 0
                ? Math.max(0.32, 0.76 + distFromActive * 0.12)
                : distFromActive <= 2
                ? 0.9
                : Math.max(0.36, 0.86 - (distFromActive - 2) * 0.1);

            const rowBlurFilter =
              bgBlur && Math.abs(distFromActive) > 1 ? "blur(2.2px)" : "none";

            return (
              <div
                key={idx}
                style={{
                  height: lineHeightPx,
                  opacity: lineOpacity,
                  filter: rowBlurFilter,
                }}
                className="relative flex items-center transition-all duration-200"
              >
                {showReticle && idx === activeLineIdx && (
                  <span
                    className="absolute -left-5 w-3.5 h-3.5 rounded-full border border-sky-500/70 flex items-center justify-center pointer-events-none"
                    title="Spatial Visual Reticle"
                  >
                    <span className="w-1 h-1 rounded-full bg-sky-500" />
                  </span>
                )}

                <div
                  className="flex items-center whitespace-pre relative"
                  style={{ font: getFontCssString(fontSize) }}
                >
                  {line.segments.map((seg, sIdx) => {
                    const isSentenceHighlighted =
                      idx === activeLineIdx && seg.clauseId === activeClauseId;
                    const isMouthSelected =
                      clauseMenuOpen && isSentenceHighlighted;
                    const isPersistentHighlighted = highlightedClauses.has(
                      seg.clauseId
                    );
                    const isUnderlined = underlinedClauses.has(seg.clauseId);

                    const words = seg.text.split(" ");
                    const focusStartWord = Math.max(
                      0,
                      Math.min(
                        Math.max(0, words.length - 4),
                        Math.floor(words.length * clauseClickRatio)
                      )
                    );
                    const focusEndWord = Math.min(
                      words.length - 1,
                      focusStartWord + 3
                    );

                    return (
                      <React.Fragment key={sIdx}>
                        <span
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio =
                              rect.width > 0
                                ? (e.clientX - rect.left) / rect.width
                                : 0.5;
                            onSentenceClick(
                              idx,
                              seg.clauseId,
                              Math.max(0, Math.min(1, ratio))
                            );
                          }}
                          onDoubleClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio =
                              rect.width > 0
                                ? (e.clientX - rect.left) / rect.width
                                : 0.5;
                            onSentenceDoubleClick(
                              idx,
                              seg.clauseId,
                              Math.max(0, Math.min(1, ratio))
                            );
                          }}
                          className={`relative inline-flex items-center rounded-md px-1 -mx-1 py-0.5 transition-colors duration-150 cursor-pointer ${
                            isSentenceHighlighted
                              ? isNight
                                ? "bg-indigo-500/30 text-white border-b border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.25)] z-10"
                                : "bg-white/85 text-stone-950 border-b border-stone-400 shadow-[0_0_16px_rgba(255,255,255,0.95)] z-10"
                              : isPersistentHighlighted
                              ? isNight
                                ? "bg-amber-500/25 text-amber-100"
                                : "bg-amber-200/60 text-stone-900"
                              : ""
                          } ${
                            isUnderlined
                              ? "underline decoration-2 underline-offset-4"
                              : ""
                          }`}
                        >
                          {isMouthSelected
                            ? words.map((w, wIdx) => {
                                const inSelectionBox =
                                  wIdx >= focusStartWord &&
                                  wIdx <= focusEndWord;
                                return (
                                  <span
                                    key={wIdx}
                                    className={
                                      inSelectionBox
                                        ? "bg-[#7ba3bd]/65 text-stone-950 rounded-sm px-0.5 -mx-0.5"
                                        : ""
                                    }
                                  >
                                    {w}
                                    {wIdx < words.length - 1 ? " " : ""}
                                  </span>
                                );
                              })
                            : seg.text}

                          {isMouthSelected && (
                            <span
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                left: `${Math.max(
                                  0.08,
                                  Math.min(0.92, clauseClickRatio)
                                ) * 100}%`,
                              }}
                              className={`absolute -translate-x-1/2 top-full mt-1.5 z-30 h-8 px-3.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-4 whitespace-nowrap ${unifiedSurfaceClass}`}
                            >
                              {menuShowBookmark && (
                                <button
                                  type="button"
                                  onClick={onAddBookmark}
                                  className="opacity-80 hover:opacity-100 transition flex items-center gap-1 text-xs"
                                  title="Bookmark Sentence"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <span>Bookmark</span>
                                </button>
                              )}

                              {menuShowHighlight && (
                                <>
                                  <button
                                    type="button"
                                    onClick={onToggleHighlight}
                                    className="opacity-80 hover:opacity-100 transition text-xs font-semibold"
                                    title="Highlight Sentence"
                                  >
                                    Highlight
                                  </button>
                                  <button
                                    type="button"
                                    onClick={onToggleUnderline}
                                    className="opacity-80 hover:opacity-100 transition font-serif font-bold text-xs underline underline-offset-2"
                                    title="Underline Sentence"
                                  >
                                    U
                                  </button>
                                </>
                              )}

                              {menuShowNotes && (
                                <button
                                  type="button"
                                  onClick={onAddToNotes}
                                  className="opacity-80 hover:opacity-100 transition text-xs"
                                  title="Add Sentence to Notes"
                                >
                                  Note
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={onCopy}
                                className="opacity-80 hover:opacity-100 transition"
                                title="Copy Sentence"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </button>
                            </span>
                          )}
                        </span>
                        {seg.isClauseEnd && (
                          <span style={{ width: clauseGapPx }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {showRowMeta && (
                  <span
                    className={`absolute left-full ml-2.5 whitespace-nowrap text-[10px] font-mono tabular-nums px-2 py-0.5 rounded border pointer-events-none ${rowBadgeWeakContrastClass}`}
                  >
                    {line.clauseCount} sent / {line.wordCount} w |{" "}
                    {Math.round(line.widthRatio * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
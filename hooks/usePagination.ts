"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ROWS_PER_PAGE } from "@/lib/constants";
import { packParagraphIntoVisualLines } from "@/lib/text-segmentation";
import type { VisualLine } from "@/lib/types";

interface UsePaginationParams {
  rawText: string;
  readingWidthPct: number;
  fontSize: number;
  fontFamily: string;
  getFontCssString: (sizePx: number) => string;
  rowsContainerRef?: React.RefObject<HTMLDivElement | null>;
  onPaginated: (firstClauseId: number, newPages: VisualLine[][]) => void;
}

export function usePagination({
  rawText,
  readingWidthPct,
  fontSize,
  fontFamily,
  getFontCssString,
  rowsContainerRef,
  onPaginated,
}: UsePaginationParams) {
  const [pages, setPages] = useState<VisualLine[][]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [activeClauseId, setActiveClauseId] = useState(0);

  const onPaginatedRef = useRef(onPaginated);
  useEffect(() => {
    onPaginatedRef.current = onPaginated;
  }, [onPaginated]);

  const paginateText = useCallback(
    (text: string, containerWidth: number) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const fontSpec = getFontCssString(fontSize);
      ctx.font = fontSpec;

      const maxTextWidth = Math.max(containerWidth - 16, 280);
      const visualLines: VisualLine[] = [];
      let globalClauseId = 0;

      for (const para of text.split(/\r?\n/)) {
        const trimmed = para.trim();
        if (!trimmed) continue;
        const { lines, nextClauseId } = packParagraphIntoVisualLines(
          trimmed, ctx, fontSpec, maxTextWidth, globalClauseId
        );
        globalClauseId = nextClauseId;
        visualLines.push(...lines);
      }

      const paged: VisualLine[][] = [];
      for (let i = 0; i < visualLines.length; i += ROWS_PER_PAGE) {
        paged.push(visualLines.slice(i, i + ROWS_PER_PAGE));
      }

      const finalPages = paged.length ? paged : [[{
        segments: [{ text: "(Empty Document)", clauseId: 0, startX: 0, endX: 120, isClauseEnd: true }],
        clauseCount: 1, wordCount: 2, charCount: 14, widthRatio: 0.2,
        isParaStart: true, isParaEnd: true,
      }]];
      const firstClause = finalPages[0]?.[0]?.segments?.[0]?.clauseId ?? 0;

      setPages(finalPages);
      setPageIdx((prev) => Math.min(prev, Math.max(0, finalPages.length - 1)));
      onPaginatedRef.current(firstClause, finalPages);
    },
    [fontSize, getFontCssString]
  );

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const fromDom = rowsContainerRef?.current?.clientWidth;
      const fallback = Math.round(
        ((typeof window !== "undefined" ? window.innerWidth : 1280) * readingWidthPct) / 100
      );
      const w = fromDom && fromDom > 0 ? fromDom : fallback;
      paginateText(rawText, w);
    };
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf1); };
  }, [rawText, readingWidthPct, fontSize, fontFamily, paginateText, rowsContainerRef]);

  useEffect(() => {
    const el = rowsContainerRef?.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastW = el.clientWidth;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (Math.abs(w - lastW) > 8) {
          lastW = w;
          paginateText(rawText, Math.max(w, 280));
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rawText, paginateText, rowsContainerRef]);

  return { pages, pageIdx, setPageIdx, activeLineIdx, setActiveLineIdx, activeClauseId, setActiveClauseId };
}
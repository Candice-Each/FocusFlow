"use client";

import React from "react";

interface PaginationFooterProps {
  pageIdx: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PaginationFooter({
  pageIdx,
  pageCount,
  onPrev,
  onNext,
}: PaginationFooterProps) {
  return (
    <footer className="h-10 flex items-center justify-center gap-6 text-xs z-10 shrink-0 tabular-nums">
      <button
        type="button"
        disabled={pageIdx <= 0}
        onClick={onPrev}
        className="opacity-50 hover:opacity-100 disabled:opacity-20 px-2"
      >
        ‹
      </button>
      <span className="font-serif text-sm opacity-80">
        {pageIdx + 1} / {Math.max(1, pageCount)}
      </span>
      <button
        type="button"
        disabled={pageIdx >= pageCount - 1}
        onClick={onNext}
        className="opacity-50 hover:opacity-100 disabled:opacity-20 px-2"
      >
        ›
      </button>
    </footer>
  );
}
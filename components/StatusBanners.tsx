"use client";

import React from "react";
import type { ToastNotification } from "@/lib/types";

interface StatusBannersProps {
  toast: ToastNotification | null;
  showReturnConfirm: boolean;
  pageIdx: number;
  activeLineIdx: number;
  readingSeconds: number;
  formatTime: (sec: number) => string;
  onResume: () => void;
  showGuideBanner: boolean;
  noCameraMode: boolean;
  onDismissGuide: () => void;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
}

export function StatusBanners({
  toast,
  showReturnConfirm,
  pageIdx,
  activeLineIdx,
  readingSeconds,
  formatTime,
  onResume,
  showGuideBanner,
  noCameraMode,
  onDismissGuide,
  unifiedSurfaceClass,
  unifiedSubtleBoxClass,
}: StatusBannersProps) {
  return (
    <>
      {toast && (
        <div
          className={`fixed bottom-11 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2.5 text-xs transition-all whitespace-nowrap ${unifiedSurfaceClass}`}
        >
          <span className="w-2 h-2 rounded-full bg-stone-800 shrink-0" />
          <span className="font-medium">{toast.title}</span>
          {toast.detail && (
            <span className="opacity-70 border-l border-stone-400/40 pl-2.5 max-w-md truncate">
              {toast.detail}
            </span>
          )}
        </div>
      )}

      {showReturnConfirm && (
        <div
          className={`fixed bottom-11 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-4 ${unifiedSurfaceClass}`}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Welcome Back · Reading Timer Paused</span>
            </div>
            <p className="text-[11px] opacity-75 leading-relaxed">
              Paused at Page {pageIdx + 1}, Row {activeLineIdx + 1} (
              {formatTime(readingSeconds)} recorded). Reading remains paused
              until you choose Resume.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResume}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition"
            >
              Resume Timer
            </button>
          </div>
        </div>
      )}

      {showGuideBanner && (
        <div
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full border backdrop-blur-sm flex items-center gap-3 text-[11px] whitespace-nowrap ${unifiedSubtleBoxClass}`}
        >
          <span>
            {noCameraMode
              ? "No-Camera Mode: Click any sentence to focus, or double-click to summon the selection box and quick menu."
              : "Tip: Gaze highlights sentences on the active row; open your mouth (or double-click) to summon the selection box and quick menu."}
          </span>
          <button
            type="button"
            onClick={onDismissGuide}
            className="opacity-50 hover:opacity-100 px-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

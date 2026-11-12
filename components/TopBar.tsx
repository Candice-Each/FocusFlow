"use client";

import React from "react";
import type { ReadingStats } from "@/lib/types";

interface TopBarProps {
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onBackToShelf?: () => void;
  readingStats: ReadingStats;
  readingSeconds: number;
  isOffScreenPaused: boolean;
  clauseMenuOpen: boolean;
  isCalibrated: boolean;
  noCameraMode: boolean;
  modelReady: boolean;
  startCalibration: () => void;
  isPurchased: boolean;
  setBuyModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSpeaking: boolean;
  toggleTtsReading: (single?: boolean) => void;
  setNotesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  micActive: boolean;
  toggleMicrophone: () => void;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
  formatTime: (sec: number) => string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export function TopBar({
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
  onBackToShelf,
  readingStats,
  readingSeconds,
  isOffScreenPaused,
  clauseMenuOpen,
  isCalibrated,
  noCameraMode,
  modelReady,
  startCalibration,
  isPurchased,
  setBuyModalOpen,
  isSpeaking,
  toggleTtsReading,
  setNotesModalOpen,
  micActive,
  toggleMicrophone,
  unifiedSurfaceClass,
  unifiedSubtleBoxClass,
  formatTime,
  onPointerEnter,
  onPointerLeave,
}: TopBarProps) {
  return (
    <header
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="h-14 px-8 pt-2 flex items-center justify-between z-20 shrink-0"
    >
      <div className="flex items-center gap-2.5">

        <button
          type="button"
          onClick={() => setLeftSidebarOpen((v) => !v)}
          className={`w-10 h-8 rounded-full border flex items-center justify-center transition ${unifiedSurfaceClass}`}
          title="Contents & Bookmarks"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <line x1="9" y1="4" x2="9" y2="20" />
          </svg>
        </button>

        {onBackToShelf && (
          <button
            type="button"
            onClick={onBackToShelf}
            className={`text-xs px-3.5 py-1 rounded-full border backdrop-blur-sm flex items-center gap-2 tabular-nums whitespace-nowrap transition hover:opacity-80 ${unifiedSubtleBoxClass}`}
            title="Back to Shelf"
          >
            Shelf
          </button>
        )}

        <div
          className={`text-xs px-3.5 py-1 rounded-full border backdrop-blur-sm flex items-center gap-2 tabular-nums whitespace-nowrap ${unifiedSubtleBoxClass}`}
        >
          <span>Row {readingStats.currentLineIdx + 1}</span>
          <span className="opacity-40">|</span>
          <span>{readingStats.wpm} WPM</span>
          <span className="opacity-40">|</span>
          <span>
            {formatTime(readingSeconds)}
            {isOffScreenPaused ? " (Paused)" : ""}
          </span>
          <span className="opacity-40">|</span>
          <span
            className={
              clauseMenuOpen
                ? "font-semibold underline underline-offset-2"
                : "opacity-80"
            }
          >
            {clauseMenuOpen ? "Selection Active" : "Gaze Sentence · Mouth Select"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isCalibrated && !noCameraMode && (
          <button
            type="button"
            disabled={!modelReady}
            onClick={startCalibration}
            className="px-3.5 py-1.5 rounded-full bg-stone-900 text-white text-xs font-medium shadow-sm hover:bg-stone-800 disabled:opacity-40 transition whitespace-nowrap"
          >
            {modelReady ? "Calibrate Gaze (9-Pt)" : "Loading Model..."}
          </button>
        )}

        <button
          type="button"
          onClick={() => setBuyModalOpen(true)}
          className={`px-3 h-8 rounded-full text-xs font-medium border transition flex items-center gap-1 whitespace-nowrap ${
            isPurchased
              ? "bg-emerald-50/90 text-emerald-800 border-emerald-300"
              : unifiedSurfaceClass
          }`}
          title="Purchase Full Book"
        >
          <span>{isPurchased ? "✓ Purchased" : "Buy"}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleTtsReading(false)}
          className={`w-10 h-8 rounded-full border flex items-center justify-center transition ${
            isSpeaking
              ? "bg-amber-600 text-white border-amber-600"
              : unifiedSurfaceClass
          }`}
          title="Audiobook Read Aloud (TTS)"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setNotesModalOpen((v) => !v)}
          className={`w-10 h-8 rounded-full border flex items-center justify-center transition ${unifiedSurfaceClass}`}
          title="Reading Notes, Highlights & TXT Import"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
            <path d="M10 12h7" />
            <path d="M10 16h4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setRightSidebarOpen((v) => !v)}
          className={`w-10 h-8 rounded-full border flex items-center justify-center transition ${
            rightSidebarOpen
              ? "bg-stone-900 text-white border-stone-900"
              : unifiedSurfaceClass
          }`}
          title="Reading Settings & Multimodal Sensing"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={toggleMicrophone}
          className={`w-14 h-8 rounded-full p-0.5 flex items-center border transition-colors ${
            micActive
              ? "bg-emerald-700 border-emerald-600 justify-end"
              : "bg-stone-900 border-stone-800 justify-start"
          }`}
          title="Live Microphone Toggle"
        >
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-stone-900 shadow">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </span>
        </button>
      </div>
    </header>
  );
}
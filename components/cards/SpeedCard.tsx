"use client";

import React from "react";
import type { ReadingStats } from "@/lib/types";

interface SpeedCardProps {
  readingStats: ReadingStats;
  readingSeconds: number;
  formatTime: (sec: number) => string;
  unifiedSurfaceClass: string;
  dragHandle: React.ReactNode;
  onStartDrag: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
}

export function SpeedCard({
  readingStats,
  readingSeconds,
  formatTime,
  unifiedSurfaceClass,
  dragHandle,
  onStartDrag,
  style,
}: SpeedCardProps) {
  return (
    <div
      onPointerDown={onStartDrag}
      style={style}
      className={`rounded-2xl p-5 border cursor-grab active:cursor-grabbing transition-shadow ${unifiedSurfaceClass}`}
    >
      <div className="flex items-center justify-between text-xs opacity-60 mb-1 whitespace-nowrap tabular-nums">
        <span>Reading Speed</span>
        <div className="flex items-center gap-1.5">
          <span>Active Time: {formatTime(readingSeconds)}</span>
          {dragHandle}
        </div>
      </div>
      <div className="text-5xl font-serif tracking-tight my-1 tabular-nums">
        {readingStats.wpm}
      </div>
      <div className="text-xs opacity-60 whitespace-nowrap tabular-nums">
        words per minute ({readingStats.cpm} CPM · Row{" "}
        {readingStats.lineProgressPct}%)
      </div>
    </div>
  );
}
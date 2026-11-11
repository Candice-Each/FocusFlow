"use client";

import React from "react";
import type { ChapterDoc } from "@/lib/types";

export interface Bookmark {
  id: number;
  text: string;
  page: number;
  line: number;
}

interface LeftSidebarProps {
  open: boolean;
  chapters: ChapterDoc[];
  chapterIdx: number;
  customTitle: string | null;
  onSelectChapter: (idx: number) => void;
  bookmarks: Bookmark[];
  onSelectBookmark: (bm: Bookmark) => void;
  unifiedSurfaceClass: string;
  isNight: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export function LeftSidebar({
  open,
  chapters,
  chapterIdx,
  customTitle,
  onSelectChapter,
  bookmarks,
  onSelectBookmark,
  unifiedSurfaceClass,
  isNight,
  onPointerEnter,
  onPointerLeave,
}: LeftSidebarProps) {
  return (
    <aside
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`fixed top-4 bottom-4 left-4 w-80 rounded-2xl border z-30 flex flex-col justify-between p-6 transition-transform duration-300 ${unifiedSurfaceClass} ${
        open ? "translate-x-0" : "-translate-x-[120%]"
      }`}
    >
      <div className="overflow-y-auto space-y-6 pr-1">
        <div>
          <h2 className="text-lg font-serif font-medium mb-3">Contents</h2>
          <ul className="space-y-2 text-xs">
            {chapters.map((chap, idx) => (
              <li
                key={idx}
                onClick={() => onSelectChapter(idx)}
                className={`flex items-center gap-2.5 cursor-pointer py-1.5 px-2.5 rounded-lg transition ${
                  chapterIdx === idx && !customTitle
                    ? isNight
                      ? "bg-stone-800 text-white font-semibold"
                      : "bg-stone-200/75 text-stone-950 font-semibold"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                <span className="opacity-50 font-mono">{idx + 1}</span>
                <span className="truncate">{chap.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-dashed border-stone-400/50" />

        <div>
          <h2 className="text-lg font-serif font-medium mb-3">
            Bookmarks ({bookmarks.length})
          </h2>
          <ul className="space-y-2 text-xs">
            {bookmarks.map((bm, i) => (
              <li
                key={`${bm.id}-${i}`}
                onClick={() => onSelectBookmark(bm)}
                className="flex items-center justify-between gap-2 cursor-pointer py-1.5 px-2 rounded-lg opacity-75 hover:opacity-100 hover:bg-stone-500/10 group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="opacity-50 font-mono">{i + 1}</span>
                  <span className="truncate group-hover:font-medium">
                    {bm.text}
                  </span>
                </div>
                <span className="opacity-50 group-hover:opacity-100">‹</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
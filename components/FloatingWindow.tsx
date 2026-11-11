"use client";

import React from "react";
import type { WinState } from "@/lib/types";

interface FloatingWindowProps {
  title: string;
  winState: WinState;
  setWinState: React.Dispatch<React.SetStateAction<WinState>>;
  isNight: boolean;
  minW?: number;
  minH?: number;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function FloatingWindow({
  title,
  winState,
  setWinState,
  isNight,
  minW = 240,
  minH = 160,
  headerExtra,
  children,
}: FloatingWindowProps) {
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX - winState.x;
    const startY = e.clientY - winState.y;
    const onMove = (ev: PointerEvent) => {
      setWinState((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - startX)),
        y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - startY)),
      }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = winState.w;
    const origH = winState.h;
    const onMove = (ev: PointerEvent) => {
      setWinState((prev) => ({
        ...prev,
        w: Math.max(minW, origW + (ev.clientX - startX)),
        h: Math.max(minH, origH + (ev.clientY - startY)),
      }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const shellTheme = isNight
    ? "bg-[#1c1e22]/95 border-stone-700/80 text-stone-100 shadow-2xl"
    : "bg-white/95 border-stone-300/85 text-stone-800 shadow-xl";

  const headerTheme = isNight
    ? "bg-stone-900/90 border-stone-800 text-stone-200"
    : "bg-[#f5f3ef]/90 border-stone-200/90 text-stone-800";

  return (
    <div
      style={
        winState.visible
          ? {
              left: winState.x,
              top: winState.y,
              width: winState.w,
              height: winState.h,
            }
          : {
              left: -9999,
              top: -9999,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }
      }
      className={`fixed z-40 border rounded-2xl flex flex-col overflow-hidden backdrop-blur-md transition-colors ${shellTheme}`}
    >
      <div
        onPointerDown={startDrag}
        className={`h-8 px-3 border-b flex items-center justify-between cursor-move select-none shrink-0 ${headerTheme}`}
      >
        <span className="text-xs font-serif font-medium truncate">{title}</span>
        <div
          className="flex items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {headerExtra}
          <button
            type="button"
            onClick={() => setWinState((p) => ({ ...p, visible: false }))}
            className="text-stone-400 hover:text-rose-500 px-1 text-xs transition"
            title="Close Window"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 overflow-hidden p-1.5">
        {children}
      </div>

      <div
        onPointerDown={startResize}
        className="w-4 h-4 absolute right-0.5 bottom-0.5 cursor-nwse-resize z-20 flex items-end justify-end p-0.5 text-stone-400 hover:text-stone-700"
        title="Resize Window"
      >
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
          <path d="M9 1v8H1L9 1z" />
        </svg>
      </div>
    </div>
  );
}
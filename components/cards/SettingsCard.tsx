"use client";

import React from "react";
import type { BgTheme, FontFamily, TextColor } from "@/lib/theme";
import { ToggleSwitch } from "../ToggleSwitch";

interface SettingsCardProps {
  fontFamily: FontFamily;
  setFontFamily: React.Dispatch<React.SetStateAction<FontFamily>>;
  bgTheme: BgTheme;
  setBgTheme: React.Dispatch<React.SetStateAction<BgTheme>>;
  textColor: TextColor;
  setTextColor: React.Dispatch<React.SetStateAction<TextColor>>;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  readingWidthPct: number;
  setReadingWidthPct: React.Dispatch<React.SetStateAction<number>>;
  lineSpacingRatio: number;
  setLineSpacingRatio: React.Dispatch<React.SetStateAction<number>>;
  showRowMeta: boolean;
  setShowRowMeta: React.Dispatch<React.SetStateAction<boolean>>;
  menuShowBookmark: boolean;
  setMenuShowBookmark: React.Dispatch<React.SetStateAction<boolean>>;
  menuShowHighlight: boolean;
  setMenuShowHighlight: React.Dispatch<React.SetStateAction<boolean>>;
  menuShowNotes: boolean;
  setMenuShowNotes: React.Dispatch<React.SetStateAction<boolean>>;
  showBottomLeftBar: boolean;
  setShowBottomLeftBar: React.Dispatch<React.SetStateAction<boolean>>;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
  dragHandle: React.ReactNode;
  onStartDrag: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
}

export function SettingsCard(props: SettingsCardProps) {
  const {
    fontFamily,
    setFontFamily,
    bgTheme,
    setBgTheme,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    readingWidthPct,
    setReadingWidthPct,
    lineSpacingRatio,
    setLineSpacingRatio,
    showRowMeta,
    setShowRowMeta,
    menuShowBookmark,
    setMenuShowBookmark,
    menuShowHighlight,
    setMenuShowHighlight,
    menuShowNotes,
    setMenuShowNotes,
    showBottomLeftBar,
    setShowBottomLeftBar,
    unifiedSurfaceClass,
    unifiedSubtleBoxClass,
    dragHandle,
    onStartDrag,
    style,
  } = props;

  return (
    <div
      onPointerDown={onStartDrag}
      style={style}
      className={`rounded-2xl p-5 border space-y-3.5 cursor-grab active:cursor-grabbing transition-shadow ${unifiedSurfaceClass}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] opacity-55">Reading</div>
          <h3 className="text-xl font-serif font-medium">Settings</h3>
        </div>
        {dragHandle}
      </div>

      <div>
        <div className="text-[11px] opacity-55 mb-1.5">Font Family</div>
        <div className="flex items-center gap-2">
          {(["Georgia", "Inter", "Literata"] as const).map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFontFamily(f)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                fontFamily === f
                  ? "bg-stone-900 text-white border-stone-900 font-medium"
                  : "border-stone-300/80 opacity-75 hover:opacity-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] opacity-55 mb-1.5">Background</div>
        <div className="flex items-center gap-3 text-xs">
          {[
            { name: "Paper" as const, dot: "bg-[#e3dfd7]" },
            { name: "White" as const, dot: "bg-white" },
            { name: "Night" as const, dot: "bg-stone-900" },
          ].map((b) => (
            <button
              type="button"
              key={b.name}
              onClick={() => setBgTheme(b.name)}
              className="flex items-center gap-1.5"
            >
              <span
                className={`w-4 h-4 rounded-full border ${b.dot} ${
                  bgTheme === b.name
                    ? "ring-2 ring-stone-900 ring-offset-1"
                    : "border-stone-400"
                }`}
              />
              <span>{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] opacity-55 mb-1.5">Text Color</div>
        <div className="flex items-center gap-3 text-xs">
          {[
            { name: "Black" as const, dot: "bg-stone-950" },
            { name: "Gray" as const, dot: "bg-stone-500" },
            { name: "Soft" as const, dot: "bg-[#6e3b37]" },
          ].map((c) => (
            <button
              type="button"
              key={c.name}
              onClick={() => setTextColor(c.name)}
              className="flex items-center gap-1.5"
            >
              <span
                className={`w-4 h-4 rounded-full ${c.dot} ${
                  textColor === c.name
                    ? "ring-2 ring-stone-900 ring-offset-1"
                    : ""
                }`}
              />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1 tabular-nums whitespace-nowrap">
          <span className="opacity-60">Text Size (px)</span>
          <span className="font-semibold">{fontSize}</span>
        </div>
        <input
          type="range"
          min={12}
          max={22}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-stone-900 h-1 bg-stone-300 rounded-lg cursor-pointer"
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1 tabular-nums whitespace-nowrap">
          <span className="opacity-60">Reading Width (%)</span>
          <span className="font-semibold">{readingWidthPct}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={92}
          step={2}
          value={readingWidthPct}
          onChange={(e) => setReadingWidthPct(Number(e.target.value))}
          className="w-full accent-stone-900 h-1 bg-stone-300 rounded-lg cursor-pointer"
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1 tabular-nums whitespace-nowrap">
          <span className="opacity-60">Line Spacing</span>
          <span className="font-semibold">
            {lineSpacingRatio.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min={1.8}
          max={2.9}
          step={0.05}
          value={lineSpacingRatio}
          onChange={(e) => setLineSpacingRatio(Number(e.target.value))}
          className="w-full accent-stone-900 h-1 bg-stone-300 rounded-lg cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between text-xs pt-0.5 whitespace-nowrap">
        <span>Row Stats Badge</span>
        <ToggleSwitch
          checked={showRowMeta}
          onChange={() => setShowRowMeta((v) => !v)}
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-stone-300/40">
        <div className="text-[11px] opacity-55 whitespace-nowrap">
          Mouth Menu Items & Bottom-Left Bar
        </div>

        {[
          {
            label: "Bookmark in Mouth Menu",
            val: menuShowBookmark,
            set: setMenuShowBookmark,
          },
          {
            label: "Highlight in Mouth Menu",
            val: menuShowHighlight,
            set: setMenuShowHighlight,
          },
          {
            label: "Notes in Mouth Menu",
            val: menuShowNotes,
            set: setMenuShowNotes,
          },
          {
            label: "Bottom-Left Difficulty Bar",
            val: showBottomLeftBar,
            set: setShowBottomLeftBar,
          },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => item.set((v) => !v)}
            className={`w-full px-3.5 py-2 rounded-2xl border flex items-center justify-between text-xs cursor-pointer transition whitespace-nowrap ${unifiedSubtleBoxClass}`}
          >
            <span className="font-medium pr-2">{item.label}</span>
            <ToggleSwitch
              checked={item.val}
              onChange={() => item.set((v) => !v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
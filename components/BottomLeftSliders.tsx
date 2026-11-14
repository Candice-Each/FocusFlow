"use client";

import React from "react";

interface BottomLeftSlidersProps {
  visible: boolean;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  nextLineSlider: number;
  setNextLineSlider: React.Dispatch<React.SetStateAction<number>>;
  prevLineSlider: number;
  setPrevLineSlider: React.Dispatch<React.SetStateAction<number>>;
  skipLinesSlider: number;
  setSkipLinesSlider: React.Dispatch<React.SetStateAction<number>>;
  isNight: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onSliderPointerDown: () => void;
}

export function BottomLeftSliders({
  visible,
  expanded,
  setExpanded,
  nextLineSlider,
  setNextLineSlider,
  prevLineSlider,
  setPrevLineSlider,
  skipLinesSlider,
  setSkipLinesSlider,
  isNight,
  onPointerEnter,
  onPointerLeave,
  onSliderPointerDown,
}: BottomLeftSlidersProps) {
  if (!visible) return null;

  const items = expanded
    ? [
        { label: "Next", val: nextLineSlider, min: 15, max: 95, set: setNextLineSlider },
        { label: "Prev", val: prevLineSlider, min: 5, max: 90, set: setPrevLineSlider },
        { label: "Skip", val: skipLinesSlider, min: 5, max: 90, set: setSkipLinesSlider },
      ]
    : [{ label: "Next", val: nextLineSlider, min: 15, max: 95, set: setNextLineSlider }];

  return (
    <div
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`fixed left-6 bottom-4 z-20 flex flex-col items-center transition-all duration-200 ${
        expanded
          ? isNight
            ? "px-4 py-3 rounded-2xl bg-stone-900/45 backdrop-blur-md"
            : "px-4 py-3 rounded-2xl bg-white/40 backdrop-blur-md"
          : "p-1 bg-transparent"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="bg-transparent border-0 p-1 mb-1.5 text-xs opacity-55 hover:opacity-100 transition leading-none"
        title={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? "<" : ">"}
      </button>

      <div className="flex items-center gap-4">
        {items.map((sl) => (
          <div key={sl.label} className="flex flex-col items-center gap-1.5">
            {expanded && (
              <span className="text-[11px] font-mono tabular-nums opacity-70 leading-none">
                {sl.val}
              </span>
            )}
            <div className="w-5 h-24 flex items-center justify-center">
              <input
                type="range"
                min={sl.min}
                max={sl.max}
                value={sl.val}
                onPointerDown={onSliderPointerDown}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (sl.label === "Next") {
                    setNextLineSlider(val);
                    setPrevLineSlider((p) => Math.min(p, val));
                    setSkipLinesSlider((s) => Math.min(s, val));
                  } else {
                    sl.set(Math.min(val, nextLineSlider));
                  }
                }}
                title={`${sl.label} Line Sensitivity: ${sl.val}`}
                className="w-24 h-1 -rotate-90 accent-stone-700/70 bg-stone-400/25 rounded-lg cursor-pointer opacity-65 hover:opacity-100 transition-opacity shrink-0"
              />
            </div>
            {expanded && (
              <span className="text-[10px] font-medium tracking-wide opacity-60 leading-none">
                {sl.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
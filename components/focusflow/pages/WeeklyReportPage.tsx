"use client";

import React from "react";

const SPEED_SESSIONS = [142, 156, 151, 168, 174, 179, 186];

export function WeeklyReportPage() {
  return (
    <div className="max-w-5xl mx-auto px-10 py-8 select-none">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 mb-1">
        REPORT
      </div>
      <h1 className="font-serif text-4xl text-stone-900 mb-2">This week</h1>
      <p className="text-xs text-stone-500 max-w-xl leading-relaxed mb-8">
        Ergonomic counts come from posture prompts. Gesture counts come from the recognition badge.
        They describe your habit only; they are not a medical result.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-stone-900 mb-5">Ergonomics</h3>
          <div className="space-y-4 my-auto">
            {[
              { label: "Forward", range: "9 - 14%", pct: 28 },
              { label: "Tilt", range: "4 - 6%", pct: 14 },
              { label: "Too close", range: "6 - 9%", pct: 20 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4 text-xs">
                <span className="w-20 text-stone-600">{row.label}</span>
                <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div style={{ width: `${row.pct}%` }} className="h-full bg-stone-900 rounded-full" />
                </div>
                <span className="w-16 text-right font-mono text-[11px] text-stone-500 tabular-nums">
                  {row.range}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">Reading speed</h3>
            <div className="font-serif text-4xl text-stone-900 my-1 tabular-nums">186</div>
            <p className="text-[11px] text-stone-500 mb-4">
              Words per minute over the last seven reading sessions
            </p>
          </div>
          <div className="h-24 flex items-end gap-2.5 pt-2">
            {SPEED_SESSIONS.map((wpm, i) => {
              const isLatest = i === SPEED_SESSIONS.length - 1;
              const heightPct = Math.round((wpm / 200) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    title={`Session ${i + 1}: ${wpm} WPM`}
                    className={`w-full rounded-sm transition-all ${
                      isLatest ? "bg-stone-900" : "bg-[#e7e5e4] hover:bg-stone-300"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">Gesture and keys</h3>
            <div className="font-serif text-4xl text-stone-900 my-1 tabular-nums">17%</div>
            <p className="text-[11px] text-stone-500 mb-5">
              Share of input events that came from gestures
            </p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Gesture", count: 38, pct: 26 },
              { label: "Mouse", count: 142, pct: 74 },
              { label: "Keys", count: 43, pct: 30 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4 text-xs">
                <span className="w-16 text-stone-600">{row.label}</span>
                <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div style={{ width: `${row.pct}%` }} className="h-full bg-stone-900 rounded-full" />
                </div>
                <span className="w-8 text-right font-mono text-[11px] text-stone-500 tabular-nums">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-5">Skips and returns</h3>
            <div className="space-y-4">
              {[
                { label: "Skips", count: 12, pct: 58 },
                { label: "Returns", count: 8, pct: 38 },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-4 text-xs">
                  <span className="w-16 text-stone-600">{row.label}</span>
                  <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div style={{ width: `${row.pct}%` }} className="h-full bg-stone-900 rounded-full" />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] text-stone-500 tabular-nums">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-stone-500 mt-6">
            A return is part of careful reading and is not treated as an error.
          </p>
        </div>
      </div>
    </div>
  );
}
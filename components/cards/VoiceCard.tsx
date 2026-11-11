"use client";

import React from "react";
import { ToggleSwitch } from "../ToggleSwitch";

interface VoiceCardProps {
  voiceError: boolean;
  toggleMicrophone: () => void;
  micActive: boolean;
  voiceMode: "Read" | "Notes";
  setVoiceMode: React.Dispatch<React.SetStateAction<"Read" | "Notes">>;
  voiceLog: string;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
  dragHandle: React.ReactNode;
  onStartDrag: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
}

export function VoiceCard(props: VoiceCardProps) {
  const {
    voiceError,
    toggleMicrophone,
    micActive,
    voiceMode,
    setVoiceMode,
    voiceLog,
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
      className={`rounded-2xl p-5 border space-y-3 cursor-grab active:cursor-grabbing transition-shadow ${unifiedSurfaceClass}`}
    >
      <div className="flex items-center justify-between whitespace-nowrap">
        <h3 className="text-base font-serif font-medium">Voice</h3>
        <div className="flex items-center gap-2">
          {voiceError && (
            <button
              type="button"
              onClick={toggleMicrophone}
              className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-400/30 hover:bg-rose-500/25"
            >
              Failed · Retry
            </button>
          )}
          <ToggleSwitch
            checked={micActive}
            onChange={toggleMicrophone}
            title="Microphone Toggle"
          />
          {dragHandle}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["Read", "Notes"] as const).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setVoiceMode(m)}
            className={`px-3.5 py-1 rounded-full text-xs border transition whitespace-nowrap ${
              voiceMode === m
                ? "bg-stone-900 text-white border-stone-900 font-medium"
                : "border-stone-300/80 opacity-75"
            }`}
          >
            {m === "Read" ? "Read Mode" : "Notes Mode"}
          </button>
        ))}
      </div>

      <div
        className={`text-xs px-3 py-2 rounded-xl border font-mono truncate ${unifiedSubtleBoxClass}`}
      >
        {voiceLog}
      </div>
    </div>
  );
}
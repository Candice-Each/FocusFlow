"use client";

import React from "react";
import { ToggleSwitch } from "../ToggleSwitch";

interface GestureCardProps {
  gestureControl: boolean;
  setGestureControl: React.Dispatch<React.SetStateAction<boolean>>;
  showReticle: boolean;
  setShowReticle: React.Dispatch<React.SetStateAction<boolean>>;
  bgBlur: boolean;
  setBgBlur: React.Dispatch<React.SetStateAction<boolean>>;
  clauseMenuOpen: boolean;
  gestureBadgeText: string;
  mouthScore: number;
  unifiedSurfaceClass: string;
  dragHandle: React.ReactNode;
  onStartDrag: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
}

export function GestureCard(props: GestureCardProps) {
  const {
    gestureControl,
    setGestureControl,
    showReticle,
    setShowReticle,
    bgBlur,
    setBgBlur,
    clauseMenuOpen,
    gestureBadgeText,
    mouthScore,
    unifiedSurfaceClass,
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
      <div className="flex items-center justify-between whitespace-nowrap tabular-nums">
        <h3 className="text-base font-serif font-medium">Gesture</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
              !gestureControl
                ? "bg-stone-500/15 text-stone-500 border-stone-400/30"
                : clauseMenuOpen
                ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                : "bg-stone-500/10 text-stone-700 border-stone-300/60"
            }`}
          >
            {!gestureControl
              ? "Disabled"
              : `${gestureBadgeText} · Jaw ${mouthScore}%`}
          </span>
          {dragHandle}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Explicit Gesture Control</span>
        <ToggleSwitch
          checked={gestureControl}
          onChange={() => setGestureControl((v) => !v)}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Spatial Visual Reticle</span>
        <ToggleSwitch
          checked={showReticle}
          onChange={() => setShowReticle((v) => !v)}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Gestalt Background Blur</span>
        <ToggleSwitch checked={bgBlur} onChange={() => setBgBlur((v) => !v)} />
      </div>
    </div>
  );
}
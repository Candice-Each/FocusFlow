"use client";

import React from "react";
import { CALIBRATION_POINTS } from "@/lib/constants";

interface CalibrationOverlayProps {
  isCalibrating: boolean;
  calibStep: number;
  calibSampleProgress: number;
  onPointClick: (px: number, py: number) => void;
  onExit: () => void;
}

export function CalibrationOverlay({
  isCalibrating,
  calibStep,
  calibSampleProgress,
  onPointClick,
  onExit,
}: CalibrationOverlayProps) {
  if (!isCalibrating) return null;

  const winW = typeof window !== "undefined" ? window.innerWidth : 0;
  const winH = typeof window !== "undefined" ? window.innerHeight : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 text-slate-100 flex flex-col items-center justify-center">
      <p className="text-slate-300 text-lg mb-2">
        Keep a natural reading posture — <strong>look at and click</strong> the
        glowing target ({calibStep + 1} / 9)
      </p>
      <p className="text-slate-500 text-sm mb-4">
        Hold your gaze steady on the target for ~0.5s after clicking (
        {calibSampleProgress}%)
      </p>
      <button
        type="button"
        onClick={onExit}
        className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
      >
        Exit Calibration
      </button>
      {CALIBRATION_POINTS.map(([rx, ry], idx) => {
        if (idx !== calibStep) return null;
        const px = Math.round(rx * winW);
        const py = Math.round(ry * winH);
        return (
          <button
            type="button"
            key={idx}
            onClick={() => onPointClick(px, py)}
            style={{ left: `${rx * 100}%`, top: `${ry * 100}%` }}
            className="fixed -ml-6 -mt-6 w-12 h-12 rounded-full bg-indigo-500/30 border-2 border-indigo-400 flex items-center justify-center animate-pulse cursor-crosshair"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />
          </button>
        );
      })}
    </div>
  );
}
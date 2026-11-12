"use client";

import React, { useEffect, useState } from "react";
import { CALIBRATION_POINTS } from "@/lib/constants";
import { playSubtleEarcon } from "@/lib/focusflow/earcon";

interface NinePointGazeOverlayProps {
  open: boolean;
  onComplete: () => void;
  onExit: () => void;
}

export function NinePointGazeOverlay({ open, onComplete, onExit }: NinePointGazeOverlayProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setProgress(0);
    }
  }, [open]);

  if (!open) return null;

  const handleClick = () => {
    if (progress > 0) return;
    playSubtleEarcon(520 + step * 35, 120);
    let p = 0;
    const timer = setInterval(() => {
      p += 10;
      if (p >= 100) {
        clearInterval(timer);
        setProgress(0);
        if (step < CALIBRATION_POINTS.length - 1) {
          setStep((s) => s + 1);
        } else {
          setStep(0);
          onComplete();
        }
      } else {
        setProgress(p);
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 text-slate-100 flex flex-col items-center justify-center">
      <p className="text-slate-300 text-lg mb-2">
        Keep a natural reading posture — <strong>look at and click</strong> the
        glowing target ({step + 1} / 9)
      </p>
      <p className="text-slate-500 text-sm mb-4">
        Hold your gaze steady on the target after clicking ({progress}%)
      </p>
      <button
        type="button"
        onClick={onExit}
        className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
      >
        Exit Calibration
      </button>
      {CALIBRATION_POINTS.map(([rx, ry], idx) => {
        if (idx !== step) return null;
        const scale = 1 + (progress / 100) * 0.35;
        return (
          <button
            type="button"
            key={idx}
            onClick={handleClick}
            style={{
              left: `${rx * 100}%`,
              top: `${ry * 100}%`,
              transform: `scale(${scale})`,
            }}
            className="fixed -ml-6 -mt-6 w-12 h-12 rounded-full bg-indigo-500/30 border-2 border-indigo-400 flex items-center justify-center animate-pulse cursor-crosshair transition-transform"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />
          </button>
        );
      })}
    </div>
  );
}
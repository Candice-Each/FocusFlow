"use client";

import React from "react";
import type { WinState } from "@/lib/types";
import { FloatingWindow } from "./FloatingWindow";

interface MonitorWindowsProps {
  winVideo: WinState;
  setWinVideo: React.Dispatch<React.SetStateAction<WinState>>;
  winMesh: WinState;
  setWinMesh: React.Dispatch<React.SetStateAction<WinState>>;
  winHeatmap: WinState;
  setWinHeatmap: React.Dispatch<React.SetStateAction<WinState>>;
  isNight: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  meshCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  miniHeatmapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraStatus: string;
  fps: number;
  mouthScore: number;
  noCameraMode: boolean;
  meshShowVideoBg: boolean;
  setMeshShowVideoBg: React.Dispatch<React.SetStateAction<boolean>>;
  isCalibrated: boolean;
  showPageHeatmap: boolean;
  setShowPageHeatmap: React.Dispatch<React.SetStateAction<boolean>>;
  heatmapDecayMode: boolean;
  setHeatmapDecayMode: React.Dispatch<React.SetStateAction<boolean>>;
  heatmapUseRawY: boolean;
  setHeatmapUseRawY: React.Dispatch<React.SetStateAction<boolean>>;
  onClearHeatmap: () => void;
  unifiedSubtleBoxClass: string;
}

export function MonitorWindows({
  winVideo,
  setWinVideo,
  winMesh,
  setWinMesh,
  winHeatmap,
  setWinHeatmap,
  isNight,
  videoRef,
  meshCanvasRef,
  miniHeatmapCanvasRef,
  cameraStatus,
  fps,
  mouthScore,
  noCameraMode,
  meshShowVideoBg,
  setMeshShowVideoBg,
  isCalibrated,
  showPageHeatmap,
  setShowPageHeatmap,
  heatmapDecayMode,
  setHeatmapDecayMode,
  heatmapUseRawY,
  setHeatmapUseRawY,
  onClearHeatmap,
  unifiedSubtleBoxClass,
}: MonitorWindowsProps) {
  return (
    <>
      <FloatingWindow
        title="1. Camera Live"
        winState={winVideo}
        setWinState={setWinVideo}
        isNight={isNight}
      >
        <div
          className={`relative w-full h-full rounded-xl overflow-hidden border ${
            isNight
              ? "border-stone-700/80 bg-stone-950"
              : "border-stone-300/80 bg-stone-200/60"
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
          {noCameraMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs opacity-75">
              <span>No-Camera Mode Active</span>
              <span className="text-[10px] mt-1">
                Re-enable camera in the Sensing panel
              </span>
            </div>
          )}
          <div
            className={`absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg border backdrop-blur-md flex items-center justify-between text-[11px] font-mono tabular-nums ${unifiedSubtleBoxClass}`}
          >
            <span>
              {cameraStatus === "Active" ? `Live · ${fps} FPS` : cameraStatus}
            </span>
            <span>Jaw {mouthScore}%</span>
          </div>
        </div>
      </FloatingWindow>

      <FloatingWindow
        title="2. Face & Eye Topology"
        winState={winMesh}
        setWinState={setWinMesh}
        isNight={isNight}
        headerExtra={
          <button
            type="button"
            onClick={() => setMeshShowVideoBg((v) => !v)}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition ${unifiedSubtleBoxClass}`}
          >
            {meshShowVideoBg ? "Grid Bg" : "Video Bg"}
          </button>
        }
      >
        <div
          className={`w-full h-full rounded-xl overflow-hidden border ${
            isNight ? "border-stone-700/80" : "border-stone-300/80"
          }`}
        >
          <canvas
            ref={meshCanvasRef}
            width={320}
            height={240}
            className="w-full h-full block object-contain"
          />
        </div>
      </FloatingWindow>

      <FloatingWindow
        title="3. Gaze Heatmap Monitor"
        winState={winHeatmap}
        setWinState={setWinHeatmap}
        isNight={isNight}
        headerExtra={
          <button
            type="button"
            onClick={onClearHeatmap}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition hover:border-rose-400 ${unifiedSubtleBoxClass}`}
          >
            Clear
          </button>
        }
      >
        <div
          className={`w-full h-full rounded-xl overflow-hidden border flex flex-col ${
            isNight
              ? "border-stone-700/80 bg-[#181a1e]"
              : "border-stone-300/80 bg-[#f5f3ef]"
          }`}
        >
          <div className="flex-1 relative min-h-0">
            <canvas
              ref={miniHeatmapCanvasRef}
              width={280}
              height={160}
              className="w-full h-full block"
            />
            {!isCalibrated && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs opacity-65">
                Complete 9-point calibration to visualize real-time gaze heatmap
              </div>
            )}
          </div>
          <div
            className={`h-8 px-2.5 border-t flex items-center justify-between text-[11px] shrink-0 ${unifiedSubtleBoxClass}`}
          >
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPageHeatmap}
                onChange={(e) => setShowPageHeatmap(e.target.checked)}
                className="accent-stone-900"
              />
              <span>Overlay</span>
            </label>
            <button
              type="button"
              onClick={() => setHeatmapDecayMode((m) => !m)}
              className="px-2 py-0.5 rounded border border-stone-300/60 text-[10px]"
            >
              {heatmapDecayMode ? "Decay" : "Accumulate"}
            </button>
            <button
              type="button"
              onClick={() => setHeatmapUseRawY((r) => !r)}
              className="px-2 py-0.5 rounded border border-stone-300/60 text-[10px]"
            >
              {heatmapUseRawY ? "Raw Y" : "Snapped Y"}
            </button>
          </div>
        </div>
      </FloatingWindow>
    </>
  );
}
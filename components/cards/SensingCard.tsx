"use client";

import React from "react";
import type {
  CameraStatus,
  FaceBaseline,
  TrackingQuality,
  WinState,
} from "@/lib/types";
import { ToggleSwitch } from "../ToggleSwitch";

interface SensingCardProps {
  trackingQuality: TrackingQuality;
  cameraStatus: CameraStatus;
  fps: number;
  continuousFaceState: string;
  multimodalTriggerState: string;
  faceBaseline: FaceBaseline | null;
  showGazeCursor: boolean;
  setShowGazeCursor: React.Dispatch<React.SetStateAction<boolean>>;
  winVideo: WinState;
  setWinVideo: React.Dispatch<React.SetStateAction<WinState>>;
  winMesh: WinState;
  setWinMesh: React.Dispatch<React.SetStateAction<WinState>>;
  showPageHeatmap: boolean;
  setShowPageHeatmap: React.Dispatch<React.SetStateAction<boolean>>;
  setWinHeatmap: React.Dispatch<React.SetStateAction<WinState>>;
  faceAssist: boolean;
  setFaceAssist: React.Dispatch<React.SetStateAction<boolean>>;
  noCameraMode: boolean;
  setNoCameraMode: React.Dispatch<React.SetStateAction<boolean>>;
  modelReady: boolean;
  startCalibration: () => void;
  isCalibrated: boolean;
  calibratePersonalFaceBaseline: () => void;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
  dragHandle: React.ReactNode;
  onStartDrag: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
}

export function SensingCard(props: SensingCardProps) {
  const {
    trackingQuality,
    cameraStatus,
    fps,
    continuousFaceState,
    multimodalTriggerState,
    faceBaseline,
    showGazeCursor,
    setShowGazeCursor,
    winVideo,
    setWinVideo,
    winMesh,
    setWinMesh,
    showPageHeatmap,
    setShowPageHeatmap,
    setWinHeatmap,
    faceAssist,
    setFaceAssist,
    noCameraMode,
    setNoCameraMode,
    modelReady,
    startCalibration,
    isCalibrated,
    calibratePersonalFaceBaseline,
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
      className={`rounded-2xl p-5 border space-y-2.5 cursor-grab active:cursor-grabbing transition-shadow ${unifiedSurfaceClass}`}
    >
      <div className="flex items-center justify-between whitespace-nowrap">
        <h3 className="text-base font-serif font-medium">Sensing & Face</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
              trackingQuality === "Good"
                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                : trackingQuality === "Limited"
                ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                : "bg-stone-500/15 text-stone-500 border-stone-400/30"
            }`}
          >
            Quality: {trackingQuality}
          </span>
          {dragHandle}
        </div>
      </div>

      <div
        className={`text-[11px] rounded-xl p-2.5 border space-y-1 tabular-nums ${unifiedSubtleBoxClass}`}
      >
        <div className="flex justify-between whitespace-nowrap">
          <span className="opacity-75">Camera Status:</span>
          <span className="font-medium">
            {cameraStatus === "Active" ? `Active (${fps} FPS)` : cameraStatus}
          </span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span className="opacity-75">Face Dynamics:</span>
          <span className="font-medium">{continuousFaceState}</span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span className="opacity-75">Multimodal State:</span>
          <span className="font-medium">{multimodalTriggerState}</span>
        </div>
        {faceBaseline && (
          <div className="flex justify-between text-[10px] opacity-65 pt-0.5 border-t border-stone-300/40 whitespace-nowrap">
            <span>Personal Baseline:</span>
            <span>
              Y{faceBaseline.yaw}° / P{faceBaseline.pitch}° / R
              {faceBaseline.roll}°
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span className="font-medium">Gaze Cursor</span>
        <ToggleSwitch
          checked={showGazeCursor}
          onChange={() => setShowGazeCursor((v) => !v)}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Camera Live Window</span>
        <ToggleSwitch
          checked={winVideo.visible}
          onChange={() => setWinVideo((p) => ({ ...p, visible: !p.visible }))}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Topology Mesh Window</span>
        <ToggleSwitch
          checked={winMesh.visible}
          onChange={() => setWinMesh((p) => ({ ...p, visible: !p.visible }))}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Gaze Heatmap Overlay</span>
        <ToggleSwitch
          checked={showPageHeatmap}
          onChange={() => {
            const next = !showPageHeatmap;
            setShowPageHeatmap(next);
            setWinHeatmap((p) => ({ ...p, visible: next }));
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>Face Drift Assist</span>
        <ToggleSwitch
          checked={faceAssist}
          onChange={() => setFaceAssist((v) => !v)}
        />
      </div>

      <div className="flex items-center justify-between text-xs whitespace-nowrap">
        <span>No-Camera Reading Mode</span>
        <ToggleSwitch
          checked={noCameraMode}
          onChange={() => setNoCameraMode((v) => !v)}
        />
      </div>

      <div className="pt-2 border-t border-stone-300/40 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!modelReady || noCameraMode}
          onClick={startCalibration}
          className="py-1.5 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-medium transition whitespace-nowrap"
        >
          {isCalibrated ? "Recalibrate 9-Pt" : "9-Pt Calibration"}
        </button>
        <button
          type="button"
          disabled={!modelReady || noCameraMode}
          onClick={calibratePersonalFaceBaseline}
          className={`py-1.5 px-2 rounded-xl border text-xs font-medium disabled:opacity-40 transition whitespace-nowrap ${unifiedSubtleBoxClass}`}
        >
          Face Baseline
        </button>
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { HardwareCalibrationState } from "@/lib/focusflow/types";
import { DEFAULT_HARDWARE_STATE } from "@/lib/focusflow/types";
import { readHardwareState, writeHardwareState } from "@/lib/focusflow/store";
import { playSubtleEarcon } from "@/lib/focusflow/earcon";
import { NinePointGazeOverlay } from "./NinePointGazeOverlay";

export function EnvironmentHardwarePage() {
  const [hardwareState, setHardwareState] = useState<HardwareCalibrationState>(DEFAULT_HARDWARE_STATE);
  const [hydrated, setHydrated] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraStatusMsg, setCameraStatusMsg] = useState(
    "Not opened yet — open to test the camera"
  );

  const [completedGazePoints, setCompletedGazePoints] = useState<Set<number>>(new Set());
  const [calibOverlayOpen, setCalibOverlayOpen] = useState(false);

  const [recordingPosture, setRecordingPosture] = useState(false);
  const [postureProgress, setPostureProgress] = useState(0);

  const [micListening, setMicListening] = useState(false);
  const [micPromptText, setMicPromptText] = useState("Say a short command below.");
  const [micResultStatus, setMicResultStatus] = useState("No result yet");

  useEffect(() => {
    const saved = readHardwareState();
    setHardwareState(saved);
    if (saved.gazeCalibrated) {
      setCompletedGazePoints(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    }
    if (saved.postureRecorded) setPostureProgress(100);
    if (saved.lastRecognisedText) {
      setMicResultStatus(`Recognised: "${saved.lastRecognisedText}"`);
    }
    setCameraStatusMsg(
      saved.cameraTested
        ? "Last test passed (camera is currently closed)"
        : "Not opened yet — open to test the camera"
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeHardwareState(hardwareState);
  }, [hardwareState, hydrated]);

  useEffect(() => {
    return () => {
      if (videoPreviewRef.current?.srcObject) {
        (videoPreviewRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleToggleCameraTest = async () => {
    if (cameraStreamActive) {
      if (videoPreviewRef.current?.srcObject) {
        (videoPreviewRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoPreviewRef.current.srcObject = null;
      }
      setCameraStreamActive(false);
      setCameraStatusMsg("Camera closed (processed locally)");
      return;
    }
    try {
      setCameraStatusMsg("Requesting browser camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 320 },
      });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play();
      }
      setCameraStreamActive(true);
      setCameraStatusMsg("Camera ready · Local preview active (never stored)");
      setHardwareState((prev) => ({ ...prev, cameraTested: true }));
    } catch {
      setCameraStatusMsg("Camera unavailable or permission denied — adjust and retry");
    }
  };

  const handleRecordPostureBaseline = () => {
    if (recordingPosture) return;
    setRecordingPosture(true);
    setPostureProgress(10);
    let step = 10;
    const timer = setInterval(() => {
      step += 15;
      if (step >= 100) {
        clearInterval(timer);
        setPostureProgress(100);
        setRecordingPosture(false);
        playSubtleEarcon(587.33, 180);
        setHardwareState((prev) => ({
          ...prev,
          postureRecorded: true,
          postureBaselineText: "Baseline recorded (Neutral upright)",
        }));
      } else {
        setPostureProgress(step);
      }
    }, 280);
  };

  const handleRunMicTest = (simulatedPhrase?: string) => {
    if (simulatedPhrase) {
      setMicPromptText(simulatedPhrase);
      setMicResultStatus(`Recognised: "${simulatedPhrase}"`);
      playSubtleEarcon(659.25, 140);
      setHardwareState((prev) => ({
        ...prev,
        micTested: true,
        lastRecognisedText: simulatedPhrase,
      }));
      return;
    }
    const SpeechRec =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
            .SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
        : null;
    if (!SpeechRec) {
      const fallback = "Next chapter";
      setMicPromptText(fallback);
      setMicResultStatus(`Recognised (Simulated): "${fallback}"`);
      setHardwareState((prev) => ({ ...prev, micTested: true, lastRecognisedText: fallback }));
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new (SpeechRec as any)();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;
      setMicListening(true);
      setMicResultStatus("Listening...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (ev: any) => {
        const transcript = String(ev.results?.[0]?.[0]?.transcript || "").trim();
        setMicListening(false);
        if (transcript) {
          setMicPromptText(transcript);
          setMicResultStatus(`Recognised: "${transcript}"`);
          playSubtleEarcon(659.25, 140);
          setHardwareState((prev) => ({
            ...prev,
            micTested: true,
            lastRecognisedText: transcript,
          }));
        } else {
          setMicResultStatus("Recognition failed — tap Recognise to retry");
        }
      };
      rec.onerror = () => {
        setMicListening(false);
        setMicResultStatus("Recognition failed — tap Recognise to retry");
      };
      rec.onend = () => setMicListening(false);
      rec.start();
    } catch {
      setMicListening(false);
      setMicResultStatus("Recognition failed — tap Recognise to retry");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-10 py-7 select-none">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 mb-1">
        LAB
      </div>
      <h1 className="font-serif text-4xl text-stone-900 mb-1.5">
        Environment and hardware
      </h1>
      <p className="text-xs text-stone-500 max-w-xl leading-relaxed mb-6">
        Calibrate once here. Everything stays inside the browser, and the reading page stays clean.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera test */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Camera test</h3>
            <div className="w-full h-28 rounded-xl bg-[#ebe6de] border border-stone-200/70 overflow-hidden relative flex items-center justify-center mb-3">
              <video
                ref={videoPreviewRef}
                playsInline
                muted
                className={`w-full h-full object-cover -scale-x-100 ${
                  cameraStreamActive ? "block" : "hidden"
                }`}
              />
              {!cameraStreamActive && (
                <span className="text-[11px] text-stone-500">
                  Local camera preview (frames are never stored)
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-500 mb-4">{cameraStatusMsg}</div>
          </div>
          <button
            type="button"
            onClick={handleToggleCameraTest}
            className="self-start px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition"
          >
            {cameraStreamActive ? "Close camera" : "Open camera"}
          </button>
        </div>

        {/* Nine-point gaze */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">Nine-point gaze</h3>
            <div className="text-[11px] text-stone-500 mb-3">
              {completedGazePoints.size >= 9
                ? "All 9 points calibrated"
                : completedGazePoints.size > 0
                ? `${completedGazePoints.size} / 9 points done`
                : "Not started"}
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-[180px] my-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pt) => {
                const isDone = completedGazePoints.has(pt);
                return (
                  <div
                    key={pt}
                    className={`w-10 h-10 rounded-full text-xs font-mono flex items-center justify-center transition ${
                      isDone
                        ? "bg-stone-800 text-white"
                        : "bg-stone-100 text-stone-600 border border-stone-200"
                    }`}
                  >
                    {pt}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setCalibOverlayOpen(true)}
              className="px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition"
            >
              {completedGazePoints.size >= 9 ? "Recalibrate (9-pt)" : "Start calibration"}
            </button>
          </div>
        </div>

        {/* Personal posture */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">Personal posture</h3>
            <div className="text-[11px] text-stone-500 mb-3">
              {hardwareState.postureRecorded
                ? hardwareState.postureBaselineText
                : recordingPosture
                ? "Hold upright posture..."
                : "Not recorded"}
            </div>
            <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-3">
              <div
                style={{ width: `${postureProgress}%` }}
                className="h-full bg-stone-900 transition-all duration-200 rounded-full"
              />
            </div>
            <p className="text-[11px] text-stone-500 mb-4">
              Sit in the position you call upright, and hold for 2 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecordPostureBaseline}
            className="self-start px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition"
          >
            Record baseline
          </button>
        </div>

        {/* Microphone */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-stone-900">Microphone</h3>
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  micListening
                    ? "bg-emerald-500 border-emerald-600 animate-pulse"
                    : hardwareState.micTested
                    ? "bg-stone-900 border-stone-900"
                    : "border-stone-300"
                }`}
              />
            </div>
            <div className="text-[11px] text-stone-400 mb-1">Recognised text</div>
            <div className="text-xs text-stone-700 pb-2 mb-3 border-b border-stone-200">
              {micPromptText}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {(["Next chapter", "Save this line", "Pause reading"] as const).map((phrase) => (
                <button
                  type="button"
                  key={phrase}
                  onClick={() => handleRunMicTest(phrase)}
                  className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-[11px] text-stone-700 transition"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleRunMicTest()}
              className="px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition"
            >
              {micListening ? "Listening..." : "Recognise"}
            </button>
            <div className="text-[11px] text-stone-400">{micResultStatus}</div>
          </div>
        </div>
      </div>

      <NinePointGazeOverlay
        open={calibOverlayOpen}
        onComplete={() => {
          setCompletedGazePoints(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
          setHardwareState((prev) => ({ ...prev, gazeCalibrated: true }));
          setCalibOverlayOpen(false);
          playSubtleEarcon(780, 220);
        }}
        onExit={() => setCalibOverlayOpen(false)}
      />
    </div>
  );
}
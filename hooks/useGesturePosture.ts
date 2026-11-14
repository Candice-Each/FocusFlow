"use client";
import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
// ==========================================
// Types
// ==========================================
type Point = {
  x: number;
  y: number;
  visibility?: number;
};
type Baseline = {
  shoulderSlope: number;
  headOffset: number;
  headSize: number;
  shoulderWidth: number;
  shoulderEarGap?: number;
  leftEarGap?: number;
  rightEarGap?: number;
  headRoll?: number;
};
interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onPrev: () => void;
  onNext: () => void;
}
// ==========================================
// MediaPipe models
// ==========================================
const MODEL_ROOT =
  "https://storage.googleapis.com/mediapipe-models";
const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
// ==========================================
// Gesture settings
// ==========================================
// The camera preview is mirrored in MonitorWindows (-scale-x-100).
// Work in displayed coordinates so "right" matches what the user sees.
const LEFT_ZONE_MAX = 0.30;
const RIGHT_ZONE_MIN = 0.70;
const ZONE_HOLD_MS = 400;
// Number of missing-hand frames before rearming.
const REARM_MISSING_FRAMES = 5;
// Inference interval: approximately 12 FPS.
const DETECTION_INTERVAL = 65;
// ==========================================
// Main Hook
// ==========================================
export function useGesturePosture({
  videoRef,
  enabled,
  onPrev,
  onNext,
}: Options) {
  const [status, setStatus] = useState(
    "Waiting for camera"
  );
  const [posture, setPosture] = useState(
    "Not calibrated"
  );
  const [postureDebug, setPostureDebug] = useState("Calibrate to see measurements");
  const [baseline, setBaseline] =
    useState<Baseline | null>(null);
  const baselineRef = useRef<Baseline | null>(null);
  const collectRef = useRef<Baseline[]>([]);
  const collectingRef = useRef(false);
  const callbackRef = useRef({
    onPrev,
    onNext,
  });
  useEffect(() => {
    callbackRef.current = {
      onPrev,
      onNext,
    };
  }, [onPrev, onNext]);
  // ==========================================
  // Posture Calibration
  // ==========================================
  const calibrate = () => {
    collectRef.current = [];
    collectingRef.current = true;
    baselineRef.current = null;
    setBaseline(null);
    setPosture(
      "Calibrating · sit upright..."
    );
    setPostureDebug("Collecting baseline...");
  };
  // ==========================================
  // Detection lifecycle
  // ==========================================
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let handModel: HandLandmarker | null = null;
    let poseModel: PoseLandmarker | null = null;
    let timer: ReturnType<typeof setTimeout> | null =
      null;
    // Hand tracking state
    let currentZone: "left" | "right" | null = null;
    let zoneStartTime = 0;
    let handMissing = 0;
    let armed = true;
    // Posture tracking state
    let badSince = 0;
    let shownPosture = "";
    let lastDebugAt = 0;
    let lastVideoTime = -1;
    // ========================================
    // Detection Loop
    // ========================================
    const loop = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (
        video &&
        video.readyState === 4 &&
        video.videoWidth > 0 &&
        video.currentTime !== lastVideoTime
      ) {
        lastVideoTime = video.currentTime;
        const now = performance.now();
        try {
          // ==================================
          // 1. Hand Detection
          // ==================================
          const hands =
            handModel?.detectForVideo(
              video,
              now
            ).landmarks ?? [];
          // Check whether four fingers are
          // clearly extended.
          const hand = hands.find((points) => {
            const wrist = points[0];
            if (!wrist) return false;
            const tips = [8, 12, 16, 20];
            const middle = [6, 10, 14, 18];
            return tips.every((tip, i) => {
              const tipPoint = points[tip];
              const middlePoint = points[middle[i]];
              if (!tipPoint || !middlePoint) {
                return false;
              }
              const tipDistance = Math.hypot(
                tipPoint.x - wrist.x,
                tipPoint.y - wrist.y
              );
              const middleDistance = Math.hypot(
                middlePoint.x - wrist.x,
                middlePoint.y - wrist.y
              );
              return (
                tipDistance >
                middleDistance * 1.15
              );
            });
          });
          // ==================================
          // No open hand detected
          // ==================================
          if (!hand) {
            handMissing++;
            // A brief tracking dropout cancels the hold but cannot rearm.
            currentZone = null;
            zoneStartTime = 0;
            if (
              handMissing >=
              REARM_MISSING_FRAMES
            ) {
              armed = true;
              setStatus(
                "Ready · raise an open palm"
              );
            }
          } else {
            handMissing = 0;
            // ==================================
            // Calculate palm center
            // ==================================
            const palm = {
              x:
                (
                  hand[0].x +
                  hand[5].x +
                  hand[9].x +
                  hand[17].x
                ) / 4,
              y:
                (
                  hand[0].y +
                  hand[5].y +
                  hand[9].y +
                  hand[17].y
                ) / 4,
            };
            // Mirror coordinates to match the camera preview, and classify
            // a static open palm into left / neutral / right zones.
            const displayX = 1 - palm.x;
            const nextZone: "left" | "right" | null =
              displayX <= LEFT_ZONE_MAX ? "left" :
              displayX >= RIGHT_ZONE_MIN ? "right" : null;
            if (!armed) {
              setStatus("Page turned · lower hand to rearm");
            } else if (!nextZone) {
              currentZone = null;
              zoneStartTime = 0;
              setStatus(`Center zone · X:${displayX.toFixed(2)} · no turn`);
            } else {
              if (currentZone !== nextZone) {
                currentZone = nextZone;
                zoneStartTime = now;
              }
              const heldMs = now - zoneStartTime;
              setStatus(`${nextZone === "right" ? "Right → next" : "Left → previous"} · ${Math.min(100, Math.round(heldMs / ZONE_HOLD_MS * 100))}%`);
              if (heldMs >= ZONE_HOLD_MS) {
                if (nextZone === "right") callbackRef.current.onNext();
                else callbackRef.current.onPrev();
                setStatus(nextZone === "right" ? "NEXT PAGE · lower hand" : "PREVIOUS PAGE · lower hand");
                armed = false;
                currentZone = null;
                zoneStartTime = 0;
              }
            }
          }
          // ==================================
          // 2. Posture Detection
          // ==================================
          const poseResult =
            poseModel?.detectForVideo(
              video,
              now
            );
          const landmarks =
            poseResult?.landmarks?.[0] as
              | Point[]
              | undefined;
          if (landmarks) {
            const nose = landmarks[0];
            const left = landmarks[11];
            const right = landmarks[12];
            const leftEar = landmarks[7];
            const rightEar = landmarks[8];
            const visible = [nose, left, right].every(
              (p) =>
                p &&
                (
                  p.visibility === undefined ||
                  p.visibility > 0.5
                )
            );
            if (visible) {
              const shoulderWidth = Math.hypot(
                left.x - right.x,
                left.y - right.y
              );
              if (shoulderWidth > 0.08) {
                // Ear-to-shoulder distance gets smaller when both shoulders
                // rise. Use the head-size ratio below as a fallback.
                const earsVisible = [leftEar, rightEar].every(
                  (p) => p && (p.visibility === undefined || p.visibility > 0.5)
                );
                const shoulderEarGap = earsVisible
                  ? ((left.y - leftEar.y) + (right.y - rightEar.y)) / (2 * shoulderWidth)
                  : undefined;
                const leftEarGap = earsVisible ? (left.y - leftEar.y) / shoulderWidth : undefined;
                const rightEarGap = earsVisible ? (right.y - rightEar.y) / shoulderWidth : undefined;
                const headRoll = earsVisible
                  ? (leftEar.y - rightEar.y) /
                    Math.max(0.08, Math.hypot(leftEar.x - rightEar.x, leftEar.y - rightEar.y))
                  : undefined;
                const current: Baseline = {
                  shoulderSlope:
                    (
                      left.y - right.y
                    ) / shoulderWidth,
                  headOffset:
                    (
                      nose.x -
                      (
                        left.x + right.x
                      ) / 2
                    ) / shoulderWidth,
                  headSize:
                    (
                      (
                        left.y + right.y
                      ) / 2 -
                      nose.y
                    ) / shoulderWidth,
                  shoulderWidth,
                  shoulderEarGap,
                  leftEarGap,
                  rightEarGap,
                  headRoll,
                };
                // ============================
                // Calibration
                // ============================
                if (collectingRef.current) {
                  collectRef.current.push(
                    current
                  );
                  setPosture(
                    `Calibrating ${Math.min(
                      100,
                      Math.round(
                        collectRef.current.length /
                        45 * 100
                      )
                    )}%`
                  );
                  if (
                    collectRef.current.length >=
                    45
                  ) {
                    const average = (
                      key: "shoulderSlope" | "headOffset" | "headSize" | "shoulderWidth"
                    ) =>
                      collectRef.current.reduce(
                        (sum, item) =>
                          sum + item[key],
                        0
                      ) /
                      collectRef.current.length;
                    const result: Baseline = {
                      shoulderSlope:
                        average(
                          "shoulderSlope"
                        ),
                      headOffset:
                        average(
                          "headOffset"
                        ),
                      headSize:
                        average(
                          "headSize"
                        ),
                      shoulderWidth: average("shoulderWidth"),
                      shoulderEarGap: (() => {
                        const gaps = collectRef.current
                          .map((item) => item.shoulderEarGap)
                          .filter((value): value is number => value !== undefined && value > 0);
                        return gaps.length >= 25
                          ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length
                          : undefined;
                      })(),
                      leftEarGap: (() => {
                        const values = collectRef.current.map((p) => p.leftEarGap)
                          .filter((v): v is number => v !== undefined && v > 0);
                        return values.length >= 25
                          ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined;
                      })(),
                      rightEarGap: (() => {
                        const values = collectRef.current.map((p) => p.rightEarGap)
                          .filter((v): v is number => v !== undefined && v > 0);
                        return values.length >= 25
                          ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined;
                      })(),
                      headRoll: (() => {
                        const values = collectRef.current.map((p) => p.headRoll)
                          .filter((v): v is number => v !== undefined);
                        return values.length >= 25
                          ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined;
                      })(),
                    };
                    baselineRef.current =
                      result;
                    setBaseline(result);
                    collectingRef.current =
                      false;
                    setPosture(
                      "Good posture"
                    );
                  }
                }
                // ============================
                // Posture evaluation
                // ============================
                else if (
                  baselineRef.current
                ) {
                  const base =
                    baselineRef.current;
                  const shoulderTilt =
                    Math.abs(
                      current.shoulderSlope -
                      base.shoulderSlope
                    ) > 0.10;
                  const headTilt =
                    Math.abs(
                      current.headOffset -
                      base.headOffset
                    ) > 0.14 ||
                    (current.headRoll !== undefined && base.headRoll !== undefined &&
                      Math.abs(current.headRoll - base.headRoll) > 0.16);
                  const forwardLean =
                    current.headSize <
                    base.headSize * 0.73;
                  // Relative closeness estimate: shoulders look wider than
                  // during personal calibration; not a centimetre reading.
                  const tooClose = current.shoulderWidth >
                    base.shoulderWidth * 1.28;
                  const widthStable = Math.abs(current.shoulderWidth / base.shoulderWidth - 1) < 0.18;
                  const earGapPairsAvailable = current.leftEarGap !== undefined &&
                    current.rightEarGap !== undefined && base.leftEarGap !== undefined &&
                    base.rightEarGap !== undefined;
                  const oneShoulderRaised = widthStable &&
                    Math.abs(current.headOffset - base.headOffset) < 0.20 &&
                    ((earGapPairsAvailable &&
                      ((base.leftEarGap! - current.leftEarGap! > 0.045 &&
                        Math.abs(base.rightEarGap! - current.rightEarGap!) < 0.12) ||
                       (base.rightEarGap! - current.rightEarGap! > 0.045 &&
                        Math.abs(base.leftEarGap! - current.leftEarGap!) < 0.12))) ||
                     Math.abs(current.shoulderSlope - base.shoulderSlope) > 0.075);
                  const earsSupportShrug = current.shoulderEarGap !== undefined &&
                    base.shoulderEarGap !== undefined &&
                    base.shoulderEarGap > 0.16;
                  const shouldersRaised = widthStable &&
                    Math.abs(current.headOffset - base.headOffset) < 0.17 &&
                    (earsSupportShrug
                      ? current.shoulderEarGap! < base.shoulderEarGap! - 0.06
                      : current.headSize < base.headSize * 0.89);
                  if (now - lastDebugAt > 250) {
                    const shoulderDelta = Math.abs(current.shoulderSlope - base.shoulderSlope);
                    const headDelta = Math.abs(current.headOffset - base.headOffset);
                    const rollDelta = current.headRoll !== undefined && base.headRoll !== undefined
                      ? Math.abs(current.headRoll - base.headRoll).toFixed(2) : "--";
                    const leftDelta = base.leftEarGap !== undefined && current.leftEarGap !== undefined
                      ? (base.leftEarGap - current.leftEarGap).toFixed(2) : "--";
                    const rightDelta = base.rightEarGap !== undefined && current.rightEarGap !== undefined
                      ? (base.rightEarGap - current.rightEarGap).toFixed(2) : "--";
                    setPostureDebug(`Shoulder Δ${shoulderDelta.toFixed(2)} · Head Δ${headDelta.toFixed(2)} · Roll Δ${rollDelta} · L${leftDelta} R${rightDelta}`);
                    lastDebugAt = now;
                  }
                  let next =
                    "Good posture";
                  if (tooClose) {
                    next = "Too close to screen · move back";
                  } else if (oneShoulderRaised) {
                    next = "One shoulder raised · relax shoulders";
                  } else if (
                    shoulderTilt ||
                    headTilt
                  ) {
                    next =
                      "Body/head tilted · sit upright";
                  } else if (shouldersRaised) {
                    next = "Shoulders raised · relax shoulders";
                  } else if (
                    forwardLean
                  ) {
                    next =
                      "Possible slouch/forward lean · sit upright";
                  }
                  // ============================
                  // Alert delay
                  // ============================
                  if (
                    next ===
                    "Good posture"
                  ) {
                    badSince = 0;
                    if (shownPosture !== next) {
                      setPosture(next);
                      shownPosture = next;
                    }
                  } else {
                    if (!badSince) badSince = now;
                    if (now - badSince > 650 && shownPosture !== next) {
                      setPosture(next);
                      shownPosture = next;
                    }
                  }
                }
              }
            }
          }
        } catch {
          // A dropped camera frame should
          // not crash the reading interface.
        }
      }
      timer = setTimeout(
        loop,
        DETECTION_INTERVAL
      );
    };
    // ========================================
    // Load MediaPipe Models
    // ========================================
    async function start() {
      setStatus(
        "Loading hand and pose models..."
      );
      try {
        const vision =
          await FilesetResolver.forVisionTasks(
            WASM_ROOT
          );
        if (cancelled) return;
        // Hand Landmarker
        handModel =
          await HandLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  `${MODEL_ROOT}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numHands: 1,
            }
          );
        if (cancelled) {
          handModel.close();
          return;
        }
        // Pose Landmarker
        poseModel =
          await PoseLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  `${MODEL_ROOT}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numPoses: 1,
            }
          );
        if (cancelled) {
          poseModel.close();
          handModel.close();
          return;
        }
        setStatus(
          "Ready · raise an open palm"
        );
        loop();
      } catch (error) {
        console.error(
          "Gesture/Posture model error:",
          error
        );
        if (!cancelled) {
          setStatus(
            "Model loading failed · check console"
          );
        }
      }
    }
    void start();
    // ========================================
    // Cleanup
    // ========================================
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      handModel?.close();
      poseModel?.close();
    };
  }, [enabled, videoRef]);
  // ==========================================
  // Public API
  // ==========================================
  return {
    status: enabled
      ? status
      : "Disabled",
    posture: enabled
      ? posture
      : "Disabled",
    baseline,
    postureDebug,
    calibrate,
  };
}




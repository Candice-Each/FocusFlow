"use client";

import { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { OneEuroFilter } from "@/lib/one-euro-filter";
import { drawFaceAndEyeMesh, extractGazeTelemetry } from "@/lib/gaze";
import type {
  CalibCollection,
  CalibrationSamples,
  CameraStatus,
  FaceBaseline,
  GazePoint,
  GazeTelemetry,
  GazeTrackingConfig,
  GazeTrackingState,
  ReadingLayout,
  ReadingStats,
  TrackingQuality,
} from "@/lib/types";

interface UseGazeTrackingOptions {
  noCameraMode: boolean;
  stateRef: React.RefObject<GazeTrackingState>;
  weightsRef: React.RefObject<number[][] | null>;
  uiConfigRef: React.RefObject<GazeTrackingConfig>;
  layoutRef: React.RefObject<ReadingLayout>;
  faceBaselineRef: React.RefObject<FaceBaseline | null>;
  collectingPointRef: React.RefObject<CalibCollection | null>;
  calibSamplesRef: React.RefObject<CalibrationSamples>;

  videoRef: React.RefObject<HTMLVideoElement | null>;
  meshCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  rowsContainerRef: React.RefObject<HTMLDivElement | null>;
  uiInteractingRef: React.RefObject<boolean>;
  isDraggingSliderRef: React.RefObject<boolean>;

  updateAndRenderHeatmaps: (
    gx: number,
    gy: number,
    rowsRect: DOMRect,
    curLine: number,
    lineCount: number,
    curLineHeight: number
  ) => void;

  setCameraStatus: React.Dispatch<React.SetStateAction<CameraStatus>>;
  setTrackingQuality: React.Dispatch<React.SetStateAction<TrackingQuality>>;
  setContinuousFaceState: React.Dispatch<React.SetStateAction<string>>;
  setMultimodalTriggerState: React.Dispatch<React.SetStateAction<string>>;
  setFps: React.Dispatch<React.SetStateAction<number>>;
  setModelReady: React.Dispatch<React.SetStateAction<boolean>>;
  setMouthScore: React.Dispatch<React.SetStateAction<number>>;
  setIsOffScreenPaused: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReturnConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveLineIdx: React.Dispatch<React.SetStateAction<number>>;
  setActiveClauseId: React.Dispatch<React.SetStateAction<number>>;
  setPageIdx: React.Dispatch<React.SetStateAction<number>>;
  setGazePoint: React.Dispatch<React.SetStateAction<GazePoint>>;
  setReadingStats: React.Dispatch<React.SetStateAction<ReadingStats>>;
  setClauseMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setGestureBadgeText: React.Dispatch<React.SetStateAction<string>>;
  setCalibSampleProgress: React.Dispatch<React.SetStateAction<number>>;
}

export function useGazeTracking(options: UseGazeTrackingOptions) {
  const {
    noCameraMode,
    stateRef,
    weightsRef,
    uiConfigRef,
    layoutRef,
    faceBaselineRef,
    collectingPointRef,
    calibSamplesRef,
    videoRef,
    meshCanvasRef,
    rowsContainerRef,
    uiInteractingRef,
    isDraggingSliderRef,
    updateAndRenderHeatmaps,
    setCameraStatus,
    setTrackingQuality,
    setContinuousFaceState,
    setMultimodalTriggerState,
    setFps,
    setModelReady,
    setMouthScore,
    setIsOffScreenPaused,
    setShowReturnConfirm,
    setActiveLineIdx,
    setActiveClauseId,
    setPageIdx,
    setGazePoint,
    setReadingStats,
    setClauseMenuOpen,
    setGestureBadgeText,
    setCalibSampleProgress,
  } = options;

  const latestTelemetryRef = useRef<GazeTelemetry | null>(null);

  useEffect(() => {
    if (noCameraMode) {
      setCameraStatus("No-Camera Mode");
      setTrackingQuality("Unavailable");
      setContinuousFaceState("No-Camera Mode");
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    let landmarker: FaceLandmarker | null = null;
    let rafId = 0;
    let lastInferMs = -1;
    let frameCounter = 0;
    let fpsTimer = performance.now();
    let active = true;

    let verticalJumpDir: -1 | 0 | 1 = 0;
    let lastVerticalJumpTime = 0;
    let rightZoneReachedAt = 0;
    let prevTrackedLine = 0;
    let prevTrackedPage = 0;

    const filterX = new OneEuroFilter(0.8, 0.014, 1.0);
    const filterY = new OneEuroFilter(0.55, 0.008, 1.0);

    async function setup() {
      const s = stateRef.current;
      s.telQueue = [];
      s.biasY = 0;
      s.lineEnterTime = 0;
      s.prevBlink = 0;
      s.blinkEma = 0.1;
      s.blinkCooldownUntil = 0;
      verticalJumpDir = 0;
      lastVerticalJumpTime = 0;
      rightZoneReachedAt = 0;
      prevTrackedLine = s.currentLine;
      prevTrackedPage = 0;
      lastInferMs = -1;

      try {
        setCameraStatus("Initializing");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        if (!active) return;
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30 } },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setModelReady(true);
          setCameraStatus("Active");
        }
      } catch {
        if (active) {
          setCameraStatus("Permission Denied");
          setTrackingQuality("Unavailable");
        }
        return;
      }

      const loop = () => {
        if (!active) return;
        rafId = requestAnimationFrame(loop);

        const video = videoRef.current;
        if (
          !video ||
          video.readyState < 2 ||
          video.videoWidth === 0 ||
          !landmarker
        )
          return;

        const now = performance.now();
        if (now - lastInferMs < 32) return;
        const timestampMs = Math.max(Math.floor(now), lastInferMs + 1);
        lastInferMs = timestampMs;

        frameCounter++;
        if (now - fpsTimer >= 1000) {
          setFps(frameCounter);
          frameCounter = 0;
          fpsTimer = now;
        }

        let res: FaceLandmarkerResult;
        try {
          res = landmarker.detectForVideo(video, timestampMs);
        } catch {
          return;
        }

        const tel = extractGazeTelemetry(res);
        latestTelemetryRef.current = tel;
        const st = stateRef.current;

        if (meshCanvasRef.current) {
          drawFaceAndEyeMesh(
            meshCanvasRef.current,
            res,
            tel,
            video,
            uiConfigRef.current.meshShowVideoBg,
            uiConfigRef.current.isNight
          );
        }

        // Off-screen detection & quality check
        if (!tel) {
          setTrackingQuality("Unavailable");
          setContinuousFaceState("Off-Screen");
          st.telQueue = [];
          if (st.faceLostStart === 0) {
            st.faceLostStart = timestampMs;
          } else if (
            timestampMs - st.faceLostStart > 3500 &&
            !uiConfigRef.current.isOffScreenPaused
          ) {
            setIsOffScreenPaused(true);
            setMultimodalTriggerState("Paused (Off-Screen)");
          }
          return;
        }

        if (st.faceLostStart > 0) {
          st.faceLostStart = 0;
        }
        if (
          uiConfigRef.current.isOffScreenPaused &&
          !uiConfigRef.current.showReturnConfirm
        ) {
          setShowReturnConfirm(true);
          setMultimodalTriggerState("Awaiting Resume");
        }

        // Priority 1: Calibration sample collection
        const collecting = collectingPointRef.current;
        if (collecting && collecting.remaining > 0) {
          if (tel.blink > 0.5) return;
          if (collecting.settle > 0) {
            collecting.settle -= 1;
            return;
          }
          calibSamplesRef.current.X.push(tel.features);
          calibSamplesRef.current.Y.push([collecting.targetX, collecting.targetY]);
          collecting.remaining -= 1;
          const done = collecting.total - collecting.remaining;
          setCalibSampleProgress(Math.round((done / collecting.total) * 100));
          return;
        }

        const base = faceBaselineRef.current;
        const relYaw = base ? tel.yawDeg - base.yaw : tel.yawDeg;
        const relPitch = base ? tel.pitchDeg - base.pitch : tel.pitchDeg;

        if (Math.abs(relYaw) > 22 || Math.abs(relPitch) > 18 || tel.blink > 0.5) {
          setTrackingQuality("Limited");
        } else {
          setTrackingQuality("Good");
        }

        setMouthScore(Math.round(tel.jawOpen * 100));

        if (tel.jawOpen > 0.32) {
          setContinuousFaceState("Jaw Open");
        } else if (tel.blink > 0.45) {
          setContinuousFaceState("Blink Guard");
        } else if (Math.abs(relYaw) > 15) {
          setContinuousFaceState(`Yaw ${relYaw > 0 ? "+" : ""}${relYaw}°`);
        } else if (Math.abs(relPitch) > 12) {
          setContinuousFaceState(`Pitch ${relPitch > 0 ? "+" : ""}${relPitch}°`);
        } else {
          setContinuousFaceState("Stable");
        }

        if (uiConfigRef.current.showReturnConfirm) {
          if (tel.jawOpen > 0.35 || relPitch > 12) {
            setIsOffScreenPaused(false);
            setShowReturnConfirm(false);
            setMultimodalTriggerState("Resumed via Face");
          }
          return;
        }

        // Priority 2: Mouth-open trigger
        if (uiConfigRef.current.gestureControl && tel.jawOpen > 0.32) {
          if (rowsContainerRef.current) {
            const rr = rowsContainerRef.current.getBoundingClientRect();
            const { pages: cp, pageIdx: pi } = layoutRef.current;
            const lineSegs = cp[pi]?.[st.currentLine]?.segments ?? [];
            const approxX =
              st.recentX.length > 0
                ? st.recentX.reduce((a, b) => a + b, 0) / st.recentX.length
                : rr.left;
            const localXSync = Math.max(0, approxX - rr.left);
            for (let i = 0; i < lineSegs.length; i++) {
              const seg = lineSegs[i];
              if (
                localXSync >= seg.startX - 14 &&
                localXSync <= seg.endX + 14
              ) {
                if (seg.clauseId !== st.currentClauseId) {
                  st.currentClauseId = seg.clauseId;
                  setActiveClauseId(seg.clauseId);
                }
                break;
              }
            }
          }
          if (st.mouthOpenStart === 0) {
            st.mouthOpenStart = timestampMs;
          } else if (
            timestampMs - st.mouthOpenStart >= 150 &&
            timestampMs - st.lastMouthTrigger > 800
          ) {
            st.lastMouthTrigger = timestampMs;
            st.mouthOpenStart = 0;

            const { pages: curPages, pageIdx: curPageIdx } = layoutRef.current;
            const safeLine = Math.max(
              0,
              Math.min(st.currentLine, (curPages[curPageIdx]?.length ?? 1) - 1)
            );
            st.currentLine = safeLine;
            setActiveLineIdx(safeLine);

            const rowSegs = curPages[curPageIdx]?.[safeLine]?.segments ?? [];
            if (
              rowSegs.length > 0 &&
              !rowSegs.some((s) => s.clauseId === st.currentClauseId)
            ) {
              st.currentClauseId = rowSegs[0].clauseId;
              setActiveClauseId(rowSegs[0].clauseId);
            }

            setClauseMenuOpen((prev) => {
              const next = !prev;
              setGestureBadgeText(next ? "Menu Active" : "Standby");
              setMultimodalTriggerState(
                next ? "Mouth Selection Active" : "Gaze Tracking"
              );
              return next;
            });
          }
          return;
        } else {
          st.mouthOpenStart = 0;
        }

        // Dynamic Spike-Based Blink Guard with 2-frame lookback buffer
        const deltaBlink = tel.blink - st.prevBlink;
        st.prevBlink = tel.blink;
        const isBlinkSpike =
          tel.blink > 0.45 ||
          deltaBlink > 0.11 ||
          tel.blink - st.blinkEma > 0.18;

        if (isBlinkSpike) {
          st.telQueue = [];
          st.blinkCooldownUntil = timestampMs + 140;
          return;
        }
        st.blinkEma = st.blinkEma * 0.92 + tel.blink * 0.08;

        if (timestampMs < st.blinkCooldownUntil) {
          return;
        }

        st.telQueue.push(tel);
        if (st.telQueue.length < 3) {
          return;
        }
        const stableTel = st.telQueue.shift()!;
        const feat = stableTel.features;

        const W = weightsRef.current;
        if (!W || !rowsContainerRef.current) return;

        let rawX = 0;
        let rawY = 0;
        for (let i = 0; i < feat.length; i++) {
          rawX += feat[i] * W[i][0];
          rawY += feat[i] * W[i][1];
        }

        const rowsRect = rowsContainerRef.current.getBoundingClientRect();
        const { pages: curPages, pageIdx: curPageIdx } = layoutRef.current;
        const lineCount = curPages[curPageIdx]?.length ?? 1;
        if (st.lineEnterTime === 0) st.lineEnterTime = timestampMs;

        const curLineHeight = uiConfigRef.current.lineHeightPx;
        const getLineCenterY = (idx: number) =>
          rowsRect.top + (idx + 0.5) * curLineHeight;

        const clampedRawX = Math.max(-120, Math.min(window.innerWidth + 120, rawX));
        const clampedRawY = Math.max(-80, Math.min(window.innerHeight + 80, rawY));
        const filtX = filterX.filter(clampedRawX, timestampMs);
        const rawFiltY = filterY.filter(clampedRawY, timestampMs);

        const maxBiasPx = curLineHeight * 2.5;

        // If user manually clicked a sentence (st.currentLine changed externally), anchor biasY to the clicked row
        if (st.currentLine !== prevTrackedLine || curPageIdx !== prevTrackedPage) {
          const targetCenterY = getLineCenterY(st.currentLine);
          const clickResidual = targetCenterY - (rawFiltY + st.biasY);
          if (Math.abs(clickResidual) < curLineHeight * 3.5) {
            st.biasY = Math.max(
              -maxBiasPx,
              Math.min(maxBiasPx, st.biasY + 0.45 * clickResidual)
            );
          }
          prevTrackedLine = st.currentLine;
          prevTrackedPage = curPageIdx;
        }

        // Top-of-page ceiling guard: when reading Row 0 or Row 1, never let cursor float above Row 0 into the empty header
        if (st.currentLine <= 1 && rawFiltY + st.biasY < rowsRect.top) {
          const ceilingResidual = getLineCenterY(st.currentLine) - (rawFiltY + st.biasY);
          st.biasY = Math.max(
            -maxBiasPx,
            Math.min(maxBiasPx, st.biasY + 0.18 * ceilingResidual)
          );
        }

        st.biasY = Math.max(-maxBiasPx, Math.min(maxBiasPx, st.biasY));
        const filtY = rawFiltY + st.biasY;

        const screenX = Math.max(0, Math.min(window.innerWidth, filtX));
        const screenY = Math.max(0, Math.min(window.innerHeight, filtY));

        if (
          uiInteractingRef.current ||
          isDraggingSliderRef.current ||
          uiConfigRef.current.clauseMenuOpen
        ) {
          const lockedY = getLineCenterY(st.currentLine);
          setGazePoint((prev) => ({
            ...prev,
            x: screenX,
            y: screenY,
            snappedY: lockedY,
            rawY: filtY,
          }));
          const targetHeatY = uiConfigRef.current.heatmapUseRawY
            ? screenY
            : lockedY;
          updateAndRenderHeatmaps(
            screenX,
            targetHeatY,
            rowsRect,
            st.currentLine,
            lineCount,
            curLineHeight
          );
          return;
        }

        const currentLineObj = curPages[curPageIdx]?.[st.currentLine] ?? {
          segments: [],
          clauseCount: 1,
          wordCount: 8,
          charCount: 45,
          widthRatio: 1,
          isParaStart: true,
          isParaEnd: false,
        };

        st.recentX.push(filtX);
        if (st.recentX.length > 3) st.recentX.shift();
        const smoothX =
          st.recentX.reduce((a, b) => a + b, 0) / st.recentX.length;

        const textWidthPx = Math.max(280, rowsRect.width - 16);
        const lineStartX = rowsRect.left;
        const localX = Math.max(0, smoothX - lineStartX);
        const lineDwellMs = timestampMs - st.lineEnterTime;

        const expectedLineMs = Math.max(
          600,
          ((currentLineObj.wordCount || 8) / Math.max(80, st.wpmEma)) * 60000
        );
        const timeProgress = Math.min(1.6, lineDwellMs / expectedLineMs);

        // ==================== Sliders Mapping ====================
        const { nextSens, prevSens, skipSens } = uiConfigRef.current;
        const normNext = Math.max(0, Math.min(1, (nextSens - 15) / 80));
        const normPrev = Math.max(0, Math.min(1, (prevSens - 5) / 85));
        const normSkip = Math.max(0, Math.min(1, (skipSens - 5) / 85));

        const rightFactor = 0.62 - normNext * 0.16;
        const minWrapDwellMs = 580 - normNext * 200;
        const sweepDropFactor = 0.26 - normNext * 0.08;
        const leftLandingBase = 0.34 + normNext * 0.10;

        // High-Resistance Prev & Skip (much harder than Next)
        const prevOffsetRatio = 2.25 - normPrev * 0.60;
        const skipOffsetRatio = 2.65 - normSkip * 0.65;
        const backwardHoldMs = Math.round(1600 - normPrev * 600);
        const verticalSkipHoldMs = Math.round(1850 - normSkip * 650);

        const activeCenterY = getLineCenterY(st.currentLine);
        const diffY = filtY - activeCenterY;

        if (lineDwellMs > 260) {
          if (smoothX > st.maxLineX) st.maxLineX = smoothX;
          const rightTriggerRatio = Math.max(
            0.24,
            currentLineObj.widthRatio * rightFactor
          );
          if (localX >= textWidthPx * rightTriggerRatio) {
            st.reachedRightZone = true;
            rightZoneReachedAt = timestampMs;
          }
        }

        if (st.reachedRightZone && timestampMs - rightZoneReachedAt > 4500) {
          st.reachedRightZone = false;
          st.maxLineX = smoothX;
        }

        const leftReturnX =
          lineStartX +
          textWidthPx *
            Math.min(
              leftLandingBase,
              Math.max(0.22, currentLineObj.widthRatio * 0.55)
            );
        const minSweepDropPx =
          textWidthPx *
          Math.max(0.16, currentLineObj.widthRatio * sweepDropFactor);

        const canNormalWrap =
          st.reachedRightZone &&
          lineDwellMs >= minWrapDwellMs &&
          timestampMs - st.lastSweepTime > 650 &&
          smoothX <= leftReturnX &&
          st.maxLineX - smoothX >= minSweepDropPx;

        if (canNormalWrap) {
          if (
            lineDwellMs >= 450 &&
            lineDwellMs <= 20000 &&
            currentLineObj.wordCount >= 2
          ) {
            const instWpm = (currentLineObj.wordCount / lineDwellMs) * 60000;
            const instCpm = (currentLineObj.charCount / lineDwellMs) * 60000;
            st.wpmEma = Math.round(
              st.wpmEma * 0.72 + Math.min(550, Math.max(60, instWpm)) * 0.28
            );
            st.cpmEma = Math.round(
              st.cpmEma * 0.72 + Math.min(2200, Math.max(150, instCpm)) * 0.28
            );
          }

          st.lastSweepTime = timestampMs;
          st.reachedRightZone = false;
          rightZoneReachedAt = 0;
          st.maxLineX = lineStartX;
          st.backwardCandidateId = -1;
          st.verticalJumpStartTime = 0;
          verticalJumpDir = 0;

          if (st.currentLine < lineCount - 1) {
            st.currentLine += 1;
            prevTrackedLine = st.currentLine;
            st.lineEnterTime = timestampMs;
            setActiveLineIdx(st.currentLine);
            const nextRowSegs =
              curPages[curPageIdx]?.[st.currentLine]?.segments ?? [];
            if (nextRowSegs.length > 0) {
              st.currentClauseId = nextRowSegs[0].clauseId;
              setActiveClauseId(nextRowSegs[0].clauseId);
            }
          } else if (curPageIdx < curPages.length - 1) {
            st.currentLine = 0;
            prevTrackedLine = 0;
            prevTrackedPage = curPageIdx + 1;
            st.lineEnterTime = timestampMs;
            setActiveLineIdx(0);
            const nextFirstClause =
              curPages[curPageIdx + 1]?.[0]?.segments?.[0]?.clauseId ?? 0;
            st.currentClauseId = nextFirstClause;
            setActiveClauseId(nextFirstClause);
            setPageIdx(curPageIdx + 1);
          }
        } else if (timestampMs - lastVerticalJumpTime > 1800) {
          const isInsideReadingBounds =
            filtY >= rowsRect.top - curLineHeight * 0.6 &&
            filtY <= rowsRect.bottom + curLineHeight * 0.6;

          const isTryingPrevLine =
            isInsideReadingBounds &&
            st.currentLine > 0 &&
            diffY < -curLineHeight * prevOffsetRatio;

          const isTryingSkipLine =
            isInsideReadingBounds &&
            st.currentLine < lineCount - 2 &&
            diffY > curLineHeight * skipOffsetRatio;

          const curDir: -1 | 0 | 1 = isTryingPrevLine
            ? -1
            : isTryingSkipLine
            ? 1
            : 0;

          if (curDir !== 0) {
            if (st.verticalJumpStartTime === 0 || verticalJumpDir !== curDir) {
              st.verticalJumpStartTime = timestampMs;
              verticalJumpDir = curDir;
            } else if (
              timestampMs - st.verticalJumpStartTime >
              (curDir === -1 ? backwardHoldMs : verticalSkipHoldMs)
            ) {
              const targetRow =
                curDir === -1
                  ? Math.max(0, st.currentLine - 1)
                  : Math.min(lineCount - 1, st.currentLine + 2);

              if (targetRow !== st.currentLine) {
                st.currentLine = targetRow;
                prevTrackedLine = targetRow;
                st.lineEnterTime = timestampMs;
                lastVerticalJumpTime = timestampMs;
                st.reachedRightZone = false;
                rightZoneReachedAt = 0;
                st.maxLineX = lineStartX;
                setActiveLineIdx(targetRow);
                const targetSegs =
                  curPages[curPageIdx]?.[targetRow]?.segments ?? [];
                if (targetSegs.length > 0) {
                  let matchId = targetSegs[0].clauseId;
                  for (let i = 0; i < targetSegs.length; i++) {
                    const seg = targetSegs[i];
                    if (localX >= seg.startX - 8 && localX <= seg.endX + 8) {
                      matchId = seg.clauseId;
                      break;
                    }
                  }
                  st.currentClauseId = matchId;
                  setActiveClauseId(matchId);
                }
              }
              st.verticalJumpStartTime = 0;
              verticalJumpDir = 0;
            }
          } else {
            st.verticalJumpStartTime = 0;
            verticalJumpDir = 0;
          }
        }

        const activeLineSegments =
          curPages[curPageIdx]?.[st.currentLine]?.segments ?? [];
        if (activeLineSegments.length > 0) {
          let rawMatchedId = st.currentClauseId;
          for (let s = 0; s < activeLineSegments.length; s++) {
            const seg = activeLineSegments[s];
            if (localX >= seg.startX - 4 && localX <= seg.endX + 4) {
              rawMatchedId = seg.clauseId;
              break;
            }
          }

          if (rawMatchedId > st.currentClauseId) {
            if (st.forwardCandidateId !== rawMatchedId) {
              st.forwardCandidateId = rawMatchedId;
              st.forwardStartTime = timestampMs;
            } else if (timestampMs - st.forwardStartTime >= 140) {
              st.currentClauseId = rawMatchedId;
              setActiveClauseId(rawMatchedId);
              st.forwardCandidateId = -1;

              // Horizontal Reading Anchor: when user advances forward to the next clause on the active line,
              // gently pull st.biasY toward activeCenterY if filtY is floating above the line (diffY < 0)
              if (
                uiConfigRef.current.faceAssist &&
                diffY < -curLineHeight * 0.25 &&
                diffY > -curLineHeight * 2.4
              ) {
                st.biasY = Math.max(
                  -maxBiasPx,
                  Math.min(maxBiasPx, st.biasY - 0.22 * diffY)
                );
              }
            }
            st.backwardCandidateId = -1;
          } else if (rawMatchedId < st.currentClauseId) {
            const isSweepingLeft =
              st.reachedRightZone && smoothX < st.maxLineX - 35;
            if (!isSweepingLeft) {
              if (st.backwardCandidateId !== rawMatchedId) {
                st.backwardCandidateId = rawMatchedId;
                st.backwardStartTime = timestampMs;
              } else if (
                timestampMs - st.backwardStartTime >= Math.max(950, backwardHoldMs)
              ) {
                st.currentClauseId = rawMatchedId;
                setActiveClauseId(rawMatchedId);
                st.backwardCandidateId = -1;
              }
            }
            st.forwardCandidateId = -1;
          } else {
            st.forwardCandidateId = -1;
            st.backwardCandidateId = -1;
          }
        }

        setReadingStats({
          wpm: st.wpmEma,
          cpm: st.cpmEma,
          lineProgressPct: Math.min(100, Math.round(timeProgress * 100)),
          rightZoneLatched: st.reachedRightZone,
          currentLineIdx: st.currentLine,
        });

        const snappedY = getLineCenterY(st.currentLine);
        const clampedX = Math.max(
          lineStartX,
          Math.min(rowsRect.right - 12, smoothX)
        );

        setGazePoint({
          x: screenX,
          y: screenY,
          snappedX: clampedX,
          snappedY,
          rawY: filtY,
          biasY: Math.round(st.biasY),
        });

        const targetHeatY = uiConfigRef.current.heatmapUseRawY
          ? screenY
          : snappedY;
        updateAndRenderHeatmaps(
          screenX,
          targetHeatY,
          rowsRect,
          st.currentLine,
          lineCount,
          curLineHeight
        );
      };

      rafId = requestAnimationFrame(loop);
    }

    setup();
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
      landmarker?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noCameraMode, updateAndRenderHeatmaps]);

  return { latestTelemetryRef };
}
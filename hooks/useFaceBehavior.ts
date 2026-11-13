"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createFaceAnalysisState,
  createPersonalFaceBaseline,
  DEFAULT_FACE_ANALYSIS_CONFIG,
  updateFaceAnalysis,
} from "@/lib/face/engine";
import {
  createFacePromptPolicyState,
  DEFAULT_FACE_PROMPT_POLICY_CONFIG,
  updateFacePromptPolicy,
} from "@/lib/face/prompt-policy";
import type {
  FaceAnalysisConfig,
  FaceAnalysisObservation,
  FacePromptKind,
  FacePromptPolicyConfig,
  FaceTelemetry,
  PersonalFaceBaseline,
} from "@/lib/face/types";
import type { CameraStatus, GazeTelemetry, TrackingQuality } from "@/lib/types";

const EMPTY_OBSERVATION: FaceAnalysisObservation = {
  phase: "baseline-required",
  trackingGate: "unavailable",
  activeReadingMs: 0,
  relative: null,
  postureConditionMs: 0,
  strainConditionMs: 0,
  postureDeviationCandidate: false,
  cognitiveStrainCandidate: false,
  activeStrainSignals: [],
};

export interface BaselineCaptureState {
  status: "idle" | "collecting" | "ready" | "failed";
  progress: number;
  sampleCount: number;
  message: string;
}

export interface ActiveFacePrompt {
  kind: FacePromptKind;
  reason: string;
  demo: boolean;
}

interface UseFaceBehaviorOptions {
  latestTelemetryRef: React.RefObject<GazeTelemetry | null>;
  trackingQuality: TrackingQuality;
  cameraStatus: CameraStatus;
  enabled: boolean;
  readingActive: boolean;
  promptsBlocked: boolean;
  isCalibrated: boolean;
  pageIdx: number;
  activeLineIdx: number;
  activeClauseId: number;
  demoMode: boolean;
}

const BASELINE_DURATION_MS = 5_000;
const BASELINE_MINIMUM_SAMPLES = 15;
const FACE_UPDATE_INTERVAL_MS = 200;

function asFaceTelemetry(telemetry: GazeTelemetry): FaceTelemetry {
  return {
    yawDeg: telemetry.yawDeg,
    pitchDeg: telemetry.pitchDeg,
    rollDeg: telemetry.rollDeg,
    blink: telemetry.blink,
    jawOpen: telemetry.jawOpen,
    browDown: telemetry.browDown,
    eyeSquint: telemetry.eyeSquint,
    mouthPress: telemetry.mouthPress,
    faceWidth: telemetry.faceWidth,
    faceCenterX: telemetry.faceCenterX,
    faceCenterY: telemetry.faceCenterY,
  };
}

function confidenceFor(quality: TrackingQuality, cameraStatus: CameraStatus): number {
  if (cameraStatus !== "Active") return 0;
  if (quality === "Good") return 1;
  if (quality === "Limited") return 0.55;
  return 0;
}

export function useFaceBehavior(options: UseFaceBehaviorOptions) {
  const {
    latestTelemetryRef,
    trackingQuality,
    cameraStatus,
    enabled,
    readingActive,
    promptsBlocked,
    isCalibrated,
    pageIdx,
    activeLineIdx,
    activeClauseId,
    demoMode,
  } = options;

  const analysisConfig = useMemo<FaceAnalysisConfig>(
    () =>
      demoMode
        ? {
            ...DEFAULT_FACE_ANALYSIS_CONFIG,
            sessionWarmUpMs: 3_000,
            postureSustainMs: 4_000,
            strainSustainMs: 2_500,
          }
        : { ...DEFAULT_FACE_ANALYSIS_CONFIG },
    [demoMode]
  );
  const promptConfig = useMemo<FacePromptPolicyConfig>(
    () =>
      demoMode
        ? {
            ...DEFAULT_FACE_PROMPT_POLICY_CONFIG,
            cooldownMs: { posture: 15_000, understanding: 15_000, rest: 15_000 },
            restAfterActiveReadingMs: 45_000,
            restRepeatActiveReadingMs: 45_000,
          }
        : {
            ...DEFAULT_FACE_PROMPT_POLICY_CONFIG,
            cooldownMs: { ...DEFAULT_FACE_PROMPT_POLICY_CONFIG.cooldownMs },
          },
    [demoMode]
  );

  const [baseline, setBaseline] = useState<PersonalFaceBaseline | null>(null);
  const [observation, setObservation] =
    useState<FaceAnalysisObservation>(EMPTY_OBSERVATION);
  const [capture, setCapture] = useState<BaselineCaptureState>({
    status: "idle",
    progress: 0,
    sampleCount: 0,
    message: "Record a five-second personal baseline before analysis.",
  });
  const [readingDifficultySignal, setReadingDifficultySignal] = useState(false);
  const [activePrompt, setActivePrompt] = useState<ActiveFacePrompt | null>(null);
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(0);

  const engineStateRef = useRef(createFaceAnalysisState(0));
  const promptStateRef = useRef(createFacePromptPolicyState(promptConfig));
  const baselineRef = useRef<PersonalFaceBaseline | null>(null);
  const activePromptRef = useRef<ActiveFacePrompt | null>(null);
  const disabledPromptKindsRef = useRef<Set<FacePromptKind>>(new Set());
  const captureRef = useRef<{
    startedAtMs: number;
    samples: FaceTelemetry[];
  } | null>(null);
  const positionRef = useRef<{
    key: number | null;
    activeSinceMs: number;
    regressions: number[];
  }>({ key: null, activeSinceMs: 0, regressions: [] });
  const breakEndsAtRef = useRef(0);
  const restTakenRef = useRef(false);

  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);
  useEffect(() => {
    activePromptRef.current = activePrompt;
  }, [activePrompt]);

  useEffect(() => {
    const now = performance.now();
    engineStateRef.current = createFaceAnalysisState(now);
    promptStateRef.current = createFacePromptPolicyState(promptConfig);
    positionRef.current.activeSinceMs = now;
  }, [promptConfig]);

  useEffect(() => {
    const now = performance.now();
    const nextKey = pageIdx * 1_000_000 + activeLineIdx * 10_000 + activeClauseId;
    const position = positionRef.current;
    if (position.key !== null && nextKey < position.key) {
      position.regressions.push(now);
    }
    if (position.key !== nextKey) {
      position.key = nextKey;
      position.activeSinceMs = now;
    }
  }, [pageIdx, activeLineIdx, activeClauseId]);

  const startBaselineCapture = useCallback(() => {
    const telemetry = latestTelemetryRef.current;
    if (!telemetry || trackingQuality !== "Good" || cameraStatus !== "Active") {
      setCapture({
        status: "failed",
        progress: 0,
        sampleCount: 0,
        message: "A clearly visible, well-lit face is required before recording.",
      });
      return false;
    }
    captureRef.current = { startedAtMs: performance.now(), samples: [] };
    setCapture({
      status: "collecting",
      progress: 0,
      sampleCount: 0,
      message: "Read naturally and keep a comfortable position for five seconds.",
    });
    return true;
  }, [cameraStatus, latestTelemetryRef, trackingQuality]);

  const clearActivePrompt = useCallback(() => {
    activePromptRef.current = null;
    setActivePrompt(null);
  }, []);

  const snoozePrompt = useCallback(
    (minutes: number) => {
      const prompt = activePromptRef.current;
      if (!prompt) return;
      const now = performance.now();
      const cooldown = promptConfig.cooldownMs[prompt.kind];
      promptStateRef.current.lastIssuedAtMs[prompt.kind] =
        now - cooldown + minutes * 60_000;
      clearActivePrompt();
    },
    [clearActivePrompt, promptConfig]
  );

  const disablePromptKind = useCallback(
    (kind: FacePromptKind) => {
      disabledPromptKindsRef.current.add(kind);
      if (activePromptRef.current?.kind === kind) clearActivePrompt();
    },
    [clearActivePrompt]
  );

  const requestDemoPrompt = useCallback((kind: FacePromptKind) => {
    const prompt: ActiveFacePrompt = {
      kind,
      reason: "Manually requested in face-assist demo mode.",
      demo: true,
    };
    activePromptRef.current = prompt;
    setActivePrompt(prompt);
  }, []);

  const startRestBreak = useCallback(() => {
    clearActivePrompt();
    breakEndsAtRef.current = performance.now() + 20_000;
    setBreakRemainingSeconds(20);
  }, [clearActivePrompt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = performance.now();
      const telemetry = latestTelemetryRef.current;

      const captureSession = captureRef.current;
      if (captureSession) {
        if (telemetry && trackingQuality === "Good" && cameraStatus === "Active") {
          captureSession.samples.push(asFaceTelemetry(telemetry));
        }
        const elapsed = now - captureSession.startedAtMs;
        const progress = Math.min(100, Math.round((elapsed / BASELINE_DURATION_MS) * 100));
        setCapture((previous) => ({
          ...previous,
          progress,
          sampleCount: captureSession.samples.length,
        }));
        if (elapsed >= BASELINE_DURATION_MS) {
          captureRef.current = null;
          if (captureSession.samples.length >= BASELINE_MINIMUM_SAMPLES) {
            const nextBaseline = createPersonalFaceBaseline(captureSession.samples, now);
            baselineRef.current = nextBaseline;
            setBaseline(nextBaseline);
            engineStateRef.current = createFaceAnalysisState(now);
            promptStateRef.current = createFacePromptPolicyState(promptConfig);
            setCapture({
              status: "ready",
              progress: 100,
              sampleCount: captureSession.samples.length,
              message: "Personal baseline ready for this browser session.",
            });
          } else {
            setCapture({
              status: "failed",
              progress: 0,
              sampleCount: captureSession.samples.length,
              message: "Not enough reliable samples. Improve lighting and try again.",
            });
          }
        }
      }

      const breakActive = breakEndsAtRef.current > now;
      if (breakActive) {
        setBreakRemainingSeconds(Math.max(1, Math.ceil((breakEndsAtRef.current - now) / 1000)));
      } else if (breakEndsAtRef.current > 0) {
        breakEndsAtRef.current = 0;
        restTakenRef.current = true;
        setBreakRemainingSeconds(0);
      }

      const pageVisible = document.visibilityState === "visible";
      const effectiveReadingActive =
        enabled && readingActive && pageVisible && !breakActive;
      const update = updateFaceAnalysis(
        engineStateRef.current,
        {
          nowMs: now,
          telemetry: telemetry ? asFaceTelemetry(telemetry) : null,
          trackingConfidence: confidenceFor(trackingQuality, cameraStatus),
          baseline: baselineRef.current,
          readingActive: effectiveReadingActive,
        },
        analysisConfig
      );
      engineStateRef.current = update.state;
      setObservation(update.observation);

      const position = positionRef.current;
      position.regressions = position.regressions.filter(
        (timestamp) => now - timestamp <= 20_000
      );
      const dwellThresholdMs = demoMode ? 6_000 : 8_000;
      const nextReadingDifficulty =
        effectiveReadingActive &&
        isCalibrated &&
        (now - position.activeSinceMs >= dwellThresholdMs ||
          position.regressions.length >= 2);
      setReadingDifficultySignal((previous) =>
        previous === nextReadingDifficulty ? previous : nextReadingDifficulty
      );

      const promptUpdate = updateFacePromptPolicy(
        promptStateRef.current,
        {
          nowMs: now,
          observation: update.observation,
          readingDifficultySignal: nextReadingDifficulty,
          readingActive: effectiveReadingActive,
          promptsAllowed:
            enabled && !promptsBlocked && !activePromptRef.current && !breakActive,
          restTaken: restTakenRef.current,
        },
        promptConfig
      );
      restTakenRef.current = false;
      promptStateRef.current = promptUpdate.state;
      const decision = promptUpdate.decision;
      if (decision && !disabledPromptKindsRef.current.has(decision.kind)) {
        const prompt: ActiveFacePrompt = {
          kind: decision.kind,
          reason: decision.reason,
          demo: false,
        };
        activePromptRef.current = prompt;
        setActivePrompt(prompt);
      }
    }, FACE_UPDATE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [
    analysisConfig,
    cameraStatus,
    demoMode,
    enabled,
    isCalibrated,
    latestTelemetryRef,
    promptConfig,
    promptsBlocked,
    readingActive,
    trackingQuality,
  ]);

  return {
    baseline,
    observation,
    capture,
    readingDifficultySignal,
    activePrompt,
    breakRemainingSeconds,
    startBaselineCapture,
    dismissPrompt: clearActivePrompt,
    snoozePrompt,
    disablePromptKind,
    requestDemoPrompt,
    startRestBreak,
  };
}

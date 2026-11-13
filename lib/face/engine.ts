import type {
  FaceAnalysisConfig,
  FaceAnalysisObservation,
  FaceAnalysisPhase,
  FaceAnalysisState,
  FaceAnalysisUpdate,
  FaceFeatureVector,
  FaceFrameInput,
  FaceTelemetry,
  PersonalFaceBaseline,
  RelativeFaceFeatures,
  StrainSignal,
  TrackingGate,
} from "./types";

export const DEFAULT_FACE_ANALYSIS_CONFIG: Readonly<FaceAnalysisConfig> = {
  unavailableConfidenceBelow: 0.35,
  goodConfidenceAtOrAbove: 0.72,
  sessionWarmUpMs: 90_000,
  smoothingTimeConstantMs: 400,
  maxUpdateGapMs: 1_000,
  postureYawThresholdDeg: 15,
  posturePitchThresholdDeg: 12,
  postureRollThresholdDeg: 10,
  postureFaceCenterXThreshold: 0.1,
  postureFaceCenterYThreshold: 0.1,
  postureFaceWidthRatioThreshold: 0.25,
  postureSustainMs: 15_000,
  strainBrowDownDelta: 0.07,
  strainEyeSquintDelta: 0.08,
  strainMouthPressDelta: 0.08,
  strainJawOpenDelta: 0.14,
  strainBlinkDelta: 0.14,
  strainPrimaryMinimumSignals: 1,
  strainSupportingMinimumWithOnePrimary: 0,
  strainSustainMs: 2_000,
  strainReleaseGraceMs: 450,
};

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normaliseTelemetry(telemetry: FaceTelemetry): FaceFeatureVector {
  return {
    yawDeg: finiteOrZero(telemetry.yawDeg),
    pitchDeg: finiteOrZero(telemetry.pitchDeg),
    rollDeg: finiteOrZero(telemetry.rollDeg),
    blink: clamp01(telemetry.blink),
    jawOpen: clamp01(telemetry.jawOpen),
    browDown: clamp01(telemetry.browDown),
    eyeSquint: clamp01(telemetry.eyeSquint),
    mouthPress: clamp01(telemetry.mouthPress),
    faceWidth: clamp01(telemetry.faceWidth),
    faceCenterX: clamp01(telemetry.faceCenterX),
    faceCenterY: clamp01(telemetry.faceCenterY),
  };
}

function median(samples: readonly FaceTelemetry[], key: keyof FaceFeatureVector): number {
  const values = samples
    .map((sample) => normaliseTelemetry(sample)[key])
    .sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? values[middle]
    : (values[middle - 1] + values[middle]) * 0.5;
}

/** Builds a personal neutral reference from one or more deliberately captured samples. */
export function createPersonalFaceBaseline(
  samples: readonly FaceTelemetry[],
  capturedAtMs: number,
): PersonalFaceBaseline {
  if (samples.length === 0) {
    throw new Error("A personal face baseline requires at least one sample.");
  }
  return {
    yawDeg: median(samples, "yawDeg"),
    pitchDeg: median(samples, "pitchDeg"),
    rollDeg: median(samples, "rollDeg"),
    blink: median(samples, "blink"),
    jawOpen: median(samples, "jawOpen"),
    browDown: median(samples, "browDown"),
    eyeSquint: median(samples, "eyeSquint"),
    mouthPress: median(samples, "mouthPress"),
    faceWidth: median(samples, "faceWidth"),
    faceCenterX: median(samples, "faceCenterX"),
    faceCenterY: median(samples, "faceCenterY"),
    capturedAtMs: finiteOrZero(capturedAtMs),
    sampleCount: samples.length,
  };
}

export function createFaceAnalysisState(sessionStartedAtMs: number): FaceAnalysisState {
  const start = finiteOrZero(sessionStartedAtMs);
  return {
    sessionStartedAtMs: start,
    lastUpdatedAtMs: start,
    activeReadingMs: 0,
    smoothed: null,
    postureConditionSinceMs: null,
    strainConditionSinceMs: null,
    strainLastEvidenceAtMs: null,
  };
}

function classifyTrackingGate(confidence: number, config: FaceAnalysisConfig): TrackingGate {
  const value = clamp01(confidence);
  if (value < config.unavailableConfidenceBelow) return "unavailable";
  if (value < config.goodConfidenceAtOrAbove) return "limited";
  return "good";
}

function smoothFeatures(
  previous: FaceFeatureVector | null,
  current: FaceFeatureVector,
  deltaMs: number,
  timeConstantMs: number,
): FaceFeatureVector {
  if (!previous || timeConstantMs <= 0) return current;
  const alpha = 1 - Math.exp(-Math.max(0, deltaMs) / timeConstantMs);
  const blend = (before: number, after: number) => before + alpha * (after - before);
  return {
    yawDeg: blend(previous.yawDeg, current.yawDeg),
    pitchDeg: blend(previous.pitchDeg, current.pitchDeg),
    rollDeg: blend(previous.rollDeg, current.rollDeg),
    blink: blend(previous.blink, current.blink),
    jawOpen: blend(previous.jawOpen, current.jawOpen),
    browDown: blend(previous.browDown, current.browDown),
    eyeSquint: blend(previous.eyeSquint, current.eyeSquint),
    mouthPress: blend(previous.mouthPress, current.mouthPress),
    faceWidth: blend(previous.faceWidth, current.faceWidth),
    faceCenterX: blend(previous.faceCenterX, current.faceCenterX),
    faceCenterY: blend(previous.faceCenterY, current.faceCenterY),
  };
}

function relativeToBaseline(
  current: FaceFeatureVector,
  baseline: PersonalFaceBaseline,
): RelativeFaceFeatures {
  return {
    yawDeg: current.yawDeg - baseline.yawDeg,
    pitchDeg: current.pitchDeg - baseline.pitchDeg,
    rollDeg: current.rollDeg - baseline.rollDeg,
    blink: current.blink - baseline.blink,
    jawOpen: current.jawOpen - baseline.jawOpen,
    browDown: current.browDown - baseline.browDown,
    eyeSquint: current.eyeSquint - baseline.eyeSquint,
    mouthPress: current.mouthPress - baseline.mouthPress,
    faceWidth: current.faceWidth - baseline.faceWidth,
    faceCenterX: current.faceCenterX - baseline.faceCenterX,
    faceCenterY: current.faceCenterY - baseline.faceCenterY,
    faceWidthRatio:
      baseline.faceWidth > 1e-6
        ? current.faceWidth / baseline.faceWidth - 1
        : 0,
  };
}

function phaseFor(
  baseline: PersonalFaceBaseline | null,
  trackingGate: TrackingGate,
  activeReadingMs: number,
  config: FaceAnalysisConfig,
): FaceAnalysisPhase {
  if (!baseline) return "baseline-required";
  if (trackingGate === "unavailable") return "tracking-unavailable";
  if (trackingGate === "limited") return "tracking-limited";
  if (activeReadingMs < config.sessionWarmUpMs) return "warming-up";
  return "monitoring";
}

function conditionDuration(nowMs: number, sinceMs: number | null): number {
  return sinceMs === null ? 0 : Math.max(0, nowMs - sinceMs);
}

function emptyObservation(
  phase: FaceAnalysisPhase,
  trackingGate: TrackingGate,
  activeReadingMs: number,
  relative: RelativeFaceFeatures | null,
): FaceAnalysisObservation {
  return {
    phase,
    trackingGate,
    activeReadingMs,
    relative,
    postureConditionMs: 0,
    strainConditionMs: 0,
    postureDeviationCandidate: false,
    cognitiveStrainCandidate: false,
    activeStrainSignals: [],
  };
}

/**
 * Pure, deterministic frame update. It identifies candidates only; it does not
 * infer emotion, diagnose posture, or decide that a reader is confused.
 */
export function updateFaceAnalysis(
  previous: FaceAnalysisState,
  input: FaceFrameInput,
  config: FaceAnalysisConfig = DEFAULT_FACE_ANALYSIS_CONFIG,
): FaceAnalysisUpdate {
  const requestedNow = finiteOrZero(input.nowMs);
  const nowMs = Math.max(previous.lastUpdatedAtMs, requestedNow);
  const elapsedMs = Math.min(
    Math.max(0, nowMs - previous.lastUpdatedAtMs),
    Math.max(0, config.maxUpdateGapMs),
  );
  const activeReadingMs = previous.activeReadingMs + (input.readingActive ? elapsedMs : 0);
  const trackingGate = input.telemetry
    ? classifyTrackingGate(input.trackingConfidence, config)
    : "unavailable";

  const current = input.telemetry ? normaliseTelemetry(input.telemetry) : null;
  const smoothed =
    current && trackingGate === "good"
      ? smoothFeatures(previous.smoothed, current, elapsedMs, config.smoothingTimeConstantMs)
      : previous.smoothed;
  const relative = smoothed && input.baseline
    ? relativeToBaseline(smoothed, input.baseline)
    : null;
  const phase = phaseFor(input.baseline, trackingGate, activeReadingMs, config);

  if (phase !== "monitoring" || !input.readingActive || !relative) {
    const state: FaceAnalysisState = {
      ...previous,
      lastUpdatedAtMs: nowMs,
      activeReadingMs,
      smoothed,
      postureConditionSinceMs: null,
      strainConditionSinceMs: null,
      strainLastEvidenceAtMs: null,
    };
    return {
      state,
      observation: emptyObservation(phase, trackingGate, activeReadingMs, relative),
    };
  }

  const postureExceeded =
    Math.abs(relative.yawDeg) >= config.postureYawThresholdDeg ||
    Math.abs(relative.pitchDeg) >= config.posturePitchThresholdDeg ||
    Math.abs(relative.rollDeg) >= config.postureRollThresholdDeg ||
    Math.abs(relative.faceCenterX) >= config.postureFaceCenterXThreshold ||
    Math.abs(relative.faceCenterY) >= config.postureFaceCenterYThreshold ||
    Math.abs(relative.faceWidthRatio) >= config.postureFaceWidthRatioThreshold;
  const postureConditionSinceMs = postureExceeded
    ? previous.postureConditionSinceMs ?? nowMs
    : null;

  const primaryStrainSignals: StrainSignal[] = [];
  if (relative.browDown >= config.strainBrowDownDelta) primaryStrainSignals.push("brow-down");
  if (relative.eyeSquint >= config.strainEyeSquintDelta) primaryStrainSignals.push("eye-squint");
  if (relative.mouthPress >= config.strainMouthPressDelta) primaryStrainSignals.push("mouth-press");

  // Blink and jaw opening are supporting evidence only. Jaw opening is already
  // used as a gesture elsewhere, so it can never create a candidate by itself.
  const supportingStrainSignals: StrainSignal[] = [];
  if (Math.abs(relative.blink) >= config.strainBlinkDelta) supportingStrainSignals.push("blink-change");
  if (relative.jawOpen >= config.strainJawOpenDelta) supportingStrainSignals.push("jaw-open");
  const activeStrainSignals = [...primaryStrainSignals, ...supportingStrainSignals];
  // A sustained primary signal can form a candidate. It still cannot request
  // assistance by itself: the prompt policy also requires reading evidence.
  const strainExceeded =
    primaryStrainSignals.length >= config.strainPrimaryMinimumSignals ||
    (primaryStrainSignals.length >= 1 &&
      supportingStrainSignals.length >= config.strainSupportingMinimumWithOnePrimary);
  const strainWithinReleaseGrace =
    !strainExceeded &&
    previous.strainLastEvidenceAtMs !== null &&
    nowMs - previous.strainLastEvidenceAtMs <= config.strainReleaseGraceMs;
  const strainConditionSinceMs =
    strainExceeded || strainWithinReleaseGrace
      ? previous.strainConditionSinceMs ?? nowMs
      : null;
  const strainLastEvidenceAtMs = strainExceeded
    ? nowMs
    : strainWithinReleaseGrace
    ? previous.strainLastEvidenceAtMs
    : null;

  const postureConditionMs = conditionDuration(nowMs, postureConditionSinceMs);
  const strainConditionMs = conditionDuration(nowMs, strainConditionSinceMs);
  const state: FaceAnalysisState = {
    ...previous,
    lastUpdatedAtMs: nowMs,
    activeReadingMs,
    smoothed,
    postureConditionSinceMs,
    strainConditionSinceMs,
    strainLastEvidenceAtMs,
  };

  return {
    state,
    observation: {
      phase,
      trackingGate,
      activeReadingMs,
      relative,
      postureConditionMs,
      strainConditionMs,
      postureDeviationCandidate: postureConditionMs >= config.postureSustainMs,
      cognitiveStrainCandidate: strainConditionMs >= config.strainSustainMs,
      activeStrainSignals,
    },
  };
}

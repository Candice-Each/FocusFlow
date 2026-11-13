import type { GazeTelemetry } from "../types";

/** The face-related subset already produced by the shared MediaPipe pipeline. */
export type FaceTelemetry = Pick<
  GazeTelemetry,
  | "yawDeg"
  | "pitchDeg"
  | "rollDeg"
  | "blink"
  | "jawOpen"
  | "browDown"
  | "eyeSquint"
  | "mouthPress"
  | "faceWidth"
  | "faceCenterX"
  | "faceCenterY"
>;

export interface FaceFeatureVector {
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  blink: number;
  jawOpen: number;
  browDown: number;
  eyeSquint: number;
  mouthPress: number;
  faceWidth: number;
  faceCenterX: number;
  faceCenterY: number;
}

/** A person-specific neutral reading reference, never a population norm. */
export interface PersonalFaceBaseline extends FaceFeatureVector {
  capturedAtMs: number;
  sampleCount: number;
}

export type TrackingGate = "unavailable" | "limited" | "good";

export type FaceAnalysisPhase =
  | "baseline-required"
  | "warming-up"
  | "tracking-unavailable"
  | "tracking-limited"
  | "monitoring";

export type StrainSignal =
  | "brow-down"
  | "eye-squint"
  | "mouth-press"
  | "blink-change"
  | "jaw-open";

export type RelativeFaceFeatures = FaceFeatureVector & {
  /** Proportional change from baseline; 0.2 means the detected face is 20% wider. */
  faceWidthRatio: number;
};

export interface FaceAnalysisConfig {
  unavailableConfidenceBelow: number;
  goodConfidenceAtOrAbove: number;
  sessionWarmUpMs: number;
  smoothingTimeConstantMs: number;
  maxUpdateGapMs: number;
  postureYawThresholdDeg: number;
  posturePitchThresholdDeg: number;
  postureRollThresholdDeg: number;
  postureFaceCenterXThreshold: number;
  postureFaceCenterYThreshold: number;
  postureFaceWidthRatioThreshold: number;
  postureSustainMs: number;
  strainBrowDownDelta: number;
  strainEyeSquintDelta: number;
  strainMouthPressDelta: number;
  strainJawOpenDelta: number;
  strainBlinkDelta: number;
  strainPrimaryMinimumSignals: number;
  strainSupportingMinimumWithOnePrimary: number;
  strainSustainMs: number;
}

export interface FaceAnalysisState {
  sessionStartedAtMs: number;
  lastUpdatedAtMs: number;
  activeReadingMs: number;
  smoothed: FaceFeatureVector | null;
  postureConditionSinceMs: number | null;
  strainConditionSinceMs: number | null;
}

export interface FaceFrameInput {
  nowMs: number;
  telemetry: FaceTelemetry | null;
  /** Normalised upstream confidence in the inclusive range 0..1. */
  trackingConfidence: number;
  baseline: PersonalFaceBaseline | null;
  readingActive: boolean;
}

export interface FaceAnalysisObservation {
  phase: FaceAnalysisPhase;
  trackingGate: TrackingGate;
  activeReadingMs: number;
  relative: RelativeFaceFeatures | null;
  postureConditionMs: number;
  strainConditionMs: number;
  postureDeviationCandidate: boolean;
  cognitiveStrainCandidate: boolean;
  activeStrainSignals: readonly StrainSignal[];
}

export interface FaceAnalysisUpdate {
  state: FaceAnalysisState;
  observation: FaceAnalysisObservation;
}

export type FacePromptKind = "posture" | "understanding" | "rest";

export interface PromptCooldowns {
  posture: number;
  understanding: number;
  rest: number;
}

export interface FacePromptPolicyConfig {
  cooldownMs: PromptCooldowns;
  restAfterActiveReadingMs: number;
  restRepeatActiveReadingMs: number;
  priority: readonly FacePromptKind[];
}

export interface FacePromptPolicyState {
  lastIssuedAtMs: Record<FacePromptKind, number | null>;
  nextRestDueAtActiveReadingMs: number;
}

export interface FacePromptPolicyInput {
  nowMs: number;
  observation: FaceAnalysisObservation;
  /** A separate reading signal, such as long dwell or repeated regression. */
  readingDifficultySignal: boolean;
  readingActive: boolean;
  promptsAllowed: boolean;
  /** Set only when the application knows that a break was completed. */
  restTaken?: boolean;
}

export interface FacePromptDecision {
  kind: FacePromptKind;
  issuedAtMs: number;
  reason: string;
}

export interface FacePromptPolicyUpdate {
  state: FacePromptPolicyState;
  decision: FacePromptDecision | null;
  eligible: Readonly<Record<FacePromptKind, boolean>>;
}

export interface GazeTelemetry {
  features: number[]; yawDeg: number; pitchDeg: number; rollDeg: number;
  blink: number; jawOpen: number; browDown: number;
  rU: number; rV: number; lU: number; lV: number;
  lookH: number; lookV: number;
}
export interface GazePoint {
  x: number; y: number; snappedX: number; snappedY: number;
  rawY: number; biasY: number;
}
export interface ClauseSegment {
  text: string; clauseId: number; startX: number; endX: number; isClauseEnd: boolean;
}
export interface VisualLine {
  segments: ClauseSegment[]; clauseCount: number; wordCount: number;
  charCount: number; widthRatio: number; isParaStart: boolean; isParaEnd: boolean;
}
export interface ChapterDoc { title: string; content: string }
export interface WinState { visible: boolean; x: number; y: number; w: number; h: number }
export interface ToastNotification { title: string; detail?: string }
export type RightCardId = "speed" | "sensing" | "settings" | "gesture" | "voice";
export interface FaceBaseline { yaw: number; pitch: number; roll: number; jaw: number }
export interface ReadingStats {
  wpm: number; cpm: number; lineProgressPct: number;
  rightZoneLatched: boolean; currentLineIdx: number;
}
export type CameraStatus = "Active" | "Initializing" | "Permission Denied" | "No-Camera Mode";
export type TrackingQuality = "Good" | "Limited" | "Unavailable";
export interface CalibCollection {
  targetX: number; targetY: number; settle: number; remaining: number; total: number;
}
export interface CalibrationSamples { X: number[][]; Y: number[][] }
export interface ReadingLayout { pages: VisualLine[][]; pageIdx: number }
export interface GazeTrackingConfig {
  meshShowVideoBg: boolean; heatmapDecayMode: boolean; heatmapUseRawY: boolean;
  gestureControl: boolean; faceAssist: boolean; noCameraMode: boolean;
  isOffScreenPaused: boolean; showReturnConfirm: boolean; clauseMenuOpen: boolean;
  isNight: boolean; nextSens: number; prevSens: number; skipSens: number; lineHeightPx: number;
}
export interface GazeTrackingState {
  currentLine: number; currentClauseId: number; biasY: number;
  recentX: number[]; maxLineX: number; reachedRightZone: boolean;
  lastSweepTime: number; lineEnterTime: number;
  forwardCandidateId: number; forwardStartTime: number;
  backwardCandidateId: number; backwardStartTime: number;
  verticalJumpStartTime: number;
  wpmEma: number; cpmEma: number;
  mouthOpenStart: number; lastMouthTrigger: number;
  faceLostStart: number; prevBlink: number; blinkEma: number; blinkCooldownUntil: number;
  telQueue: GazeTelemetry[];
}
export function createGazeTrackingState(): GazeTrackingState {
  return {
    currentLine: 0, currentClauseId: 0, biasY: 0, recentX: [], maxLineX: 0,
    reachedRightZone: false, lastSweepTime: 0, lineEnterTime: 0,
    forwardCandidateId: -1, forwardStartTime: 0,
    backwardCandidateId: -1, backwardStartTime: 0, verticalJumpStartTime: 0,
    wpmEma: 190, cpmEma: 950, mouthOpenStart: 0, lastMouthTrigger: 0,
    faceLostStart: 0, prevBlink: 0, blinkEma: 0.1, blinkCooldownUntil: 0, telQueue: [],
  };
}
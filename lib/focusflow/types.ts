export type FocusFlowRoute =
  | "home"
  | "login"
  | "signup"
  | "shelf"
  | "guide"
  | "week"
  | "lab"
  | "reading";

export type BookModalityCategory =
  | "Gaze"
  | "Flow"
  | "Posture"
  | "Gesture"
  | "Voice"
  | "Saved";

export interface BookItem {
  id: string;
  title: string;
  author: string;
  category: BookModalityCategory;
  coverColor: string;
  spineColor: string;
  textColor?: string;
  content?: string;
  homeTags?: string[];
}

export interface HardwareCalibrationState {
  cameraTested: boolean;
  gazeCalibrated: boolean;
  postureRecorded: boolean;
  postureBaselineText: string;
  micTested: boolean;
  lastRecognisedText: string;
}

export const DEFAULT_HARDWARE_STATE: HardwareCalibrationState = {
  cameraTested: false,
  gazeCalibrated: false,
  postureRecorded: false,
  postureBaselineText: "Not recorded",
  micTested: false,
  lastRecognisedText: "",
};
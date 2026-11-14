/**
 * Events produced by a recognizer adapter (Web Speech API, mock, cloud ASR).
 *
 * Mirrors the Java `SpeechEvent` of voice-assist: the engine below only ever
 * consumes these, so swapping recognizers never touches command logic.
 */
export type SpeechEvent =
  | { kind: "wake" }
  | { kind: "partial"; text: string }
  | { kind: "final"; text: string }
  | { kind: "error"; code: SpeechErrorCode; message?: string };

export type SpeechErrorCode =
  | "NO_SPEECH"
  | "NO_PERMISSION"
  | "NO_MICROPHONE"
  | "NETWORK"
  | "ABORTED"
  | "UNKNOWN";

export function classifySpeechError(rawError: string, message?: string): SpeechErrorCode {
  switch (rawError) {
    case "no-speech":
      return "NO_SPEECH";
    case "not-allowed":
    case "service-not-allowed":
      return "NO_PERMISSION";
    case "audio-capture":
      return "NO_MICROPHONE";
    case "network":
      return "NETWORK";
    case "aborted":
      return "ABORTED";
    default:
      return /microphone/i.test(message ?? "") ? "NO_MICROPHONE" : "UNKNOWN";
  }
}

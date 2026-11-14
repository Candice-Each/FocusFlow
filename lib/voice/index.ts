export {
  DEFAULT_VOICE_CONFIG,
  type CommandId,
  type ParsedCommand,
  type VoiceAction,
  type VoiceConfig,
  type VoiceEngineState,
  type VoiceMode,
} from "./commands";
export { VoiceAssistant, type VoiceAssistantOptions } from "./voice-assistant";
export { parseIntent, parseTranscript } from "./intent-parser";
export {
  canonicalizeCommand,
  normalizeCommandText,
  cleanNoteText,
  RECOGNITION_HINTS,
} from "./normalize";
export { matchWakeWord, type WakeMatch } from "./wake-word";
export {
  createReaderSnapshot,
  isFirstPage,
  isLastPage,
  isFirstLine,
  isLastLine,
  type ReaderSnapshot,
} from "./reader-context";
export { Throttle } from "./throttle";
export {
  classifySpeechError,
  type SpeechEvent,
  type SpeechErrorCode,
} from "./speech-event";
export {
  createWebSpeechHandle,
  getSpeechRecognitionCtor,
  isWebSpeechSupported,
  type WebSpeechHandle,
} from "./web-speech";

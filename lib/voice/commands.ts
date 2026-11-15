/**
 * Command vocabulary.
 *
 * `CommandId` is the behavioural contract between the parser and the host.
 * Add a member here and the host's exhaustive switch stops compiling until it
 * is handled — the same guarantee the Java `VoiceAction` sealed interface gives.
 */
export type CommandId =
  // line
  | "NEXT_LINE"
  | "PREV_LINE"
  | "SKIP_LINES_FORWARD"
  | "SKIP_LINES_BACK"
  // page
  | "NEXT_PAGE"
  | "PREV_PAGE"
  | "FIRST_PAGE"
  | "LAST_PAGE"
  // chapter
  | "NEXT_CHAPTER"
  | "PREV_CHAPTER"
  // menu
  | "OPEN_MENU"
  | "CLOSE_MENU"
  // narration
  | "READ_LINE"
  | "READ_PARAGRAPH"
  | "STOP_READING"
  // font
  | "FONT_BIGGER"
  | "FONT_SMALLER"
  // notes / marks
  | "BOOKMARK_LINE"
  | "OPEN_NOTES"
  | "HIGHLIGHT_SENTENCE"
  | "UNDERLINE_SENTENCE"
  | "COPY_SENTENCE"
  // timer
  | "PAUSE_READING"
  | "RESUME_READING"
  // dictation
  | "START_DICTATION"
  | "STOP_DICTATION"
  // meta
  | "CANCEL"
  | "HELP";

export interface ParsedCommand {
  id: CommandId;
  /** Lines to move when the command is SKIP_LINES_FORWARD / SKIP_LINES_BACK. */
  count?: number;
  /** The canonical phrase that matched, for logs and debugging. */
  matched: string;
}

export interface ParserHit {
  command: ParsedCommand;
  /** True when a wake word was required and found. */
  wakeWordUsed: boolean;
}

export interface VoiceConfig {
  wakeWords: ReadonlyArray<string>;
  /** A wake word only arms the parser for this long. */
  wakeWindowMs: number;
  /** Same command inside this window is dropped. */
  throttleMs: number;
  /** Command channel ignores utterances longer than this (treated as free text). */
  maxCommandChars: number;
  /**
   * When false the engine behaves like a push-to-talk session: the host already
   * decided the user is talking, so no wake word is needed.
   */
  requireWakeWord: boolean;
  dictationWakeWords: ReadonlyArray<string>;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  wakeWords: ["hey focus", "okay focus", "focus"],
  wakeWindowMs: 4500,
  throttleMs: 1000,
  maxCommandChars: 90,
  requireWakeWord: true,
  dictationWakeWords: ["stop dictation", "stop note", "end note", "finish note"],
};

export type VoiceMode = "Read" | "Notes";
export type VoiceEngineState = "IDLE" | "ARMED" | "DICTATING";

/** What the host should do, produced by `VoiceAssistant.drain()`. */
export type VoiceAction =
  | { kind: "COMMAND"; command: ParsedCommand }
  | { kind: "DICTATION_START" }
  | { kind: "DICTATION_APPEND"; text: string }
  | { kind: "DICTATION_END"; text: string }
  | { kind: "PREVIEW"; text: string }
  | {
      kind: "PROMPT";
      message: string;
      /**
       * `info` – a normal boundary/context notice ("already on the last page").
       * `error` – the utterance was not understood at all, or the recognizer failed.
       * Hosts may play a different cue for each.
       */
      severity?: "info" | "error";
    }
  | { kind: "STATUS"; state: VoiceEngineState; mode: VoiceMode };

/** Trimmed truthy helper used all over the engine. */
export function isNonEmpty(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

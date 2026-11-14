import {
  DEFAULT_VOICE_CONFIG,
  isNonEmpty,
  type ParsedCommand,
  type VoiceAction,
  type VoiceConfig,
  type VoiceEngineState,
  type VoiceMode,
} from "./commands";
import { parseIntent } from "./intent-parser";
import { canonicalizeCommand, cleanNoteText } from "./normalize";
import { matchWakeWord } from "./wake-word";
import { Throttle } from "./throttle";
import {
  isFirstLine,
  isFirstPage,
  isLastLine,
  isLastPage,
  type ReaderSnapshot,
} from "./reader-context";
import type { SpeechEvent } from "./speech-event";

export interface VoiceAssistantOptions {
  config?: Partial<VoiceConfig>;
  /** Verbose trace for the voice log / console. */
  onTrace?: (line: string) => void;
}

/** A fragment kept across two finals, e.g. "hey" then "focus next line". */
interface PendingClause {
  matched: string;
  at: number;
}

/**
 * The facade. Hosts push `SpeechEvent`s in and drain `VoiceAction`s out.
 *
 * ```
 * engine.setMode("Read");
 * engine.receive({ kind: "final", text: "hey focus next line" });
 * for (const action of engine.drain()) { ... }
 * ```
 *
 * No mic, no DOM, no timers — `now` is injected so every branch is testable.
 */
export class VoiceAssistant {
  readonly config: VoiceConfig;
  private state: VoiceEngineState = "IDLE";
  private mode: VoiceMode = "Read";
  private queue: VoiceAction[] = [];
  private readonly throttle: Throttle;
  /** -Infinity so a clock starting at 0 still counts as "never armed". */
  private armedUntil = Number.NEGATIVE_INFINITY;
  /** Half-clause kept when the ASR splits "hey" and "focus next line". */
  private pendingClause: PendingClause | null = null;
  private dictationBuffer: string[] = [];
  private dictationFinalized = false;
  private readonly onTrace?: (line: string) => void;
  private lastPartial = "";
  private snapshot: ReaderSnapshot | null = null;

  constructor(options: VoiceAssistantOptions = {}) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...options.config };
    this.throttle = new Throttle(this.config.throttleMs);
    this.onTrace = options.onTrace;
  }

  get engineState(): VoiceEngineState {
    return this.state;
  }

  get currentMode(): VoiceMode {
    return this.mode;
  }

  /**
   * Switch modes. Leaving Notes finalises whatever was dictated so far, so a
   * host flip never silently discards the accumulated transcript.
   */
  /**
   * Switch modes. The engine owns the mode; the host mirrors it.
   *
   * Leaving Notes finalises the accumulated note first, but `finishDictation`
   * no longer touches `mode`, so this is the only place the mode changes.
   */
  setMode(mode: VoiceMode, now = Date.now()): void {
    if (this.mode === mode) {
      // Same mode: only make sure the state matches the mode. Entering Notes
      // again should not wipe an in-progress transcript.
      const expected: VoiceEngineState = mode === "Notes" ? "DICTATING" : "IDLE";
      if (this.state !== expected) {
        this.state = expected;
        this.queue.push({ kind: "STATUS", state: this.state, mode: this.mode });
      }
      return;
    }

    if (this.mode === "Notes" && mode !== "Notes") {
      this.finishDictation();
    }

    this.mode = mode;
    if (mode === "Notes") {
      this.dictationBuffer = [];
      this.dictationFinalized = false;
      this.state = "DICTATING";
    } else {
      this.state = "IDLE";
    }
    this.queue.push({ kind: "STATUS", state: this.state, mode: this.mode });
    this.trace(`mode → ${mode} (state ${this.state})`);
    void now;
  }

  /** Push one recognizer event. */
  receive(event: SpeechEvent, now = Date.now()): void {
    switch (event.kind) {
      case "error":
        this.trace(`asr error ${event.code}${event.message ? ` – ${event.message}` : ""}`);
        this.queue.push({
          kind: "PROMPT",
          message: this.describeError(event.code),
          severity: "error",
        });
        return;
      case "wake":
        this.arm(now);
        return;
      case "partial":
        this.handlePartial(event.text, now);
        return;
      case "final":
        this.handleFinal(event.text, now);
        return;
    }
  }

  /** Take everything queued since the last drain. */
  drain(): VoiceAction[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  reset(): void {
    this.state = "IDLE";
    this.queue = [];
    this.pendingClause = null;
    this.dictationBuffer = [];
    this.dictationFinalized = false;
    this.lastPartial = "";
    this.throttle.reset();
  }

  // ── event handlers ───────────────────────────────────────────────────────

  private arm(now: number): void {
    this.armedUntil = now + this.config.wakeWindowMs;
    if (this.state !== "DICTATING") this.state = "ARMED";
    this.trace("wake word heard");
  }

  private handlePartial(text: string, now: number): void {
    const cleaned = text.trim();
    if (!cleaned || cleaned === this.lastPartial) return;
    this.lastPartial = cleaned;

    if (this.state === "DICTATING") {
      // Partials preview only; nothing is committed until final.
      this.queue.push({ kind: "PREVIEW", text: cleaned });
      return;
    }
    this.queue.push({ kind: "PREVIEW", text: cleaned });
    void now;
  }

  private handleFinal(rawText: string, now: number): void {
    if (!isNonEmpty(rawText)) {
      this.trace("empty final ignored");
      return;
    }
    this.lastPartial = "";
    const text = rawText.trim();
    this.trace(`final "${text}"`);

    if (this.state === "DICTATING") {
      this.consumeDictation(text, now);
      return;
    }

    this.consumeCommand(text, now);
  }

  // ── command channel ──────────────────────────────────────────────────────

  private consumeCommand(text: string, now: number): void {
    const wake = matchWakeWord(canonicalizeCommand(text), this.config);
    let body: string;
    let usedWake = false;

    if (wake.matched) {
      usedWake = true;
      if (!wake.rest) {
        this.arm(now);
        return;
      }
      body = wake.rest;
      this.armedUntil = now + this.config.wakeWindowMs;
    } else if (this.config.requireWakeWord && now > this.armedUntil) {
      this.pendingClause = null;
      this.trace(`ignored (not armed): "${text}"`);
      return;
    } else {
      body = canonicalizeCommand(text);
    }

    // Split wake word: "hey" alone, then "focus next line".
    if (this.config.requireWakeWord && !usedWake) {
      const glued = this.tryGlue(body, now);
      if (glued) {
        body = glued.body;
        usedWake = true;
      }
    }

    if (body.length > this.config.maxCommandChars) {
      this.trace(`ignored (too long, treated as free text): ${body.slice(0, 40)}…`);
      return;
    }
    if (!body) return;

    const parsed = parseIntent(body);
    if (!parsed) {
      const half = this.rememberHalfCommand(body, now);
      if (half) {
        this.trace(`half command remembered: "${body}"`);
      } else {
        this.queue.push({
          kind: "PROMPT",
          message: `Not a command: “${text}”`,
          severity: "error",
        });
        this.trace(`no intent for "${body}"`);
      }
      return;
    }

    if (usedWake) this.armedUntil = now + this.config.wakeWindowMs;
    const ok = this.applyGuards(parsed);
    if (!ok) return;

    if (!this.throttle.tryTake(parsed.id, now)) {
      this.trace(`throttled: ${parsed.id}`);
      return;
    }

    this.pendingClause = null;
    this.queue.push({ kind: "COMMAND", command: parsed });
    this.trace(`command ${parsed.id} ← "${parsed.matched}"`);
  }

  /**
   * "hey" / "hey focus" gets split into two finals by the recognizer. Keep the
   * fragment so the next final can be checked as its continuation.
   */
  private rememberHalfCommand(body: string, now: number): boolean {
    const words = body.split(" ").filter(Boolean);
    if (words.length !== 1) return false;
    const [word] = words;
    const isWakeFragment = this.config.wakeWords.some((wake) =>
      wake.split(" ").includes(word)
    );
    if (!isWakeFragment) return false;
    this.pendingClause = { matched: word, at: now };
    return true;
  }

  private tryGlue(body: string, now: number): { body: string } | null {
    if (!this.pendingClause) return null;
    const fragment = this.pendingClause.matched;
    const expired = now - this.pendingClause.at > this.config.wakeWindowMs;
    this.pendingClause = null;
    if (expired) return null;
    const joined = canonicalizeCommand(`${fragment} ${body}`);
    const wake = matchWakeWord(joined, this.config);
    if (!wake.matched) return null;
    return { body: wake.rest || joined };
  }

  /** Context / boundary rules. Returns false when the command was replaced. */
  private applyGuards(parsed: ParsedCommand): boolean {
    const snapshot = this.snapshot;
    switch (parsed.id) {
      case "NEXT_PAGE":
        if (snapshot && isLastPage(snapshot)) {
          this.queue.push({ kind: "PROMPT", message: "Already on the last page.", severity: "info" });
          return false;
        }
        return true;
      case "PREV_PAGE":
        if (snapshot && isFirstPage(snapshot)) {
          this.queue.push({ kind: "PROMPT", message: "Already on the first page.", severity: "info" });
          return false;
        }
        return true;
      case "NEXT_LINE":
        if (snapshot && isLastLine(snapshot)) {
          this.queue.push({ kind: "PROMPT", message: "End of this page.", severity: "info" });
          return false;
        }
        return true;
      case "PREV_LINE":
        if (snapshot && isFirstLine(snapshot)) {
          this.queue.push({ kind: "PROMPT", message: "Top of this page.", severity: "info" });
          return false;
        }
        return true;
      case "COPY_SENTENCE":
      case "HIGHLIGHT_SENTENCE":
      case "UNDERLINE_SENTENCE":
      case "BOOKMARK_LINE":
        if (snapshot && !snapshot.hasActiveSentence) {
          this.queue.push({ kind: "PROMPT", message: "No sentence selected yet.", severity: "info" });
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  // ── dictation channel ────────────────────────────────────────────────────

  /**
   * Notes mode.
   *
   * Dictation is deliberately command-free so spoken prose is never executed
   * as an action. Two exceptions:
   *
   * 1. A bare phrase from `dictationWakeWords` always works, so the user can
   *    leave immediately ("stop dictation").
   * 2. Any other mode switch needs the wake word, so quoted speech such as
   *    "this read mode is annoying" is still recorded as a note:
   *
   *      "hey focus change to read mode" → leave dictation
   *      "hey focus start dictation"     → already dictating (info prompt)
   */
  private consumeDictation(text: string, now: number): void {
    const canonical = canonicalizeCommand(text);

    if (matchesAnyPhrase(canonical, this.config.dictationWakeWords)) {
      this.leaveDictation();
      return;
    }

    const wake = matchWakeWord(canonical, this.config);
    if (wake.matched && wake.rest) {
      const parsed = parseIntent(wake.rest);
      if (parsed?.id === "STOP_DICTATION") {
        this.trace("mode switch via wake word → read mode");
        this.leaveDictation();
        return;
      }
      if (parsed?.id === "START_DICTATION") {
        this.queue.push({ kind: "PROMPT", message: "Already dictating.", severity: "info" });
        return;
      }
    }

    if (!isNonEmpty(text)) return;
    const cleaned = cleanNoteText(text);
    if (!cleaned) return;
    this.dictationBuffer.push(cleaned);
    this.queue.push({ kind: "DICTATION_APPEND", text: cleaned });
    this.trace(`note += "${cleaned}"`);
    void now;
  }

  /** Spoken exit from dictation: close the note *and* go back to Read mode. */
  private leaveDictation(): void {
    this.finishDictation();
    this.setMode("Read");
  }

  /**
   * End dictation. This only leaves the DICTATING state — the current mode is
   * owned by `setMode`. Having this method force `mode = "Read"` caused spoken
   * mode switches to bounce: the host called finishDictation() (flipping to
   * Read) and then setMode("Notes") in the same tick.
   */
  finishDictation(): void {
    if (this.dictationFinalized) return;
    this.dictationFinalized = true;
    const joined = this.dictationBuffer.join(" ").trim();
    this.dictationBuffer = [];
    if (joined) {
      this.queue.push({ kind: "DICTATION_END", text: joined });
      this.trace(`dictation ended (${joined.length} chars)`);
    }
    if (this.state === "DICTATING") {
      this.state = "IDLE";
      this.queue.push({ kind: "STATUS", state: this.state, mode: this.mode });
      this.trace(`dictation ended (mode stays ${this.mode})`);
    }
  }

  beginDictation(): void {
    this.dictationBuffer = [];
    this.dictationFinalized = false;
    this.state = "DICTATING";
    this.queue.push({ kind: "DICTATION_START" });
    this.queue.push({ kind: "STATUS", state: this.state, mode: this.mode });
    this.trace("dictation started");
  }

  // ── host-provided context ────────────────────────────────────────────────

  /**
   * Push the current reader state before each `receive()`. Cheap on purpose:
   * the host already owns the numbers, voice only reads them.
   */
  sync(snapshot: ReaderSnapshot): void {
    this.snapshot = snapshot;
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private describeError(code: string): string {
    switch (code) {
      case "NO_PERMISSION":
        return "Microphone permission denied – allow it in the browser settings.";
      case "NO_MICROPHONE":
        return "No microphone detected.";
      case "NO_SPEECH":
        return "No speech detected – try again.";
      case "NETWORK":
        return "Speech service unreachable.";
      default:
        return "Recognition failed – tap Retry.";
    }
  }

  private trace(line: string): void {
    this.onTrace?.(line);
  }
}

/** Whole-word containment test for a phrase list. */
function matchesAnyPhrase(canonical: string, phrases: ReadonlyArray<string>): boolean {
  return phrases.some((phrase) => {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(phrase)}($|\\s)`);
    return pattern.test(canonical);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

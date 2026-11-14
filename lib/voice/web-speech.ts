import {
  classifySpeechError,
  type SpeechEvent,
  type SpeechErrorCode,
} from "./speech-event";

/**
 * Adapter around the browser Web Speech API.
 *
 * This file is the only place that knows about `webkitSpeechRecognition`. It
 * emits `SpeechEvent`s and nothing else, so the engine stays testable and a
 * different recognizer (cloud ASR, WebGPU Whisper) can be dropped in later.
 *
 * Two recoveries are built in, both learned from the Java bridge:
 *
 * - `continuous` is on and the session is restarted when the browser ends it;
 * - a partial that never turns into a final after `stalePartialMs` is promoted
 *   to a final, otherwise the UI would show text that never acts.
 */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  phrases?: ReadonlyArray<{ phrase: string; boost?: number }>;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface WebSpeechOptions {
  lang?: string;
  hints?: ReadonlyArray<string>;
  /** Promote a long-standing partial to a final. */
  stalePartialMs?: number;
}

export interface WebSpeechHandle {
  start(): boolean;
  stop(): void;
  isRunning(): boolean;
  dispose(): void;
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isWebSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function createWebSpeechHandle(
  emit: (event: SpeechEvent) => void,
  options: WebSpeechOptions = {}
): WebSpeechHandle | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const staleMs = options.stalePartialMs ?? 2200;
  const lang = options.lang ?? "en-US";

  let recognition: SpeechRecognitionLike | null = null;
  let running = false;
  let disposed = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let staleTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPartial = "";
  let consecutiveErrors = 0;

  const clearStale = () => {
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = null;
  };

  const flushPartial = () => {
    if (lastPartial) {
      const text = lastPartial;
      lastPartial = "";
      emit({ kind: "final", text });
    }
  };

  const build = () => {
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    if (options.hints && options.hints.length > 0 && "phrases" in rec) {
      // Best-effort contextual biasing. Ignored by browsers without it.
      try {
        rec.phrases = options.hints.map((phrase) => ({ phrase, boost: 5 }));
      } catch {
        // ignore – optional API
      }
    }

    rec.onstart = () => {
      consecutiveErrors = 0;
    };

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = String(result[0]?.transcript ?? "").trim();
        if (!text) continue;
        if (result.isFinal) {
          clearStale();
          lastPartial = "";
          emit({ kind: "final", text });
        } else {
          interim += `${text} `;
        }
      }
      if (interim.trim()) {
        lastPartial = interim.trim();
        emit({ kind: "partial", text: lastPartial });
        clearStale();
        staleTimer = setTimeout(() => {
          if (lastPartial) {
            const text = lastPartial;
            lastPartial = "";
            emit({ kind: "final", text });
          }
        }, staleMs);
      }
    };

    rec.onerror = (event) => {
      const code: SpeechErrorCode = classifySpeechError(event.error, event.message);
      // Benign noises: the session simply restarts.
      if (code === "NO_SPEECH" || code === "ABORTED") return;
      consecutiveErrors += 1;
      emit({ kind: "error", code, message: event.message });
      if (consecutiveErrors >= 5) {
        running = false;
      }
    };

    rec.onend = () => {
      if (disposed || !running) return;
      flushPartial();
      // Back off a little so a broken service is not hammered.
      const delay = Math.min(3000, 250 * consecutiveErrors + 200);
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (disposed || !running) return;
        try {
          rec.start();
        } catch {
          // "already started" – harmless
        }
      }, delay);
    };

    return rec;
  };

  return {
    start() {
      if (running) return true;
      recognition = build();
      running = true;
      try {
        recognition.start();
        emit({ kind: "wake" });
        return true;
      } catch {
        running = false;
        emit({ kind: "error", code: "UNKNOWN" });
        return false;
      }
    },
    stop() {
      running = false;
      clearStale();
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = null;
      try {
        recognition?.stop();
      } catch {
        // ignore
      }
    },
    isRunning() {
      return running;
    },
    dispose() {
      disposed = true;
      running = false;
      clearStale();
      if (restartTimer) clearTimeout(restartTimer);
      try {
        recognition?.abort();
      } catch {
        // ignore
      }
      recognition = null;
    },
  };
}

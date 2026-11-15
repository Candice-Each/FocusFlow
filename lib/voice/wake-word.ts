/**
 * Decide whether an utterance starts with a wake word ("hey focus …").
 *
 * Ported from voice-assist's `WakeWordMatcher` and adapted to English:
 *
 * - Only the start of the utterance is inspected.
 * - Exact match wins, then the same phrase with filler words removed
 *   ("hey there focus"), then a single substituted word.
 * - A bare wake word ("hey focus") arms the engine and returns an empty body.
 * - The stripped body never starts inside the wake word: "focus" alone is a
 *   wake word, "focused on it" is not.
 */
import type { VoiceConfig } from "./commands";

export interface WakeMatch {
  matched: boolean;
  /** Utterance with the wake word removed. Empty means "just the wake word". */
  rest: string;
  wakeWord: string;
}

const FILLER = /\b(hey|hi|hello|okay|ok|yo|um|uh)\b/g;

function stripFiller(text: string): string {
  return text.replace(FILLER, "").replace(/\s+/g, " ").trim();
}

export function matchWakeWord(text: string, config: VoiceConfig): WakeMatch {
  const canonical = text.trim().toLowerCase();
  if (!canonical) return { matched: false, rest: "", wakeWord: "" };

  // 1. Exact prefix, whole-word boundary on the right.
  for (const wake of config.wakeWords) {
    if (canonical === wake) {
      return { matched: true, rest: "", wakeWord: wake };
    }
    if (canonical.startsWith(`${wake} `)) {
      return { matched: true, rest: canonical.slice(wake.length + 1).trim(), wakeWord: wake };
    }
  }

  // 2. Filler words removed from both sides ("hey there, focus" → "focus …").
  //    The bare name must then still be a whole-word prefix.
  const collapsed = stripFiller(canonical);
  for (const wake of config.wakeWords) {
    const bareName = stripFiller(wake);
    if (!bareName) continue;
    if (collapsed === bareName) {
      return { matched: true, rest: "", wakeWord: wake };
    }
    if (collapsed.startsWith(`${bareName} `)) {
      return { matched: true, rest: collapsed.slice(bareName.length + 1).trim(), wakeWord: wake };
    }
  }
  // Filler only in the middle of the wake phrase: "hey there focus next line".
  for (const wake of config.wakeWords) {
    const pattern = wake
      .split(" ")
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+(?:\\w+\\s+)*");
    const m = new RegExp(`^${pattern}(?:\\s+|$)`).exec(canonical);
    if (m) {
      return { matched: true, rest: canonical.slice(m[0].length).trim(), wakeWord: wake };
    }
  }

  // 3. One substituted word ("hey foucs next line"), same word count only.
  const words = canonical.split(" ").filter(Boolean);
  for (const wake of config.wakeWords) {
    const wakeWords = wake.split(" ");
    if (words.length < wakeWords.length) continue;
    let misses = 0;
    for (let i = 0; i < wakeWords.length; i += 1) {
      if (words[i] !== wakeWords[i]) misses += 1;
    }
    // Multi-word wake phrases tolerate one miss; a single-word wake word does
    // not, otherwise every near-homophone becomes a wake trigger.
    if (wakeWords.length > 1 && misses === 1) {
      return {
        matched: true,
        rest: words.slice(wakeWords.length).join(" ").trim(),
        wakeWord: wake,
      };
    }
  }

  return { matched: false, rest: canonical, wakeWord: "" };
}

/** True when the whole utterance is only wake words / filler, no command body. */
export function isBareWakeWord(text: string, config: VoiceConfig): boolean {
  const canonical = text.trim().toLowerCase();
  if (!canonical) return false;
  const collapsed = stripFiller(canonical);
  return config.wakeWords.some((wake) => {
    const bare = stripFiller(wake);
    return bare !== "" && (canonical === wake || collapsed === bare);
  });
}

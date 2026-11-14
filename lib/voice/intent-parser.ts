import { canonicalizeCommand } from "./normalize";
import type { CommandId, ParsedCommand } from "./commands";

interface Rule {
  id: CommandId;
  /** Any of these canonical phrases matches. Longest / most specific first. */
  phrases: ReadonlyArray<string>;
  /** Dynamic match, e.g. "skip 3 lines" — runs before the phrase table. */
  match?: (canonical: string) => ParsedCommand | null;
}

const RULES: ReadonlyArray<Rule> = [
  // ── Mode switching (must come before generic dictation phrases) ──────────
  {
    id: "STOP_DICTATION",
    phrases: [
      "stop dictation", "stop note", "end note", "finish note", "done note",
      "exit dictation", "leave dictation", "stop listening",
      "switch to read mode", "change to read mode", "go to read mode",
      "back to read mode", "read mode please", "resume reading mode",
    ],
  },
  {
    id: "START_DICTATION",
    phrases: [
      "start dictation", "start note", "take a note", "voice note", "dictate",
      "switch to notes mode", "change to notes mode", "go to notes mode",
      "back to notes mode",
      "switch to note mode", "change to note mode", "go to note mode",
      "open notes mode",
    ],
  },

  // ── Line movement (specific before generic "next") ───────────────────────
  {
    id: "SKIP_LINES_BACK",
    phrases: [],
    match: (c) => {
      const m = /\bskip (\w+) lines? back(ward)?\b/.exec(c) ?? /\bback (\w+) lines?\b/.exec(c);
      return m ? { id: "SKIP_LINES_BACK", count: readCount(m[1]), matched: m[0] } : null;
    },
  },
  {
    id: "SKIP_LINES_FORWARD",
    phrases: [],
    match: (c) => {
      const m = /\bskip (\w+) lines?( forward| ahead)?\b/.exec(c) ?? /\bforward (\w+) lines?\b/.exec(c);
      return m ? { id: "SKIP_LINES_FORWARD", count: readCount(m[1]), matched: m[0] } : null;
    },
  },
  {
    id: "NEXT_LINE",
    phrases: ["next line", "following line", "move down one line", "down one line", "line down"],
  },
  {
    id: "PREV_LINE",
    phrases: ["previous line", "last line", "move up one line", "up one line", "line up", "go back a line"],
  },

  // ── Page movement ────────────────────────────────────────────────────────
  { id: "NEXT_PAGE", phrases: ["next page", "page down", "turn page", "turn the page", "go forward", "move forward"] },
  { id: "PREV_PAGE", phrases: ["previous page", "page up", "go back", "back page", "turn back", "move backward"] },
  { id: "FIRST_PAGE", phrases: ["first page", "go to start", "go to the beginning", "beginning of the book"] },
  { id: "LAST_PAGE", phrases: ["last page", "go to end", "go to the end", "end of the book"] },

  // ── Chapter ──────────────────────────────────────────────────────────────
  { id: "NEXT_CHAPTER", phrases: ["next chapter", "following chapter"] },
  { id: "PREV_CHAPTER", phrases: ["previous chapter", "last chapter", "back chapter"] },

  // ── Menu ─────────────────────────────────────────────────────────────────
  { id: "CLOSE_MENU", phrases: ["close menu", "hide menu", "dismiss menu", "close the menu"] },
  {
    id: "OPEN_MENU",
    phrases: ["open menu", "open the menu", "select", "selection menu", "quick actions", "show menu"],
  },

  // ── Narration ────────────────────────────────────────────────────────────
  { id: "STOP_READING", phrases: ["stop reading", "stop narration", "stop the audio", "pause audio", "stop"] },
  {
    id: "READ_PARAGRAPH",
    phrases: ["read this paragraph", "read paragraph", "read the paragraph", "read page", "read this page", "read aloud"],
  },
  {
    id: "READ_LINE",
    phrases: ["read this line", "read line", "read the line", "read this sentence", "read sentence", "read this"],
  },

  // ── Font ─────────────────────────────────────────────────────────────────
  {
    id: "FONT_BIGGER",
    phrases: ["font bigger", "bigger font", "increase font size", "increase font", "larger font", "font up", "zoom in", "bigger text"],
  },
  {
    id: "FONT_SMALLER",
    phrases: ["font smaller", "smaller font", "decrease font size", "decrease font", "smaller text", "font down", "zoom out"],
  },

  // ── Marks & notes ────────────────────────────────────────────────────────
  {
    id: "BOOKMARK_LINE",
    phrases: ["save this line", "bookmark this line", "bookmark this sentence", "save this sentence", "add bookmark"],
  },
  { id: "OPEN_NOTES", phrases: ["open notes", "show notes", "notes panel", "open my notes"] },
  {
    id: "HIGHLIGHT_SENTENCE",
    phrases: ["highlight this sentence", "highlight this line", "highlight sentence", "highlight"],
  },
  {
    id: "UNDERLINE_SENTENCE",
    phrases: ["underline this sentence", "underline this line", "underline sentence", "underline"],
  },
  {
    id: "COPY_SENTENCE",
    phrases: ["copy this sentence", "copy this line", "copy sentence", "copy this"],
  },

  // ── Timer ────────────────────────────────────────────────────────────────
  { id: "RESUME_READING", phrases: ["resume reading", "resume session", "continue reading", "resume"] },
  { id: "PAUSE_READING", phrases: ["pause reading", "pause session", "pause timer", "pause"] },

  // ── Meta ─────────────────────────────────────────────────────────────────
  { id: "CANCEL", phrases: ["cancel", "never mind", "forget it", "undo", "go back one step"] },
  { id: "HELP", phrases: ["help", "what can i say", "show commands", "voice help"] },
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, couple: 2,
};

function readCount(raw: string | undefined): number {
  if (!raw) return 1;
  const digits = Number.parseInt(raw, 10);
  if (Number.isFinite(digits) && digits > 0) return Math.min(digits, 20);
  const word = NUMBER_WORDS[raw];
  return word ? word : 1;
}

/**
 * Match a canonicalised transcript against the rule table.
 *
 * Rules are ordered specific → generic, and a phrase must appear as a whole
 * word sequence (not a substring), so "bookmark line ten" does not fire
 * NEXT_LINE.
 */
export function parseIntent(canonical: string): ParsedCommand | null {
  if (!canonical) return null;

  for (const rule of RULES) {
    if (rule.match) {
      const hit = rule.match(canonical);
      if (hit) return hit;
    }
    for (const phrase of rule.phrases) {
      if (hasWholePhrase(canonical, phrase)) {
        return { id: rule.id, matched: phrase };
      }
    }
  }
  return null;
}

function hasWholePhrase(text: string, phrase: string): boolean {
  const idx = text.indexOf(phrase);
  if (idx === -1) return false;
  const before = idx === 0 ? " " : text[idx - 1];
  const after = idx + phrase.length >= text.length ? " " : text[idx + phrase.length];
  if (!/[\s]/.test(before) || !/[\s]/.test(after)) return false;
  return true;
}

/** Public helper for hosts that want to parse one raw utterance. */
export function parseTranscript(raw: string): ParsedCommand | null {
  return parseIntent(canonicalizeCommand(raw));
}

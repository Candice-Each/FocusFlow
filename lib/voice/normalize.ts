/**
 * Normalisation pipeline for English reading commands.
 *
 * Three layers, each independent and order-dependent:
 *
 * 1. **Punctuation + case** — the ASR inserts commas at pauses, so "Next,
 *    line." must become "next line".
 * 2. **Homophones** — whole-word rewrites only, so a real "flip" in a book
 *    title is never touched.
 * 3. **Colloquial padding** — "could you please take me to the next page"
 *    loses its politeness.
 *
 * Anything between quotes is a title and is preserved verbatim (apart from
 * case). This mirrors voice-assist's 《书名号》 protection.
 */

const HOMOPHONES: ReadonlyArray<readonly [string, string]> = [
  // line / page
  ["land", "line"],
  ["lime", "line"],
  ["lynn", "line"],
  ["lien", "line"],
  ["pages", "page"],
  ["paige", "page"],
  ["payge", "page"],
  // back / forward
  ["forwards", "forward"],
  ["four wards", "forward"],
  // chapter
  ["chapters", "chapter"],
  ["chap ter", "chapter"],
  // notes / menu / font
  ["knows", "notes"],
  ["nods", "notes"],
  ["minute", "menu"],
  ["many you", "menu"],
  ["fount", "font"],
  // read / narration
  ["reed", "read"],
  ["paragraphs", "paragraph"],
  ["paragraf", "paragraph"],
  // pause / resume
  ["pose", "pause"],
  ["paws", "pause"],
  ["risky", "resume"],
  // marks
  ["highlighted", "highlight"],
  ["underlined", "underline"],
  ["coppie", "copy"],
  ["boomark", "bookmark"],
];

/** Polite / verbose forms removed before matching, longest first. */
const COLLOQUIAL: ReadonlyArray<readonly [string, string]> = [
  ["what is on the ", ""],
  ["take me to the ", ""],
  ["take me to ", ""],
  ["take me back to ", ""],
  ["could you please ", ""],
  ["would you please ", ""],
  ["could you ", ""],
  ["can you ", ""],
  ["would you ", ""],
  ["please ", ""],
  ["i want to ", ""],
  ["i would like to ", ""],
  ["i'd like to ", ""],
  // NOTE: "go to" / "move to" / "switch to" are stripped only when followed by
  // a navigation target (see COLLOQUIAL_TARGETED below), so mode changes such
  // as "switch to notes mode" keep their verb.
  ["bring up the ", ""],
  ["bring up ", ""],
  ["pull up the ", ""],
  ["pull up ", ""],
  ["call up the ", ""],
  ["call up ", ""],
  ["show me the ", ""],
  ["show me ", ""],
  ["make the ", ""],
  ["make ", ""],
  ["a bit ", ""],
  ["a little ", ""],
  // terse forms
  ["next one", "next page"],
  ["previous one", "previous page"],
  ["last one", "previous page"],
  ["the next", "next"],
  ["the previous", "previous"],
  ["the page", "page"],
  ["the menu", "menu"],
  ["the line", "line"],
  ["the sentence", "sentence"],
];

const TITLE_OPEN = "'\"\u201c";
const TITLE_CLOSE = "'\"\u201d";

/** Split text into [literal, title, literal, title, …] slices. */
function splitTitles(text: string): Array<{ title: boolean; value: string }> {
  const out: Array<{ title: boolean; value: string }> = [];
  let i = 0;
  let literalStart = 0;

  while (i < text.length) {
    if (TITLE_OPEN.includes(text[i])) {
      const start = i;
      let j = i + 1;
      while (j < text.length && !TITLE_CLOSE.includes(text[j])) j += 1;
      if (j < text.length) {
        if (start > literalStart) {
          out.push({ title: false, value: text.slice(literalStart, start) });
        }
        out.push({ title: true, value: text.slice(start + 1, j) });
        i = j + 1;
        literalStart = i;
        continue;
      }
    }
    i += 1;
  }
  if (literalStart < text.length) {
    out.push({ title: false, value: text.slice(literalStart) });
  }
  return out;
}

/** Titles are kept but marked with a sentinel so later passes can restore them. */
function mapLiterals(
  text: string,
  transform: (literal: string) => string
): string {
  return splitTitles(text)
    .map((part) =>
      part.title
        ? `\u0001${part.value}\u0002`
        : transform(part.value)
    )
    .join("");
}

function restoreTitles(text: string): string {
  return text.replace(/\u0001([\s\S]*?)\u0002/g, (_, title: string) => title.trim());
}

function applyHomophones(text: string): string {
  let out = text;
  for (const [from, to] of [...HOMOPHONES].sort((a, b) => b[0].length - a[0].length)) {
    out = out.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  return out;
}

/** Verbs that only lose their padding when a navigation target follows. */
const NAV_TARGETS =
  "next|previous|prev|first|last|the next|the previous|the page|the menu|the line|the sentence";

const COLLOQUIAL_TARGETED: ReadonlyArray<RegExp> = [
  new RegExp(`\\b(?:go|move|jump|turn|switch|take me) to (?:the )?(?=${NAV_TARGETS}\\b)`, "g"),
];

function applyColloquial(text: string): string {
  let out = text;
  for (const [from, to] of COLLOQUIAL) {
    out = out.split(from).join(to);
  }
  for (const pattern of COLLOQUIAL_TARGETED) {
    out = out.replace(pattern, "");
  }
  return out;
}

function stripPunctuation(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Command channel: lower-case, no punctuation, colloquial padding removed. */
export function canonicalizeCommand(raw: string): string {
  const lowered = raw.toLowerCase();
  let working = mapLiterals(lowered, (literal) => stripPunctuation(literal));
  working = mapLiterals(working, applyHomophones);
  working = mapLiterals(working, applyColloquial);
  working = mapLiterals(working, (literal) => literal.replace(/\s+/g, " ").trim());
  return restoreTitles(working).replace(/\s+/g, " ").trim();
}

/** Backwards-compatible alias used by older call sites. */
export function normalizeCommandText(raw: string): string {
  return stripPunctuation(raw);
}

/** Notes channel keeps punctuation; only whitespace is tidied and a period added. */
export function cleanNoteText(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Canonical phrases fed to Web Speech `phrases` biasing. */
export const RECOGNITION_HINTS: ReadonlyArray<string> = [
  "hey focus",
  "next line", "previous line", "next page", "previous page",
  "next chapter", "previous chapter", "first page", "last page",
  "open menu", "close menu", "read this line", "read this paragraph",
  "stop reading", "pause reading", "resume reading",
  "font bigger", "font smaller", "increase font size", "decrease font size",
  "save this line", "bookmark this line", "open notes",
  "highlight this sentence", "underline this sentence", "copy this sentence",
  "skip three lines", "start dictation", "stop dictation",
];

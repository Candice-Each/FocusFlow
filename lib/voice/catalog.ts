/**
 * User-facing catalogue of voice commands.
 *
 * Phrases are derived from `RULES` in `intent-parser.ts`, so the guide can
 * never advertise a command the parser does not accept. Grouping, labels and
 * the display order live here because they are presentation concerns.
 *
 * Adding a `CommandId` without a `CATALOG_META` entry is a type error.
 */
import type { CommandId } from "./commands";
import { RULES } from "./intent-parser";

export type CommandGroup =
  | "Navigate"
  | "Chapter"
  | "Menu"
  | "Narrate"
  | "Text"
  | "Marks"
  | "Timer"
  | "Mode"
  | "Meta";

export interface CommandMeta {
  group: CommandGroup;
  /** Short title shown in the list, sentence case ("Next line"). */
  label: string;
  /** One-line explanation shown under the label in the command list. */
  description: string;
  /**
   * Rough usage frequency. Lower sorts first under the "All" tab so the most
   * likely commands stay at the top; explicit group tabs keep rule order.
   */
  priority: number;
  /** Takes a spoken count ("skip three lines"). */
  numberArg?: boolean;
}

export const CATALOG_META: Record<CommandId, CommandMeta> = {
  NEXT_PAGE: { group: "Navigate", label: "Next page", description: "Turn to the next page", priority: 1 },
  NEXT_LINE: { group: "Navigate", label: "Next line", description: "Move the active sentence down one row", priority: 2 },
  START_DICTATION: { group: "Mode", label: "Start dictation", description: "Switch to Notes mode and start a voice note", priority: 3 },
  READ_LINE: { group: "Narrate", label: "Read this line", description: "Start narration from the active sentence", priority: 4 },
  STOP_READING: { group: "Narrate", label: "Stop reading", description: "End the narration that is currently playing", priority: 5 },
  FONT_BIGGER: { group: "Text", label: "Font bigger", description: "Increase the reading font size", priority: 6 },
  FONT_SMALLER: { group: "Text", label: "Font smaller", description: "Decrease the reading font size", priority: 7 },
  PREV_PAGE: { group: "Navigate", label: "Previous page", description: "Turn back to the previous page", priority: 8 },
  SKIP_LINES_FORWARD: {
    group: "Navigate",
    label: "Skip forward",
    description: "Jump ahead by a number of lines",
    priority: 9,
    numberArg: true,
  },
  PREV_LINE: { group: "Navigate", label: "Previous line", description: "Move the active sentence up one row", priority: 10 },
  OPEN_MENU: { group: "Menu", label: "Open menu", description: "Show the sentence action bar", priority: 11 },
  BOOKMARK_LINE: { group: "Marks", label: "Bookmark this line", description: "Save the active sentence as a bookmark", priority: 12 },
  HIGHLIGHT_SENTENCE: { group: "Marks", label: "Highlight sentence", description: "Highlight the sentence you are on", priority: 13 },
  PAUSE_READING: { group: "Timer", label: "Pause session", description: "Pause the reading session", priority: 14 },
  STOP_DICTATION: { group: "Mode", label: "Stop dictation", description: "Finish the voice note and return to reading", priority: 15 },
  RESUME_READING: { group: "Timer", label: "Resume session", description: "Resume a paused reading session", priority: 16 },
  NEXT_CHAPTER: { group: "Chapter", label: "Next chapter", description: "Move on to the following chapter", priority: 17 },
  COPY_SENTENCE: { group: "Marks", label: "Copy sentence", description: "Copy the active sentence to the clipboard", priority: 18 },
  UNDERLINE_SENTENCE: { group: "Marks", label: "Underline sentence", description: "Underline the sentence you are on", priority: 19 },
  OPEN_NOTES: { group: "Marks", label: "Open notes", description: "Open the notes panel", priority: 20 },
  SKIP_LINES_BACK: {
    group: "Navigate",
    label: "Skip back",
    description: "Jump back by a number of lines",
    priority: 21,
    numberArg: true,
  },
  FIRST_PAGE: { group: "Navigate", label: "First page", description: "Go to the very first page", priority: 22 },
  LAST_PAGE: { group: "Navigate", label: "Last page", description: "Go to the final page", priority: 23 },
  PREV_CHAPTER: { group: "Chapter", label: "Previous chapter", description: "Return to the chapter before this one", priority: 24 },
  CLOSE_MENU: { group: "Menu", label: "Close menu", description: "Dismiss the sentence action bar", priority: 25 },
  CANCEL: { group: "Meta", label: "Cancel", description: "Undo the current menu action", priority: 26 },
  HELP: { group: "Meta", label: "Help", description: "List the available voice commands", priority: 27 },
  READ_PARAGRAPH: { group: "Narrate", label: "Read this page", description: "Read the whole page aloud", priority: 28 },
};

/**
 * Tab order for the group filter. "Mode" is last so the Mode shortcut buttons
 * are a deliberate jump rather than the default landing spot.
 */
export const GROUP_ORDER: ReadonlyArray<CommandGroup> = [
  "Navigate",
  "Chapter",
  "Menu",
  "Narrate",
  "Text",
  "Marks",
  "Timer",
  "Mode",
  "Meta",
];

export interface CommandCatalogEntry {
  id: CommandId;
  group: CommandGroup;
  label: string;
  description: string;
  priority: number;
  numberArg: boolean;
  /** Canonical phrases the parser accepts, in rule order. */
  phrases: ReadonlyArray<string>;
}

function phrasesFor(id: CommandId): string[] {
  const rule = RULES.find((r) => r.id === id);
  return rule ? [...rule.phrases] : [];
}

/** Rule-order index, used to keep explicit group tabs stable. */
const RULE_ORDER: ReadonlyArray<CommandId> = RULES.map((r) => r.id);

export const VOICE_CATALOG: ReadonlyArray<CommandCatalogEntry> = (
  Object.keys(CATALOG_META) as CommandId[]
)
  .map((id) => {
    const meta = CATALOG_META[id];
    return {
      id,
      group: meta.group,
      label: meta.label,
      description: meta.description,
      priority: meta.priority,
      numberArg: Boolean(meta.numberArg),
      phrases: phrasesFor(id),
    };
  })
  .sort((a, b) => a.priority - b.priority);

/** Notes / Read mode shortcut buttons in the right column. */
export const MODE_SHORTCUTS = [
  { label: "Read mode", commandId: "STOP_DICTATION" },
  { label: "Notes mode", commandId: "START_DICTATION" },
] as const satisfies ReadonlyArray<{ label: string; commandId: CommandId }>;

/**
 * Filter the catalogue.
 *
 * Under "All" the list is ordered by `priority` (most used first). Under a
 * specific group the rule order is kept, so a group reads in the same sequence
 * as the phrase table and does not reshuffle between visits.
 */
export function filterCatalog(
  query: string,
  group: CommandGroup | "All"
): CommandCatalogEntry[] {
  const q = query.trim().toLowerCase();
  const matches = VOICE_CATALOG.filter((entry) => {
    if (group !== "All" && entry.group !== group) return false;
    if (!q) return true;
    return (
      entry.label.toLowerCase().includes(q) ||
      entry.id.toLowerCase().includes(q) ||
      entry.phrases.some((p) => p.includes(q))
    );
  });

  if (group === "All") return matches;
  return [...matches].sort(
    (a, b) => RULE_ORDER.indexOf(a.id) - RULE_ORDER.indexOf(b.id)
  );
}

/** Parser phrases are lowercase; show them sentence-cased. */
export function sentenceCase(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

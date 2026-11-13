export interface TranslationResult {
  text: string;
  method: "browser" | "local-fallback";
  note: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

interface BrowserTranslator {
  translate: (text: string) => Promise<string>;
  destroy?: () => void;
}

interface BrowserTranslatorConstructor {
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<BrowserTranslator>;
}

const PLAIN_LANGUAGE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\ba large number of\b/gi, "many"],
  [/\bapproximately\b/gi, "about"],
  [/\bconsequently\b/gi, "so"],
  [/\bnevertheless\b/gi, "even so"],
  [/\bfurthermore\b/gi, "also"],
  [/\btherefore\b/gi, "so"],
  [/\butili[sz]e[sd]?\b/gi, "use"],
  [/\bdemonstrate[sd]?\b/gi, "show"],
  [/\bfacilitate[sd]?\b/gi, "help"],
  [/\bcommence[sd]?\b/gi, "start"],
  [/\bterminate[sd]?\b/gi, "end"],
  [/\bsubsequent\b/gi, "later"],
  [/\bprior to\b/gi, "before"],
  [/\bin the event that\b/gi, "if"],
  [/\bregion of interest\b/gi, "area being tracked"],
  [/\bcognitive load\b/gi, "mental effort"],
  [/\bchops? the page into scraps\b/gi, "breaks the text into disconnected pieces"],
];

const STOP_WORDS = new Set(
  [
    "about", "after", "again", "against", "also", "among", "because", "before",
    "being", "between", "could", "does", "during", "each", "from", "have", "into",
    "itself", "might", "more", "most", "other", "over", "same", "should", "some",
    "such", "than", "that", "their", "them", "then", "there", "these", "they",
    "this", "those", "through", "under", "very", "what", "when", "where", "which",
    "while", "with", "word", "would", "your", "page", "reader", "reading", "sentence", "text",
  ]
);

const TERM_DEFINITIONS: Record<string, string> = {
  algorithm: "A defined sequence of steps used to solve a problem or process data.",
  baseline: "A personal reference measurement used for later comparison.",
  calibration: "The process of adjusting a system using known reference points.",
  clause: "A group of words that expresses one part of a sentence.",
  cognitive: "Related to thinking, understanding, memory, or attention.",
  comprehension: "The process of understanding what is being read.",
  confidence: "A score indicating how reliable a system considers its current result.",
  context: "Surrounding information that helps explain the meaning of something.",
  contextual: "Dependent on the surrounding information or situation.",
  fixation: "A short period during which the eyes remain focused on one location.",
  following: "Tracking or paying attention to something as it continues.",
  gaze: "The direction or location at which a person is looking.",
  interface: "The controls and visual elements through which a user operates a system.",
  modality: "A channel of interaction, such as vision, speech, sound, or gesture.",
  multimodal: "Using more than one interaction or information channel together.",
  opacity: "The degree to which an element blocks what is behind it.",
  peripheral: "Located outside the central area of vision or attention.",
  regression: "A backward eye movement to previously read material.",
  scraps: "Small, disconnected pieces left after something has been divided.",
  chops: "Cuts or divides something into smaller parts.",
  semantic: "Related to the meaning of words, phrases, or information.",
  sustained: "Continuing for a meaningful period rather than occurring briefly.",
  tracking: "Continuously estimating the position or movement of a target.",
  typography: "The visual arrangement and styling of written text.",
};

const DEMO_TRANSLATIONS = new Map<string, string>([
  [
    "following each word chops the page into scraps.",
    "逐词追踪会把页面上的文字切割成彼此分离的片段。",
  ],
  [
    "you end up watching the box as well as the sentence, while the thought you wanted to follow quietly slips into the background of the page.",
    "你最终既要关注提示框，也要阅读句子，而原本想跟随的思路却悄悄退到了页面背景中。",
  ],
  [
    "the region of interest is larger than a word on purpose.",
    "系统有意让关注区域大于单个词语。",
  ],
  [
    "a little room around the sentence allows the eyes to wander naturally while the meaning stays connected to the paragraph around it.",
    "在句子周围保留一些空间，可以让视线自然移动，同时维持它与上下文的意义联系。",
  ],
  [
    "if the gaze stays on the same clause, the page adds a quiet edge.",
    "如果视线持续停留在同一个分句上，页面会添加一个轻微的视觉边界。",
  ],
]);

function normaliseSentence(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?。！？]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function simplifyLocally(sourceText: string): string {
  const source = normaliseSentence(sourceText);
  if (!source) return "No sentence is currently available.";

  let simplified = source;
  for (const [pattern, replacement] of PLAIN_LANGUAGE_REPLACEMENTS) {
    simplified = simplified.replace(pattern, replacement);
  }
  simplified = simplified
    .replace(/\s*;\s*/g, ". ")
    .replace(/\s*—\s*/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  const words = simplified.split(/\s+/);
  if (words.length > 24) {
    const split = simplified.match(
      /^(.{25,}?[,.])\s+(while|although|because|which|whereas|and)\s+(.+)$/i
    );
    if (split) {
      const connector = split[2].toLowerCase();
      const relationship =
        connector === "because"
          ? "Reason"
          : connector === "although" || connector === "whereas"
          ? "Contrast"
          : "Additional point";
      simplified = `${ensureTerminalPunctuation(split[1].replace(/[,]$/, ""))} ${relationship}: ${ensureTerminalPunctuation(split[3])}`;
    }
  }

  if (simplified.toLowerCase() === source.toLowerCase()) {
    const commaParts = source.split(/,\s+/).filter(Boolean);
    if (commaParts.length > 1) {
      simplified = `Main point: ${ensureTerminalPunctuation(commaParts[0])} Detail: ${ensureTerminalPunctuation(commaParts.slice(1).join(", "))}`;
    } else {
      simplified = `Main point: ${ensureTerminalPunctuation(source)}`;
    }
  }

  return simplified;
}

function fallbackTranslation(sourceText: string): TranslationResult {
  const source = normaliseSentence(sourceText);
  const exact = DEMO_TRANSLATIONS.get(source.toLowerCase());
  if (exact) {
    return {
      text: exact,
      method: "local-fallback",
      note: "Produced by the built-in offline demo glossary.",
    };
  }

  const knownTerms = extractKeyTerms(source, 5).filter((item) =>
    Object.prototype.hasOwnProperty.call(TERM_DEFINITIONS, item.term.toLowerCase())
  );
  const glossary = knownTerms.length
    ? knownTerms
        .map((item) => `${item.term}: ${item.definition}`)
        .join("\n")
    : "No matching terms were found in the offline glossary.";

  return {
    text: `完整中文翻译在此浏览器中不可用。离线词义辅助：\n${glossary}`,
    method: "local-fallback",
    note:
      "This is a limited local fallback, not a full translation. Use a browser with the built-in Translator API for arbitrary text.",
  };
}

export async function translateToChinese(
  sourceText: string
): Promise<TranslationResult> {
  const source = normaliseSentence(sourceText);
  if (!source) {
    return {
      text: "没有可翻译的句子。",
      method: "local-fallback",
      note: "No source sentence was available.",
    };
  }

  const translatorConstructor = (
    globalThis as typeof globalThis & {
      Translator?: BrowserTranslatorConstructor;
    }
  ).Translator;

  if (translatorConstructor) {
    let translator: BrowserTranslator | null = null;
    try {
      translator = await translatorConstructor.create({
        sourceLanguage: "en",
        targetLanguage: "zh",
      });
      const translated = await translator.translate(source);
      if (translated.trim()) {
        return {
          text: translated.trim(),
          method: "browser",
          note: "Translated locally with the browser's built-in language model.",
        };
      }
    } catch {
      // Fall through to the explicit limited local fallback.
    } finally {
      translator?.destroy?.();
    }
  }

  return fallbackTranslation(source);
}

export function extractKeyTerms(
  sourceText: string,
  maximumTerms = 4
): KeyTerm[] {
  const tokens = normaliseSentence(sourceText).match(/[A-Za-z][A-Za-z'-]{3,}/g) ?? [];
  const unique = new Map<string, { display: string; score: number }>();

  for (const token of tokens) {
    const key = token.toLowerCase().replace(/['’-]s$/, "");
    if (STOP_WORDS.has(key)) continue;
    let score = Math.min(5, key.length / 2);
    if (TERM_DEFINITIONS[key]) score += 8;
    if (/(tion|sion|ment|ity|ive|ical|ology|metric|scope)$/.test(key)) score += 2;
    if (/^[A-Z]/.test(token)) score += 1;
    const previous = unique.get(key);
    if (!previous || score > previous.score) {
      unique.set(key, { display: token, score });
    }
  }

  return [...unique.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, maximumTerms)
    .map(([key, value]) => ({
      term: value.display,
      definition:
        TERM_DEFINITIONS[key] ??
        `A potentially important content word in this sentence. Re-read the surrounding phrase to confirm its specific meaning here.`,
    }));
}

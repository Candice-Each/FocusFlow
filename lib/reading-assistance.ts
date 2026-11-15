export interface TranslationResult {
  text: string;
  method: "browser" | "local-fallback";
  note: string;
}

export interface KeyTerm {
  term: string;
  chinese: string;
  definitionEn: string;
  definitionZh: string;
}

interface GlossaryEntry {
  chinese: string;
  definitionEn: string;
  definitionZh: string;
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

const TERM_GLOSSARY: Record<string, GlossaryEntry> = {
  algorithm: {
    chinese: "算法",
    definitionEn: "A defined sequence of steps used to solve a problem or process data.",
    definitionZh: "为解决问题或处理数据而设定的一系列步骤。",
  },
  attention: {
    chinese: "注意力",
    definitionEn: "The mental focus given to a particular object or task.",
    definitionZh: "集中在特定对象或任务上的心理资源。",
  },
  background: {
    chinese: "背景；次要位置",
    definitionEn: "The less noticeable area or idea behind the main focus.",
    definitionZh: "位于主要关注对象之后、较不显眼的区域或想法。",
  },
  baseline: {
    chinese: "基准值",
    definitionEn: "A reference measurement used for later comparison.",
    definitionZh: "用于与后续测量结果进行比较的参考值。",
  },
  calibration: {
    chinese: "校准",
    definitionEn: "Adjusting a system using known reference points.",
    definitionZh: "利用已知参考点调整系统的过程。",
  },
  candidate: {
    chinese: "候选信号",
    definitionEn: "A possible signal that still needs supporting evidence.",
    definitionZh: "仍需其他证据支持的可能信号。",
  },
  chops: {
    chinese: "切割；分割",
    definitionEn: "Cuts or divides something into smaller parts.",
    definitionZh: "把某物切开或分成更小的部分。",
  },
  clause: {
    chinese: "分句",
    definitionEn: "A group of words expressing one part of a sentence.",
    definitionZh: "表达句子中某一部分意思的一组词。",
  },
  cognitive: {
    chinese: "认知的",
    definitionEn: "Related to thinking, understanding, memory, or attention.",
    definitionZh: "与思考、理解、记忆或注意有关的。",
  },
  comprehension: {
    chinese: "理解",
    definitionEn: "The process of understanding information or text.",
    definitionZh: "理解信息或文本含义的过程。",
  },
  confidence: {
    chinese: "置信度",
    definitionEn: "A score showing how reliable a system considers a result.",
    definitionZh: "表示系统认为当前结果有多可靠的分数。",
  },
  context: {
    chinese: "上下文",
    definitionEn: "Surrounding information that helps explain meaning.",
    definitionZh: "帮助解释含义的周边信息。",
  },
  contextual: {
    chinese: "上下文相关的",
    definitionEn: "Dependent on the surrounding information or situation.",
    definitionZh: "其含义取决于周围信息或具体情境的。",
  },
  fixation: {
    chinese: "注视",
    definitionEn: "A short period when the eyes remain focused on one location.",
    definitionZh: "眼睛在短时间内持续聚焦于同一位置。",
  },
  following: {
    chinese: "跟随；持续关注",
    definitionEn: "Tracking or paying attention to something as it continues.",
    definitionZh: "随着事物发展而持续追踪或注意它。",
  },
  gaze: {
    chinese: "视线；凝视",
    definitionEn: "The direction or location at which a person is looking.",
    definitionZh: "一个人正在注视的方向或位置。",
  },
  interface: {
    chinese: "界面",
    definitionEn: "The controls and visuals through which a user operates a system.",
    definitionZh: "用户操作系统时使用的控件与视觉元素。",
  },
  modality: {
    chinese: "交互模态",
    definitionEn: "An interaction channel such as vision, speech, sound, or gesture.",
    definitionZh: "视觉、语音、声音或手势等交互渠道。",
  },
  multimodal: {
    chinese: "多模态的",
    definitionEn: "Using more than one interaction or information channel together.",
    definitionZh: "同时使用多个交互或信息渠道的。",
  },
  opacity: {
    chinese: "不透明度",
    definitionEn: "The degree to which an element blocks what is behind it.",
    definitionZh: "元素遮挡其后方内容的程度。",
  },
  peripheral: {
    chinese: "周边的；外围的",
    definitionEn: "Located outside the central area of vision or attention.",
    definitionZh: "位于视觉或注意中心之外的。",
  },
  quietly: {
    chinese: "悄然地；不显眼地",
    definitionEn: "In a way that attracts little attention.",
    definitionZh: "以不易被察觉或不引人注意的方式。",
  },
  regression: {
    chinese: "回视",
    definitionEn: "A backward eye movement to previously read material.",
    definitionZh: "视线返回到先前已读内容的眼动。",
  },
  scraps: {
    chinese: "碎片；零散部分",
    definitionEn: "Small, disconnected pieces left after something is divided.",
    definitionZh: "某物被分割后留下的细小、不连贯部分。",
  },
  semantic: {
    chinese: "语义的",
    definitionEn: "Related to the meaning of words, phrases, or information.",
    definitionZh: "与词语、短语或信息含义有关的。",
  },
  strain: {
    chinese: "紧张；负担",
    definitionEn: "Effort or pressure that makes a task harder to sustain.",
    definitionZh: "使任务更难持续的用力或压力状态。",
  },
  sustained: {
    chinese: "持续的",
    definitionEn: "Continuing for a meaningful period rather than occurring briefly.",
    definitionZh: "持续一段有意义的时间，而不是短暂出现。",
  },
  thought: {
    chinese: "想法；思路",
    definitionEn: "An idea or line of reasoning in the mind.",
    definitionZh: "头脑中的一个想法或推理思路。",
  },
  tracking: {
    chinese: "追踪",
    definitionEn: "Continuously estimating the position or movement of a target.",
    definitionZh: "持续估计目标的位置或移动情况。",
  },
  typography: {
    chinese: "文字排版",
    definitionEn: "The visual arrangement and styling of written text.",
    definitionZh: "书面文字的视觉排列与样式设计。",
  },
  watching: {
    chinese: "观察；注视",
    definitionEn: "Looking at something carefully for a period of time.",
    definitionZh: "在一段时间内认真看着某个对象。",
  },
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

const RELATION_LABELS: Record<string, string> = {
  although: "Contrast",
  because: "Reason",
  but: "Contrast",
  however: "Contrast",
  if: "Condition",
  so: "Result",
  therefore: "Result",
  when: "Condition or time",
  whereas: "Contrast",
  while: "Parallel or contrasting point",
  which: "Supporting detail",
};

function splitMeaningUnits(text: string): Array<{ label: string; text: string }> {
  const units: Array<{ label: string; text: string }> = [];
  const connectorPattern =
    /\s*(?:,\s*)?\b(although|because|but|however|if|so|therefore|when|whereas|while|which)\b\s+/gi;
  let cursor = 0;
  let nextLabel = "Main statement";
  let match: RegExpExecArray | null;

  while ((match = connectorPattern.exec(text)) !== null) {
    const part = text.slice(cursor, match.index).trim().replace(/[,;:]$/, "");
    if (part.split(/\s+/).length >= 2) {
      units.push({ label: nextLabel, text: part });
    }
    nextLabel = RELATION_LABELS[match[1].toLowerCase()] ?? "Supporting detail";
    cursor = connectorPattern.lastIndex;
  }

  const tail = text.slice(cursor).trim();
  if (tail) units.push({ label: nextLabel, text: tail });

  if (units.length <= 1 && /[,;—]/.test(text)) {
    const punctuationParts = text
      .split(/\s*[,;—]\s*/)
      .map((part) => part.trim())
      .filter((part) => part.split(/\s+/).length >= 2);
    if (punctuationParts.length > 1) {
      return punctuationParts.map((part, index) => ({
        label: index === 0 ? "Main statement" : "Supporting detail",
        text: part,
      }));
    }
  }

  return units.length > 0 ? units : [{ label: "Main statement", text }];
}

function chunkForReading(text: string, wordsPerChunk = 6): string {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(words.slice(index, index + wordsPerChunk).join(" "));
  }
  return chunks.join("  /  ");
}

export function simplifyLocally(sourceText: string): string {
  const source = normaliseSentence(sourceText);
  if (!source) return "No sentence is currently available.";

  let plainText = source;
  for (const [pattern, replacement] of PLAIN_LANGUAGE_REPLACEMENTS) {
    plainText = plainText.replace(pattern, replacement);
  }
  plainText = plainText
    .replace(/\s*;\s*/g, ". ")
    .replace(/\s*—\s*/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  const units = splitMeaningUnits(plainText);
  const mainIdea = ensureTerminalPunctuation(units[0]?.text || plainText);
  const wordingChanged = plainText.toLowerCase() !== source.toLowerCase();
  const breakdown = units
    .map(
      (unit, index) =>
        `${index + 1}. ${unit.label}: ${ensureTerminalPunctuation(unit.text)}`
    )
    .join("\n");
  const chunkedText = chunkForReading(plainText);

  if (units.length === 1) {
    return [
      wordingChanged ? "PLAIN VERSION" : "KEY IDEA",
      mainIdea,
      "",
      "READ IN CHUNKS",
      chunkedText,
      "",
      wordingChanged
        ? "Figurative or complex wording was replaced with plainer language."
        : "This sentence already contains one compact idea, so the wording is preserved and divided only into reading chunks.",
    ].join("\n");
  }

  return [
    "MAIN IDEA",
    mainIdea,
    "",
    "BREAKDOWN",
    breakdown,
    "",
    "READ IN CHUNKS",
    chunkedText,
    "",
    wordingChanged
      ? "Common academic or figurative wording was replaced with plainer language."
      : `${units.length} meaning blocks were separated to reduce sentence-processing load.`,
  ].join("\n");
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

  const knownTerms = extractKeyTerms(source, 5);
  const glossary = knownTerms.length
    ? knownTerms
        .map(
          (item) =>
            `${item.term} / ${item.chinese}: ${item.definitionZh}`
        )
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
  const unique = new Map<
    string,
    { display: string; score: number; glossary: GlossaryEntry }
  >();

  for (const token of tokens) {
    const key = token.toLowerCase().replace(/['’-]s$/, "");
    if (STOP_WORDS.has(key)) continue;
    const glossary = TERM_GLOSSARY[key];
    if (!glossary) continue;
    let score = Math.min(5, key.length / 2);
    score += 8;
    if (/(tion|sion|ment|ity|ive|ical|ology|metric|scope)$/.test(key)) score += 2;
    if (/^[A-Z]/.test(token)) score += 1;
    const previous = unique.get(key);
    if (!previous || score > previous.score) {
      unique.set(key, { display: token, score, glossary });
    }
  }

  return [...unique.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, maximumTerms)
    .map(([, value]) => ({
      term: value.display,
      chinese: value.glossary.chinese,
      definitionEn: value.glossary.definitionEn,
      definitionZh: value.glossary.definitionZh,
    }));
}

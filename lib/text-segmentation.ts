import { CLAUSE_GAP_PX } from "./constants";
import type { ClauseSegment, VisualLine } from "./types";

export function countEffectiveWordsAndChars(text: string): {
  words: number;
  chars: number;
} {
  const cjkMatches = text.match(/[\u4e00-\u9fa5]/g) || [];
  const engMatches =
    text
      .replace(/[\u4e00-\u9fa5]/g, " ")
      .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
  const words = engMatches.length + cjkMatches.length / 1.8;
  const chars = text.replace(/\s+/g, "").length;
  return { words: Math.max(1, Number(words.toFixed(1))), chars: Math.max(1, chars) };
}

export function joinTokens(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  if (/[—-]$/.test(a) || /^[—-]/.test(b)) return `${a}${b}`;
  const needSpace =
    /[A-Za-z0-9.,;:!?'"”’)\]]$/.test(a) && /^[A-Za-z0-9"“'‘(\[]/.test(b);
  return needSpace ? `${a} ${b}` : `${a}${b}`;
}

export function tokenizeWithAtomicProtection(para: string): string[] {
  const ATOMIC_SCAN_REGEX =
    /([\u4e00-\u9fa5A-Za-z0-9]{0,4}(?:“[^”\r\n]{1,16}”|「[^」\r\n]{1,16}」|『[^』\r\n]{1,16}』)[\u4e00-\u9fa5A-Za-z0-9]{0,6}[，。！？；：、,.!?;:—]*|\b(?:Mr|Mrs|Ms|Dr|Capt|St|Rev|Gov)\.\s+[A-Z][A-Za-z'-]+[,.;:!?—]*|(?:\b(?:the|a|an)\s+)?"[A-Z][A-Za-z\s-]{1,18}"[,.;:!?—]*|["“'‘(\[]*[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*['’-]?[A-Za-z0-9]*[,.;:!?'"”’)\]]*(?:—|--)?|[\u4e00-\u9fa5][，。！？；：、”’）》】—…]*|[^\s])/g;

  return para.match(ATOMIC_SCAN_REGEX) || [para];
}

interface SemanticClause {
  tokens: string[];
  text: string;
  isHardStop: boolean;
}

export function buildFullSentences(tokens: string[]): SemanticClause[] {
  const sentences: SemanticClause[] = [];
  let curTokens: string[] = [];
  let curText = "";

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    curTokens.push(tok);
    curText = joinTokens(curText, tok);

    const isAbbr = /\b(Mr|Mrs|Ms|Dr|Capt|St|Rev|Gov)\.$/i.test(tok);
    const isSentenceEnd = !isAbbr && /([.!?。！？…]+['"”’)\]]*)$/.test(tok);

    if (isSentenceEnd) {
      sentences.push({ tokens: curTokens, text: curText, isHardStop: true });
      curTokens = [];
      curText = "";
    }
  }

  if (curTokens.length > 0) {
    sentences.push({ tokens: curTokens, text: curText, isHardStop: true });
  }

  return sentences;
}

export function flowSentencesIntoSingleRowUnits(
  sentences: SemanticClause[],
  indentStr: string,
  measure: (s: string) => number,
  maxTextWidth: number,
  startClauseId: number
): { lines: VisualLine[]; nextClauseId: number } {
  interface TaggedToken {
    text: string;
    isSentenceEnd: boolean;
  }

  const stream: TaggedToken[] = [];
  sentences.forEach((s, sIdx) => {
    s.tokens.forEach((tok, tIdx) => {
      const text = sIdx === 0 && tIdx === 0 ? indentStr + tok : tok;
      const isLast = tIdx === s.tokens.length - 1;
      stream.push({ text, isSentenceEnd: isLast });
    });
  });

  const rawRows: TaggedToken[][] = [];
  let curRow: TaggedToken[] = [];
  let curRowText = "";

  for (let i = 0; i < stream.length; i++) {
    const item = stream[i];
    const candidate = curRowText ? joinTokens(curRowText, item.text) : item.text;
    if (curRow.length > 0 && measure(candidate) > maxTextWidth) {
      rawRows.push(curRow);
      const cleanStart = item.text.trimStart();
      curRow = [{ ...item, text: cleanStart }];
      curRowText = cleanStart;
    } else {
      curRow.push(item);
      curRowText = candidate;
    }
  }
  if (curRow.length > 0) rawRows.push(curRow);

  const lines: VisualLine[] = [];
  let clauseIdCounter = startClauseId;
  const minFragPx = Math.min(110, maxTextWidth * 0.18);

  rawRows.forEach((rowTokens, rIdx) => {
    const groups: string[][] = [];
    let buf: string[] = [];
    rowTokens.forEach((t, idx) => {
      buf.push(t.text);
      if (t.isSentenceEnd || idx === rowTokens.length - 1) {
        groups.push(buf);
        buf = [];
      }
    });

    const mergedGroups: string[] = [];
    for (let g = 0; g < groups.length; g++) {
      const gTokens = groups[g];
      const gText = gTokens.reduce((acc, tk) => joinTokens(acc, tk), "");
      const isCjk = /[\u4e00-\u9fa5]/.test(gText);
      const isShortFrag =
        (isCjk ? gText.length < 5 : gTokens.length < 3) || measure(gText) < minFragPx;

      if (isShortFrag && g < groups.length - 1) {
        groups[g + 1] = [...gTokens, ...groups[g + 1]];
      } else if (isShortFrag && mergedGroups.length > 0) {
        mergedGroups[mergedGroups.length - 1] = joinTokens(
          mergedGroups[mergedGroups.length - 1],
          gText
        );
      } else {
        mergedGroups.push(gText);
      }
    }

    let curX = 0;
    const segments: ClauseSegment[] = mergedGroups.map((segText, sIdx) => {
      const startX = sIdx === 0 ? 0 : curX + CLAUSE_GAP_PX;
      const w = measure(segText);
      curX = startX + w;
      return {
        text: segText,
        clauseId: clauseIdCounter++,
        startX,
        endX: curX,
        isClauseEnd: sIdx < mergedGroups.length - 1,
      };
    });

    const fullRowText = segments.map((s) => s.text).join(" ");
    const { words, chars } = countEffectiveWordsAndChars(fullRowText);
    lines.push({
      segments,
      clauseCount: segments.length,
      wordCount: words,
      charCount: chars,
      widthRatio: Math.min(1, Math.max(0.12, curX / maxTextWidth)),
      isParaStart: rIdx === 0,
      isParaEnd: rIdx === rawRows.length - 1,
    });
  });

  return { lines, nextClauseId: clauseIdCounter };
}

export function packParagraphIntoVisualLines(
  para: string,
  ctx: CanvasRenderingContext2D,
  fontSpec: string,
  maxTextWidth: number,
  startClauseId = 0
): { lines: VisualLine[]; nextClauseId: number } {
  ctx.font = fontSpec;
  const measure = (s: string) => ctx.measureText(s).width;
  const indentStr = /^[\u4e00-\u9fa5“「『]/.test(para) ? "  " : "";
  const tokens = tokenizeWithAtomicProtection(para);
  const sentences = buildFullSentences(tokens);
  return flowSentencesIntoSingleRowUnits(
    sentences,
    indentStr,
    measure,
    maxTextWidth,
    startClauseId
  );
}
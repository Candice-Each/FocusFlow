/**
 * Read-only view of the reader that the voice engine is allowed to consult.
 *
 * The reader owns pages, page index and line index; voice only asks questions
 * such as "am I on the first page?". This keeps the boundary identical to
 * voice-assist's `ReaderContext`: voice never stores pagination itself.
 */
export interface ReaderSnapshot {
  pageIdx: number;
  pageCount: number;
  lineIdx: number;
  lineCount: number;
  hasActiveSentence: boolean;
  isSpeaking: boolean;
  isDictating: boolean;
}

export function createReaderSnapshot(partial?: Partial<ReaderSnapshot>): ReaderSnapshot {
  return {
    pageIdx: 0,
    pageCount: 1,
    lineIdx: 0,
    lineCount: 1,
    hasActiveSentence: true,
    isSpeaking: false,
    isDictating: false,
    ...partial,
  };
}

/** Page guards. Unknown pageCount (<= 0) never blocks, same as voice-assist. */
export function isFirstPage(s: ReaderSnapshot): boolean {
  if (s.pageCount <= 0) return false;
  return s.pageIdx <= 0;
}

export function isLastPage(s: ReaderSnapshot): boolean {
  if (s.pageCount <= 0) return false;
  return s.pageIdx >= s.pageCount - 1;
}

export function isFirstLine(s: ReaderSnapshot): boolean {
  return s.lineIdx <= 0;
}

export function isLastLine(s: ReaderSnapshot): boolean {
  return s.lineCount > 0 && s.lineIdx >= s.lineCount - 1;
}

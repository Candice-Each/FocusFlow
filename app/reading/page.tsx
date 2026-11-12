"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import "@/lib/console-filter";

import { BOOK_CHAPTERS } from "@/lib/chapters";
import { useRouter } from "next/navigation";
import { readBooks } from "@/lib/focusflow/store";
import { ROWS_PER_PAGE, CLAUSE_GAP_PX, CALIBRATION_POINTS } from "@/lib/constants";
import { getFontCssString as buildFontCss } from "@/lib/fonts";
import { formatTime } from "@/lib/format";
import { solveRidgeRegression } from "@/lib/ridge-regression";
import { buildThemeClasses, type FontFamily, type BgTheme, type TextColor } from "@/lib/theme";
import type {
  CalibCollection, CalibrationSamples, CameraStatus, FaceBaseline, GazePoint,
  GazeTrackingConfig, GazeTrackingState, ReadingLayout, ReadingStats,
  ToastNotification, TrackingQuality, WinState,
} from "@/lib/types";
import { createGazeTrackingState } from "@/lib/types";
import { useHeatmapRenderer } from "@/hooks/useHeatmapRenderer";
import { useGazeTracking } from "@/hooks/useGazeTracking";
import { usePagination } from "@/hooks/usePagination";

import { TopBar } from "@/components/TopBar";
import { LeftSidebar, type Bookmark } from "@/components/LeftSidebar";
import { ReadingView } from "@/components/ReadingView";
import { RightSidebar } from "@/components/RightSidebar";
import { MonitorWindows } from "@/components/MonitorWindows";
import { CalibrationOverlay } from "@/components/CalibrationOverlay";
import { StatusBanners } from "@/components/StatusBanners";
import { PaginationFooter } from "@/components/PaginationFooter";
import { BottomLeftSliders } from "@/components/BottomLeftSliders";
import { BuyModal } from "@/components/modals/BuyModal";
import { NotesModal } from "@/components/modals/NotesModal";

export default function SingleBookReadingInterface() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rowsContainerRef = useRef<HTMLDivElement | null>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const router = useRouter();
  const [backToShelfVisible, setBackToShelfVisible] = useState(false);
  const [noCameraMode, setNoCameraMode] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("Initializing");
  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality>("Unavailable");
  const [fps, setFps] = useState(0);

  const [gazePoint, setGazePoint] = useState<GazePoint>({
    x: 400, y: 300, snappedX: 400, snappedY: 300, rawY: 300, biasY: 0,
  });
  const [readingStats, setReadingStats] = useState<ReadingStats>({
    wpm: 190, cpm: 950, lineProgressPct: 0, rightZoneLatched: false, currentLineIdx: 0,
  });
  const [faceBaseline, setFaceBaseline] = useState<FaceBaseline | null>(null);
  const [continuousFaceState, setContinuousFaceState] = useState<string>("Stable");
  const [multimodalTriggerState, setMultimodalTriggerState] = useState<string>("Idle");
  const [isOffScreenPaused, setIsOffScreenPaused] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);

  const [chapterIdx, setChapterIdx] = useState(0);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [rawText, setRawText] = useState(BOOK_CHAPTERS[0].content);

  const [fontFamily, setFontFamily] = useState<FontFamily>("Georgia");
  const [bgTheme, setBgTheme] = useState<BgTheme>("Paper");
  const [textColor, setTextColor] = useState<TextColor>("Black");
  const [fontSize, setFontSize] = useState(15);
  const [readingWidthPct, setReadingWidthPct] = useState(60);
  const [lineSpacingRatio, setLineSpacingRatio] = useState(2.35);
  const [showRowMeta, setShowRowMeta] = useState(false);
  const [menuShowBookmark, setMenuShowBookmark] = useState(true);
  const [menuShowHighlight, setMenuShowHighlight] = useState(true);
  const [menuShowNotes, setMenuShowNotes] = useState(true);
  const [showBottomLeftBar, setShowBottomLeftBar] = useState(true);

  const [gestureControl, setGestureControl] = useState(true);
  const [faceAssist, setFaceAssist] = useState(true);
  const [showReticle, setShowReticle] = useState(true);
  const [showGazeCursor, setShowGazeCursor] = useState(true);
  const [bgBlur, setBgBlur] = useState(false);
  const [gestureBadgeText, setGestureBadgeText] = useState("Standby");
  const [mouthScore, setMouthScore] = useState(0);
  const [clauseMenuOpen, setClauseMenuOpen] = useState(false);
  const [clauseClickRatio, setClauseClickRatio] = useState(0.5);

  const [voiceMode, setVoiceMode] = useState<"Read" | "Notes">("Read");
  const [micActive, setMicActive] = useState(false);
  const [voiceLog, setVoiceLog] = useState('Say "next line" or "open menu"');
  const [voiceError, setVoiceError] = useState(false);

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [bottomLeftExpanded, setBottomLeftExpanded] = useState(false);
  const [winVideo, setWinVideo] = useState<WinState>({ visible: false, x: 20, y: 68, w: 280, h: 210 });
  const [winMesh, setWinMesh] = useState<WinState>({ visible: false, x: 20, y: 290, w: 280, h: 225 });
  const [winHeatmap, setWinHeatmap] = useState<WinState>({ visible: false, x: 20, y: 527, w: 280, h: 215 });
  const [meshShowVideoBg, setMeshShowVideoBg] = useState(false);
  const [showPageHeatmap, setShowPageHeatmap] = useState(false);
  const [heatmapDecayMode, setHeatmapDecayMode] = useState(true);
  const [heatmapUseRawY, setHeatmapUseRawY] = useState(false);

  const [nextLineSlider, setNextLineSlider] = useState(65);
  const [prevLineSlider, setPrevLineSlider] = useState(30);
  const [skipLinesSlider, setSkipLinesSlider] = useState(30);

  const [highlightedClauses, setHighlightedClauses] = useState<Set<number>>(new Set());
  const [underlinedClauses, setUnderlinedClauses] = useState<Set<number>>(new Set());
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { id: 5, text: "The surrounding words remain......", page: 0, line: 5 },
    { id: 13, text: "A steady reading pace matters......", page: 0, line: 12 },
  ]);
  const [notesList, setNotesList] = useState<string[]>([
    "[System] Gaze highlights contiguous sentence units on the active row; open your mouth (or double-click) at any time to summon the selection box and quick action bar.",
  ]);
  const [noteInputText, setNoteInputText] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  const [statusToast, setStatusToast] = useState<ToastNotification | null>(null);
  const [dismissGuideBanner, setDismissGuideBanner] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((title: string, detail?: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStatusToast({ title, detail });
    toastTimerRef.current = setTimeout(() => setStatusToast(null), 2600);
  }, []);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibStep, setCalibStep] = useState(0);
  const [calibSampleProgress, setCalibSampleProgress] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const weightsRef = useRef<number[][] | null>(null);
  const calibSamplesRef = useRef<CalibrationSamples>({ X: [], Y: [] });
  const collectingPointRef = useRef<CalibCollection | null>(null);

  const [readingSeconds, setReadingSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isOffScreenPaused && !showReturnConfirm && !isCalibrating) {
        setReadingSeconds((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isOffScreenPaused, showReturnConfirm, isCalibrating]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("book");
    if (!bookId) return;
    
    // 只要带了 book 参数，就允许返回 Shelf
    setBackToShelfVisible(true);
    
    const books = readBooks();
    const book = books.find((b) => b.id === bookId);
    if (book?.content) {
      setCustomTitle(book.title);
      setRawText(book.content);
    }
  }, []);

  const isNight = bgTheme === "Night";
  const lineHeightPx = Math.max(30, Math.round(fontSize * lineSpacingRatio));
  const theme = buildThemeClasses(isNight, bgTheme, textColor);
  const currentChapterTitle = customTitle || BOOK_CHAPTERS[chapterIdx]?.title || "Why not chase each word";

  const getFontCssString = useCallback(
    (sizePx: number) => buildFontCss(fontFamily, sizePx),
    [fontFamily]
  );

  const stateRef = useRef<GazeTrackingState>(createGazeTrackingState());
  const faceBaselineRef = useRef<FaceBaseline | null>(null);
  useEffect(() => { faceBaselineRef.current = faceBaseline; }, [faceBaseline]);

  const uiInteractingRef = useRef(false);
  const isDraggingSliderRef = useRef(false);
  useEffect(() => {
    const clearSliderDrag = () => {
      if (isDraggingSliderRef.current) {
        isDraggingSliderRef.current = false;
        uiInteractingRef.current = false;
      }
    };
    window.addEventListener("pointerup", clearSliderDrag);
    window.addEventListener("pointercancel", clearSliderDrag);
    return () => {
      window.removeEventListener("pointerup", clearSliderDrag);
      window.removeEventListener("pointercancel", clearSliderDrag);
    };
  }, []);

  const prevRawTextRef = useRef(rawText);
  const { pages, pageIdx, setPageIdx, activeLineIdx, setActiveLineIdx, activeClauseId, setActiveClauseId } = usePagination({
    rawText, readingWidthPct, fontSize, fontFamily, getFontCssString, rowsContainerRef,
    onPaginated: (firstClauseId, newPages) => {
      const st = stateRef.current;
      const isNewText = prevRawTextRef.current !== rawText;
      prevRawTextRef.current = rawText;

      if (isNewText) {
        st.currentLine = 0;
        st.currentClauseId = firstClauseId;
        st.lineEnterTime = performance.now();
        st.reachedRightZone = false;
        st.maxLineX = 0;
        setActiveLineIdx(0);
        setActiveClauseId(firstClauseId);
        setClauseMenuOpen(false);
      } else {
        const safeP = Math.min(pageIdx, Math.max(0, newPages.length - 1));
        const safeL = Math.max(0, Math.min(st.currentLine, (newPages[safeP]?.length ?? 1) - 1));
        const rowSegs = newPages[safeP]?.[safeL]?.segments ?? [];
        const fallbackCid = rowSegs.some((s) => s.clauseId === st.currentClauseId)
          ? st.currentClauseId
          : (rowSegs[0]?.clauseId ?? firstClauseId);
        st.currentLine = safeL;
        st.currentClauseId = fallbackCid;
        setActiveLineIdx(safeL);
        setActiveClauseId(fallbackCid);
      }
    },
  });

  const layoutRef = useRef<ReadingLayout>({ pages: [], pageIdx: 0 });
  useEffect(() => { layoutRef.current = { pages, pageIdx }; }, [pages, pageIdx]);

  const uiConfigRef = useRef<GazeTrackingConfig>({
    meshShowVideoBg: false, heatmapDecayMode: true, heatmapUseRawY: false,
    gestureControl: true, faceAssist: true, noCameraMode: false,
    isOffScreenPaused: false, showReturnConfirm: false, clauseMenuOpen: false,
    isNight: false, nextSens: 65, prevSens: 30, skipSens: 30, lineHeightPx: 35,
  });
  useEffect(() => {
    uiConfigRef.current = {
      meshShowVideoBg, heatmapDecayMode, heatmapUseRawY, gestureControl, faceAssist,
      noCameraMode, isOffScreenPaused, showReturnConfirm, clauseMenuOpen, isNight,
      nextSens: nextLineSlider, prevSens: prevLineSlider, skipSens: skipLinesSlider, lineHeightPx,
    };
  }, [meshShowVideoBg, heatmapDecayMode, heatmapUseRawY, gestureControl, faceAssist,
    noCameraMode, isOffScreenPaused, showReturnConfirm, clauseMenuOpen, isNight,
    nextLineSlider, prevLineSlider, skipLinesSlider, lineHeightPx]);

  const { miniHeatmapCanvasRef, fullHeatmapCanvasRef, updateAndRenderHeatmaps, clearHeatmap } = useHeatmapRenderer(uiConfigRef);

  const { latestTelemetryRef } = useGazeTracking({
    noCameraMode, stateRef, weightsRef, uiConfigRef, layoutRef, faceBaselineRef,
    collectingPointRef, calibSamplesRef, videoRef, meshCanvasRef, rowsContainerRef,
    updateAndRenderHeatmaps,
    setCameraStatus, setTrackingQuality, setContinuousFaceState, setMultimodalTriggerState,
    setFps, setModelReady, setMouthScore, setIsOffScreenPaused, setShowReturnConfirm,
    setActiveLineIdx, setActiveClauseId, setPageIdx, setGazePoint, setReadingStats,
    setClauseMenuOpen, setGestureBadgeText, setCalibSampleProgress,
    uiInteractingRef,
    isDraggingSliderRef,
  });

  useEffect(() => {
    const row = pages[pageIdx]?.[activeLineIdx];
    if (!row || row.segments.length === 0) return;
    if (!row.segments.some((s) => s.clauseId === activeClauseId)) {
      const fallbackCid = row.segments[0].clauseId;
      stateRef.current.currentClauseId = fallbackCid;
      setActiveClauseId(fallbackCid);
    }
  }, [pages, pageIdx, activeLineIdx, activeClauseId, setActiveClauseId]);

  const getSentenceTextById = useCallback((targetCid: number) => {
    const parts: string[] = [];
    pages.forEach((p) => {
      p.forEach((row) => {
        row.segments.forEach((seg) => {
          if (seg.clauseId === targetCid) parts.push(seg.text.trim());
        });
      });
    });
    return parts.join(" ").trim();
  }, [pages]);

  const currentLines = pages[pageIdx] ?? [];

  const getActiveSentenceText = useCallback(() => {
    const activeRow = currentLines[activeLineIdx];
    const seg = activeRow?.segments.find((s) => s.clauseId === activeClauseId) ?? activeRow?.segments[0];
    return seg ? seg.text.trim() : getSentenceTextById(activeClauseId);
  }, [currentLines, activeLineIdx, activeClauseId, getSentenceTextById]);

  const toggleTtsReading = useCallback((readSingleSentence = false) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showToast("TTS Unavailable", "Web Speech synthesis is not supported in this browser");
      return;
    }
    try {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        showToast("Audio Stopped");
        return;
      }
      const textToRead = readSingleSentence
        ? getActiveSentenceText()
        : currentLines.map((l) => l.segments.map((s) => s.text).join(" ")).join(" ");
      if (!textToRead) return;

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textToRead);
      utter.lang = "en-US";
      utter.rate = 1.0;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
      showToast(
        readSingleSentence ? "Reading Active Sentence" : "Audiobook Mode Active",
        readSingleSentence ? textToRead.slice(0, 40) + "..." : `Reading Page ${pageIdx + 1}`
      );
    } catch {
      setIsSpeaking(false);
    }
  }, [isSpeaking, getActiveSentenceText, currentLines, pageIdx, showToast]);

  const addBookmarkForActiveClause = useCallback(() => {
    const full = getActiveSentenceText() || "Selected sentence";
    const snippet = full.slice(0, 34) + (full.length > 34 ? "......" : "");
    setBookmarks((prev) => [
      ...prev.filter((b) => b.id !== activeClauseId),
      { id: activeClauseId, text: snippet, page: pageIdx, line: activeLineIdx },
    ]);
    setClauseMenuOpen(false);
    showToast("Bookmark Saved", `Page ${pageIdx + 1} / Row ${activeLineIdx + 1}`);
  }, [getActiveSentenceText, activeClauseId, pageIdx, activeLineIdx, showToast]);

  const copyActiveClause = useCallback(() => {
    const txt = getActiveSentenceText();
    try { navigator.clipboard?.writeText(txt); } catch { }
    setClauseMenuOpen(false);
    showToast("Sentence Copied", txt.slice(0, 42) + (txt.length > 42 ? "..." : ""));
  }, [getActiveSentenceText, showToast]);

  const toggleHighlightActiveClause = useCallback(() => {
    setHighlightedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(activeClauseId)) {
        next.delete(activeClauseId);
        showToast("Highlight Removed", `Sentence #${activeClauseId + 1}`);
      } else {
        next.add(activeClauseId);
        showToast("Sentence Highlighted", "Saved to Highlights list");
      }
      return next;
    });
    setClauseMenuOpen(false);
  }, [activeClauseId, showToast]);

  const toggleUnderlineActiveClause = useCallback(() => {
    setUnderlinedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(activeClauseId)) { next.delete(activeClauseId); showToast("Underline Removed"); }
      else { next.add(activeClauseId); showToast("Sentence Underlined"); }
      return next;
    });
    setClauseMenuOpen(false);
  }, [activeClauseId, showToast]);

  const addActiveSentenceToNotes = useCallback(() => {
    const txt = getActiveSentenceText();
    if (txt) {
      setNotesList((prev) => [`[Quote P${pageIdx + 1}] ${txt}`, ...prev]);
      showToast("Added to Reading Notes", "Open Notes panel from the top bar to view");
    }
    setClauseMenuOpen(false);
  }, [getActiveSentenceText, pageIdx, showToast]);
  const toggleMicrophone = useCallback(() => {
    const SpeechRec =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
        : null;

    if (!SpeechRec) {
      setVoiceError(true);
      setVoiceLog("Speech API unavailable - click Retry");
      showToast("Voice Unavailable", "Use desktop Chrome or Edge for Web Speech API");
      return;
    }

    if (micActive) {
      setMicActive(false);
      setVoiceLog("Microphone paused");
      showToast("Microphone Off");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRec as any)();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      setVoiceError(false);
      setMicActive(true);
      setVoiceLog(
        voiceMode === "Read"
          ? "Listening for command (next line / open menu)..."
          : "Listening for voice note..."
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = String(event.results?.[0]?.[0]?.transcript || "")
          .toLowerCase()
          .trim();
        setVoiceLog(transcript || "No speech detected");
        setMicActive(false);

        if (voiceMode === "Notes" && transcript) {
          setNotesList((prev) => [`[Voice Note] ${transcript}`, ...prev]);
          setMultimodalTriggerState("Voice Note Saved");
          showToast("Voice Note Saved", transcript);
          return;
        }

        if (transcript.includes("next")) {
          const nextRow = Math.min(currentLines.length - 1, activeLineIdx + 1);
          const cid = currentLines[nextRow]?.segments?.[0]?.clauseId ?? activeClauseId;
          stateRef.current.currentLine = nextRow;
          stateRef.current.currentClauseId = cid;
          setActiveLineIdx(nextRow);
          setActiveClauseId(cid);
          setMultimodalTriggerState("Voice: Next Line");
        } else if (
          transcript.includes("menu") ||
          transcript.includes("open") ||
          transcript.includes("select")
        ) {
          setClauseMenuOpen(true);
          setMultimodalTriggerState("Voice: Menu Open");
        }
      };

      recognition.onerror = () => {
        setMicActive(false);
        setVoiceError(true);
        setVoiceLog("Recognition failed - tap Retry");
      };
      recognition.onend = () => setMicActive(false);
      recognition.start();
    } catch {
      setVoiceError(true);
      setMicActive(false);
    }
  }, [micActive, voiceMode, currentLines, activeLineIdx, activeClauseId, showToast]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      let decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      if (decoded.includes("\uFFFD")) {
        decoded = new TextDecoder("gbk").decode(buffer);
      }
      const cleanTitle = file.name.replace(/\.txt$/i, "");
      setCustomTitle(cleanTitle);
      setRawText(decoded);
      setNotesModalOpen(false);
      showToast("TXT Document Imported", `Loaded "${cleanTitle}"`);
    },
    [showToast]
  );

  const calibratePersonalFaceBaseline = useCallback(() => {
    const tel = latestTelemetryRef.current;
    if (!tel) {
      showToast("Baseline Failed", "Ensure your face is visible in the camera frame");
      return;
    }
    setFaceBaseline({
      yaw: tel.yawDeg,
      pitch: tel.pitchDeg,
      roll: tel.rollDeg,
      jaw: tel.jawOpen,
    });
    setMultimodalTriggerState("Baseline Locked");
    showToast(
      "Face Baseline Calibrated",
      `Reference pose: Yaw ${tel.yawDeg} deg / Pitch ${tel.pitchDeg} deg / Roll ${tel.rollDeg} deg`
    );
  }, [latestTelemetryRef, showToast]);

  const startCalibration = useCallback(() => {
    calibSamplesRef.current = { X: [], Y: [] };
    collectingPointRef.current = null;
    setCalibSampleProgress(0);
    setCalibStep(0);
    setIsCalibrating(true);
  }, []);

  const handleCalibPointClick = useCallback(
    (tx: number, ty: number) => {
      if (collectingPointRef.current && collectingPointRef.current.remaining > 0) return;
      setCalibSampleProgress(0);
      collectingPointRef.current = {
        targetX: tx,
        targetY: ty,
        settle: 3,
        remaining: 20,
        total: 20,
      };

      const checkTimer = setInterval(() => {
        if (!collectingPointRef.current) {
          clearInterval(checkTimer);
          return;
        }
        if (collectingPointRef.current.remaining <= 0) {
          clearInterval(checkTimer);
          collectingPointRef.current = null;
          setCalibSampleProgress(0);

          if (calibStep < CALIBRATION_POINTS.length - 1) {
            setCalibStep((s) => s + 1);
          } else {
            const { X, Y } = calibSamplesRef.current;
            weightsRef.current = solveRidgeRegression(X, Y, 0.6);
            const firstClause = pages[pageIdx]?.[0]?.segments?.[0]?.clauseId ?? 0;
            stateRef.current.biasY = 0;
            stateRef.current.currentLine = 0;
            stateRef.current.currentClauseId = firstClause;
            stateRef.current.lineEnterTime = performance.now();
            stateRef.current.reachedRightZone = false;
            stateRef.current.maxLineX = 0;
            clearHeatmap();
            setActiveLineIdx(0);
            setActiveClauseId(firstClause);
            setClauseMenuOpen(false);
            setIsCalibrating(false);
            setIsCalibrated(true);
            showToast(
              "9-Point Calibration Complete",
              "Gaze highlights sentences; open mouth to summon selection and menu"
            );
          }
        }
      }, 30);
    },
    [calibStep, pages, pageIdx, clearHeatmap, setActiveLineIdx, setActiveClauseId, showToast]
  );

  const handleSelectChapter = useCallback(
    (idx: number) => {
      setCustomTitle(null);
      setChapterIdx(idx);
      setRawText(BOOK_CHAPTERS[idx].content);
      setLeftSidebarOpen(false);
      showToast("Chapter Switched", BOOK_CHAPTERS[idx].title);
    },
    [showToast]
  );

  const handleSelectBookmark = useCallback(
    (bm: Bookmark) => {
      const safeP = Math.max(0, Math.min(bm.page, pages.length - 1));
      const safeL = Math.max(0, Math.min(bm.line, (pages[safeP]?.length ?? 1) - 1));
      const rowSegs = pages[safeP]?.[safeL]?.segments ?? [];
      const validCid = rowSegs.some((s) => s.clauseId === bm.id) ? bm.id : rowSegs[0]?.clauseId ?? 0;

      setPageIdx(safeP);
      setActiveLineIdx(safeL);
      setActiveClauseId(validCid);
      setClauseMenuOpen(false);
      stateRef.current.currentLine = safeL;
      stateRef.current.currentClauseId = validCid;
      setLeftSidebarOpen(false);
      showToast("Jumped to Bookmark", `Page ${safeP + 1} / Row ${safeL + 1}`);
    },
    [pages, showToast]
  );

  const handlePagePrev = useCallback(() => {
    const prevP = Math.max(0, pageIdx - 1);
    const firstCid = pages[prevP]?.[0]?.segments?.[0]?.clauseId ?? 0;
    setPageIdx(prevP);
    setActiveLineIdx(0);
    setActiveClauseId(firstCid);
    setClauseMenuOpen(false);
    stateRef.current.currentLine = 0;
    stateRef.current.currentClauseId = firstCid;
    stateRef.current.reachedRightZone = false;
    stateRef.current.maxLineX = 0;
  }, [pageIdx, pages, setPageIdx, setActiveLineIdx, setActiveClauseId]);

  const handlePageNext = useCallback(() => {
    const nextP = Math.min(pages.length - 1, pageIdx + 1);
    const firstCid = pages[nextP]?.[0]?.segments?.[0]?.clauseId ?? 0;
    setPageIdx(nextP);
    setActiveLineIdx(0);
    setActiveClauseId(firstCid);
    setClauseMenuOpen(false);
    stateRef.current.currentLine = 0;
    stateRef.current.currentClauseId = firstCid;
    stateRef.current.reachedRightZone = false;
    stateRef.current.maxLineX = 0;
  }, [pageIdx, pages, setPageIdx, setActiveLineIdx, setActiveClauseId]);

  const onSentenceClick = useCallback(
    (lineIdx: number, clauseId: number, ratio: number) => {
      stateRef.current.currentLine = lineIdx;
      stateRef.current.currentClauseId = clauseId;
      stateRef.current.lineEnterTime = performance.now();
      stateRef.current.reachedRightZone = false;
      stateRef.current.maxLineX = 0;
      setActiveLineIdx(lineIdx);
      setActiveClauseId(clauseId);
      setClauseClickRatio(ratio);
      setClauseMenuOpen(false);
    },
    [setActiveLineIdx, setActiveClauseId]
  );

  const onSentenceDoubleClick = useCallback(
    (lineIdx: number, clauseId: number, ratio: number) => {
      stateRef.current.currentLine = lineIdx;
      stateRef.current.currentClauseId = clauseId;
      setActiveLineIdx(lineIdx);
      setActiveClauseId(clauseId);
      setClauseClickRatio(ratio);
      setClauseMenuOpen((v) => !v);
    },
    [setActiveLineIdx, setActiveClauseId]
  );

  const onPointerMoveGaze = useCallback(
    (e: React.PointerEvent) => {
      if (noCameraMode || !isCalibrated) {
        setGazePoint((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
      }
    },
    [noCameraMode, isCalibrated]
  );

  const unifiedSurfaceClass = theme.surface;
  const unifiedSubtleBoxClass = theme.subtle;
  const rowBadgeWeakContrastClass = theme.rowBadge;
  const dimBackdropActive = leftSidebarOpen || rightSidebarOpen;
  const showGuideBanner =
    !isCalibrated && !isCalibrating && !showReturnConfirm && !statusToast && !dismissGuideBanner;

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between select-none transition-colors duration-300 relative overflow-x-hidden ${theme.pageBg} ${theme.textTone}`}
    >

      <canvas
        ref={fullHeatmapCanvasRef}
        width={240}
        height={135}
        className={`pointer-events-none fixed inset-0 w-full h-full z-30 transition-opacity duration-200 ${showPageHeatmap && isCalibrated && !isCalibrating ? "opacity-80" : "opacity-0"
          }`}
      />

      <MonitorWindows
        winVideo={winVideo}
        setWinVideo={setWinVideo}
        winMesh={winMesh}
        setWinMesh={setWinMesh}
        winHeatmap={winHeatmap}
        setWinHeatmap={setWinHeatmap}
        isNight={isNight}
        videoRef={videoRef}
        meshCanvasRef={meshCanvasRef}
        miniHeatmapCanvasRef={miniHeatmapCanvasRef}
        cameraStatus={cameraStatus}
        fps={fps}
        mouthScore={mouthScore}
        noCameraMode={noCameraMode}
        meshShowVideoBg={meshShowVideoBg}
        setMeshShowVideoBg={setMeshShowVideoBg}
        isCalibrated={isCalibrated}
        showPageHeatmap={showPageHeatmap}
        setShowPageHeatmap={setShowPageHeatmap}
        heatmapDecayMode={heatmapDecayMode}
        setHeatmapDecayMode={setHeatmapDecayMode}
        heatmapUseRawY={heatmapUseRawY}
        setHeatmapUseRawY={setHeatmapUseRawY}
        onClearHeatmap={clearHeatmap}
        unifiedSubtleBoxClass={unifiedSubtleBoxClass}
      />

      <TopBar
        leftSidebarOpen={leftSidebarOpen}
        setLeftSidebarOpen={setLeftSidebarOpen}
        onBackToShelf={backToShelfVisible ? () => router.push("/shelf") : undefined}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
        readingStats={readingStats}
        readingSeconds={readingSeconds}
        isOffScreenPaused={isOffScreenPaused}
        clauseMenuOpen={clauseMenuOpen}
        isCalibrated={isCalibrated}
        noCameraMode={noCameraMode}
        modelReady={modelReady}
        startCalibration={startCalibration}
        isPurchased={isPurchased}
        setBuyModalOpen={setBuyModalOpen}
        isSpeaking={isSpeaking}
        toggleTtsReading={toggleTtsReading}
        setNotesModalOpen={setNotesModalOpen}
        micActive={micActive}
        toggleMicrophone={toggleMicrophone}
        unifiedSurfaceClass={unifiedSurfaceClass}
        unifiedSubtleBoxClass={unifiedSubtleBoxClass}
        formatTime={formatTime}
        onPointerEnter={() => { uiInteractingRef.current = true; }}
        onPointerLeave={() => { if (!isDraggingSliderRef.current) uiInteractingRef.current = false; }}
      />

      {dimBackdropActive && (
        <div
          onClick={() => { setLeftSidebarOpen(false); setRightSidebarOpen(false); }}
          className="fixed inset-0 bg-black/25 z-20 transition-opacity"
        />
      )}

      <LeftSidebar
        open={leftSidebarOpen}
        chapters={BOOK_CHAPTERS}
        chapterIdx={chapterIdx}
        customTitle={customTitle}
        onSelectChapter={handleSelectChapter}
        bookmarks={bookmarks}
        onSelectBookmark={handleSelectBookmark}
        unifiedSurfaceClass={unifiedSurfaceClass}
        isNight={isNight}
        onPointerEnter={() => { uiInteractingRef.current = true; }}
        onPointerLeave={() => { if (!isDraggingSliderRef.current) uiInteractingRef.current = false; }}
      />

      <BottomLeftSliders
        visible={showBottomLeftBar}
        expanded={bottomLeftExpanded}
        setExpanded={setBottomLeftExpanded}
        nextLineSlider={nextLineSlider}
        setNextLineSlider={setNextLineSlider}
        prevLineSlider={prevLineSlider}
        setPrevLineSlider={setPrevLineSlider}
        skipLinesSlider={skipLinesSlider}
        setSkipLinesSlider={setSkipLinesSlider}
        isNight={isNight}
        onPointerEnter={() => { uiInteractingRef.current = true; }}
        onPointerLeave={() => { if (!isDraggingSliderRef.current) uiInteractingRef.current = false; }}
        onSliderPointerDown={() => {
          isDraggingSliderRef.current = true;
          uiInteractingRef.current = true;
        }}
      />

      <RightSidebar
        open={rightSidebarOpen}
        readingStats={readingStats}
        readingSeconds={readingSeconds}
        formatTime={formatTime}
        trackingQuality={trackingQuality}
        cameraStatus={cameraStatus}
        fps={fps}
        continuousFaceState={continuousFaceState}
        multimodalTriggerState={multimodalTriggerState}
        faceBaseline={faceBaseline}
        showGazeCursor={showGazeCursor}
        setShowGazeCursor={setShowGazeCursor}
        winVideo={winVideo}
        setWinVideo={setWinVideo}
        winMesh={winMesh}
        setWinMesh={setWinMesh}
        showPageHeatmap={showPageHeatmap}
        setShowPageHeatmap={setShowPageHeatmap}
        setWinHeatmap={setWinHeatmap}
        faceAssist={faceAssist}
        setFaceAssist={setFaceAssist}
        noCameraMode={noCameraMode}
        setNoCameraMode={setNoCameraMode}
        modelReady={modelReady}
        startCalibration={startCalibration}
        isCalibrated={isCalibrated}
        calibratePersonalFaceBaseline={calibratePersonalFaceBaseline}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        bgTheme={bgTheme}
        setBgTheme={setBgTheme}
        textColor={textColor}
        setTextColor={setTextColor}
        fontSize={fontSize}
        setFontSize={setFontSize}
        readingWidthPct={readingWidthPct}
        setReadingWidthPct={setReadingWidthPct}
        lineSpacingRatio={lineSpacingRatio}
        setLineSpacingRatio={setLineSpacingRatio}
        showRowMeta={showRowMeta}
        setShowRowMeta={setShowRowMeta}
        menuShowBookmark={menuShowBookmark}
        setMenuShowBookmark={setMenuShowBookmark}
        menuShowHighlight={menuShowHighlight}
        setMenuShowHighlight={setMenuShowHighlight}
        menuShowNotes={menuShowNotes}
        setMenuShowNotes={setMenuShowNotes}
        showBottomLeftBar={showBottomLeftBar}
        setShowBottomLeftBar={setShowBottomLeftBar}
        gestureControl={gestureControl}
        setGestureControl={setGestureControl}
        showReticle={showReticle}
        setShowReticle={setShowReticle}
        bgBlur={bgBlur}
        setBgBlur={setBgBlur}
        clauseMenuOpen={clauseMenuOpen}
        gestureBadgeText={gestureBadgeText}
        mouthScore={mouthScore}
        voiceError={voiceError}
        toggleMicrophone={toggleMicrophone}
        micActive={micActive}
        voiceMode={voiceMode}
        setVoiceMode={setVoiceMode}
        voiceLog={voiceLog}
        unifiedSurfaceClass={unifiedSurfaceClass}
        unifiedSubtleBoxClass={unifiedSubtleBoxClass}
        onPointerEnter={() => { uiInteractingRef.current = true; }}
        onPointerLeave={() => { if (!isDraggingSliderRef.current) uiInteractingRef.current = false; }}
        onInteractChange={(active) => { uiInteractingRef.current = active; }}
      />

      <ReadingView
        title={currentChapterTitle}
        lines={currentLines}
        activeLineIdx={activeLineIdx}
        activeClauseId={activeClauseId}
        clauseMenuOpen={clauseMenuOpen}
        highlightedClauses={highlightedClauses}
        underlinedClauses={underlinedClauses}
        noCameraMode={noCameraMode}
        isCalibrated={isCalibrated}
        bgBlur={bgBlur}
        showReticle={showReticle}
        showRowMeta={showRowMeta}
        fontSize={fontSize}
        fontFamily={fontFamily}
        readingWidthPct={readingWidthPct}
        lineHeightPx={lineHeightPx}
        rowsPerPage={ROWS_PER_PAGE}
        clauseGapPx={CLAUSE_GAP_PX}
        getFontCssString={getFontCssString}
        rowsContainerRef={rowsContainerRef}
        menuShowBookmark={menuShowBookmark}
        menuShowHighlight={menuShowHighlight}
        menuShowNotes={menuShowNotes}
        isNight={isNight}
        unifiedSurfaceClass={unifiedSurfaceClass}
        rowBadgeWeakContrastClass={rowBadgeWeakContrastClass}
        clauseClickRatio={clauseClickRatio}
        onSentenceClick={onSentenceClick}
        onSentenceDoubleClick={onSentenceDoubleClick}
        onPointerMoveGaze={onPointerMoveGaze}
        onAddBookmark={addBookmarkForActiveClause}
        onToggleHighlight={toggleHighlightActiveClause}
        onToggleUnderline={toggleUnderlineActiveClause}
        onAddToNotes={addActiveSentenceToNotes}
        onCopy={copyActiveClause}
      />

      {showGazeCursor && !isCalibrating && (isCalibrated || noCameraMode) && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <div
            className="w-4 h-4 -ml-2 -mt-2 rounded-full bg-indigo-500/75 border border-white/90 shadow-[0_0_12px_rgba(99,102,241,0.85)] transition-transform duration-75"
            style={{ transform: `translate3d(${gazePoint.x}px, ${gazePoint.y}px, 0)` }}
          />
        </div>
      )}

      <StatusBanners
        toast={statusToast}
        showReturnConfirm={showReturnConfirm}
        pageIdx={pageIdx}
        activeLineIdx={activeLineIdx}
        readingSeconds={readingSeconds}
        formatTime={formatTime}
        onStayPaused={() => setShowReturnConfirm(false)}
        onResume={() => {
          setIsOffScreenPaused(false);
          setShowReturnConfirm(false);
          setMultimodalTriggerState("Timer Resumed");
        }}
        showGuideBanner={showGuideBanner}
        noCameraMode={noCameraMode}
        onDismissGuide={() => setDismissGuideBanner(true)}
        unifiedSurfaceClass={unifiedSurfaceClass}
        unifiedSubtleBoxClass={unifiedSubtleBoxClass}
      />

      <PaginationFooter
        pageIdx={pageIdx}
        pageCount={pages.length}
        onPrev={handlePagePrev}
        onNext={handlePageNext}
      />

      <BuyModal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        currentChapterTitle={currentChapterTitle}
        isPurchased={isPurchased}
        onPurchase={() => {
          setIsPurchased(true);
          setBuyModalOpen(false);
          showToast("Purchase Complete", `Unlocked full edition of "${currentChapterTitle}"`);
        }}
        unifiedSurfaceClass={unifiedSurfaceClass}
        unifiedSubtleBoxClass={unifiedSubtleBoxClass}
      />

      <NotesModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        highlightedClauses={highlightedClauses}
        getSentenceTextById={getSentenceTextById}
        onRemoveHighlight={(cid) =>
          setHighlightedClauses((prev) => {
            const next = new Set(prev);
            next.delete(cid);
            return next;
          })
        }
        showToast={showToast}
        noteInputText={noteInputText}
        setNoteInputText={setNoteInputText}
        notesList={notesList}
        setNotesList={setNotesList}
        handleFileUpload={handleFileUpload}
        unifiedSurfaceClass={unifiedSurfaceClass}
        unifiedSubtleBoxClass={unifiedSubtleBoxClass}
      />

      <CalibrationOverlay
        isCalibrating={isCalibrating}
        calibStep={calibStep}
        calibSampleProgress={calibSampleProgress}
        onPointClick={handleCalibPointClick}
        onExit={() => {
          collectingPointRef.current = null;
          setCalibSampleProgress(0);
          setIsCalibrating(false);
        }}
      />
    </div>
  );
}
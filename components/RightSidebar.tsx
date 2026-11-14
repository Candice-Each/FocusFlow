"use client";

import React, { useCallback, useRef, useState } from "react";
import type {
  CameraStatus,
  FaceBaseline,
  ReadingStats,
  RightCardId,
  TrackingQuality,
  WinState,
} from "@/lib/types";
import type { BgTheme, FontFamily, TextColor } from "@/lib/theme";
import { SpeedCard } from "./cards/SpeedCard";
import { SensingCard } from "./cards/SensingCard";
import { SettingsCard } from "./cards/SettingsCard";
import { GestureCard } from "./cards/GestureCard";
import { VoiceCard } from "./cards/VoiceCard";

interface RightSidebarProps {
  open: boolean;

  readingStats: ReadingStats;
  readingSeconds: number;
  formatTime: (sec: number) => string;

  trackingQuality: TrackingQuality;
  cameraStatus: CameraStatus;
  fps: number;
  continuousFaceState: string;
  multimodalTriggerState: string;
  faceBaseline: FaceBaseline | null;
  showGazeCursor: boolean;
  setShowGazeCursor: React.Dispatch<React.SetStateAction<boolean>>;
  winVideo: WinState;
  setWinVideo: React.Dispatch<React.SetStateAction<WinState>>;
  winMesh: WinState;
  setWinMesh: React.Dispatch<React.SetStateAction<WinState>>;
  showPageHeatmap: boolean;
  setShowPageHeatmap: React.Dispatch<React.SetStateAction<boolean>>;
  setWinHeatmap: React.Dispatch<React.SetStateAction<WinState>>;
  faceAssist: boolean;
  setFaceAssist: React.Dispatch<React.SetStateAction<boolean>>;
  noCameraMode: boolean;
  setNoCameraMode: React.Dispatch<React.SetStateAction<boolean>>;
  modelReady: boolean;
  startCalibration: () => void;
  isCalibrated: boolean;
  calibratePersonalFaceBaseline: () => void;

  fontFamily: FontFamily;
  setFontFamily: React.Dispatch<React.SetStateAction<FontFamily>>;
  bgTheme: BgTheme;
  setBgTheme: React.Dispatch<React.SetStateAction<BgTheme>>;
  textColor: TextColor;
  setTextColor: React.Dispatch<React.SetStateAction<TextColor>>;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  readingWidthPct: number;
  setReadingWidthPct: React.Dispatch<React.SetStateAction<number>>;
  lineSpacingRatio: number;
  setLineSpacingRatio: React.Dispatch<React.SetStateAction<number>>;
  showRowMeta: boolean;
  setShowRowMeta: React.Dispatch<React.SetStateAction<boolean>>;
  menuShowBookmark: boolean;
  setMenuShowBookmark: React.Dispatch<React.SetStateAction<boolean>>;
  menuShowHighlight: boolean;
  setMenuShowHighlight: React.Dispatch<React.SetStateAction<boolean>>;
  menuShowNotes: boolean;
  setMenuShowNotes: React.Dispatch<React.SetStateAction<boolean>>;
  showBottomLeftBar: boolean;
  setShowBottomLeftBar: React.Dispatch<React.SetStateAction<boolean>>;

  gestureControl: boolean;
  setGestureControl: React.Dispatch<React.SetStateAction<boolean>>;
  showReticle: boolean;
  setShowReticle: React.Dispatch<React.SetStateAction<boolean>>;
  bgBlur: boolean;
  setBgBlur: React.Dispatch<React.SetStateAction<boolean>>;
  clauseMenuOpen: boolean;
  gestureBadgeText: string;
  mouthScore: number;

  voiceError: boolean;
  toggleMicrophone: () => void;
  listenOnce: () => void;
  micActive: boolean;
  voiceMode: "Read" | "Notes";
  setVoiceMode: React.Dispatch<React.SetStateAction<"Read" | "Notes">>;
  voiceLog: string;

  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;

  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onInteractChange: (active: boolean) => void;
}

const DEFAULT_ORDER: RightCardId[] = [
  "speed",
  "sensing",
  "settings",
  "gesture",
  "voice",
];

interface DragSession {
  cardId: RightCardId;
  anchorY: number;
  currentOffset: number;
}

export function RightSidebar(props: RightSidebarProps) {
  const {
    open,
    readingStats,
    readingSeconds,
    formatTime,
    trackingQuality,
    cameraStatus,
    fps,
    continuousFaceState,
    multimodalTriggerState,
    faceBaseline,
    showGazeCursor,
    setShowGazeCursor,
    winVideo,
    setWinVideo,
    winMesh,
    setWinMesh,
    showPageHeatmap,
    setShowPageHeatmap,
    setWinHeatmap,
    faceAssist,
    setFaceAssist,
    noCameraMode,
    setNoCameraMode,
    modelReady,
    startCalibration,
    isCalibrated,
    calibratePersonalFaceBaseline,
    fontFamily,
    setFontFamily,
    bgTheme,
    setBgTheme,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    readingWidthPct,
    setReadingWidthPct,
    lineSpacingRatio,
    setLineSpacingRatio,
    showRowMeta,
    setShowRowMeta,
    menuShowBookmark,
    setMenuShowBookmark,
    menuShowHighlight,
    setMenuShowHighlight,
    menuShowNotes,
    setMenuShowNotes,
    showBottomLeftBar,
    setShowBottomLeftBar,
    gestureControl,
    setGestureControl,
    showReticle,
    setShowReticle,
    bgBlur,
    setBgBlur,
    clauseMenuOpen,
    gestureBadgeText,
    mouthScore,
    voiceError,
    toggleMicrophone,
    listenOnce,
    micActive,
    voiceMode,
    setVoiceMode,
    voiceLog,
    unifiedSurfaceClass,
    unifiedSubtleBoxClass,
    onPointerEnter,
    onPointerLeave,
    onInteractChange,
  } = props;

  const [cardOrder, setCardOrder] = useState<RightCardId[]>(DEFAULT_ORDER);
  const cardOrderRef = useRef<RightCardId[]>([...DEFAULT_ORDER]);
  const dragSessionRef = useRef<DragSession | null>(null);

  const getCardEl = (id: RightCardId) =>
    document.querySelector<HTMLDivElement>(`[data-card-id="${id}"]`);

  const startDrag = useCallback(
    (cardId: RightCardId, e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, input, label, select, textarea, a")) return;
      e.preventDefault();

      const cardEl = e.currentTarget;
      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture may fail if event was prevented */
      }

      dragSessionRef.current = {
        cardId,
        anchorY: e.clientY,
        currentOffset: 0,
      };
      cardEl.style.transition = "none";
      cardEl.style.zIndex = "40";
      cardEl.style.opacity = "0.94";
      cardEl.style.willChange = "transform";

      onInteractChange(true);

      const onMove = (ev: PointerEvent) => {
        const dragSession = dragSessionRef.current;
        if (!dragSession || dragSession.cardId !== cardId) return;

        let offset = ev.clientY - dragSession.anchorY;
        const order = [...cardOrderRef.current];
        const curIdx = order.indexOf(cardId);

        if (offset > 0 && curIdx < order.length - 1) {
          const nextEl = getCardEl(order[curIdx + 1]);
          const stepDown = (nextEl?.offsetHeight ?? 160) + 12;
          if (offset > stepDown * 0.55) {
            [order[curIdx], order[curIdx + 1]] = [
              order[curIdx + 1],
              order[curIdx],
            ];
            dragSession.anchorY += stepDown;
            offset = ev.clientY - dragSession.anchorY;
            cardOrderRef.current = order;
            setCardOrder(order);
          }
        } else if (offset < 0 && curIdx > 0) {
          const prevEl = getCardEl(order[curIdx - 1]);
          const stepUp = (prevEl?.offsetHeight ?? 160) + 12;
          if (offset < -stepUp * 0.55) {
            [order[curIdx], order[curIdx - 1]] = [
              order[curIdx - 1],
              order[curIdx],
            ];
            dragSession.anchorY -= stepUp;
            offset = ev.clientY - dragSession.anchorY;
            cardOrderRef.current = order;
            setCardOrder(order);
          }
        }

        dragSession.currentOffset = offset;
        cardEl.style.transform = `translate3d(0, ${offset}px, 0)`;
      };

      const onUp = (ev: PointerEvent) => {
        if (dragSessionRef.current?.cardId === cardId) {
          dragSessionRef.current = null;
        }
        try {
          cardEl.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released */
        }
        cardEl.style.transform = "";
        cardEl.style.transition = "";
        cardEl.style.zIndex = "";
        cardEl.style.opacity = "";
        cardEl.style.willChange = "";
        onInteractChange(false);

        cardEl.removeEventListener("pointermove", onMove);
        cardEl.removeEventListener("pointerup", onUp);
        cardEl.removeEventListener("pointercancel", onUp);
      };

      cardEl.addEventListener("pointermove", onMove);
      cardEl.addEventListener("pointerup", onUp);
      cardEl.addEventListener("pointercancel", onUp);
    },
    [onInteractChange]
  );

  const dragHandle = (
    <span
      className="text-xs opacity-35 hover:opacity-80 cursor-grab active:cursor-grabbing px-1 select-none"
      title="Drag to reorder card"
    >
      ⋮⋮
    </span>
  );

  const renderCardContent = (cardId: RightCardId) => {
    const noop = () => {};
    switch (cardId) {
      case "speed":
        return (
          <SpeedCard
            readingStats={readingStats}
            readingSeconds={readingSeconds}
            formatTime={formatTime}
            unifiedSurfaceClass={unifiedSurfaceClass}
            dragHandle={dragHandle}
            onStartDrag={noop}
          />
        );
      case "sensing":
        return (
          <SensingCard
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
            unifiedSurfaceClass={unifiedSurfaceClass}
            unifiedSubtleBoxClass={unifiedSubtleBoxClass}
            dragHandle={dragHandle}
            onStartDrag={noop}
          />
        );
      case "settings":
        return (
          <SettingsCard
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
            unifiedSurfaceClass={unifiedSurfaceClass}
            unifiedSubtleBoxClass={unifiedSubtleBoxClass}
            dragHandle={dragHandle}
            onStartDrag={noop}
          />
        );
      case "gesture":
        return (
          <GestureCard
            gestureControl={gestureControl}
            setGestureControl={setGestureControl}
            showReticle={showReticle}
            setShowReticle={setShowReticle}
            bgBlur={bgBlur}
            setBgBlur={setBgBlur}
            clauseMenuOpen={clauseMenuOpen}
            gestureBadgeText={gestureBadgeText}
            mouthScore={mouthScore}
            unifiedSurfaceClass={unifiedSurfaceClass}
            dragHandle={dragHandle}
            onStartDrag={noop}
          />
        );
      case "voice":
        return (
          <VoiceCard
            voiceError={voiceError}
            toggleMicrophone={toggleMicrophone}
            listenOnce={listenOnce}
            micActive={micActive}
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            voiceLog={voiceLog}
            unifiedSurfaceClass={unifiedSurfaceClass}
            unifiedSubtleBoxClass={unifiedSubtleBoxClass}
            dragHandle={dragHandle}
            onStartDrag={noop}
          />
        );
    }
  };

  return (
    <aside
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`fixed top-4 bottom-4 right-4 w-96 z-30 overflow-y-auto space-y-3 pr-1 transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-[120%]"
      }`}
    >
      {cardOrder.map((cardId) => (
        <div
          key={cardId}
          data-card-id={cardId}
          onPointerDown={(e) => startDrag(cardId, e)}
          className="cursor-grab active:cursor-grabbing"
        >
          {renderCardContent(cardId)}
        </div>
      ))}
    </aside>
  );
}
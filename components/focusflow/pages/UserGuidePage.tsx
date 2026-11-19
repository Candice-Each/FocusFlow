"use client";

import React, { useMemo, useState } from "react";
import { playSubtleEarcon } from "@/lib/focusflow/earcon";
import {
  DEFAULT_VOICE_CONFIG,
  GROUP_ORDER,
  MODE_SHORTCUTS,
  VOICE_CATALOG,
  filterCatalog,
  sentenceCase,
  type CommandGroup,
  type CommandId,
} from "@/lib/voice";

type GuideTab = "Gesture" | "Posture" | "Face" | "Voice" | "Eye";

/**
 * Display spelling of the primary wake word. `DEFAULT_VOICE_CONFIG` keeps the
 * lowercase form the matcher compares against, so the capitalisation lives here.
 */
const WAKE_WORD_DISPLAY = "Hey Focus";

/** Commands that take a spoken count have no fixed phrase list. */
function dictationExamples(id: string): string[] {
  if (id === "SKIP_LINES_FORWARD") return ["skip three lines", "skip 5 lines ahead"];
  if (id === "SKIP_LINES_BACK") return ["skip two lines back", "back 3 lines"];
  return [];
}

export function UserGuidePage() {
  const [subTab, setSubTab] = useState<GuideTab>("Gesture");

  // Gesture subpage
  const [selectedGestureIdx, setSelectedGestureIdx] = useState(0);
  const [currentGestureBadge, setCurrentGestureBadge] = useState("Idle");
  const [crosshairPos, setCrosshairPos] = useState({ x: 50, y: 50 });

  // Posture subpage
  const [activePostureType, setActivePostureType] = useState<"Forward" | "Tilt" | "Too close">("Forward");
  const [edgeCueActive, setEdgeCueActive] = useState(false);

  // Face-assistance subpage
  const [selectedFaceIdx, setSelectedFaceIdx] = useState(0);

  // Voice subpage
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceGroup, setVoiceGroup] = useState<CommandGroup | "All">("All");
  const [selectedCmdId, setSelectedCmdId] = useState<CommandId>("NEXT_PAGE");

  const visibleCommands = useMemo(
    () => filterCatalog(voiceQuery, voiceGroup),
    [voiceQuery, voiceGroup]
  );
  const selectedCmd =
    VOICE_CATALOG.find((entry) => entry.id === selectedCmdId) ?? VOICE_CATALOG[0];

  const [selectedEyeIdx, setSelectedEyeIdx] = useState(0);
  const [eyeSimLog, setEyeSimLog] = useState("Select a feature to explore.");

  const gestureItems = [
    { name: "Open palm · right", desc: "Turn to the next page", badgeText: "Next Page",
      detail: "Hold four extended fingers in the RIGHT third of the mirrored camera view for about 0.4 seconds. Lower your hand before turning again." },
    { name: "Open palm · left", desc: "Go to the previous page", badgeText: "Previous Page",
      detail: "Hold an open palm in the LEFT third of the camera view for about 0.4 seconds. The center zone does not flip pages." },
    { name: "☝ One finger", desc: "Highlight the row you are looking at", badgeText: "Gaze Row Highlighted",
      detail: "Look at a reading row, then raise ONLY your index finger for about 0.55 seconds. The currently gaze-selected row is saved as a highlight." },
    { name: "✌ Two fingers", desc: "Save the gaze row to Notes", badgeText: "Note Saved",
      detail: "Look at a row and hold your index and middle fingers up for about 0.55 seconds. The row text is added to Notes; use the Notes button to read it. Lower your hand between actions." },
  ];

  const eyeItems = [
    {
      name: "Line Sensitivity Sliders",
      desc: "Adjust how easily a glance triggers a line turn.",
      previewTitle: "Tune Your Reading Flow",
      previewBody: "The three sliders at the bottom left control how much eye movement is required to move to the next line (Next), go back (Prev), or skip downward (Skip). Adjust them in the right sidebar to match your reading speed.",
      actionText: "Preview Sliders",
      actionLog: "Look bottom-left on the reading page to adjust."
    },
    {
      name: "Live Camera & Mesh",
      desc: "Real-time feedback of your face and tracking points.",
      previewTitle: "Spatial Tracking Windows",
      previewBody: "Floating windows show your live camera feed and the topology mesh of your face. These are perfect for debugging if the gaze tracking feels inaccurate. You can toggle them in the Display Controls.",
      actionText: "Test Window Toggle",
      actionLog: "Live windows are draggable across the screen."
    },
    {
      name: "Gaze Heatmap",
      desc: "Visualize where your eyes linger the most.",
      previewTitle: "Attention Map",
      previewBody: "A subtle heatmap overlays the page, showing which sentences attracted the most fixation time. It decays over time so you can track your immediate focus.",
      actionText: "Toggle Heatmap",
      actionLog: "Heatmap visible on reading page."
    },
    {
      name: "Gaze Highlight",
      desc: "Highlights the sentence you are currently reading.",
      previewTitle: "Automatic Sentence Highlighting",
      previewBody: "The system follows your gaze and softly highlights the active sentence without you lifting a finger. Blinks are filtered out so the highlight stays steady.",
      actionText: "Simulate Fixation",
      actionLog: "Gaze locked on sentence. Highlight applied."
    },
    {
      name: "Mouth Gesture Menu",
      desc: "Open your mouth to summon the action bar.",
      previewTitle: "Mouth-Triggered Quick Actions",
      previewBody: "When you need to bookmark or copy a sentence, simply open your mouth wide. A selection box will anchor to your current gaze point.",
      actionText: "Simulate Mouth Open",
      actionLog: "Jaw open detected. Selection box anchored."
    }
  ];

  const faceItems = [
    {
      name: "Personal baseline",
      desc: "Record five seconds of natural reading",
      detail:
        "FocusFlow compares sustained changes with your own neutral reading baseline instead of applying one universal threshold to everyone.",
    },
    {
      name: "Presence-aware pause",
      desc: "Pause only after a sustained absence",
      detail:
        "A single missed frame is ignored. If you remain outside the camera view, reading time pauses and a welcome-back choice appears when you return.",
    },
    {
      name: "Understanding assistance",
      desc: "Combine facial and reading signals",
      detail:
        "A help prompt appears only when a sustained facial candidate coincides with a separate reading-difficulty signal. You can break down, translate, or inspect key terms.",
    },
    {
      name: "Privacy and fallback",
      desc: "Use local numerical features only",
      detail:
        "Raw video is not stored. When tracking confidence is too low, facial analysis pauses while the reading interface continues to work normally.",
    },
  ];

  const triggerPostureCorrectionDemo = () => {
    setEdgeCueActive(true);
    playSubtleEarcon(440, 220);
    setTimeout(() => setEdgeCueActive(false), 2200);
  };

  const headerConfig = {
    Gesture: {
      title: "Hands + gaze, working together",
      subtitle: "Start Hand + Posture from the floating panel. Drag its ⠿ handle to move it, or tap the title to shrink it. Gaze chooses the row; one finger highlights it and two fingers save a note. Lower your hand between gestures.",
    },
    Posture: {
      title: "Return to upright",
      subtitle: "Posture is checked in the background. When you lean in or tilt for too long, a soft edge cue asks you to sit back.",
    },
    Face: {
      title: "How Face Assist responds",
      subtitle: "Face Assist uses a personal baseline and sustained signals to offer optional support. It does not identify emotions or make a medical assessment.",
    },
    Voice: {
      title: "How to speak",
      subtitle: "Say the wake word first, then a short verb and object. Half sentences are ignored, repeated commands are throttled, and failed phrases are logged.",
    },
    Eye: {
      title: "Gaze as a cursor",
      subtitle: "Look naturally. The system highlights the active sentence and offers quick actions via mouth gestures.",
    },
  }[subTab];

  return (
    <div className="max-w-5xl mx-auto px-10 py-8 select-none relative">
      {edgeCueActive && (
        <div className="pointer-events-none fixed inset-0 z-50 border-[10px] border-amber-500/35 shadow-[inset_0_0_48px_rgba(245,158,11,0.28)] transition-opacity duration-500" />
      )}

      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 mb-1">
        FIRST SESSION
      </div>
      <h1 className="font-serif text-4xl text-stone-900 mb-2">{headerConfig.title}</h1>
      <p className="text-xs text-stone-500 max-w-xl leading-relaxed mb-6">
        {headerConfig.subtitle}
      </p>

      <div className="flex items-center gap-2 mb-7">
        {(["Gesture", "Posture", "Face", "Voice", "Eye"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs border transition ${
              subTab === tab
                ? "bg-stone-900 text-white border-stone-900 font-medium"
                : "bg-white text-stone-600 border-stone-200/90 hover:border-stone-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === "Gesture" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-stone-800 mb-4">Available hand gestures</h3>
            <div className="space-y-2.5">
              {gestureItems.map((item, idx) => {
                const isSelected = selectedGestureIdx === idx;
                return (
                  <div
                    key={item.name}
                    onClick={() => {
                      setSelectedGestureIdx(idx);
                      setCurrentGestureBadge(item.badgeText);
                      playSubtleEarcon(523.25, 120);
                    }}
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "border-stone-900 bg-stone-50/70 shadow-sm"
                        : "border-transparent hover:bg-stone-100/60"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-stone-900">{item.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
                    </div>
                    <span className="text-xs font-mono text-stone-400">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-5 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                CURRENT BADGE
              </div>
              <div className="font-serif text-3xl text-stone-900 mb-2">
                {currentGestureBadge}
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                {gestureItems[selectedGestureIdx]?.detail ||
                  "The small crosshair on the reading page shows that the hand is inside the recognition zone."}
              </p>
            </div>

            <div
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                setCrosshairPos({ x: Math.max(8, Math.min(92, x)), y: Math.max(12, Math.min(88, y)) });
              }}
              onPointerLeave={() => setCurrentGestureBadge("Idle")}
              className="h-36 rounded-xl bg-[#f5f3ef] border border-stone-200/80 relative overflow-hidden cursor-crosshair flex items-center justify-center"
            >
              <span className="text-[11px] text-stone-400 pointer-events-none">
                Move cursor here to test spatial crosshair (+)
              </span>
              <div
                style={{ left: `${crosshairPos.x}%`, top: `${crosshairPos.y}%` }}
                className="absolute -ml-2.5 -mt-2.5 w-5 h-5 flex items-center justify-center pointer-events-none text-stone-800"
              >
                <span className="text-sm font-mono leading-none">+</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "Posture" && (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {(
              [
                { type: "Forward" as const, caption: "Leaning forward toward the monitor" },
                { type: "Tilt" as const, caption: "Head tilted laterally for a prolonged period" },
                { type: "Too close" as const, caption: "Viewing distance shorter than personal baseline" },
              ] as const
            ).map((item) => {
              const isSelected = activePostureType === item.type;
              return (
                <div
                  key={item.type}
                  onClick={() => setActivePostureType(item.type)}
                  className={`p-6 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition ${
                    isSelected
                      ? "border-stone-900 bg-[#f8f7f4]"
                      : "border-stone-200/70 hover:border-stone-300"
                  }`}
                >
                  <svg
                    viewBox="0 0 80 110"
                    className="w-20 h-28 stroke-stone-800 fill-none mb-3"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="15" y1="95" x2="65" y2="95" className="stroke-stone-300" />
                    {item.type === "Forward" && (
                      <>
                        <circle cx="48" cy="26" r="9" />
                        <line x1="45" y1="35" x2="34" y2="72" />
                        <line x1="25" y1="52" x2="54" y2="48" />
                        <line x1="34" y1="72" x2="26" y2="95" />
                        <line x1="34" y1="72" x2="46" y2="95" />
                      </>
                    )}
                    {item.type === "Tilt" && (
                      <>
                        <ellipse cx="45" cy="25" rx="9" ry="9" transform="rotate(22 45 25)" />
                        <line x1="40" y1="34" x2="40" y2="72" />
                        <line x1="26" y1="50" x2="54" y2="54" />
                        <line x1="40" y1="72" x2="32" y2="95" />
                        <line x1="40" y1="72" x2="48" y2="95" />
                      </>
                    )}
                    {item.type === "Too close" && (
                      <>
                        <circle cx="40" cy="24" r="12" />
                        <line x1="40" y1="36" x2="40" y2="74" />
                        <line x1="22" y1="52" x2="58" y2="52" />
                        <line x1="40" y1="74" x2="30" y2="95" />
                        <line x1="40" y1="74" x2="50" y2="95" />
                      </>
                    )}
                  </svg>
                  <div className="text-xs font-semibold text-stone-900">{item.type}</div>
                  <div className="text-[11px] text-stone-500 mt-1">{item.caption}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <button
              type="button"
              onClick={triggerPostureCorrectionDemo}
              className="px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition shadow-sm"
            >
              Play correction
            </button>
            <span className="text-xs text-stone-500">
              {edgeCueActive
                ? `Showing soft peripheral cue for "${activePostureType}" posture...`
                : "Click Play correction to preview the non-intrusive edge cue and earcon."}
            </span>
          </div>
        </div>
      )}

      {subTab === "Face" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-stone-800 mb-4">
              Face assistance features
            </h3>
            <div className="space-y-2.5">
              {faceItems.map((item, idx) => {
                const isSelected = selectedFaceIdx === idx;
                return (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => setSelectedFaceIdx(idx)}
                    className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between text-left transition ${
                      isSelected
                        ? "border-stone-900 bg-stone-50/70 shadow-sm"
                        : "border-transparent hover:bg-stone-100/60"
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-semibold text-stone-900">
                        {item.name}
                      </span>
                      <span className="block text-[11px] text-stone-500 mt-0.5">
                        {item.desc}
                      </span>
                    </span>
                    <span className="text-xs font-mono text-stone-400">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-5 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                CURRENT EXPLANATION
              </div>
              <div className="font-serif text-2xl text-stone-900 mb-2">
                {faceItems[selectedFaceIdx].name}
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                {faceItems[selectedFaceIdx].detail}
              </p>
            </div>

            <div className="mt-8 rounded-xl bg-[#f5f3ef] border border-stone-200/80 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-3">
                SUPPORT PATH
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-700">
                <span className="rounded-full bg-white border border-stone-200 px-3 py-1">
                  Personal baseline
                </span>
                <span className="text-stone-400">→</span>
                <span className="rounded-full bg-white border border-stone-200 px-3 py-1">
                  Sustained change
                </span>
                <span className="text-stone-400">→</span>
                <span className="rounded-full bg-stone-900 px-3 py-1 text-white">
                  Optional prompt
                </span>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-stone-500">
                Facial data is supporting evidence only; the user remains in control of every intervention.
              </p>
            </div>
          </div>
        </div>
      )}

      {subTab === "Voice" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch md:h-[32rem] min-h-0">
          {/* ── left column: wake word · command list ─────────────────── */}
          <div className="md:col-span-7 flex flex-col gap-4 min-h-0">
            <div className="bg-white rounded-2xl border border-stone-200/90 px-5 py-4 shadow-sm shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                    Wake word
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Also accepts {DEFAULT_VOICE_CONFIG.wakeWords.slice(1).join(" / ")}.
                  </p>
                </div>
                <span className="self-center font-serif text-2xl leading-none text-stone-900 whitespace-nowrap mr-1">
                  &ldquo;&nbsp;{WAKE_WORD_DISPLAY}&nbsp;&rdquo;
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-xs font-serif font-medium text-stone-800 whitespace-nowrap">
                  Read mode - commands
                </h3>
                <div className="flex items-center gap-1 h-[21px] px-2 rounded-full border border-stone-200 focus-within:border-stone-400 transition shrink-0">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="w-3 h-3 shrink-0 stroke-stone-400 fill-none"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <circle cx="7" cy="7" r="4.5" />
                    <line x1="10.5" y1="10.5" x2="14" y2="14" />
                  </svg>
                  <input
                    type="text"
                    value={voiceQuery}
                    onChange={(e) => setVoiceQuery(e.target.value)}
                    aria-label="Search commands"
                    className="w-40 bg-transparent text-[10px] leading-[21px] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-nowrap gap-1 mb-3 overflow-x-auto">
                {(["All", ...GROUP_ORDER] as const).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setVoiceGroup(g)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap shrink-0 transition ${
                      voiceGroup === g
                        ? "bg-stone-900 text-white border-stone-900"
                        : "border-stone-200 text-stone-500 hover:border-stone-400"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
                {visibleCommands.length === 0 ? (
                  <div className="text-[11px] text-stone-500 px-1 py-2">
                    No command matches &ldquo;{voiceQuery}&rdquo;.
                  </div>
                ) : (
                  visibleCommands.map((entry) => {
                    const isSelected = entry.id === selectedCmdId;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => {
                          setSelectedCmdId(entry.id);
                          playSubtleEarcon(659.25, 120);
                        }}
                        className={`px-3 py-2 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "border-stone-900 bg-stone-50/70"
                            : "border-transparent hover:bg-stone-100/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-stone-900">
                            {entry.label}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400 shrink-0">
                            {entry.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {entry.description}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── right column: notes mode · selected ───────────────────── */}
          <div className="md:col-span-5 flex flex-col gap-4 min-h-0">
            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-sm shrink-0">
              <h3 className="text-xs font-serif font-medium text-stone-800 mb-1.5">Notes mode</h3>
              <p className="text-[11px] text-stone-500 leading-relaxed mb-3">
                In Notes mode everything except mode switches is recorded as a note.
              </p>
              <div className="flex gap-1.5">
                {MODE_SHORTCUTS.map((shortcut) => {
                  const active = selectedCmdId === shortcut.commandId;
                  return (
                    <button
                      type="button"
                      key={shortcut.commandId}
                      onClick={() => {
                        setVoiceGroup("Mode");
                        setSelectedCmdId(shortcut.commandId);
                        playSubtleEarcon(523.25, 120);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] border transition ${
                        active
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {shortcut.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm flex flex-col min-h-0 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                SELECTED
              </div>
              <div className="font-serif text-2xl text-stone-900 mb-3">{selectedCmd.label}</div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                {(selectedCmd.phrases.length === 0
                  ? dictationExamples(selectedCmd.id)
                  : selectedCmd.phrases
                ).map((phrase) => (
                  <div
                    key={phrase}
                    className="px-3 py-1.5 rounded-xl bg-[#f5f3ef] border border-stone-200/70 text-[11px] text-stone-800"
                  >
                    {sentenceCase(phrase)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Eye 视图渲染 (新增) */}
      {subTab === "Eye" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm">
            <h3 className="text-xs font-serif font-medium text-stone-800 mb-4">Gaze Features & Settings</h3>
            <div className="space-y-2.5">
              {eyeItems.map((item, idx) => {
                const isSelected = selectedEyeIdx === idx;
                return (
                  <div
                    key={item.name}
                    onClick={() => {
                      setSelectedEyeIdx(idx);
                      playSubtleEarcon(659.25, 140);
                      setEyeSimLog(`Selected: "${item.name}" — explore the details.`);
                    }}
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected ? "border-stone-900 bg-stone-50/70 shadow-sm" : "border-transparent hover:bg-stone-100/60"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-stone-900">{item.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
                    </div>
                    <span className="text-xs font-mono text-stone-400">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-5 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                FEATURE DETAIL
              </div>
              <div className="font-serif text-2xl text-stone-900 mb-2">
                {eyeItems[selectedEyeIdx]?.previewTitle}
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                {eyeItems[selectedEyeIdx]?.previewBody}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#f5f3ef] border border-stone-200/80 text-xs font-mono text-stone-700">
                {eyeSimLog}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSubtleEarcon(520 + selectedEyeIdx * 35, 120);
                    setEyeSimLog(eyeItems[selectedEyeIdx].actionLog);
                  }}
                  className="px-4 py-1.5 rounded-full bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition"
                >
                  {eyeItems[selectedEyeIdx]?.actionText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { playSubtleEarcon } from "@/lib/focusflow/earcon";

type GuideTab = "Gesture" | "Posture" | "Voice";

export function UserGuidePage() {
  const [subTab, setSubTab] = useState<GuideTab>("Gesture");

  // Gesture subpage
  const [selectedGestureIdx, setSelectedGestureIdx] = useState(0);
  const [currentGestureBadge, setCurrentGestureBadge] = useState("Idle");
  const [crosshairPos, setCrosshairPos] = useState({ x: 50, y: 50 });

  // Posture subpage
  const [activePostureType, setActivePostureType] = useState<"Forward" | "Tilt" | "Too close">("Forward");
  const [edgeCueActive, setEdgeCueActive] = useState(false);

  // Voice subpage
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  const [voiceSimLog, setVoiceSimLog] = useState(
    "Ready — click Test Command to hear earcon confirmation"
  );

  const gestureItems = [
    { name: "Swipe up", desc: "Move down the page", badgeText: "Swipe up",
      detail: "A complete upward hand sweep scrolls the active passage down smoothly." },
    { name: "Swipe down", desc: "Move up the page", badgeText: "Swipe down",
      detail: "A complete downward hand sweep returns to the upper passage." },
    { name: "Left or right", desc: "Previous or next chapter", badgeText: "Chapter Sweep",
      detail: "Swiping horizontally switches between the previous or next chapter." },
    { name: "Pinch and drag", desc: "Adjust reading width", badgeText: "Pinch & Drag",
      detail: "Pinch thumb and index finger to fine-tune the reading column margin." },
    { name: "Open palm", desc: "Pause or summon menu", badgeText: "Open Palm",
      detail: "Hold an open palm steady inside the zone to pause timing or open quick actions." },
  ];

  const voiceItems = [
    { cmd: "Next line", desc: "Move the active sentence down one row",
      previewTitle: "Move to the next line",
      previewBody: "Says \"hey focus next line\". Only a finished utterance is acted on; a half sentence is ignored so the page never jumps on a slip of the tongue." },
    { cmd: "Next page", desc: "Turn to the next page",
      previewTitle: "Turn the page forward",
      previewBody: "Blocked at the last page with a spoken-style prompt instead of silently doing nothing." },
    { cmd: "Previous chapter", desc: "Return to the previous chapter",
      previewTitle: "Return to previous chapter",
      previewBody: "Switches immediately to the preceding chapter without touching the mouse or keyboard." },
    { cmd: "Open menu", desc: "Summon the sentence action bar",
      previewTitle: "Open the quick action bar",
      previewBody: "Replaces hunting for the floating menu: the sentence currently held by your gaze gets its action bar." },
    { cmd: "Read this line", desc: "Start TTS narration from the active line",
      previewTitle: "Start TTS narration",
      previewBody: "Initiates calm spoken narration from the active sentence for multisensory reinforcement." },
    { cmd: "Save this line", desc: "Bookmark the active sentence",
      previewTitle: "Choose a sentence",
      previewBody: "Anchors a bookmark on the sentence currently held by your gaze and logs the timestamp." },
    { cmd: "Font bigger", desc: "Increase the reading font size",
      previewTitle: "Increase text size",
      previewBody: "Font size steps by two points per command so a single mishearing does not blow up the page." },
    { cmd: "Stop dictation", desc: "End a Notes-mode voice note",
      previewTitle: "Finish the voice note",
      previewBody: "In Notes mode every final is appended to the note list; this phrase closes the note." },
  ];

  const triggerPostureCorrectionDemo = () => {
    setEdgeCueActive(true);
    playSubtleEarcon(440, 220);
    setTimeout(() => setEdgeCueActive(false), 2200);
  };

  const headerConfig = {
    Gesture: {
      title: "What the hand does",
      subtitle: "Only a finished gesture is counted. Halfway movement is ignored so the page stays calm.",
    },
    Posture: {
      title: "Return to upright",
      subtitle: "Posture is checked in the background. When you lean in or tilt for too long, a soft edge cue asks you to sit back.",
    },
    Voice: {
      title: "How to speak",
      subtitle: "Say the wake word first, then a short verb and object. Half sentences are ignored, repeated commands are throttled, and failed phrases are logged.",
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
        {(["Gesture", "Posture", "Voice"] as const).map((tab) => (
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
            <h3 className="text-xs font-semibold text-stone-800 mb-4">Spatial gestures</h3>
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

      {subTab === "Voice" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-6 shadow-sm">
            <h3 className="text-xs font-serif font-medium text-stone-800 mb-4">Verb + Object</h3>
            <div className="space-y-2.5">
              {voiceItems.map((item, idx) => {
                const isSelected = selectedVoiceIdx === idx;
                return (
                  <div
                    key={item.cmd}
                    onClick={() => {
                      setSelectedVoiceIdx(idx);
                      playSubtleEarcon(659.25, 140);
                      setVoiceSimLog(`Recognised: "${item.cmd}" — earcon played`);
                    }}
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "border-stone-900 bg-stone-50/70 shadow-sm"
                        : "border-transparent hover:bg-stone-100/60"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-stone-900">{item.cmd}</div>
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
                COMMAND ACTION
              </div>
              <div className="font-serif text-2xl text-stone-900 mb-2">
                {voiceItems[selectedVoiceIdx]?.previewTitle}
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                {voiceItems[selectedVoiceIdx]?.previewBody}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#f5f3ef] border border-stone-200/80 text-xs font-mono text-stone-700">
                {voiceSimLog}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cmd = voiceItems[selectedVoiceIdx]?.cmd;
                    playSubtleEarcon(659.25, 150);
                    setVoiceSimLog(`Success: "${cmd}" executed`);
                  }}
                  className="px-4 py-1.5 rounded-full bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition"
                >
                  Test Command
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSubtleEarcon(220, 180);
                    setVoiceSimLog('Unrecognized: "uh maybe flip..." (Logged)');
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-stone-300 text-stone-700 text-xs hover:bg-stone-100 transition"
                >
                  Simulate Half-Sentence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
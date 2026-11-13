"use client";

import { useState } from "react";
import type {
  FaceAnalysisObservation,
  FacePromptKind,
  PersonalFaceBaseline,
} from "@/lib/face/types";
import type {
  ActiveFacePrompt,
  BaselineCaptureState,
} from "@/hooks/useFaceBehavior";

interface FaceAssistLayerProps {
  prompt: ActiveFacePrompt | null;
  observation: FaceAnalysisObservation;
  baseline: PersonalFaceBaseline | null;
  capture: BaselineCaptureState;
  readingDifficultySignal: boolean;
  breakRemainingSeconds: number;
  demoMode: boolean;
  isNight: boolean;
  onDismissPrompt: () => void;
  onSnoozePrompt: (minutes: number) => void;
  onDisablePromptKind: (kind: FacePromptKind) => void;
  onStartRestBreak: () => void;
  onStartBaseline: () => boolean;
  onRequestDemoPrompt: (kind: FacePromptKind) => void;
}

const PHASE_LABELS: Record<FaceAnalysisObservation["phase"], string> = {
  "baseline-required": "Baseline required",
  "warming-up": "Warm-up",
  "tracking-unavailable": "Unavailable",
  "tracking-limited": "Limited — analysis paused",
  monitoring: "Monitoring",
};

const PROMPT_COPY: Record<
  FacePromptKind,
  { eyebrow: string; title: string; body: string }
> = {
  understanding: {
    eyebrow: "Optional assistance",
    title: "Need help with this paragraph?",
    body:
      "A sustained baseline-relative facial change occurred together with a separate reading-difficulty signal.",
  },
  posture: {
    eyebrow: "Screen-position check",
    title: "Your reading position has shifted",
    body:
      "The change from your personal baseline has persisted. Adjust only if it feels more comfortable; this is not a medical posture assessment.",
  },
  rest: {
    eyebrow: "Active-reading reminder",
    title: "Ready for a short eye break?",
    body:
      "This reminder uses active reading time. Away, hidden-tab and paused time are excluded.",
  },
};

const ASSISTANCE_COPY = {
  simplify: {
    title: "Simplified explanation",
    body:
      "FocusFlow waits for a persistent pattern instead of reacting to one facial movement. Assistance is offered only when a separate reading signal occurs at the same time.",
  },
  translate: {
    title: "中文释义",
    body:
      "FocusFlow 不会把一次面部动作直接判断为困惑。只有持续变化与独立的阅读困难信号同时出现时，系统才会提供可关闭的理解辅助。",
  },
  terms: {
    title: "Key terms",
    body:
      "Personal baseline: the reader's own reference range. Multimodal gate: a rule requiring evidence from more than one input channel.",
  },
};

export function FaceAssistLayer(props: FaceAssistLayerProps) {
  const {
    prompt,
    observation,
    baseline,
    capture,
    readingDifficultySignal,
    breakRemainingSeconds,
    demoMode,
    isNight,
    onDismissPrompt,
    onSnoozePrompt,
    onDisablePromptKind,
    onStartRestBreak,
    onStartBaseline,
    onRequestDemoPrompt,
  } = props;
  const [assistanceResult, setAssistanceResult] = useState<
    keyof typeof ASSISTANCE_COPY | null
  >(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const surface = isNight
    ? "border-stone-700 bg-stone-950/95 text-stone-100"
    : "border-stone-200 bg-white/95 text-stone-900";
  const subtle = isNight
    ? "border-stone-700 bg-stone-900 text-stone-200"
    : "border-stone-200 bg-stone-50 text-stone-700";

  const showAssistance = (mode: keyof typeof ASSISTANCE_COPY) => {
    setAssistanceResult(mode);
    onDismissPrompt();
  };

  return (
    <>
      {prompt && (
        <aside
          aria-live="polite"
          className={`fixed bottom-12 right-6 z-[70] w-[min(420px,calc(100vw-3rem))] rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${surface}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">
                {PROMPT_COPY[prompt.kind].eyebrow}
                {prompt.demo ? " · demo" : ""}
              </p>
              <h2 className="mt-1 font-serif text-xl">
                {PROMPT_COPY[prompt.kind].title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onDismissPrompt}
              className="rounded-full px-2 py-1 text-sm opacity-55 hover:opacity-100"
              aria-label="Dismiss reminder"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-75">
            {PROMPT_COPY[prompt.kind].body}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {prompt.kind === "understanding" && (
              <>
                <button type="button" onClick={() => showAssistance("simplify")} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-medium text-white">
                  Simplify
                </button>
                <button type="button" onClick={() => showAssistance("translate")} className={`rounded-xl border px-3 py-2 text-xs ${subtle}`}>
                  Translate
                </button>
                <button type="button" onClick={() => showAssistance("terms")} className={`rounded-xl border px-3 py-2 text-xs ${subtle}`}>
                  Key terms
                </button>
              </>
            )}
            {prompt.kind === "posture" && (
              <>
                <button type="button" onClick={onDismissPrompt} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-medium text-white">
                  I adjusted
                </button>
                <button type="button" onClick={() => onSnoozePrompt(5)} className={`rounded-xl border px-3 py-2 text-xs ${subtle}`}>
                  5 minutes later
                </button>
              </>
            )}
            {prompt.kind === "rest" && (
              <>
                <button type="button" onClick={onStartRestBreak} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-medium text-white">
                  Start 20-second break
                </button>
                <button type="button" onClick={() => onSnoozePrompt(5)} className={`rounded-xl border px-3 py-2 text-xs ${subtle}`}>
                  5 minutes later
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDisablePromptKind(prompt.kind)}
            className="mt-3 text-[10px] opacity-50 underline underline-offset-2 hover:opacity-90"
          >
            Turn off this reminder type
          </button>
        </aside>
      )}

      {assistanceResult && (
        <aside className={`fixed bottom-12 right-6 z-[69] w-[min(420px,calc(100vw-3rem))] rounded-2xl border p-5 shadow-xl ${surface}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] opacity-50">
                Prototype content
              </p>
              <h2 className="mt-1 font-serif text-xl">
                {ASSISTANCE_COPY[assistanceResult].title}
              </h2>
            </div>
            <button type="button" onClick={() => setAssistanceResult(null)} className="px-2 opacity-50 hover:opacity-100">
              ✕
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed opacity-75">
            {ASSISTANCE_COPY[assistanceResult].body}
          </p>
        </aside>
      )}

      {breakRemainingSeconds > 0 && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/65 backdrop-blur-md">
          <div className={`w-[min(440px,calc(100vw-3rem))] rounded-3xl border p-8 text-center shadow-2xl ${surface}`}>
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-50">
              Eye break
            </p>
            <div className="mt-3 font-serif text-7xl tabular-nums">
              {breakRemainingSeconds}
            </div>
            <p className="mt-4 text-sm opacity-70">
              Look at something farther away and relax your eyes.
            </p>
          </div>
        </div>
      )}

      {demoMode && (
        <aside className={`fixed bottom-5 left-5 z-[65] w-80 rounded-2xl border p-4 shadow-xl backdrop-blur-xl ${surface}`}>
          <button
            type="button"
            onClick={() => setInspectorOpen((value) => !value)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-xs font-semibold">Face-assist test panel</span>
            <span className="text-xs opacity-50">{inspectorOpen ? "Hide" : "Show"}</span>
          </button>
          {inspectorOpen && (
            <div className="mt-3 space-y-3 text-[11px]">
              <div className={`rounded-xl border p-3 ${subtle}`}>
                <div className="flex justify-between"><span>Analysis</span><strong>{PHASE_LABELS[observation.phase]}</strong></div>
                <div className="mt-1 flex justify-between"><span>Tracking gate</span><strong>{observation.trackingGate}</strong></div>
                <div className="mt-1 flex justify-between"><span>Facial candidate</span><strong>{observation.cognitiveStrainCandidate ? "Yes" : "No"}</strong></div>
                <div className="mt-1 flex justify-between"><span>Reading difficulty</span><strong>{readingDifficultySignal ? "Yes" : "No"}</strong></div>
                <div className="mt-1 flex justify-between"><span>Posture candidate</span><strong>{observation.postureDeviationCandidate ? "Yes" : "No"}</strong></div>
              </div>

              <div>
                <div className="mb-1 flex justify-between opacity-65">
                  <span>Personal baseline</span>
                  <span>{capture.status === "collecting" ? `${capture.progress}%` : baseline ? `${baseline.sampleCount} samples` : "Not ready"}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-300/35">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${capture.status === "ready" ? 100 : capture.progress}%` }} />
                </div>
                <p className="mt-1 leading-relaxed opacity-55">{capture.message}</p>
                <button type="button" onClick={onStartBaseline} disabled={capture.status === "collecting"} className="mt-2 rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] text-white disabled:opacity-40">
                  {capture.status === "collecting" ? "Recording…" : baseline ? "Re-record baseline" : "Record 5s baseline"}
                </button>
              </div>

              <div>
                <p className="mb-1 opacity-55">Preview prompt layouts</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["understanding", "posture", "rest"] as FacePromptKind[]).map((kind) => (
                    <button key={kind} type="button" onClick={() => onRequestDemoPrompt(kind)} className={`rounded-lg border px-2 py-1 capitalize ${subtle}`}>
                      {kind}
                    </button>
                  ))}
                </div>
              </div>

              <p className="border-t border-stone-300/25 pt-2 leading-relaxed opacity-50">
                Local numeric features only. Raw video is not stored. Demo thresholds are shortened for testing.
              </p>
            </div>
          )}
        </aside>
      )}
    </>
  );
}

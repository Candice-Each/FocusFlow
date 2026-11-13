"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type {
  FaceAnalysisObservation,
  FacePromptKind,
  PersonalFaceBaseline,
} from "@/lib/face/types";
import type {
  ActiveFacePrompt,
  BaselineCaptureState,
} from "@/hooks/useFaceBehavior";
import {
  extractKeyTerms,
  simplifyLocally,
  translateToChinese,
} from "@/lib/reading-assistance";

interface FaceAssistLayerProps {
  prompt: ActiveFacePrompt | null;
  observation: FaceAnalysisObservation;
  baseline: PersonalFaceBaseline | null;
  capture: BaselineCaptureState;
  readingDifficultySignal: boolean;
  breakRemainingSeconds: number;
  assistanceSourceText: string;
  demoMode: boolean;
  isNight: boolean;
  onDismissPrompt: () => void;
  onSnoozePrompt: (minutes: number) => void;
  onDisablePromptKind: (kind: FacePromptKind) => void;
  onStartRestBreak: () => void;
  onRequestBaseline: () => void;
  onStartBaseline: () => boolean;
  onCancelBaseline: () => void;
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
    title: "Need help with this sentence?",
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

type AssistanceMode = "simplify" | "translate" | "terms";

interface AssistanceResultState {
  mode: AssistanceMode;
  title: string;
  sourceText: string;
  body: string;
  note: string;
  loading: boolean;
  targetClauseId: number;
}

export function FaceAssistLayer(props: FaceAssistLayerProps) {
  const {
    prompt,
    observation,
    baseline,
    capture,
    readingDifficultySignal,
    breakRemainingSeconds,
    assistanceSourceText,
    demoMode,
    isNight,
    onDismissPrompt,
    onSnoozePrompt,
    onDisablePromptKind,
    onStartRestBreak,
    onRequestBaseline,
    onStartBaseline,
    onCancelBaseline,
    onRequestDemoPrompt,
  } = props;
  const [assistanceResult, setAssistanceResult] =
    useState<AssistanceResultState | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const anchoredCardRef = useRef<HTMLElement | null>(null);
  const assistanceRequestIdRef = useRef(0);

  const surface = isNight
    ? "border-stone-700 bg-stone-950/95 text-stone-100"
    : "border-stone-200 bg-white/95 text-stone-900";
  const subtle = isNight
    ? "border-stone-700 bg-stone-900 text-stone-200"
    : "border-stone-200 bg-stone-50 text-stone-700";

  const anchoredClauseId =
    prompt?.kind === "understanding"
      ? prompt.targetClauseId
      : assistanceResult?.targetClauseId ?? null;

  useLayoutEffect(() => {
    const card = anchoredCardRef.current;
    if (!card || anchoredClauseId === null) return;
    const target = document.querySelector<HTMLElement>(
      `[data-focusflow-clause-id="${anchoredClauseId}"]`
    );
    if (!target) return;

    const resetPosition = () => {
      card.style.removeProperty("left");
      card.style.removeProperty("top");
      card.style.removeProperty("right");
      card.style.removeProperty("bottom");
    };
    const updatePosition = () => {
      const targetRect = target.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const margin = 16;
      const gap = 10;
      const cardWidth = Math.min(cardRect.width || 420, window.innerWidth - margin * 2);
      const cardHeight = cardRect.height || 240;
      let left = Math.min(
        Math.max(margin, targetRect.left),
        window.innerWidth - cardWidth - margin
      );
      let top = targetRect.bottom + gap;
      if (top + cardHeight > window.innerHeight - margin) {
        top = targetRect.top - cardHeight - gap;
      }
      top = Math.min(
        Math.max(margin, top),
        Math.max(margin, window.innerHeight - cardHeight - margin)
      );
      left = Math.max(margin, left);
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
      card.style.right = "auto";
      card.style.bottom = "auto";
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(target);
    observer.observe(card);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resetPosition();
    };
  }, [anchoredClauseId, assistanceResult?.body, assistanceResult?.loading]);

  const showAssistance = async (mode: AssistanceMode) => {
    const sourceText = assistanceSourceText.trim();
    const targetClauseId = prompt?.targetClauseId ?? -1;
    const requestId = ++assistanceRequestIdRef.current;

    if (mode === "simplify") {
      setAssistanceResult({
        mode,
        title: "Simplified explanation",
        sourceText,
        body: simplifyLocally(sourceText),
        note: "Created locally with plain-language rewriting rules.",
        loading: false,
        targetClauseId,
      });
      return;
    }

    if (mode === "terms") {
      const terms = extractKeyTerms(sourceText);
      setAssistanceResult({
        mode,
        title: "Key terms",
        sourceText,
        body: terms.length
          ? terms.map((item) => `${item.term} — ${item.definition}`).join("\n\n")
          : "No specialist terms were detected in this sentence.",
        note: "Terms were extracted locally from the current sentence.",
        loading: false,
        targetClauseId,
      });
      return;
    }

    setAssistanceResult({
      mode,
      title: "中文翻译",
      sourceText,
      body: "Preparing local translation…",
      note: "Checking the browser's built-in translation capability.",
      loading: true,
      targetClauseId,
    });
    const translation = await translateToChinese(sourceText);
    if (assistanceRequestIdRef.current !== requestId) return;
    setAssistanceResult({
      mode,
      title: "中文翻译",
      sourceText,
      body: translation.text,
      note: translation.note,
      loading: false,
      targetClauseId,
    });
  };

  return (
    <>
      {capture.status === "instructions" && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-stone-950/60 px-6 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="face-baseline-instructions-title"
            className={`w-full max-w-lg rounded-3xl border p-7 shadow-2xl ${surface}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-50">
              Personal calibration
            </p>
            <h2
              id="face-baseline-instructions-title"
              className="mt-2 font-serif text-3xl"
            >
              Before recording your baseline
            </h2>
            <p className="mt-3 text-sm leading-relaxed opacity-70">
              FocusFlow needs five seconds of your normal reading position and
              facial movement as a personal reference. It is not asking you to
              make a particular expression.
            </p>

            <ol className={`mt-5 space-y-3 rounded-2xl border p-4 text-sm ${subtle}`}>
              <li className="flex gap-3">
                <strong className="opacity-45">1</strong>
                <span>Sit as you normally read and keep your full face in view.</span>
              </li>
              <li className="flex gap-3">
                <strong className="opacity-45">2</strong>
                <span>Use steady lighting and keep the camera still.</span>
              </li>
              <li className="flex gap-3">
                <strong className="opacity-45">3</strong>
                <span>Relax your face and look naturally at the paragraph.</span>
              </li>
            </ol>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="opacity-65">Current tracking</span>
              <strong
                className={
                  observation.trackingGate === "good"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }
              >
                {observation.trackingGate}
              </strong>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed opacity-55">
              {capture.message} Only numerical features are kept for this browser
              session; raw video is not stored.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelBaseline}
                className={`rounded-xl border px-4 py-2 text-xs ${subtle}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onStartBaseline}
                disabled={observation.trackingGate !== "good"}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {observation.trackingGate === "good"
                  ? "Start baseline"
                  : "Waiting for tracking"}
              </button>
            </div>
          </section>
        </div>
      )}

      {capture.status === "collecting" && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-stone-950/60 px-6 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="face-baseline-title"
            className={`w-full max-w-lg rounded-3xl border p-7 shadow-2xl ${surface}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-50">
              Personal calibration
            </p>
            <h2 id="face-baseline-title" className="mt-2 font-serif text-3xl">
              Recording your reading baseline
            </h2>
            <p className="mt-3 text-sm leading-relaxed opacity-70">
              Sit in a comfortable reading position, look naturally at the text,
              and relax your eyebrows, eyes and mouth. There is no need to hold a
              special expression.
            </p>

            <div className={`mt-5 rounded-2xl border p-4 ${subtle}`}>
              <div className="flex items-center justify-between text-xs">
                <span>Reliable samples</span>
                <strong>{capture.sampleCount}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span>Tracking</span>
                <strong className={observation.trackingGate === "good" ? "text-emerald-600" : "text-amber-600"}>
                  {observation.trackingGate}
                </strong>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-300/35">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${capture.progress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs tabular-nums">
                <span className="opacity-65">{capture.message}</span>
                <strong>{capture.progress}%</strong>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-[11px] leading-relaxed opacity-50">
                Progress pauses automatically if tracking quality drops. Only
                numerical features are retained for this session.
              </p>
              <button
                type="button"
                onClick={onCancelBaseline}
                className={`shrink-0 rounded-xl border px-4 py-2 text-xs ${subtle}`}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {prompt && !assistanceResult && (
        <aside
          ref={prompt.kind === "understanding" ? anchoredCardRef : undefined}
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
          {prompt.kind === "understanding" && assistanceSourceText && (
            <p className={`mt-3 line-clamp-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${subtle}`}>
              “{assistanceSourceText}”
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {prompt.kind === "understanding" && (
              <>
                <button type="button" onClick={() => void showAssistance("simplify")} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-medium text-white">
                  Simplify
                </button>
                <button type="button" onClick={() => void showAssistance("translate")} className={`rounded-xl border px-3 py-2 text-xs ${subtle}`}>
                  Translate
                </button>
                <button type="button" onClick={() => void showAssistance("terms")} className={`rounded-xl border px-3 py-2 text-xs ${subtle}`}>
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
        <aside
          ref={anchoredCardRef}
          aria-live="polite"
          className={`fixed bottom-12 right-6 z-[70] max-h-[min(460px,calc(100vh-2rem))] w-[min(420px,calc(100vw-3rem))] overflow-y-auto rounded-2xl border p-5 shadow-xl backdrop-blur-xl ${surface}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] opacity-50">
                Current sentence assistance
              </p>
              <h2 className="mt-1 font-serif text-xl">
                {assistanceResult.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                assistanceRequestIdRef.current += 1;
                setAssistanceResult(null);
                onDismissPrompt();
              }}
              className="px-2 opacity-50 hover:opacity-100"
              aria-label="Close assistance result"
            >
              ✕
            </button>
          </div>
          <p className={`mt-3 rounded-xl border px-3 py-2 text-[11px] leading-relaxed opacity-70 ${subtle}`}>
            “{assistanceResult.sourceText}”
          </p>
          <p className="mt-3 whitespace-pre-line text-xs leading-relaxed opacity-85">
            {assistanceResult.body}
          </p>
          <p className="mt-3 border-t border-stone-300/25 pt-2 text-[10px] leading-relaxed opacity-50">
            {assistanceResult.loading ? "Working locally…" : assistanceResult.note}
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
        <aside
          className={`fixed bottom-5 left-24 z-[65] rounded-2xl border shadow-xl backdrop-blur-xl ${surface} ${
            inspectorOpen ? "w-80 p-4" : "w-auto px-4 py-3"
          }`}
        >
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
                {observation.activeStrainSignals.length > 0 && (
                  <div className="mt-1 leading-relaxed opacity-60">
                    Signals: {observation.activeStrainSignals.join(", ")} · {(observation.strainConditionMs / 1000).toFixed(1)}s
                  </div>
                )}
                <div className="mt-1 flex justify-between"><span>Reading difficulty</span><strong>{readingDifficultySignal ? "Yes" : "No"}</strong></div>
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
                <button type="button" onClick={onRequestBaseline} disabled={capture.status === "collecting"} className="mt-2 rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] text-white disabled:opacity-40">
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
                Local numeric features only. Raw video is not stored. Demo thresholds are shortened for testing. Automatic posture prompts are off by default.
              </p>
            </div>
          )}
        </aside>
      )}
    </>
  );
}

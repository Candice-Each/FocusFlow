"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { primeAudioContext } from "@/lib/focusflow/earcon";
import {
  VoiceAssistant,
  createWebSpeechHandle,
  isWebSpeechSupported,
  type ReaderSnapshot,
  type SpeechEvent,
  type VoiceAction,
  type VoiceMode,
} from "@/lib/voice";

export interface UseVoiceAssistantOptions {
  mode: VoiceMode;
  /** Reader state, read fresh on every utterance. */
  getSnapshot: () => ReaderSnapshot;
  /** Fired for every drained action, in order. */
  onAction: (action: VoiceAction) => void;
  /** Human-readable one-liner for the voice log. */
  onLog: (line: string) => void;
}

export interface UseVoiceAssistantResult {
  micActive: boolean;
  voiceError: boolean;
  toggleMicrophone: () => void;
  /** Press-to-talk without keeping the mic open. */
  listenOnce: () => void;
  stopMicrophone: () => void;
}

const SEEN_TTL_MS = 2000;

export function useVoiceAssistant(options: UseVoiceAssistantOptions): UseVoiceAssistantResult {
  const { mode, getSnapshot, onAction, onLog } = options;

  const [micActive, setMicActive] = useState(false);
  const [voiceError, setVoiceError] = useState(false);

  const engineRef = useRef<VoiceAssistant | null>(null);
  const handleRef = useRef<ReturnType<typeof createWebSpeechHandle> | null>(null);
  const onActionRef = useRef(onAction);
  const getSnapshotRef = useRef(getSnapshot);
  const seenRef = useRef(new Map<string, number>());

  useEffect(() => {
    onActionRef.current = onAction;
    getSnapshotRef.current = getSnapshot;
  }, [onAction, getSnapshot]);

  // Engine lives for the whole page; mic start/stop is separate from it.
  if (engineRef.current === null) {
    engineRef.current = new VoiceAssistant({
      onTrace: (line) => onLog(line),
    });
  }

  const dispatch = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const action of engine.drain()) {
      if (action.kind === "PREVIEW") {
        // Partials only update the log, never act.
        continue;
      }
      if (action.kind === "PROMPT") {
        onLog(`⚠ ${action.message}`);
        // Forward so the host can play the low error cue; the host decides
        // between "info" (silent) and "error" (audible).
        onActionRef.current(action);
        continue;
      }
      onActionRef.current(action);
    }
  }, [onLog]);

  /** Web Speech fires duplicate finals for one utterance; drop repeats. */
  const dedupe = useCallback((event: SpeechEvent): boolean => {
    if (event.kind !== "final") return true;
    const key = event.text.trim().toLowerCase();
    if (!key) return true;
    const now = Date.now();
    for (const [seen, at] of seenRef.current) {
      if (now - at > SEEN_TTL_MS) seenRef.current.delete(seen);
    }
    if (seenRef.current.has(key)) return false;
    seenRef.current.set(key, now);
    return true;
  }, []);

  const feed = useCallback(
    (event: SpeechEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (!dedupe(event)) return;
      if (event.kind === "partial") {
        onLog(`… ${event.text}`);
        return;
      }
      engine.sync(getSnapshotRef.current());
      engine.receive(event);
      dispatch();
    },
    [dedupe, dispatch, onLog]
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    // The engine owns the mode; always tell it first.
    engine.setMode(mode);
    // Then reconcile dictation with the microphone state.
    if (mode === "Notes" && micActive && engine.engineState !== "DICTATING") {
      engine.beginDictation();
    }
    dispatch();
  }, [mode, micActive, dispatch]);

  const startMicrophone = useCallback(() => {
    if (!isWebSpeechSupported()) {
      setVoiceError(true);
      onLog("Speech API unavailable – use desktop Chrome or Edge");
      return;
    }
    // Runs inside the click gesture, so this unlocks the shared AudioContext
    // and every later voice-triggered earcon can actually be heard.
    primeAudioContext();
    setVoiceError(false);
    handleRef.current?.dispose();
    handleRef.current = createWebSpeechHandle(feed, { lang: "en-US" });
    const started = handleRef.current?.start() ?? false;
    if (!started) {
      setVoiceError(true);
      onLog("Could not start recognition");
      return;
    }
    setMicActive(true);
    onLog(mode === "Notes" ? 'Notes mode: "stop dictation" ends the note' : 'Listening – say "hey focus" + command');
  }, [feed, mode, onLog]);

  const stopMicrophone = useCallback(() => {
    const engine = engineRef.current;
    if (engine?.engineState === "DICTATING") {
      engine.finishDictation();
      dispatch();
    }
    handleRef.current?.dispose();
    handleRef.current = null;
    setMicActive(false);
    onLog("Microphone off");
  }, [dispatch, onLog]);

  const toggleMicrophone = useCallback(() => {
    if (micActive) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  }, [micActive, startMicrophone, stopMicrophone]);

  const listenOnce = useCallback(() => {
    if (!isWebSpeechSupported()) {
      setVoiceError(true);
      onLog("Speech API unavailable – use desktop Chrome or Edge");
      return;
    }
    primeAudioContext();
    setVoiceError(false);
    handleRef.current?.dispose();
    handleRef.current = createWebSpeechHandle(
      (event) => {
        feed(event);
        if (event.kind === "final" || event.kind === "error") {
          handleRef.current?.stop();
        }
      },
      { lang: "en-US" }
    );
    handleRef.current?.start();
    onLog("Listening once…");
  }, [feed, onLog]);

  useEffect(() => {
    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  return { micActive, voiceError, toggleMicrophone, listenOnce, stopMicrophone };
}

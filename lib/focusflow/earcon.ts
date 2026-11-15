let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedCtx;
}

/** Default peak gain for cues; kept low so earcons stay subtle. */
export const DEFAULT_EARCON_VOLUME = 0.08;

function schedule(ctx: AudioContext, freq: number, durationMs: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

/**
 * Play a short earcon.
 *
 * Three things matter here, learned from voice-triggered cues going silent
 * while button-triggered cues worked:
 *
 * 1. The context is created lazily and may start `suspended` (autoplay policy).
 * 2. `resume()` is async — scheduling before it resolves drops the sound.
 * 3. After `resume()` the state can still read `suspended` on some Chromium
 *    builds while audio actually plays, so we always attempt the schedule and
 *    let the try/catch absorb a genuine failure.
 *
 * `volume` is the peak gain (0–1). It defaults to the existing subtle level;
 * pass a lower value for soft cues (e.g. page-turn ticks) and a higher one for
 * confirming cues. Values are clamped and non-positive volumes are ignored.
 */
export function playSubtleEarcon(
  freq = 587.33,
  durationMs = 160,
  volume = DEFAULT_EARCON_VOLUME
) {
  const ctx = getCtx();
  if (!ctx) return;
  if (!Number.isFinite(volume) || volume <= 0) return;
  const gain = Math.min(volume, 1);

  const trySchedule = () => {
    try {
      schedule(ctx, freq, durationMs, gain);
    } catch {
      // genuinely blocked – ignore
    }
  };

  try {
    if (ctx.state === "running") {
      trySchedule();
      return;
    }
    // resume() may reject (no user gesture) or resolve while still suspended.
    void ctx
      .resume()
      .then(trySchedule, trySchedule);
  } catch {
    // ignore
  }
}

/**
 * Called from a real user gesture (a button click) to unlock the shared
 * context, so later voice-triggered cues are not blocked by autoplay policy.
 * Plays an inaudible tone.
 */
export function primeAudioContext() {
  const ctx = getCtx();
  if (!ctx) return;
  const warm = () => {
    try {
      schedule(ctx, 1, 8, DEFAULT_EARCON_VOLUME);
    } catch {
      // ignore
    }
  };
  try {
    if (ctx.state === "running") warm();
    else void ctx.resume().then(warm, warm);
  } catch {
    // ignore
  }
}

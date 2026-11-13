import type {
  FacePromptDecision,
  FacePromptKind,
  FacePromptPolicyConfig,
  FacePromptPolicyInput,
  FacePromptPolicyState,
  FacePromptPolicyUpdate,
} from "./types";

export const DEFAULT_FACE_PROMPT_POLICY_CONFIG: Readonly<FacePromptPolicyConfig> = {
  cooldownMs: {
    posture: 180_000,
    understanding: 90_000,
    rest: 300_000,
  },
  restAfterActiveReadingMs: 30 * 60_000,
  restRepeatActiveReadingMs: 30 * 60_000,
  priority: ["understanding", "posture", "rest"],
};

export function createFacePromptPolicyState(
  config: FacePromptPolicyConfig = DEFAULT_FACE_PROMPT_POLICY_CONFIG,
  currentActiveReadingMs = 0,
): FacePromptPolicyState {
  return {
    lastIssuedAtMs: {
      posture: null,
      understanding: null,
      rest: null,
    },
    nextRestDueAtActiveReadingMs:
      Math.max(0, currentActiveReadingMs) + config.restAfterActiveReadingMs,
  };
}

function cooldownReady(
  kind: FacePromptKind,
  nowMs: number,
  state: FacePromptPolicyState,
  config: FacePromptPolicyConfig,
): boolean {
  const last = state.lastIssuedAtMs[kind];
  return last === null || nowMs - last >= config.cooldownMs[kind];
}

function promptReason(kind: FacePromptKind): string {
  switch (kind) {
    case "posture":
      return "A sustained change from the reader's personal posture baseline was detected.";
    case "understanding":
      return "A sustained facial-strain candidate coincided with a separate reading-difficulty signal.";
    case "rest":
      return "The configured amount of active reading time has elapsed.";
  }
}

/**
 * Pure prompt gate. Cooldowns are independent, and only the prompt actually
 * issued consumes its cooldown. Priority resolves simultaneous candidates.
 */
export function updateFacePromptPolicy(
  previous: FacePromptPolicyState,
  input: FacePromptPolicyInput,
  config: FacePromptPolicyConfig = DEFAULT_FACE_PROMPT_POLICY_CONFIG,
): FacePromptPolicyUpdate {
  const nowMs = Number.isFinite(input.nowMs) ? input.nowMs : 0;
  let nextRestDueAtActiveReadingMs = previous.nextRestDueAtActiveReadingMs;
  if (input.restTaken) {
    nextRestDueAtActiveReadingMs =
      input.observation.activeReadingMs + config.restRepeatActiveReadingMs;
  }

  const baseState: FacePromptPolicyState = {
    lastIssuedAtMs: { ...previous.lastIssuedAtMs },
    nextRestDueAtActiveReadingMs,
  };
  const monitoring = input.observation.phase === "monitoring";
  const commonGate = input.promptsAllowed && input.readingActive;
  const eligible: Record<FacePromptKind, boolean> = {
    posture:
      commonGate &&
      monitoring &&
      input.observation.postureDeviationCandidate &&
      cooldownReady("posture", nowMs, baseState, config),
    understanding:
      commonGate &&
      monitoring &&
      input.observation.cognitiveStrainCandidate &&
      input.readingDifficultySignal &&
      cooldownReady("understanding", nowMs, baseState, config),
    rest:
      commonGate &&
      input.observation.activeReadingMs >= nextRestDueAtActiveReadingMs &&
      cooldownReady("rest", nowMs, baseState, config),
  };

  const selected = config.priority.find((kind) => eligible[kind]) ?? null;
  if (!selected) {
    return { state: baseState, decision: null, eligible };
  }

  const decision: FacePromptDecision = {
    kind: selected,
    issuedAtMs: nowMs,
    reason: promptReason(selected),
  };
  const state: FacePromptPolicyState = {
    lastIssuedAtMs: {
      ...baseState.lastIssuedAtMs,
      [selected]: nowMs,
    },
    nextRestDueAtActiveReadingMs:
      selected === "rest"
        ? input.observation.activeReadingMs + config.restRepeatActiveReadingMs
        : baseState.nextRestDueAtActiveReadingMs,
  };

  return { state, decision, eligible };
}

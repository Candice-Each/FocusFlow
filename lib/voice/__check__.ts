/**
 * Self-check for the voice engine. Run with:
 *
 *   npx tsx lib/voice/__check__.ts
 *
 * Kept as a plain script so it needs no test runner. It mirrors the cases the
 * Java `VoiceAssistantTest` / `IntentParserTest` / `WakeWordMatcherTest` cover.
 */
import { VoiceAssistant } from "./voice-assistant";
import { parseTranscript } from "./intent-parser";
import { matchWakeWord } from "./wake-word";
import { DEFAULT_VOICE_CONFIG, type VoiceAction } from "./commands";
import { createReaderSnapshot } from "./reader-context";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// ── intent parsing ──────────────────────────────────────────────────────────
check("next line", parseTranscript("Next line")?.id, "NEXT_LINE");
check("next, line (punctuation)", parseTranscript("Next, line.")?.id, "NEXT_LINE");
check("page down", parseTranscript("page down")?.id, "NEXT_PAGE");
check("go back", parseTranscript("go back")?.id, "PREV_PAGE");
check("skip 3 lines", parseTranscript("skip 3 lines forward")?.count, 3);
check("skip two lines back", parseTranscript("skip two lines back")?.id, "SKIP_LINES_BACK");
check("font bigger", parseTranscript("make the font bigger please")?.id, "FONT_BIGGER");
check("open menu", parseTranscript("open the menu")?.id, "OPEN_MENU");
check("read this line", parseTranscript("read this line")?.id, "READ_LINE");
check("stop reading", parseTranscript("stop reading")?.id, "STOP_READING");
check("save this line", parseTranscript("save this line")?.id, "BOOKMARK_LINE");
check("homophone: land → line", parseTranscript("next land")?.id, "NEXT_LINE");
check("homophone: fount → font", parseTranscript("fount bigger")?.id, "FONT_BIGGER");
check("no match", parseTranscript("the garden was empty"), null);
check("title is not rewritten", parseTranscript('open "next page" essay')?.id ?? null, null);

// ── wake word ───────────────────────────────────────────────────────────────
const wake = (t: string) => matchWakeWord(t, DEFAULT_VOICE_CONFIG);
check("wake exact", wake("hey focus").matched, true);
check("wake with body", wake("hey focus next line").rest, "next line");
check("wake filler", wake("hey there focus next line").rest, "next line");
check("wake miss", wake("next line").matched, false);

// ── engine: wake gate + throttle + boundaries ──────────────────────────────
function engineWith(snapshot = createReaderSnapshot({ pageIdx: 1, pageCount: 5, lineIdx: 0, lineCount: 12 })) {
  const actions: VoiceAction[] = [];
  const e = new VoiceAssistant();
  e.sync(snapshot);
  return {
    engine: e,
    run(text: string, now: number) {
      e.receive({ kind: "final", text }, now);
      actions.push(...e.drain());
      return actions.slice(-1)[0];
    },
    actions,
    e,
  };
}

{
  const t = engineWith();
  check("no wake → ignored", t.run("next line", 0), undefined);

  const armed = engineWith();
  armed.run("hey focus", 0);
  check("armed → command", armed.run("next line", 500)?.kind, "COMMAND");

  const gate = engineWith();
  gate.run("hey focus next line", 0);
  check("wake + body in one", gate.run("next page", 300)?.kind, "COMMAND");

  const throttled = engineWith();
  throttled.run("hey focus next line", 0);
  throttled.run("hey focus next line", 200);
  check(
    "throttle drops repeat",
    throttled.actions.filter((a) => a.kind === "COMMAND").length,
    1
  );

  const lastPage = engineWith(createReaderSnapshot({ pageIdx: 4, pageCount: 5 }));
  const blocked = lastPage.run("hey focus next page", 0);
  check("last page blocked", blocked?.kind, "PROMPT");
  check(
    "boundary notice is info (silent)",
    blocked?.kind === "PROMPT" ? blocked.severity : null,
    "info"
  );

  const notUnderstood = engineWith();
  const miss = notUnderstood.run("hey focus the garden was quiet", 0);
  check(
    "unrecognised phrase is error (low cue)",
    miss?.kind === "PROMPT" ? miss.severity : null,
    "error"
  );

  const multi = engineWith();
  check("skip lines carries count", (() => {
    multi.run("hey focus skip 3 lines", 0);
    const last = multi.actions.filter((a) => a.kind === "COMMAND").slice(-1)[0];
    return last?.kind === "COMMAND" ? last.command.count : null;
  })(), 3);
}

// ── split wake word ────────────────────────────────────────────────────────
{
  const e = new VoiceAssistant();
  e.receive({ kind: "final", text: "hey" }, 0);
  const ignored = e.drain();
  e.receive({ kind: "final", text: "focus next line" }, 400);
  const got = e.drain();
  check("split wake: first final silent", ignored.length, 0);
  check("split wake: second final runs", got.some((a) => a.kind === "COMMAND"), true);
}

// ── dictation channel ──────────────────────────────────────────────────────
{
  const e = new VoiceAssistant();
  e.setMode("Notes");
  e.drain();
  e.receive({ kind: "partial", text: "the garden was" }, 0);
  check("dictation partial is preview-only", e.drain().every((a) => a.kind === "PREVIEW"), true);

  e.receive({ kind: "final", text: "the garden was quiet" }, 100);
  check("dictation keeps punctuation", (() => {
    const a = e.drain().find((x) => x.kind === "DICTATION_APPEND");
    return a?.kind === "DICTATION_APPEND" ? a.text : null;
  })(), "the garden was quiet.");

  e.receive({ kind: "final", text: "next line" }, 200);
  check("dictation does not execute commands", e.drain().some((a) => a.kind === "COMMAND"), false);

  e.receive({ kind: "final", text: "stop dictation" }, 300);
  const end = e.drain().find((a) => a.kind === "DICTATION_END");
  check("dictation ends", end?.kind, "DICTATION_END");
}

// ── Notes mode: mode switching needs the wake word ─────────────────────────
{
  const notes = new VoiceAssistant();
  notes.setMode("Notes");
  notes.drain();

  notes.receive({ kind: "final", text: "this read mode is annoying" }, 0);
  const kept = notes.drain();
  check(
    "prose mentioning read mode is recorded, not executed",
    kept.some((a) => a.kind === "DICTATION_APPEND"),
    true
  );

  notes.receive({ kind: "final", text: "hey focus change to read mode" }, 100);
  const left = notes.drain();
  check(
    "wake word + change to read mode leaves dictation",
    left.some((a) => a.kind === "DICTATION_END"),
    true
  );
  check("engine returns to non-dictating", notes.engineState !== "DICTATING", true);
}

{
  const notes = new VoiceAssistant();
  notes.setMode("Notes");
  notes.drain();
  notes.receive({ kind: "final", text: "stop dictation" }, 0);
  check(
    "bare stop dictation leaves dictation",
    notes.engineState,
    "IDLE"
  );
}

{
  const notes = new VoiceAssistant();
  notes.setMode("Notes");
  notes.drain();
  notes.receive({ kind: "final", text: "hey focus start dictation" }, 0);
  const again = notes.drain();
  check(
    "start dictation while dictating is an info prompt",
    again.find((a) => a.kind === "PROMPT")?.kind === "PROMPT"
      ? (again.find((a) => a.kind === "PROMPT") as { severity?: string }).severity
      : null,
    "info"
  );
}

// ── STATUS must tell the host to leave Notes mode ──────────────────────────
{
  const notes = new VoiceAssistant();
  notes.setMode("Notes");
  notes.drain();

  notes.receive({ kind: "final", text: "hey focus change to read mode" }, 1000);
  const out = notes.drain();
  const status = out.filter((a) => a.kind === "STATUS").pop();
  check(
    "spoken mode switch emits STATUS(mode=Read) for the UI",
    status?.kind === "STATUS" ? status.mode : null,
    "Read"
  );
  check(
    "engine state is no longer DICTATING",
    status?.kind === "STATUS" ? status.state : null,
    "IDLE"
  );
}

console.log(failures === 0 ? "\nall voice checks passed" : `\n${failures} check(s) failed`);
if (failures > 0) process.exitCode = 1;

"use client";

import React from "react";

interface NotesModalProps {
  open: boolean;
  onClose: () => void;
  highlightedClauses: Set<number>;
  getSentenceTextById: (cid: number) => string;
  onRemoveHighlight: (cid: number) => void;
  showToast: (title: string, detail?: string) => void;
  noteInputText: string;
  setNoteInputText: React.Dispatch<React.SetStateAction<string>>;
  notesList: string[];
  setNotesList: React.Dispatch<React.SetStateAction<string[]>>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
}

export function NotesModal({
  open,
  onClose,
  highlightedClauses,
  getSentenceTextById,
  onRemoveHighlight,
  showToast,
  noteInputText,
  setNoteInputText,
  notesList,
  setNotesList,
  handleFileUpload,
  unifiedSurfaceClass,
  unifiedSubtleBoxClass,
}: NotesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        className={`rounded-2xl max-w-lg w-full p-6 border space-y-4 ${unifiedSurfaceClass}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-55">
              Notes, Highlights & Local TXT
            </div>
            <h3 className="text-lg font-serif font-medium">
              Reading Notes & Highlights
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium opacity-75">
            Highlighted Sentences ({highlightedClauses.size})
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
            {highlightedClauses.size === 0 ? (
              <div
                className={`p-2.5 rounded-xl border text-[11px] opacity-60 ${unifiedSubtleBoxClass}`}
              >
                No highlighted sentences yet. Open your mouth (or double-click a
                sentence) and click &ldquo;Highlight&rdquo;.
              </div>
            ) : (
              Array.from(highlightedClauses).map((cid) => {
                const sentText =
                  getSentenceTextById(cid) || `Sentence #${cid + 1}`;
                return (
                  <div
                    key={cid}
                    className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${unifiedSubtleBoxClass}`}
                  >
                    <span className="truncate">{sentText}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(sentText);
                          showToast("Highlight Copied");
                        }}
                        className="text-[10px] opacity-65 hover:opacity-100 px-1"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveHighlight(cid)}
                        className="text-[10px] text-rose-500 hover:underline px-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium opacity-75">
            Add or Paste Reading Note
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteInputText}
              onChange={(e) => setNoteInputText(e.target.value)}
              placeholder="Type a note or click Paste..."
              className={`flex-1 px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${unifiedSubtleBoxClass}`}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const clip = await navigator.clipboard.readText();
                  if (clip) {
                    setNoteInputText((prev) => prev + clip);
                    showToast("Pasted from Clipboard");
                  }
                } catch {
                  showToast("Use Ctrl+V to paste");
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs ${unifiedSubtleBoxClass}`}
            >
              Paste
            </button>
            <button
              type="button"
              onClick={() => {
                if (!noteInputText.trim()) return;
                setNotesList((prev) => [noteInputText.trim(), ...prev]);
                setNoteInputText("");
                showToast("Note Saved");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-medium"
            >
              Save
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
          {notesList.map((n, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${unifiedSubtleBoxClass}`}
            >
              <span className="leading-relaxed">{n}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(n);
                  showToast("Note Copied");
                }}
                className="text-[10px] opacity-60 hover:opacity-100 shrink-0 px-1.5 py-0.5 rounded border border-stone-400/30"
              >
                Copy
              </button>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-stone-300/40 flex items-center justify-between">
          <label className="px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium cursor-pointer hover:bg-stone-800 transition">
            Import Local TXT File
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border text-xs ${unifiedSubtleBoxClass}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
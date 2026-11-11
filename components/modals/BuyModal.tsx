"use client";

import React from "react";

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  currentChapterTitle: string;
  isPurchased: boolean;
  onPurchase: () => void;
  unifiedSurfaceClass: string;
  unifiedSubtleBoxClass: string;
}

export function BuyModal({
  open,
  onClose,
  currentChapterTitle,
  isPurchased,
  onPurchase,
  unifiedSurfaceClass,
  unifiedSubtleBoxClass,
}: BuyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        className={`rounded-2xl max-w-md w-full p-6 border space-y-4 ${unifiedSurfaceClass}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-55">Single Book Edition</div>
            <h3 className="text-lg font-serif font-medium">
              Purchase Full Digital Edition
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

        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${unifiedSubtleBoxClass}`}
        >
          <div className="font-medium">
            Book: &ldquo;{currentChapterTitle}&rdquo;
          </div>
          <ul className="space-y-1 opacity-80 list-disc list-inside text-[11px]">
            <li>Full access to all chapters and unlimited local TXT imports</li>
            <li>Real-time WPM/CPM analytics and gaze heatmap overlays</li>
            <li>Sentence highlights, notes export, and TTS audio</li>
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xl font-serif font-semibold">$4.99</span>
            <span className="text-[11px] opacity-55 ml-1.5">
              One-time purchase
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-xl border text-xs ${unifiedSubtleBoxClass}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPurchase}
              className="px-4 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800"
            >
              {isPurchased ? "✓ Unlocked" : "Buy Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}